// T44: limpia datos RECARGA_ANG en rango H4C y ghost rows en H4D, corrige header V1
// Uso: node scripts/fix-h4-spillover.mjs

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

const H4C_HEADERS = ["id_saldo","mes","cuenta","saldo_inicial","fecha_confirmacion","incluye_remanente","id_cierre_origen"];

async function main() {
  console.log("=== Estado antes del fix ===\n");

  const v1Res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H4!V1" });
  console.log(`H4!V1 actual: "${v1Res.data.values?.[0]?.[0] ?? "(vacío)"}"`);

  const p11Res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H4!P11:V13" });
  const p11Rows = (p11Res.data.values ?? []).filter((r) => r.some((c) => c));
  console.log(`H4!P11:V13 filas con contenido: ${p11Rows.length}`);
  p11Rows.forEach((r, i) => console.log(`  fila ${11 + i}: ${r.join(" | ")}`));

  const x2Res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H4!X2:AE6" });
  const x2Rows = (x2Res.data.values ?? []).filter((r) => r.some((c) => c));
  console.log(`H4!X2:AE6 filas con contenido: ${x2Rows.length}`);
  x2Rows.forEach((r, i) => console.log(`  fila ${2 + i}: ${r.join(" | ")}`));

  console.log("\n=== Aplicando fixes ===\n");

  // 1. Corregir headers H4C (P1:V1) — incluye V1 = id_cierre_origen
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "H4!P1:V1",
    valueInputOption: "RAW",
    requestBody: { values: [H4C_HEADERS] },
  });
  console.log("✓ H4!P1:V1 headers escritos");

  // 2. Limpiar spillover de recargas en rango H4C
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: "H4!P11:V13" });
  console.log("✓ H4!P11:V13 limpiado");

  // 3. Limpiar ghost rows en rango H4D
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: "H4!X2:AE6" });
  console.log("✓ H4!X2:AE6 limpiado");

  console.log("\n=== Verificación post-fix ===\n");

  const v1After = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H4!V1" });
  const v1Val = v1After.data.values?.[0]?.[0];
  console.log(`H4!V1: "${v1Val}" ${v1Val === "id_cierre_origen" ? "✓" : "✗"}`);

  const p11After = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H4!P11:V13" });
  const p11Empty = (p11After.data.values ?? []).filter((r) => r.some((c) => c)).length === 0;
  console.log(`H4!P11:V13 vacío: ${p11Empty ? "✓" : "✗"}`);

  const x2After = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H4!X2:AE6" });
  const x2Empty = (x2After.data.values ?? []).filter((r) => r.some((c) => c)).length === 0;
  console.log(`H4!X2:AE6 vacío: ${x2Empty ? "✓" : "✗"}`);

  if (v1Val === "id_cierre_origen" && p11Empty && x2Empty) {
    console.log("\n✅ Fix completo — todos los checks OK");
  } else {
    console.error("\n❌ Algún check falló — revisar manualmente");
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
