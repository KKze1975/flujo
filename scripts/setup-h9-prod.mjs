// Crea la pestaña H9 (EventosLog) en PROD y escribe los headers — I-10
// Uso: node scripts/setup-h9-prod.mjs
// Mismos headers exactos que H9_HEADERS en lib/data/sheets.ts (ensureH9()).

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

const H9_HEADERS = ["timestamp", "tipo_evento", "entidad_id", "mes", "detalle", "id"];

async function main() {
  if (!spreadsheetId) {
    throw new Error("PROD_GOOGLE_SHEET_ID no está definido en .env.local");
  }

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetNames = meta.data.sheets?.map((s) => s.properties?.title) ?? [];

  if (!sheetNames.includes("H9")) {
    console.log("Creando pestaña H9 en PROD...");
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: "H9" } } }] },
    });
    console.log("✓ Pestaña H9 creada.");
  } else {
    console.log("Pestaña H9 ya existe en PROD — no se recrea.");
  }

  console.log("Escribiendo headers en H9!A1...");
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "H9!A1",
    valueInputOption: "RAW",
    requestBody: { values: [H9_HEADERS] },
  });
  console.log(`✓ Headers escritos (${H9_HEADERS.length} columnas): ${H9_HEADERS.join(", ")}`);

  const readBack = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "H9!A1:F1",
  });
  console.log("Verificación (lectura de vuelta, H9!A1:F1):", JSON.stringify(readBack.data.values));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
