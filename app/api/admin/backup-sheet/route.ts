import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export const maxDuration = 60;

const TZ = "America/Bogota";
const RETENCION_DIAS = 14;

// Tabs físicos reales del Sheet de producción — verificado por lectura directa
// de metadata (spreadsheets.get) el 22 jul 2026, NO los nombres lógicos de
// CLAUDE.md/sheet-safety (H3B, H4A/B/C, H5A, H6 son tipos de dato o rangos de
// columnas dentro de estos tabs físicos, no tabs independientes).
const TABS = ["H1", "H2", "H3", "H4", "H5", "H5B"] as const;

const TAB_BACKUP_REGEX = new RegExp(`^(${TABS.join("|")})_(\\d{4}-\\d{2}-\\d{2})$`);

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
type ContainerSheet = { title: string; sheetId: number };

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

async function getContainerSheets(sheets: Sheets, containerId: string): Promise<ContainerSheet[]> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: containerId });
  return (meta.data.sheets ?? []).map((s) => ({
    title: s.properties?.title ?? "",
    sheetId: s.properties?.sheetId ?? -1,
  }));
}

async function crearTabsFaltantes(
  sheets: Sheets,
  containerId: string,
  existentes: ContainerSheet[],
  tabsHoy: Record<(typeof TABS)[number], string>
) {
  const titulosExistentes = new Set(existentes.map((s) => s.title));
  const faltantes = TABS.filter((tab) => !titulosExistentes.has(tabsHoy[tab]));
  if (faltantes.length === 0) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: containerId,
    requestBody: {
      requests: faltantes.map((tab) => ({
        addSheet: { properties: { title: tabsHoy[tab] } },
      })),
    },
  });
}

async function escribirValores(
  sheets: Sheets,
  containerId: string,
  tabsHoy: Record<(typeof TABS)[number], string>,
  datosPorTab: Record<(typeof TABS)[number], string[][]>
) {
  await Promise.all(
    TABS.map((tab) => {
      const values = datosPorTab[tab];
      if (values.length === 0) return Promise.resolve();
      return sheets.spreadsheets.values.update({
        spreadsheetId: containerId,
        range: tabsHoy[tab],
        valueInputOption: "RAW",
        requestBody: { values },
      });
    })
  );
}

async function verificarBackup(
  sheets: Sheets,
  containerId: string,
  tabsHoy: Record<(typeof TABS)[number], string>,
  datosPorTab: Record<(typeof TABS)[number], string[][]>
) {
  const resultado: Record<string, { coincide: boolean; filasProd: number; filasBackup: number }> = {};
  await Promise.all(
    TABS.map(async (tab) => {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: containerId,
        range: tabsHoy[tab],
      });
      const backupValues = res.data.values ?? [];
      const prodValues = datosPorTab[tab];
      resultado[tabsHoy[tab]] = {
        coincide: JSON.stringify(prodValues) === JSON.stringify(backupValues),
        filasProd: prodValues.length,
        filasBackup: backupValues.length,
      };
    })
  );
  return resultado;
}

async function limpiarBackupsAntiguos(
  sheets: Sheets,
  containerId: string,
  existentesAntesDeHoy: ContainerSheet[],
  hoy: string
) {
  const hoyMs = Date.parse(hoy);

  const aBorrar = existentesAntesDeHoy.filter((s) => {
    const m = s.title.match(TAB_BACKUP_REGEX);
    if (!m) return false;
    const edadDias = (hoyMs - Date.parse(m[2])) / 86_400_000;
    return edadDias > RETENCION_DIAS;
  });

  if (aBorrar.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: containerId,
      requestBody: {
        requests: aBorrar.map((s) => ({ deleteSheet: { sheetId: s.sheetId } })),
      },
    });
  }

  return {
    revisados: existentesAntesDeHoy.length,
    borrados: aBorrar.length,
    nombres: aBorrar.map((s) => s.title),
  };
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
  const containerId = process.env.BACKUP_SHEET_ID;
  if (!containerId) {
    return NextResponse.json({ error: "BACKUP_SHEET_ID no configurado" }, { status: 500 });
  }

  const sheets = getSheetsClient();
  const hoy = hoyBogota();
  const tabsHoy = Object.fromEntries(TABS.map((tab) => [tab, `${tab}_${hoy}`])) as Record<
    (typeof TABS)[number],
    string
  >;

  // Solo lectura sobre prod — nunca values.update/append/batchUpdate contra prodSheetId.
  const datosPorTab = await leerTabsProd(sheets, prodSheetId);

  // Estado del contenedor ANTES de crear los tabs de hoy — se reutiliza para
  // decidir qué tabs viejos limpiar, orden: crear primero, limpiar después.
  const existentesAntes = await getContainerSheets(sheets, containerId);

  await crearTabsFaltantes(sheets, containerId, existentesAntes, tabsHoy);
  await escribirValores(sheets, containerId, tabsHoy, datosPorTab);

  const verificacion = await verificarBackup(sheets, containerId, tabsHoy, datosPorTab);
  const limpieza = await limpiarBackupsAntiguos(sheets, containerId, existentesAntes, hoy);

  return NextResponse.json({
    ok: true,
    backup: { contenedor: containerId, tabs: Object.values(tabsHoy) },
    verificacion,
    limpieza,
  });
}
