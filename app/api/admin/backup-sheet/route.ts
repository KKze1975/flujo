import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export const maxDuration = 60;

const TZ = "America/Bogota";
const RETENCION_DIAS = 14;
const PREFIJO = "flujo-backup-";
const NOMBRE_REGEX = /^flujo-backup-(\d{4}-\d{2}-\d{2})$/;

function hoyBogota(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getAuthClients() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    // Scope 'drive' (no solo 'spreadsheets'): files.copy y permissions.create son
    // operaciones de Drive, no de Sheets. La restricción de "solo lectura sobre prod"
    // vive en el código (nunca se llama values.update/append/batchUpdate contra
    // PROD_GOOGLE_SHEET_ID), no en el scope de la credencial.
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return {
    drive: google.drive({ version: "v3", auth }),
    sheets: google.sheets({ version: "v4", auth }),
  };
}

type Drive = ReturnType<typeof getAuthClients>["drive"];
type Sheets = ReturnType<typeof getAuthClients>["sheets"];

async function limpiarBackupsAntiguos(drive: Drive, hoy: string) {
  const res = await drive.files.list({
    q: `name contains '${PREFIJO}' and trashed = false`,
    fields: "files(id, name)",
    pageSize: 100,
  });

  const files = res.data.files ?? [];
  const hoyMs = Date.parse(hoy);

  const aBorrar = files.filter((f) => {
    const m = f.name?.match(NOMBRE_REGEX);
    if (!m) return false;
    const edadDias = (hoyMs - Date.parse(m[1])) / 86_400_000;
    return edadDias > RETENCION_DIAS;
  });

  for (const f of aBorrar) {
    if (f.id) await drive.files.delete({ fileId: f.id });
  }

  return {
    revisados: files.length,
    borrados: aBorrar.length,
    nombres: aBorrar.map((f) => f.name),
  };
}

async function verificarContraProd(sheets: Sheets, prodSheetId: string, backupId: string) {
  const [prod, backup] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: prodSheetId, range: "H1!A:L" }),
    sheets.spreadsheets.values.get({ spreadsheetId: backupId, range: "H1!A:L" }),
  ]);

  const prodValues = prod.data.values ?? [];
  const backupValues = backup.data.values ?? [];
  const coincide = JSON.stringify(prodValues) === JSON.stringify(backupValues);

  return { coincide, filasProd: prodValues.length, filasBackup: backupValues.length };
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

  const { drive, sheets } = getAuthClients();
  const hoy = hoyBogota();
  const nombreBackup = `${PREFIJO}${hoy}`;

  // Copia del Sheet de producción a nivel Drive — no modifica el archivo origen.
  const copia = await drive.files.copy({
    fileId: prodSheetId,
    requestBody: { name: nombreBackup },
    fields: "id, name",
  });
  const backupId = copia.data.id;
  if (!backupId) {
    return NextResponse.json({ error: "La copia no devolvió un ID de archivo" }, { status: 500 });
  }

  const ownerEmail = process.env.BACKUP_OWNER_EMAIL;
  let compartidoCon: string | null = null;
  if (ownerEmail) {
    await drive.permissions.create({
      fileId: backupId,
      sendNotificationEmail: false,
      requestBody: { role: "reader", type: "user", emailAddress: ownerEmail },
    });
    compartidoCon = ownerEmail;
  }

  const verificacion = await verificarContraProd(sheets, prodSheetId, backupId);
  const limpieza = await limpiarBackupsAntiguos(drive, hoy);

  return NextResponse.json({
    ok: true,
    backup: { id: backupId, nombre: nombreBackup, compartidoCon },
    verificacion,
    limpieza,
  });
}
