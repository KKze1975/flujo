// Limpia duplicados en H4C (columnas P:T) — mantiene solo la fila más reciente por mes+cuenta
// Uso: node scripts/cleanup-h4c.mjs

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
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H4!P:T" });
  const rows = (res.data.values ?? []);
  if (rows.length < 2) { console.log("H4C vacío — nada que limpiar."); return; }

  const [headers, ...dataRows] = rows;
  const idIdx  = headers.indexOf("id_saldo");
  const mesIdx = headers.indexOf("mes");
  const cuentaIdx = headers.indexOf("cuenta");

  console.log(`Filas de datos encontradas: ${dataRows.length}`);

  // timestamp del id: SALDO_{ts}_{cuenta}
  const tsFromId = (id) => Number((id ?? "").split("_")[1] ?? 0);

  // Agrupar por mes+cuenta, quedar con la más reciente
  const latest = new Map();
  for (const row of dataRows) {
    if (!row[idIdx]) continue;
    const key = `${row[mesIdx]}|${row[cuentaIdx]}`;
    const ts = tsFromId(row[idIdx]);
    if (!latest.has(key) || ts > tsFromId(latest.get(key)[idIdx])) {
      latest.set(key, row);
    }
  }

  const kept = Array.from(latest.values());
  console.log(`Filas a conservar: ${kept.length}`);
  console.log(`Filas a eliminar: ${dataRows.length - kept.length}`);

  if (dataRows.length === kept.length) {
    console.log("Sin duplicados — nada que limpiar."); return;
  }

  // Limpiar datos y reescribir solo las filas a conservar
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: "H4!P2:T10000" });
  if (kept.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "H4!P2",
      valueInputOption: "RAW",
      requestBody: { values: kept },
    });
  }

  console.log("\nResultado final:");
  for (const row of kept) {
    console.log(`  ${row[mesIdx]} | ${row[cuentaIdx]} | ${row[headers.indexOf("saldo_inicial")]} | ${row[headers.indexOf("fecha_confirmacion")]}`);
  }
  console.log("\n✓ H4C limpio — sin duplicados.");
}

main().catch((err) => { console.error("Error:", err.message); process.exit(1); });
