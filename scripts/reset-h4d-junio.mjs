// Script one-shot: limpia recargas Angie (H4D) de junio 2026.
// Uso: node scripts/reset-h4d-junio.mjs

import { readFileSync } from "fs";
import { google } from "googleapis";

const MES = "2026-06";

const envPath = new URL("../.env.local", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const envRaw  = readFileSync(envPath, "utf-8");
const env     = {};
for (const line of envRaw.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const idx = t.indexOf("=");
  if (idx === -1) continue;
  env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim().replace(/^"(.*)"$/, "$1");
}

const auth = new google.auth.JWT({
  email: env.GOOGLE_CLIENT_EMAIL,
  key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets        = google.sheets({ version: "v4", auth });
const spreadsheetId = env.GOOGLE_SHEET_ID;

const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H4!V:AC" });
const raw = res.data.values ?? [];

if (raw.length < 2) {
  console.log("H4D: 0 filas — sin cambios.");
  process.exit(0);
}

const [headers, ...rows] = raw;
const mesI  = headers.indexOf("mes");
const junio = rows.filter(r => (r[mesI] ?? "") === MES);
const otros  = rows.filter(r => (r[mesI] ?? "") !== MES && r[0]);

if (junio.length === 0) {
  console.log("H4D: 0 filas de junio — sin cambios.");
  process.exit(0);
}

await sheets.spreadsheets.values.clear({ spreadsheetId, range: "H4!V2:AC10000" });

if (otros.length > 0) {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "H4!V2",
    valueInputOption: "RAW",
    requestBody: { values: otros },
  });
}

// Verificar
const res2 = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H4!V:AC" });
const [h2, ...rows2] = res2.data.values ?? [];
const mesI2 = (h2 ?? []).indexOf("mes");
const restantes = rows2.filter(r => (r[mesI2] ?? "") === MES).length;

console.log(`H4D: borradas ${junio.length} fila(s); ${otros.length} de otros períodos conservadas.`);
console.log(restantes === 0
  ? "✓ H4D: 0 filas de junio confirmadas."
  : `⚠️  H4D: QUEDAN ${restantes} filas de junio.`);
