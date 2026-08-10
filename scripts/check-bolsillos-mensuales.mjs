// Diagnóstico read-only: estado de Mercado mensual / Frida / Fondo transporte en H1+H2 PROD.
// No escribe nada. Uso: node scripts/check-bolsillos-mensuales.mjs
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
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const sheets = google.sheets({ version: "v4", auth });
const spreadsheetId = env.PROD_GOOGLE_SHEET_ID;

const NOMBRES = ["Mercado mensual", "Frida", "Fondo transporte"];

async function main() {
  console.log("Spreadsheet (PROD):", spreadsheetId);

  const h1res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H1!A1:L300" });
  const h1rows = h1res.data.values ?? [];
  const h1headers = h1rows[0];
  const col1 = (row, name) => row[h1headers.indexOf(name)] ?? "";
  console.log("\n--- H1 headers ---", h1headers);

  const conceptos = h1rows.slice(1).filter(r => NOMBRES.includes(col1(r, "nombre")));
  console.log("\n--- H1 conceptos encontrados ---");
  for (const r of conceptos) {
    console.log({
      id_concepto: col1(r, "id_concepto"),
      nombre: col1(r, "nombre"),
      tipo: col1(r, "tipo"),
      frecuencia: col1(r, "frecuencia"),
      estado_concepto: col1(r, "estado_concepto"),
    });
  }

  const h2res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H2!A1:V2000" });
  const h2rows = h2res.data.values ?? [];
  const h2headers = h2rows[0];
  const col2 = (row, name) => row[h2headers.indexOf(name)] ?? "";
  console.log("\n--- H2 headers ---", h2headers);

  const ids = new Set(conceptos.map(r => col1(r, "id_concepto")));
  const movs = h2rows.slice(1)
    .map((r, i) => ({ r, fila: i + 2 }))
    .filter(({ r }) => ids.has(col2(r, "id_concepto")) && col2(r, "mes") === "2026-08");
  console.log("\n--- H2 filas 2026-08 para esos conceptos (id_concepto match) ---");
  movs.forEach(({ r, fila }) => {
    console.log({
      fila,
      id_movimiento: col2(r, "id_movimiento"),
      id_concepto: col2(r, "id_concepto"),
      nombre_snapshot: col2(r, "nombre_snapshot"),
      semana: col2(r, "semana"),
      estado: col2(r, "estado"),
      monto_presupuestado: col2(r, "monto_presupuestado"),
      monto_ejecutado: col2(r, "monto_ejecutado"),
    });
  });
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
