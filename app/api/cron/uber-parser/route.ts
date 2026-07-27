import { google } from "googleapis";
import type { NextRequest } from "next/server";
import { mesDeFecha, semanaDeFechaEnMes } from "@/lib/utils/fecha";
import { getGmailClient, buscarViajesNuevos, marcarComoLeidos } from "@/lib/uber/gmail";

export const maxDuration = 60;

const TRANSPORTE_BOLSILLO_ID = "TRANSPORTE_1748100037";

const H3_HEADERS = [
  "id_consumo", "id_bolsillo", "mes", "semana", "descripcion",
  "monto", "ejecutor", "fuente_en_mano", "fuente_nequi",
  "fuente_camilo", "fuente_angie", "fecha", "comprobante_url", "clasificado",
  "sobre_techo", "id_recarga_origen", "imprevisto",
];

function getSheets() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function ensureH3(sheets: ReturnType<typeof getSheets>) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === "H3");
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: "H3" } } }] },
    });
  }
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `H3!A1:${String.fromCharCode(64 + H3_HEADERS.length)}1`,
    });
    const existing = res.data.values?.[0] ?? [];
    if (existing[0] === "id_consumo" && existing.length >= H3_HEADERS.length) return;
  } catch {
    // Proceed to write headers
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "H3!A1",
    valueInputOption: "RAW",
    requestBody: { values: [H3_HEADERS] },
  });
}

// H3 (ConsumoH3) no tiene columna "notas" (esa es de H2/Movimientos) -- se
// evita cambio de esquema (I-10, decision explicita de Camilo) reutilizando
// "descripcion", que ya existe y es texto libre, para llevar la marca
// [dedupe:xxxxxxxx] junto con el resumen legible del viaje.
async function dedupeKeysYaEscritas(sheets: ReturnType<typeof getSheets>, mes: string): Promise<Set<string>> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "H3!A:Q",
  });
  const rows = (res.data.values ?? []) as string[][];
  if (rows.length < 2) return new Set();
  const [headers, ...data] = rows;
  const mesI = headers.indexOf("mes");
  const descripcionI = headers.indexOf("descripcion");
  if (descripcionI === -1) return new Set();
  const keys = new Set<string>();
  for (const row of data) {
    if (row[mesI] !== mes) continue;
    const m = (row[descripcionI] ?? "").match(/\[dedupe:([a-f0-9]{8})\]/);
    if (m) keys.add(m[1]);
  }
  return keys;
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const header = req.headers.get("authorization");
    if (header !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    return Response.json({ error: "Credenciales Gmail no configuradas (GMAIL_CLIENT_ID/SECRET/REFRESH_TOKEN)" }, { status: 500 });
  }

  const gmail = getGmailClient({ clientId, clientSecret, refreshToken });
  const viajes = await buscarViajesNuevos(gmail);

  const sheets = getSheets();
  await ensureH3(sheets);

  const escritos: string[] = [];
  const saltados: string[] = [];
  const idsMensajesLeidos: string[] = [];

  const yaEscritasPorMes = new Map<string, Set<string>>();

  for (const { dedupeKey, viaje, fechaCorreo, idsMensajes } of viajes) {
    const mes = mesDeFecha(fechaCorreo);
    const semana = semanaDeFechaEnMes(fechaCorreo);

    let yaEscritas = yaEscritasPorMes.get(mes);
    if (!yaEscritas) {
      yaEscritas = await dedupeKeysYaEscritas(sheets, mes);
      yaEscritasPorMes.set(mes, yaEscritas);
    }

    if (yaEscritas.has(dedupeKey)) {
      saltados.push(dedupeKey);
      idsMensajesLeidos.push(...idsMensajes);
      continue;
    }

    const id = `CONSUMO_${Date.now()}_${dedupeKey}`;
    const hoy = new Date().toISOString().split("T")[0];
    const descripcion = `Uber ${viaje.tipoServicio} — ${viaje.direccionRecogida} → ${viaje.direccionDestino} [dedupe:${dedupeKey}]`;
    const row = [
      id,
      TRANSPORTE_BOLSILLO_ID,
      mes,
      semana,
      descripcion,
      String(viaje.montoTotal),
      "camilo",
      "FALSE", "FALSE", "TRUE", "FALSE",
      hoy,
      "",
      "TRUE",
      "FALSE",
      "",
      "FALSE",
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "H3!A:Q",
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });

    yaEscritas.add(dedupeKey);
    escritos.push(dedupeKey);
    idsMensajesLeidos.push(...idsMensajes);
  }

  if (idsMensajesLeidos.length > 0) {
    await marcarComoLeidos(gmail, idsMensajesLeidos);
  }

  return Response.json({ escritos: escritos.length, saltados: saltados.length, dedupeKeys: escritos });
}
