// Borra las filas de datos de H2 manteniendo la fila de headers (fila 1).
// Uso: node scripts/reset-h2.mjs

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
const spreadsheetId = env.GOOGLE_SHEET_ID;

async function main() {
  console.log("Limpiando filas de datos de H2 (headers en fila 1 intactos)...");
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: "H2!A2:Z1000",
  });
  console.log("✓ H2 vacía — listo para reinicializar.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
