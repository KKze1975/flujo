// OBS-3 — Crea concepto "Imprevistos" en H1 y movimiento junio 2026 en H2 (dev Sheet)
// Uso: node scripts/seed-imprevistos.mjs

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

const ts = Date.now();
const conceptoId = `COMPROMISOS_FINANCIEROS_${ts}`;
const movimientoId = `MOV_${ts + 1}`;

// H1 row: id_concepto | nombre | categoria | tipo | frecuencia |
//         mes_activo_bimestral | monto_referencia | semana_default |
//         requiere_aprobacion | estado_concepto | fecha_retiro | notas
const h1Row = [
  conceptoId,
  "Imprevistos",
  "Compromisos Financieros",
  "pago_fraccionado",
  "mensual",
  "",
  "250000",
  "variable",
  "FALSE",
  "activo",
  "",
  "OBS-3: Gastos imprevistos — techo 250K, no sugerido por Haiku",
];

// H2 row: 25 columns (id_movimiento … id_recarga_origen)
const h2Row = [
  movimientoId,
  conceptoId,
  "2026-06",
  "Imprevistos",
  "Compromisos Financieros",
  "pago_fraccionado",
  "",        // semana (variable)
  "250000",  // monto_presupuestado
  "",        // monto_ejecutado
  "",        // desviacion
  "pendiente",
  "",        // ejecutor
  "FALSE",   // fuente_en_mano
  "FALSE",   // fuente_nequi
  "FALSE",   // fuente_camilo
  "FALSE",   // fuente_angie
  "",        // fecha_ejecucion
  "",        // razon_desviacion
  "",        // razon_postergacion
  "",        // comprobante_url
  "FALSE",   // pendiente_aprobacion
  "",        // notas
  "",        // monto_ejecutado_camilo
  "",        // monto_ejecutado_angie
  "",        // id_recarga_origen
];

async function main() {
  // Check for existing Imprevistos in H1
  const h1Res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H1!A:L" });
  const h1Rows = (h1Res.data.values ?? []);
  const headers = h1Rows[0] ?? [];
  const nombreIdx = headers.indexOf("nombre");
  const existing = h1Rows.slice(1).find(r => r[nombreIdx] === "Imprevistos");
  if (existing) {
    console.log(`⚠ Imprevistos ya existe en H1: ${existing[0]} — abortando.`);
    return;
  }

  console.log(`Insertando en H1: ${conceptoId}`);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "H1!A:L",
    valueInputOption: "RAW",
    requestBody: { values: [h1Row] },
  });
  console.log("✓ H1 Imprevistos creado.");

  console.log(`Insertando en H2: ${movimientoId} (2026-06)`);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "H2!A:Y",
    valueInputOption: "RAW",
    requestBody: { values: [h2Row] },
  });
  console.log("✓ H2 Imprevistos junio 2026 creado.");
  console.log(`\n→ Anota el conceptoId: ${conceptoId}`);
  console.log("→ En producción: agregar manualmente antes del merge a main.");
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });
