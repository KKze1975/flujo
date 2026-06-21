// BL-QA-06 — Seed Imprevistos en H1 y H2 del Sheet de dev
// Guard correcto: nombre=Imprevistos AND tipo=pago_fraccionado AND estado_concepto=activo
// Correcciones vs seed-imprevistos.mjs: frecuencia=semanal, H2 semana=S3
// Uso: node scripts/seed-imprevistos-v2.mjs

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
  "semanal",     // techo por semana (corregido de "mensual")
  "",
  "250000",
  "variable",
  "FALSE",
  "activo",
  "",
  "BL-QA-06: Gastos imprevistos — techo 250K/semana, no sugerido por Haiku",
];

// H2 row: 25 columns (id_movimiento … id_recarga_origen)
const h2Row = [
  movimientoId,
  conceptoId,
  "2026-06",
  "Imprevistos",
  "Compromisos Financieros",
  "pago_fraccionado",
  "S3",       // semana S3 (no variable)
  "250000",   // monto_presupuestado (techo semanal)
  "",         // monto_ejecutado
  "",         // desviacion
  "pendiente",
  "",         // ejecutor
  "FALSE",    // fuente_en_mano
  "FALSE",    // fuente_nequi
  "FALSE",    // fuente_camilo
  "FALSE",    // fuente_angie
  "",         // fecha_ejecucion
  "",         // razon_desviacion
  "",         // razon_postergacion
  "",         // comprobante_url
  "FALSE",    // pendiente_aprobacion
  "",         // notas
  "",         // monto_ejecutado_camilo
  "",         // monto_ejecutado_angie
  "",         // id_recarga_origen
];

async function main() {
  // P1 — Guard H1: busca Imprevistos activo tipo pago_fraccionado
  const h1Res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H1!A:L" });
  const h1Rows = h1Res.data.values ?? [];
  const h1Headers = h1Rows[0] ?? [];
  const nombreIdx  = h1Headers.indexOf("nombre");
  const tipoIdx    = h1Headers.indexOf("tipo");
  const estadoIdx  = h1Headers.indexOf("estado_concepto");

  const existingActivo = h1Rows.slice(1).find(r =>
    r[nombreIdx] === "Imprevistos" &&
    r[tipoIdx]   === "pago_fraccionado" &&
    r[estadoIdx] === "activo"
  );
  if (existingActivo) {
    console.log(`⚠ Imprevistos activo ya existe en H1: ${existingActivo[0]} — abortando H1.`);
  } else {
    console.log(`Insertando en H1: ${conceptoId}`);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "H1!A:L",
      valueInputOption: "RAW",
      requestBody: { values: [h1Row] },
    });
    console.log("✓ H1 Imprevistos creado.");
  }

  // Determinar el conceptoId real (puede ser uno ya existente o el nuevo)
  const h1ResPost = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H1!A:L" });
  const h1RowsPost = h1ResPost.data.values ?? [];
  const h1HeadersPost = h1RowsPost[0] ?? [];
  const nombreIdxPost  = h1HeadersPost.indexOf("nombre");
  const tipoIdxPost    = h1HeadersPost.indexOf("tipo");
  const estadoIdxPost  = h1HeadersPost.indexOf("estado_concepto");
  const idIdxPost      = h1HeadersPost.indexOf("id_concepto");

  const conceptoActivo = h1RowsPost.slice(1).find(r =>
    r[nombreIdxPost] === "Imprevistos" &&
    r[tipoIdxPost]   === "pago_fraccionado" &&
    r[estadoIdxPost] === "activo"
  );
  const realConceptoId = conceptoActivo?.[idIdxPost] ?? conceptoId;

  // P2 — Guard H2: busca MOV con ese conceptoId + S3 + 2026-06
  const h2Res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H2!A:Y" });
  const h2Rows = h2Res.data.values ?? [];
  const h2Headers = h2Rows[0] ?? [];
  const h2ConceptoIdx = h2Headers.indexOf("id_concepto");
  const h2SemanaIdx   = h2Headers.indexOf("semana");
  const h2MesIdx      = h2Headers.indexOf("mes");

  const existingMov = h2Rows.slice(1).find(r =>
    r[h2ConceptoIdx] === realConceptoId &&
    r[h2SemanaIdx]   === "S3" &&
    r[h2MesIdx]      === "2026-06"
  );
  if (existingMov) {
    console.log(`⚠ MOV S3 para Imprevistos ya existe: ${existingMov[0]} — abortando H2.`);
  } else {
    const h2RowFinal = [...h2Row];
    h2RowFinal[1] = realConceptoId; // usar el conceptoId real
    console.log(`Insertando en H2: ${movimientoId} (2026-06, S3, conceptoId=${realConceptoId})`);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "H2!A:Y",
      valueInputOption: "RAW",
      requestBody: { values: [h2RowFinal] },
    });
    console.log("✓ H2 Imprevistos S3/2026-06 creado.");
    console.log(`\n→ ConceptoId: ${realConceptoId}`);
    console.log("→ En producción: agregar manualmente en H1 y H2 antes del merge a main.");
  }
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });
