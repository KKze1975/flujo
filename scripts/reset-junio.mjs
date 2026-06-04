// Reset de datos de junio 2026 en H2, H3, H4, H5/H5B.
// Borra filas de "2026-06" y reinicializa H2 desde H1.
// No toca mayo (2026-05) ni ninguna otra hoja (H1, H6).
// Uso: node scripts/reset-junio.mjs

import { readFileSync } from "fs";
import { google } from "googleapis";

const MES       = "2026-06";
const MES_PREVIO = "2026-05";

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

function colVal(row, headers, name) {
  return row[headers.indexOf(name)] ?? "";
}

// Borra filas de MES en un rango de columnas; conserva otras filas.
// `rangeRead` es el rango completo del bloque (incluyendo fila 1 de headers).
// `rangeClear` es el rango de datos (sin fila 1).
// `rangeWrite` es donde empieza la reescritura de los datos restantes.
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
    console.log(`  ${label}: sin datos — nada que borrar.`);
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
    console.log(`  ${label}: sin filas de junio.`);
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

  console.log(`  ${label}: borradas ${junioRows.length} fila(s) de junio; ${otherRows.length} de otros meses conservadas.`);
  return junioRows.length;
}

// ── Lógica de inicialización (replica POST /api/mes/[mes]/iniciar) ─────────────

const MESES_NOMBRES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function mesNombre(mes) {
  const month = parseInt(mes.split("-")[1], 10);
  return MESES_NOMBRES[month - 1] ?? "";
}

function conceptoActivoEnMes(row, headers, mes) {
  if (colVal(row, headers, "estado_concepto") !== "activo") return false;
  if (colVal(row, headers, "frecuencia") !== "bimestral") return true;
  const mesAct = colVal(row, headers, "mes_activo_bimestral");
  if (!mesAct) return false;
  return mesAct.split(",").map(m => m.trim()).includes(mesNombre(mes));
}

function movRow(id, { conceptoId, nombreSnapshot, categoriaSnapshot, tipoSnapshot, semana, montoPresupuestado }) {
  return [
    id, conceptoId, MES, nombreSnapshot, categoriaSnapshot, tipoSnapshot,
    semana ?? "",
    montoPresupuestado,
    "",       // monto_ejecutado
    "",       // desviacion
    "pendiente",
    "",       // ejecutor
    "FALSE",  // fuente_en_mano
    "FALSE",  // fuente_nequi
    "FALSE",  // fuente_camilo
    "FALSE",  // fuente_angie
    "",       // fecha_ejecucion
    "",       // razon_desviacion
    "",       // razon_postergacion
    "",       // comprobante_url
    "FALSE",  // pendiente_aprobacion
    "",       // notas
  ];
}

// ── 1. H2 — Borrar junio y reinicializar ─────────────────────────────────────

async function resetH2() {
  console.log(`\n── 1. H2 — Movimientos ──────────────────────────────────────`);

  // Leer H2 completo
  const h2Res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H2!A:V" });
  const { headers: h2H, rows: h2Rows } = parseRows(h2Res.data.values);
  const mesI = h2H.indexOf("mes");
  const estI = h2H.indexOf("estado");

  const junioRows  = h2Rows.filter(r => (r[mesI] ?? "") === MES);
  const otherRows  = h2Rows.filter(r => (r[mesI] ?? "") !== MES && r[0]);
  const mayoRows   = h2Rows.filter(r => (r[mesI] ?? "") === MES_PREVIO);

  console.log(`  Filas de junio actuales:              ${junioRows.length}`);
  console.log(`  Filas de otros meses (se conservan):  ${otherRows.length}`);

  // Leer H1 conceptos
  const h1Res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H1!A:L" });
  const { headers: h1H, rows: h1Rows } = parseRows(h1Res.data.values);
  const conceptosActivos = h1Rows.filter(r => r[0] && conceptoActivoEnMes(r, h1H, MES));
  console.log(`  Conceptos activos en H1 para junio:   ${conceptosActivos.length}`);

  // Carryover de mayo
  const carryover = mayoRows.filter(r => colVal(r, h2H, "estado") === "pospuesto_mes_siguiente");
  console.log(`  Carryover de mayo (pospuesto_mes_sig): ${carryover.length}`);

  // Generar filas nuevas (misma lógica que iniciar/route.ts)
  const SEMANAS = ["S1", "S2", "S3", "S4"];
  const base = Date.now();
  let ctr = 0;
  const newRows = [];

  for (const cr of conceptosActivos) {
    const frecuencia     = colVal(cr, h1H, "frecuencia");
    const semanaDefault  = colVal(cr, h1H, "semana_default");
    const concepto = {
      conceptoId:          colVal(cr, h1H, "id_concepto"),
      nombreSnapshot:      colVal(cr, h1H, "nombre"),
      categoriaSnapshot:   colVal(cr, h1H, "categoria"),
      tipoSnapshot:        colVal(cr, h1H, "tipo"),
      montoPresupuestado:  colVal(cr, h1H, "monto_referencia"),
    };
    if (frecuencia === "semanal") {
      for (const s of SEMANAS) {
        newRows.push(movRow(`MOV_${base + ctr++}`, { ...concepto, semana: s }));
      }
    } else {
      const semana = semanaDefault === "variable" ? null : semanaDefault || null;
      newRows.push(movRow(`MOV_${base + ctr++}`, { ...concepto, semana }));
    }
  }

  for (const mr of carryover) {
    newRows.push(movRow(`MOV_${base + ctr++}`, {
      conceptoId:         colVal(mr, h2H, "id_concepto"),
      nombreSnapshot:     colVal(mr, h2H, "nombre_snapshot"),
      categoriaSnapshot:  colVal(mr, h2H, "categoria_snapshot"),
      tipoSnapshot:       colVal(mr, h2H, "tipo_snapshot"),
      semana:             colVal(mr, h2H, "semana") || null,
      montoPresupuestado: colVal(mr, h2H, "monto_presupuestado"),
    }));
  }

  console.log(`  Nuevas filas de junio a insertar:     ${newRows.length}`);

  // Borrar filas de junio y reescribir otros meses
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: "H2!A2:V10000" });
  if (otherRows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "H2!A2",
      valueInputOption: "RAW",
      requestBody: { values: otherRows },
    });
  }

  // Insertar nuevas filas de junio
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "H2!A:V",
    valueInputOption: "RAW",
    requestBody: { values: newRows },
  });

  // Verificar
  const vRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H2!A:V" });
  const { headers: vH, rows: vRows } = parseRows(vRes.data.values);
  const vMesI = vH.indexOf("mes");
  const junioVerify = vRows.filter(r => (r[vMesI] ?? "") === MES);

  console.log(`\n  ✓ Borradas:   ${junioRows.length} filas de junio`);
  console.log(`  ✓ Recreadas:  ${newRows.length} filas de junio en estado pendiente`);
  console.log(`  ✓ Verificación: ${junioVerify.length} filas de junio en H2 ${junioVerify.length === 62 ? "✓ (62 esperadas)" : `⚠️  (se esperaban 62)`}`);

  return { borradas: junioRows.length, creadas: newRows.length, verificadas: junioVerify.length };
}

// ── 2. H3 — Consumos ─────────────────────────────────────────────────────────

async function resetH3() {
  console.log(`\n── 2. H3 — Consumos ─────────────────────────────────────────`);
  const borradas = await deleteJunioRows({
    rangeRead:  "H3!A:N",
    rangeClear: "H3!A2:N10000",
    rangeWrite: "H3!A2",
    label: "H3",
  });

  // Verificar que no queden filas de junio
  let remaining = 0;
  try {
    const vRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H3!A:N" });
    const { headers: vH, rows: vR } = parseRows(vRes.data.values ?? []);
    const vMesI = vH.indexOf("mes");
    remaining = vR.filter(r => (r[vMesI] ?? "") === MES).length;
  } catch { /* H3 vacía */ }

  if (remaining > 0) {
    console.log(`  ⚠️  ADVERTENCIA: quedan ${remaining} filas de junio en H3`);
  } else if (borradas > 0) {
    console.log(`  ✓ Sin filas de junio en H3`);
  }

  return { borradas };
}

// ── 3. H4 — Datos ────────────────────────────────────────────────────────────

async function resetH4() {
  console.log(`\n── 3. H4 — Datos ────────────────────────────────────────────`);
  const h4a = await deleteJunioRows({
    rangeRead:  "H4!A:G",
    rangeClear: "H4!A2:G10000",
    rangeWrite: "H4!A2",
    label: "H4A (Ingresos Camilo)",
  });
  const h4b = await deleteJunioRows({
    rangeRead:  "H4!I:N",
    rangeClear: "H4!I2:N10000",
    rangeWrite: "H4!I2",
    label: "H4B (Aportes Angie)",
  });
  const h4c = await deleteJunioRows({
    rangeRead:  "H4!P:T",
    rangeClear: "H4!P2:T10000",
    rangeWrite: "H4!P2",
    label: "H4C (Saldos iniciales)",
  });
  return { h4a, h4b, h4c };
}

// ── 4. H5 — Cierres y planes ──────────────────────────────────────────────────

async function resetH5() {
  console.log(`\n── 4. H5 — Cierres y planes ─────────────────────────────────`);
  const h5a = await deleteJunioRows({
    rangeRead:  "H5!A:N",
    rangeClear: "H5!A2:N10000",
    rangeWrite: "H5!A2",
    label: "H5 Rango A (cierres semana)",
  });
  const h5b = await deleteJunioRows({
    rangeRead:  "H5B!A:I",
    rangeClear: "H5B!A2:I10000",
    rangeWrite: "H5B!A2",
    label: "H5 Rango B (planes semana siguiente)",
  });
  return { h5a, h5b };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${"═".repeat(62)}`);
  console.log(`  RESET JUNIO 2026`);
  console.log(`  Toca: H2, H3, H4, H5, H5B — solo mes="${MES}"`);
  console.log(`  Mayo (${MES_PREVIO}) y demás meses quedan intactos.`);
  console.log(`${"═".repeat(62)}`);

  const h2 = await resetH2();
  const h3 = await resetH3();
  const h4 = await resetH4();
  const h5 = await resetH5();

  console.log(`\n${"═".repeat(62)}`);
  console.log(`RESUMEN FINAL:`);
  console.log(`  H2  → borradas ${h2.borradas} | recreadas ${h2.creadas} | verificadas ${h2.verificadas} filas`);
  console.log(`  H3  → borradas ${h3.borradas} fila(s)`);
  console.log(`  H4A → borradas ${h4.h4a} fila(s) (ingresos Camilo)`);
  console.log(`  H4B → borradas ${h4.h4b} fila(s) (aportes Angie)`);
  console.log(`  H4C → borradas ${h4.h4c} fila(s) (saldos iniciales)`);
  console.log(`  H5A → borradas ${h5.h5a} fila(s) (cierres semana)`);
  console.log(`  H5B → borradas ${h5.h5b} fila(s) (planes semana siguiente)`);
  console.log(`${"═".repeat(62)}\n`);
}

main().catch(err => { console.error("Error:", err.message); process.exit(1); });
