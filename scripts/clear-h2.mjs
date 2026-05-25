// Limpia filas de datos de H2 manteniendo los headers (fila 1)
// Uso: node scripts/clear-h2.mjs

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
  // Contar filas antes de limpiar
  const antes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "H2!A:A",
  });
  const totalAntes = (antes.data.values ?? []).length;
  console.log(`Filas en H2 antes (incluyendo header): ${totalAntes}`);
  console.log(`Movimientos a borrar: ${totalAntes - 1}`);

  // Limpiar filas de datos — mantiene fila 1 (headers)
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: "H2!A2:V10000",
  });

  // Verificar que solo queda el header
  const despues = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "H2!A:A",
  });
  const totalDespues = (despues.data.values ?? []).length;
  console.log(`\nFilas en H2 después: ${totalDespues}`);

  if (totalDespues === 1) {
    console.log("✓ H2 limpia — solo queda header. Lista para reinicializar.");
  } else {
    console.error(`✗ H2 tiene ${totalDespues} filas — algo no se limpió bien.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
