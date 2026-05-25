// Actualiza Entretenimiento en H1: frecuencia mensual → semanal, monto 1000000 → 250000
// Fila 36 — RECREACION_1748100035
// Uso: node scripts/update-h1-entretenimiento.mjs

import { readFileSync } from "fs";
import { google } from "googleapis";

const envPath = new URL("../.env.local", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const envRaw = readFileSync(envPath, "utf-8");
const env = {};
for (const line of envRaw.split("\n")) {
  const t = line.trim(); if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("="); if (i === -1) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^"(.*)"$/, "$1");
}

const auth = new google.auth.JWT({
  email: env.GOOGLE_CLIENT_EMAIL,
  key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });
const spreadsheetId = env.GOOGLE_SHEET_ID;

// Columnas H1: E=frecuencia (col 5), G=monto_referencia (col 7)

async function main() {
  console.log("Actualizando Entretenimiento (fila 36)...");
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        { range: "H1!E36", values: [["semanal"]] },
        { range: "H1!G36", values: [[250000]] },
      ],
    },
  });

  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H1!A36:L36" });
  const row = res.data.values?.[0] ?? [];
  console.log(`\nVerificación:`);
  console.log(`  nombre:    ${row[1]}`);
  console.log(`  frecuencia: ${row[4]}`);
  console.log(`  monto:     ${row[6]}`);
  console.log(`  estado:    ${row[9]}`);
  console.log("\n✓ Entretenimiento actualizado.");
}

main().catch((err) => { console.error("Error:", err.message); process.exit(1); });
