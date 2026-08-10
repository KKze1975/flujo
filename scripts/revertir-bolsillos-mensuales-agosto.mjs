// Revierte a pendiente las filas H2 de Mercado mensual y Frida (2026-08, PROD)
// que quedaron ejecutado de forma permanente por el bug de bolsillos mensuales
// (ver FIX-BOLSILLO-MENSUAL-CIERRE-01). Replica exactamente el patch de
// tipo:"revertir_ejecucion" de app/api/mes/[mes]/movimientos/[id]/route.ts.
// Uso: node scripts/revertir-bolsillos-mensuales-agosto.mjs
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

const FILAS_A_REVERTIR = [175, 210]; // Mercado mensual, Frida

async function main() {
  console.log("Spreadsheet (PROD):", spreadsheetId);
  const headersRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H2!A1:Y1" });
  const headers = headersRes.data.values[0];
  const idx = (name) => headers.indexOf(name);

  for (const fila of FILAS_A_REVERTIR) {
    const before = (await sheets.spreadsheets.values.get({ spreadsheetId, range: `H2!A${fila}:Y${fila}` })).data.values[0];
    console.log(`\n--- Fila ${fila} ANTES ---`, before[idx("nombre_snapshot")], "| estado:", before[idx("estado")]);

    const after = [...before];
    after[idx("monto_ejecutado")] = "";
    after[idx("desviacion")] = "";
    after[idx("estado")] = "pendiente";
    after[idx("ejecutor")] = "";
    after[idx("fuente_en_mano")] = "FALSE";
    after[idx("fuente_nequi")] = "FALSE";
    after[idx("fuente_camilo")] = "FALSE";
    after[idx("fuente_angie")] = "FALSE";
    after[idx("fecha_ejecucion")] = "";

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `H2!A${fila}:Y${fila}`,
      valueInputOption: "RAW",
      requestBody: { values: [after] },
    });

    const verify = (await sheets.spreadsheets.values.get({ spreadsheetId, range: `H2!A${fila}:Y${fila}` })).data.values[0];
    console.log(`--- Fila ${fila} DESPUÉS (leído de vuelta) ---`);
    headers.forEach((h, i) => console.log(`  ${h}: ${JSON.stringify(verify[i] ?? "")}`));
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
