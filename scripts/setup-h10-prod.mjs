// Crea la pestaña H10 (IdeasBacklog) en PROD y escribe los headers — I-10
// Uso: node scripts/setup-h10-prod.mjs
// Mismos headers exactos que H10_HEADERS en lib/data/sheets.ts (ensureH10()).

import { readFileSync } from "fs";
import { google } from "googleapis";

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

const auth = new google.auth.JWT({
  email: env.GOOGLE_CLIENT_EMAIL,
  key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });
const spreadsheetId = env.PROD_GOOGLE_SHEET_ID;

const H10_HEADERS = [
  "id", "timestamp", "propuesta_por", "descripcion", "caso_de_uso",
  "motivo_importancia", "triage_impacto", "triage_esfuerzo", "triage_alineacion",
  "estado", "prioridad_score",
];

async function main() {
  if (!spreadsheetId) {
    throw new Error("PROD_GOOGLE_SHEET_ID no está definido en .env.local");
  }
  if (spreadsheetId === env.GOOGLE_SHEET_ID) {
    throw new Error("PROD_GOOGLE_SHEET_ID coincide con GOOGLE_SHEET_ID (DEV) — abortando por seguridad.");
  }

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetNames = meta.data.sheets?.map((s) => s.properties?.title) ?? [];

  if (!sheetNames.includes("H10")) {
    console.log("Creando pestaña H10 en PROD...");
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: "H10" } } }] },
    });
    console.log("✓ Pestaña H10 creada.");
  } else {
    console.log("Pestaña H10 ya existe en PROD — no se recrea.");
  }

  console.log("Escribiendo headers en H10!A1...");
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "H10!A1",
    valueInputOption: "RAW",
    requestBody: { values: [H10_HEADERS] },
  });
  console.log(`✓ Headers escritos (${H10_HEADERS.length} columnas): ${H10_HEADERS.join(", ")}`);

  const readBack = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "H10!A1:K1",
  });
  console.log("Verificación (lectura de vuelta, H10!A1:K1):", JSON.stringify(readBack.data.values));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
