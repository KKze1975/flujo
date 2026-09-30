// Crea la pestaña H11 (AportesEmprendimiento) en PROD y escribe los headers — I-10
// APORTES-SEMANALES-01A.
//
// Uso:
//   node scripts/setup-h11-prod.mjs           -> DRY-RUN (por defecto): solo LEE, no escribe nada.
//   node scripts/setup-h11-prod.mjs --apply   -> crea la pestaña (si falta) y escribe/completa headers.
//
// Mismos headers exactos que H11_HEADERS en lib/data/sheets.ts (ensureH11()).
// Guards: PROD_GOOGLE_SHEET_ID debe existir y ser distinto de GOOGLE_SHEET_ID (DEV).
// El Sheet ID nunca se imprime.

import { readFileSync } from "fs";
import { google } from "googleapis";

const APPLY = process.argv.includes("--apply");

const envPath = new URL("../.env.local", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const envRaw = readFileSync(envPath, "utf-8");
const env = {};
for (const line of envRaw.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^"(.*)"$/, "$1");
}

const H11_HEADERS = ["id_aporte", "mes", "semana", "monto", "fecha", "notas"];

async function main() {
  const spreadsheetId = env.PROD_GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    throw new Error("PROD_GOOGLE_SHEET_ID no está definido en .env.local");
  }
  if (spreadsheetId === env.GOOGLE_SHEET_ID) {
    throw new Error("PROD_GOOGLE_SHEET_ID coincide con GOOGLE_SHEET_ID (DEV) — abortando por seguridad.");
  }

  const auth = new google.auth.JWT({
    email: env.GOOGLE_CLIENT_EMAIL,
    key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: [
      APPLY
        ? "https://www.googleapis.com/auth/spreadsheets"
        : "https://www.googleapis.com/auth/spreadsheets.readonly",
    ],
  });
  const sheets = google.sheets({ version: "v4", auth });

  console.log(APPLY ? "Modo --apply: ESCRIBE en PROD." : "Modo DRY-RUN: solo lectura, no se escribe nada.");

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetNames = meta.data.sheets?.map((s) => s.properties?.title) ?? [];
  const existe = sheetNames.includes("H11");

  let headersActuales = [];
  if (existe) {
    const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H11!A1:F1" });
    headersActuales = (r.data.values ?? [[]])[0] ?? [];
  }
  const completo = H11_HEADERS.every((h, i) => headersActuales[i] === h);

  console.log(`Pestaña H11: ${existe ? "existe" : "NO existe"}. Headers completos: ${completo ? "sí" : "no"}.`);

  if (existe && completo) {
    console.log("Nada que hacer: H11 ya está lista en PROD.");
    return;
  }
  if (!APPLY) {
    if (!existe) console.log("[dry-run] Crearía la pestaña H11.");
    console.log(`[dry-run] Escribiría headers en H11!A1:F1: ${H11_HEADERS.join(", ")}`);
    console.log("Para aplicar: node scripts/setup-h11-prod.mjs --apply");
    return;
  }

  if (!existe) {
    console.log("Creando pestaña H11 en PROD...");
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: "H11" } } }] },
    });
    console.log("✓ Pestaña H11 creada.");
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "H11!A1:F1",
    valueInputOption: "RAW",
    requestBody: { values: [H11_HEADERS] },
  });
  console.log(`✓ Headers escritos (${H11_HEADERS.length} columnas): ${H11_HEADERS.join(", ")}`);

  const readBack = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H11!A1:F1" });
  console.log("Verificación (H11!A1:F1):", JSON.stringify(readBack.data.values));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
