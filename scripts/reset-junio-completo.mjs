// Reset limpio de junio 2026 — borra datos sin reinicializar H2.
// Toca: H2 (solo clear), H3B (consumos), H4B (aportes Angie),
//        H4C (saldos iniciales), H5A (cierres), H5B (planes)
// NO toca: H1, H4A (ingresos Camilo), H6
// H2 queda vacía — la app la reinicializa al abrir el mes.
// Uso: node scripts/reset-junio-completo.mjs

import { readFileSync } from "fs";
import { google } from "googleapis";

const MES = "2026-06";

// ── Credenciales ──────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseRows(rawRows) {
  if (!rawRows || rawRows.length === 0) return { headers: [], rows: [] };
  const [headers, ...rows] = rawRows;
  return { headers, rows };
}

// Lee un rango, borra las filas de MES, reescribe las demás.
// Retorna la cantidad de filas borradas.
async function deleteJunioRows({ rangeRead, rangeClear, rangeWrite, label }) {
  let raw;
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: rangeRead });
    raw = res.data.values;
  } catch {
    console.log(`  ${label}: tab no existe — nada que borrar.`);
    return 0;
  }

  if (!raw || raw.length < 2) {
    console.log(`  ${label}: 0 filas — sin cambios.`);
    return 0;
  }

  const { headers, rows } = parseRows(raw);
  const mesI = headers.indexOf("mes");
  if (mesI === -1) {
    console.log(`  ${label}: columna "mes" no encontrada — revisar estructura.`);
    return 0;
  }

  const junioRows = rows.filter(r => (r[mesI] ?? "") === MES);
  const otherRows = rows.filter(r => (r[mesI] ?? "") !== MES && r[0]);

  if (junioRows.length === 0) {
    console.log(`  ${label}: 0 filas — sin cambios.`);
    return 0;
  }

  await sheets.spreadsheets.values.clear({ spreadsheetId, range: rangeClear });
  if (otherRows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: rangeWrite,
      valueInputOption: "RAW",
      requestBody: { values: otherRows },
    });
  }

  console.log(`  ${label}: borradas ${junioRows.length} fila(s); ${otherRows.length} de otros períodos conservadas.`);
  return junioRows.length;
}

// Verifica que no queden filas de MES en el rango.
async function verifyZeroJunio({ rangeRead, label }) {
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: rangeRead });
    const { headers, rows } = parseRows(res.data.values ?? []);
    const mesI = headers.indexOf("mes");
    if (mesI === -1) return;
    const remaining = rows.filter(r => (r[mesI] ?? "") === MES).length;
    if (remaining > 0) {
      console.log(`  ⚠️  ${label}: QUEDAN ${remaining} filas de junio — verificar manualmente.`);
    } else {
      console.log(`  ✓ ${label}: 0 filas de junio confirmadas.`);
    }
  } catch { /* vacía o no existe */ }
}

// ── 1. H2 — Solo borrar (sin reinicializar) ───────────────────────────────────

async function resetH2() {
  console.log(`\n── 1. H2 — Movimientos (solo clear) ────────────────────────`);

  let antes = 0;
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H2!A:V" });
    const { headers, rows } = parseRows(res.data.values ?? []);
    const mesI = headers.indexOf("mes");
    if (mesI !== -1) antes = rows.filter(r => (r[mesI] ?? "") === MES).length;
  } catch { /* vacía */ }

  if (antes === 0) {
    console.log(`  H2: 0 filas de junio — sin cambios.`);
    return 0;
  }

  await sheets.spreadsheets.values.clear({ spreadsheetId, range: "H2!A2:Z1000" });

  let despues = 0;
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H2!A:V" });
    const { headers, rows } = parseRows(res.data.values ?? []);
    const mesI = headers.indexOf("mes");
    if (mesI !== -1) despues = rows.filter(r => (r[mesI] ?? "") === MES).length;
  } catch { /* vacía */ }

  console.log(`  H2: borradas ${antes} fila(s); 0 filas post-clear.`);
  if (despues > 0) {
    console.log(`  ⚠️  QUEDAN ${despues} filas de junio en H2.`);
  } else {
    console.log(`  ✓ H2 vacía — lista para reinicializar desde la app.`);
  }
  return antes;
}

// ── 2. H3 — Consumos (Rango B; Rango A intacto) ──────────────────────────────

async function resetH3() {
  console.log(`\n── 2. H3 — Consumos ────────────────────────────────────────`);
  const borradas = await deleteJunioRows({
    rangeRead:  "H3!A:N",
    rangeClear: "H3!A2:N10000",
    rangeWrite: "H3!A2",
    label: "H3 consumos",
  });
  if (borradas > 0) await verifyZeroJunio({ rangeRead: "H3!A:N", label: "H3" });
  return borradas;
}

// ── 3. H4B — Aportes Angie ────────────────────────────────────────────────────

async function resetH4B() {
  console.log(`\n── 3. H4B — Aportes Angie ──────────────────────────────────`);
  const borradas = await deleteJunioRows({
    rangeRead:  "H4!I:N",
    rangeClear: "H4!I2:N10000",
    rangeWrite: "H4!I2",
    label: "H4B (aportes Angie)",
  });
  if (borradas > 0) await verifyZeroJunio({ rangeRead: "H4!I:N", label: "H4B" });
  return borradas;
}

// ── 4. H4C — Saldos iniciales ─────────────────────────────────────────────────

async function resetH4C() {
  console.log(`\n── 4. H4C — Saldos iniciales ───────────────────────────────`);
  const borradas = await deleteJunioRows({
    rangeRead:  "H4!P:T",
    rangeClear: "H4!P2:T10000",
    rangeWrite: "H4!P2",
    label: "H4C (saldos iniciales)",
  });
  if (borradas > 0) await verifyZeroJunio({ rangeRead: "H4!P:T", label: "H4C" });
  return borradas;
}

// ── 5. H5A — Cierres de semana ────────────────────────────────────────────────

async function resetH5A() {
  console.log(`\n── 5. H5A — Cierres de semana ──────────────────────────────`);
  const borradas = await deleteJunioRows({
    rangeRead:  "H5!A:N",
    rangeClear: "H5!A2:N10000",
    rangeWrite: "H5!A2",
    label: "H5A (cierres semana)",
  });
  if (borradas > 0) await verifyZeroJunio({ rangeRead: "H5!A:N", label: "H5A" });
  return borradas;
}

// ── 6. H5B — Planes semana siguiente ─────────────────────────────────────────

async function resetH5B() {
  console.log(`\n── 6. H5B — Planes semana siguiente ────────────────────────`);
  const borradas = await deleteJunioRows({
    rangeRead:  "H5B!A:I",
    rangeClear: "H5B!A2:I10000",
    rangeWrite: "H5B!A2",
    label: "H5B (planes semana siguiente)",
  });
  if (borradas > 0) await verifyZeroJunio({ rangeRead: "H5B!A:I", label: "H5B" });
  return borradas;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${"═".repeat(62)}`);
  console.log(`  RESET JUNIO 2026 — COMPLETO`);
  console.log(`  Borra mes="${MES}" en: H2 H3B H4B H4C H5A H5B`);
  console.log(`  NO toca: H1 · H4A (ingresos Camilo) · H6`);
  console.log(`  H2 queda vacía — reinicializar desde la app.`);
  console.log(`${"═".repeat(62)}`);

  const h2  = await resetH2();
  const h3  = await resetH3();
  const h4b = await resetH4B();
  const h4c = await resetH4C();
  const h5a = await resetH5A();
  const h5b = await resetH5B();

  console.log(`\n${"═".repeat(62)}`);
  console.log(`RESUMEN FINAL:`);
  console.log(`  H2   → ${h2}  fila(s) borradas  [vacía — pendiente reinit desde app]`);
  console.log(`  H3B  → ${h3}  fila(s) borradas  (consumos)`);
  console.log(`  H4B  → ${h4b} fila(s) borradas  (aportes Angie)`);
  console.log(`  H4C  → ${h4c} fila(s) borradas  (saldos iniciales)`);
  console.log(`  H5A  → ${h5a} fila(s) borradas  (cierres semana)`);
  console.log(`  H5B  → ${h5b} fila(s) borradas  (planes semana siguiente)`);
  console.log(`${"═".repeat(62)}\n`);
}

main().catch(err => { console.error("Error:", err.message); process.exit(1); });
