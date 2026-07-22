import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export const maxDuration = 60;

const TZ = "America/Bogota";
const PREFIJO = "flujo-backup-";

// Tabs físicos reales del Sheet de producción — verificado por lectura directa
// de metadata (spreadsheets.get) el 22 jul 2026, NO los nombres lógicos de
// CLAUDE.md/sheet-safety (H3B, H4A/B/C, H5A, H6 son tipos de dato o rangos de
// columnas dentro de estos tabs físicos, no tabs independientes).
const TABS = ["H1", "H2", "H3", "H4", "H5", "H5B"] as const;

function hoyBogota(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    // Exclusivamente Sheets API — sin Drive API. Mismo scope que ya usa el
    // resto de la app, sin ampliación.
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

type Sheets = ReturnType<typeof getSheetsClient>;

async function leerTabsProd(sheets: Sheets, prodSheetId: string) {
  const resultados = await Promise.all(
    TABS.map((tab) =>
      sheets.spreadsheets.values.get({ spreadsheetId: prodSheetId, range: tab })
    )
  );
  return Object.fromEntries(
    TABS.map((tab, i) => [tab, (resultados[i].data.values ?? []) as string[][]])
  ) as Record<(typeof TABS)[number], string[][]>;
}

async function crearBackup(sheets: Sheets, nombreBackup: string) {
  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: nombreBackup },
      sheets: TABS.map((title) => ({ properties: { title } })),
    },
    fields: "spreadsheetId",
  });
  const backupId = res.data.spreadsheetId;
  if (!backupId) throw new Error("spreadsheets.create no devolvió spreadsheetId");
  return backupId;
}

async function escribirBackup(
  sheets: Sheets,
  backupId: string,
  datosPorTab: Record<(typeof TABS)[number], string[][]>
) {
  await Promise.all(
    TABS.map((tab) => {
      const values = datosPorTab[tab];
      if (values.length === 0) return Promise.resolve();
      return sheets.spreadsheets.values.update({
        spreadsheetId: backupId,
        range: tab,
        valueInputOption: "RAW",
        requestBody: { values },
      });
    })
  );
}

async function verificarContraProd(
  sheets: Sheets,
  prodSheetId: string,
  backupId: string
) {
  const resultado: Record<string, { coincide: boolean; filasProd: number; filasBackup: number }> = {};
  for (const tab of TABS) {
    const [prod, backup] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: prodSheetId, range: tab }),
      sheets.spreadsheets.values.get({ spreadsheetId: backupId, range: tab }),
    ]);
    const prodValues = prod.data.values ?? [];
    const backupValues = backup.data.values ?? [];
    resultado[tab] = {
      coincide: JSON.stringify(prodValues) === JSON.stringify(backupValues),
      filasProd: prodValues.length,
      filasBackup: backupValues.length,
    };
  }
  return resultado;
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const header = req.headers.get("authorization");
    if (header !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const prodSheetId = process.env.PROD_GOOGLE_SHEET_ID;
  if (!prodSheetId) {
    return NextResponse.json({ error: "PROD_GOOGLE_SHEET_ID no configurado" }, { status: 500 });
  }

  const sheets = getSheetsClient();
  const hoy = hoyBogota();
  const nombreBackup = `${PREFIJO}${hoy}`;

  // Solo lectura sobre prod — nunca values.update/append/batchUpdate contra prodSheetId.
  const datosPorTab = await leerTabsProd(sheets, prodSheetId);

  const backupId = await crearBackup(sheets, nombreBackup);
  await escribirBackup(sheets, backupId, datosPorTab);

  const verificacion = await verificarContraProd(sheets, prodSheetId, backupId);

  return NextResponse.json({
    ok: true,
    backup: { id: backupId, nombre: nombreBackup },
    verificacion,
    limpieza: {
      ejecutada: false,
      motivo:
        "Bloqueado por diseño: Sheets API no tiene método para borrar un spreadsheet " +
        "completo (requiere Drive API, fuera de alcance de este ticket). Ver " +
        "tickets/BACKUP-NOCTURNO-01.md, sección 'Disyuntiva bloqueante — P3'.",
    },
  });
}
