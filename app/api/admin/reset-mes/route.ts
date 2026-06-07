import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getProvider } from "@/lib/data/provider";
import type { Movimiento, Semana } from "@/lib/data/types";

const MES_REGEX = /^\d{4}-\d{2}$/;

const MESES_NOMBRE = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function mesNombre(mes: string): string {
  const month = parseInt(mes.split("-")[1], 10);
  return MESES_NOMBRE[month - 1] ?? "";
}

function mesPrevio(mes: string): string {
  const [yearStr, monthStr] = mes.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (month === 1) return `${year - 1}-12`;
  return `${year}-${String(month - 1).padStart(2, "0")}`;
}

function getSheets() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return {
    sheets: google.sheets({ version: "v4", auth }),
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
  };
}

type DeleteResult = { label: string; borradas: number };

async function deleteRowsByMes(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  mes: string,
  rangeRead: string,
  rangeClear: string,
  rangeWrite: string,
  label: string
): Promise<DeleteResult> {
  let raw: string[][] | null | undefined;
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: rangeRead });
    raw = res.data.values as string[][] | undefined;
  } catch {
    return { label, borradas: 0 };
  }

  if (!raw || raw.length < 2) return { label, borradas: 0 };

  const [headers, ...rows] = raw;
  const mesI = headers.indexOf("mes");
  if (mesI === -1) return { label, borradas: 0 };

  const junioRows = rows.filter((r) => (r[mesI] ?? "") === mes);
  const otherRows = rows.filter((r) => (r[mesI] ?? "") !== mes && r[0]);

  if (junioRows.length === 0) return { label, borradas: 0 };

  await sheets.spreadsheets.values.clear({ spreadsheetId, range: rangeClear });
  if (otherRows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: rangeWrite,
      valueInputOption: "RAW",
      requestBody: { values: otherRows },
    });
  }

  return { label, borradas: junioRows.length };
}

async function resetH2(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  mes: string
): Promise<DeleteResult> {
  let antes = 0;
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H2!A:Y" });
    const raw = res.data.values as string[][] | undefined;
    if (raw && raw.length >= 2) {
      const mesI = raw[0].indexOf("mes");
      if (mesI !== -1) antes = raw.slice(1).filter((r) => (r[mesI] ?? "") === mes).length;
    }
  } catch { /* vacía */ }

  if (antes === 0) return { label: "H2", borradas: 0 };

  await sheets.spreadsheets.values.clear({ spreadsheetId, range: "H2!A2:Z1000" });
  return { label: "H2", borradas: antes };
}

function conceptoActivoEnMes(
  concepto: { estado: string; frecuencia: string; mesActivoBimestral: string | null },
  mes: string
): boolean {
  if (concepto.estado !== "activo") return false;
  if (concepto.frecuencia !== "bimestral") return true;
  if (!concepto.mesActivoBimestral) return false;
  const nombre = mesNombre(mes);
  return concepto.mesActivoBimestral.split(",").map((m) => m.trim()).includes(nombre);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const mes: string = body.mes ?? "";

  if (!MES_REGEX.test(mes)) {
    return NextResponse.json({ error: "Formato de mes inválido. Use YYYY-MM." }, { status: 400 });
  }

  const { sheets, spreadsheetId } = getSheets();

  // ── Reset ──────────────────────────────────────────────────────────────────

  const [h2, h3b, h4a, h4b, h4c, h4d, h5a, h5b] = await Promise.all([
    resetH2(sheets, spreadsheetId, mes),
    deleteRowsByMes(sheets, spreadsheetId, mes, "H3!A:P",   "H3!A2:P10000",   "H3!A2",   "H3B"),
    deleteRowsByMes(sheets, spreadsheetId, mes, "H4!A:G",   "H4!A2:G10000",   "H4!A2",   "H4A"),
    deleteRowsByMes(sheets, spreadsheetId, mes, "H4!I:N",   "H4!I2:N10000",   "H4!I2",   "H4B"),
    deleteRowsByMes(sheets, spreadsheetId, mes, "H4!P:V",   "H4!P2:V10000",   "H4!P2",   "H4C"),
    deleteRowsByMes(sheets, spreadsheetId, mes, "H4!X:AE",  "H4!X2:AE10000",  "H4!X2",   "H4D"),
    deleteRowsByMes(sheets, spreadsheetId, mes, "H5!A:N",   "H5!A2:N10000",   "H5!A2",   "H5A"),
    deleteRowsByMes(sheets, spreadsheetId, mes, "H5B!A:I",  "H5B!A2:I10000",  "H5B!A2",  "H5B"),
  ]);

  // ── Reinicializar H2 ───────────────────────────────────────────────────────

  const provider = getProvider();
  const [conceptos, movimientosPrevios] = await Promise.all([
    provider.getConceptos(),
    provider.getMovimientos(mesPrevio(mes)),
  ]);

  const SEMANAS: Semana[] = ["S1", "S2", "S3", "S4"];
  const baseFields = {
    montoEjecutado: null, desviacion: null, estado: "pendiente" as const,
    ejecutor: null, fuenteEnMano: false, fuenteNequi: false, fuenteCamilo: false,
    fuenteAngie: false, fechaEjecucion: null, razonDesviacion: null,
    razonPostergacion: null, comprobanteUrl: null, pendienteAprobacion: false,
    notas: null, montoEjecutadoCamilo: null, montoEjecutadoAngie: null, idRecargaOrigen: null,
  };

  const desdeH1: Omit<Movimiento, "id">[] = conceptos
    .filter((c) => conceptoActivoEnMes(c, mes))
    .flatMap((c) => {
      const base = {
        ...baseFields,
        conceptoId: c.id, mes,
        nombreSnapshot: c.nombre, categoriaSnapshot: c.categoria,
        tipoSnapshot: c.tipo, montoPresupuestado: c.monto,
      };
      if (c.frecuencia === "semanal") return SEMANAS.map((s) => ({ ...base, semana: s }));
      return [{ ...base, semana: c.semanaDefault === "variable" ? null : (c.semanaDefault as Semana) }];
    });

  const carryover: Omit<Movimiento, "id">[] = movimientosPrevios
    .filter((m) => m.estado === "pospuesto_mes_siguiente")
    .map((m) => ({
      ...baseFields,
      conceptoId: m.conceptoId, mes,
      nombreSnapshot: m.nombreSnapshot, categoriaSnapshot: m.categoriaSnapshot,
      tipoSnapshot: m.tipoSnapshot, montoPresupuestado: m.montoPresupuestado, semana: m.semana,
    }));

  const movimientos = await provider.crearMovimientosMes([...desdeH1, ...carryover]);

  return NextResponse.json({
    mes,
    reset: { h2: h2.borradas, h3b: h3b.borradas, h4a: h4a.borradas, h4b: h4b.borradas, h4c: h4c.borradas, h4d: h4d.borradas, h5a: h5a.borradas, h5b: h5b.borradas },
    inicializado: movimientos.length,
  });
}
