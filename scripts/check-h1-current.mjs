// Lee H1 completo y muestra id, nombre, estado por fila
// Uso: node scripts/check-h1-current.mjs

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
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "H1!A1:L200",
  });

  const rows = res.data.values ?? [];
  console.log(`Total filas (con header): ${rows.length}`);
  console.log(`Total conceptos (sin header): ${rows.length - 1}\n`);

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const fila = i + 1;
    const id = row[0] ?? "";
    const nombre = row[1] ?? "";
    const estado = row[9] ?? "";
    console.log(`Fila ${fila.toString().padStart(2)} | ${estado.padEnd(8)} | ${nombre} (${id})`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
