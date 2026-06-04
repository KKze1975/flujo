/**
 * T45 — Migración tipo bolsillo → pago_fraccionado
 * Decisiones documentadas en ESTADO.md L936-938:
 *   - tipo "bolsillo" → "pago_fraccionado" en H1 y H2 tipo_snapshot
 *   - Excepción: "Celular Angie" → "fijo" (pago único mensual)
 * Idempotente: reejecutar no duplica ni destruye datos.
 */
import { readFileSync } from "fs";
import { google } from "googleapis";

// ── Credenciales ─────────────────────────────────────────────────────────────

function loadEnv() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^"(.*)"$/, "$1");
  }
  return env;
}

const env = loadEnv();
const SHEET_ID = env.GOOGLE_SHEET_ID;

const auth = new google.auth.JWT({
  email: env.GOOGLE_CLIENT_EMAIL,
  key: env.GOOGLE_PRIVATE_KEY.split("\\n").join("\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getRange(range) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range });
  return res.data.values ?? [];
}

async function setRange(range, values) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

// ── Paso A — Diagnóstico H1 ──────────────────────────────────────────────────

async function pasoA() {
  console.log("\n=== Paso A: Diagnóstico H1 — filas con tipo=bolsillo ===");
  const rows = await getRange("H1!A:L");
  if (rows.length < 2) { console.log("H1 vacía o solo headers."); return { rows, headers: [], tipoIdx: -1 }; }

  const [headers, ...data] = rows;
  const tipoIdx = headers.indexOf("tipo");
  const nombreIdx = headers.indexOf("nombre");
  if (tipoIdx === -1) throw new Error("Columna 'tipo' no encontrada en H1");

  const bolsillos = data.filter(r => r[tipoIdx] === "bolsillo");
  console.log(`Total filas H1: ${data.length} | Con tipo=bolsillo: ${bolsillos.length}`);
  bolsillos.forEach(r => console.log(`  → [${r[0]}] ${r[nombreIdx]} (tipo=${r[tipoIdx]})`));

  return { rows, headers, tipoIdx, nombreIdx };
}

// ── Paso B — Migrar H1 tipo ──────────────────────────────────────────────────

async function pasoB({ rows, headers, tipoIdx, nombreIdx }) {
  console.log("\n=== Paso B: Migrar H1 tipo bolsillo → pago_fraccionado / fijo ===");
  if (tipoIdx === -1) { console.log("Sin columna tipo — omitiendo."); return; }

  const [headerRow, ...data] = rows;
  let changed = 0;

  const updatedData = data.map(row => {
    if (row[tipoIdx] !== "bolsillo") return row;
    const updated = [...row];
    const nombre = row[nombreIdx] ?? "";
    updated[tipoIdx] = nombre === "Celular Angie" ? "fijo" : "pago_fraccionado";
    console.log(`  H1 [${row[0]}] "${nombre}": bolsillo → ${updated[tipoIdx]}`);
    changed++;
    return updated;
  });

  if (changed === 0) {
    console.log("Sin filas con tipo=bolsillo — H1 ya migrada.");
    return;
  }

  await setRange("H1!A1", [headerRow, ...updatedData]);
  console.log(`${changed} filas H1 actualizadas.`);
}

// ── Paso C — Migrar H2 tipo_snapshot ────────────────────────────────────────

async function pasoC() {
  console.log("\n=== Paso C: Migrar H2 tipo_snapshot bolsillo → pago_fraccionado / fijo ===");
  const rows = await getRange("H2!A:Y");
  if (rows.length < 2) { console.log("H2 vacía o solo headers."); return; }

  const [headers, ...data] = rows;
  const tipoIdx = headers.indexOf("tipo_snapshot");
  const nombreIdx = headers.indexOf("nombre_snapshot");
  if (tipoIdx === -1) throw new Error("Columna 'tipo_snapshot' no encontrada en H2");

  let changed = 0;
  const updatedData = data.map(row => {
    if (row[tipoIdx] !== "bolsillo") return row;
    const updated = [...row];
    const nombre = row[nombreIdx] ?? "";
    updated[tipoIdx] = nombre === "Celular Angie" ? "fijo" : "pago_fraccionado";
    console.log(`  H2 [${row[0]}] "${nombre}": bolsillo → ${updated[tipoIdx]}`);
    changed++;
    return updated;
  });

  if (changed === 0) {
    console.log("Sin filas con tipo_snapshot=bolsillo — H2 ya migrada.");
    return;
  }

  await setRange("H2!A1", [headers, ...updatedData]);
  console.log(`${changed} filas H2 actualizadas.`);
}

// ── Verificación DoD ─────────────────────────────────────────────────────────

async function verificarDoD() {
  console.log("\n=== Verificación DoD ===");

  // DoD 1: H1 sin filas con tipo=bolsillo
  const h1 = await getRange("H1!A:L");
  const h1Headers = h1[0] ?? [];
  const h1TipoIdx = h1Headers.indexOf("tipo");
  const h1Restantes = h1.slice(1).filter(r => r[h1TipoIdx] === "bolsillo");
  const dod1 = h1Restantes.length === 0;
  console.log(`DoD 1 H1 sin tipo=bolsillo: ${dod1 ? "✓" : "✗"} [restantes: ${h1Restantes.length}]`);

  // DoD 2: H1 Celular Angie tiene tipo=fijo
  const h1NombreIdx = h1Headers.indexOf("nombre");
  const celularAngie = h1.slice(1).find(r => r[h1NombreIdx] === "Celular Angie");
  const dod2 = celularAngie ? celularAngie[h1TipoIdx] === "fijo" : null;
  console.log(`DoD 2 H1 Celular Angie tipo=fijo: ${dod2 === null ? "N/A (no encontrada)" : dod2 ? "✓" : "✗"} [tipo=${celularAngie?.[h1TipoIdx] ?? "N/A"}]`);

  // DoD 3: H2 sin filas con tipo_snapshot=bolsillo
  const h2 = await getRange("H2!A:Y");
  const h2Headers = h2[0] ?? [];
  const h2TipoIdx = h2Headers.indexOf("tipo_snapshot");
  const h2Restantes = h2.slice(1).filter(r => r[h2TipoIdx] === "bolsillo");
  const dod3 = h2Restantes.length === 0;
  console.log(`DoD 3 H2 sin tipo_snapshot=bolsillo: ${dod3 ? "✓" : "✗"} [restantes: ${h2Restantes.length}]`);

  // DoD 4: H1 tiene filas con tipo=pago_fraccionado
  const h1PF = h1.slice(1).filter(r => r[h1TipoIdx] === "pago_fraccionado");
  const dod4 = h1PF.length > 0;
  console.log(`DoD 4 H1 tiene tipo=pago_fraccionado: ${dod4 ? "✓" : "✗"} [count: ${h1PF.length}]`);

  const passed = [dod1, dod3, dod4].every(Boolean) && dod2 !== false;
  console.log(`\nResumen: ${passed ? "TODOS los DoD verificables ✓" : "HAY DoDs fallidos ✗"}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== T45 Migración tipo bolsillo → pago_fraccionado ===");
  console.log(`Sheet ID: ${SHEET_ID}`);

  const h1State = await pasoA();
  await pasoB(h1State);
  await pasoC();
  await verificarDoD();

  console.log("\n=== Migración completa ===");
  console.log("Siguiente paso: actualizar VistaSemanal.tsx L629 — tipoSnapshot === \"bolsillo\" → \"pago_fraccionado\"");
}

main().catch(err => {
  console.error("ERROR:", err.message ?? err);
  process.exit(1);
});
