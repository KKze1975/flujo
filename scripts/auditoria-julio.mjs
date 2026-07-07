// Auditoría de totales — Julio 2026
// Uso: node scripts/auditoria-julio.mjs

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
// Auditoría usa siempre el Sheet de producción
const spreadsheetId = "1GOMhxYw_f7Zl-GTVNtxAs9218x4vKxzg3LGRyveyr7A";

const MES = "2026-07";
const SEMANAS = ["S1", "S2", "S3", "S4"];

function cop(n) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}

async function main() {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`AUDITORÍA DE TOTALES — ${MES}`);
  console.log(`${"=".repeat(70)}\n`);

  // ── Paso 1: Leer H1 (conceptos) ───────────────────────────────────────────
  const h1Res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H1!A:L" });
  const h1Rows = h1Res.data.values ?? [];
  const [h1Headers, ...h1Data] = h1Rows;
  const h1Col = (row, name) => row[h1Headers.indexOf(name)] ?? "";
  const conceptos = h1Data.filter(r => r.length > 0 && r[0]).map(r => ({
    id: h1Col(r, "id_concepto"),
    nombre: h1Col(r, "nombre"),
    categoria: h1Col(r, "categoria"),
    tipo: h1Col(r, "tipo"),
    frecuencia: h1Col(r, "frecuencia"),
    mesActivoBimestral: h1Col(r, "mes_activo_bimestral"),
    monto: Number(h1Col(r, "monto_referencia")) || 0,
    semanaDefault: h1Col(r, "semana_default"),
    estado: h1Col(r, "estado_concepto"),
  }));
  console.log(`H1 — Total filas leídas: ${conceptos.length}`);

  // ── Paso 2: Leer H2 (movimientos julio) ──────────────────────────────────
  const h2Res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H2!A:Y" });
  const h2Rows = h2Res.data.values ?? [];
  const [h2Headers, ...h2Data] = h2Rows;
  const h2Col = (row, name) => row[h2Headers.indexOf(name)] ?? "";
  const todosMovs = h2Data.filter(r => r.length > 0 && r[0]);
  const movsJulio = todosMovs.filter(r => h2Col(r, "mes") === MES).map(r => ({
    id: h2Col(r, "id_movimiento"),
    conceptoId: h2Col(r, "id_concepto"),
    nombre: h2Col(r, "nombre_snapshot"),
    semana: h2Col(r, "semana"),
    montoPresupuestado: Number(h2Col(r, "monto_presupuestado")) || 0,
    estado: h2Col(r, "estado"),
  }));
  console.log(`H2 — Total filas (todos los meses): ${todosMovs.length}`);
  console.log(`H2 — Filas julio (${MES}): ${movsJulio.length}`);

  // ── Paso 3: Leer H4A (ingreso Camilo julio) ──────────────────────────────
  const h4aRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H4!A:G" });
  const h4aRows = h4aRes.data.values ?? [];
  const [h4aHeaders, ...h4aData] = h4aRows;
  const h4aCol = (row, name) => row[h4aHeaders.indexOf(name)] ?? "";
  const ingresoCamilo = h4aData.filter(r => r.length > 0 && r[0] && h4aCol(r, "mes") === MES).map(r => ({
    id: h4aCol(r, "id_ingreso"),
    mes: h4aCol(r, "mes"),
    montoCop: Number(h4aCol(r, "monto_cop")) || 0,
    estado: h4aCol(r, "estado"),
  }));
  console.log(`H4A — Filas ingreso Camilo (${MES}): ${ingresoCamilo.length}`);

  // ── Paso 4: Leer H4B (aportes Angie julio) ───────────────────────────────
  const h4bRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H4!I:N" });
  const h4bRows = h4bRes.data.values ?? [];
  const [h4bHeaders, ...h4bData] = h4bRows;
  const h4bCol = (row, name) => row[h4bHeaders.indexOf(name)] ?? "";
  const aportesAngie = h4bData.filter(r => r.length > 0 && r[0] && h4bCol(r, "mes") === MES).map(r => ({
    id: h4bCol(r, "id_ingreso"),
    mes: h4bCol(r, "mes"),
    semana: h4bCol(r, "semana"),
    monto: Number(h4bCol(r, "monto")) || 0,
  }));
  console.log(`H4B — Filas aportes Angie (${MES}): ${aportesAngie.length}`);

  console.log(`\n${"─".repeat(70)}`);
  console.log("DATOS CRUDOS CONFIRMADOS (sin truncamiento)");
  console.log(`${"─".repeat(70)}\n`);

  // Ingreso Camilo
  console.log("► Ingreso Camilo Julio 2026:");
  for (const ic of ingresoCamilo) {
    console.log(`  ${ic.id} | montoCop=${cop(ic.montoCop)} | estado=${ic.estado}`);
  }
  const ingresoCamiloTotal = ingresoCamilo.reduce((s, i) => s + i.montoCop, 0);
  console.log(`  TOTAL: ${cop(ingresoCamiloTotal)}`);

  // Aportes Angie
  console.log("\n► Aportes Angie Julio 2026:");
  for (const a of aportesAngie) {
    console.log(`  ${a.id} | semana=${a.semana} | monto=${cop(a.monto)}`);
  }
  const aportesAngieTotal = aportesAngie.reduce((s, a) => s + a.monto, 0);
  console.log(`  TOTAL: ${cop(aportesAngieTotal)}`);

  // H2 Julio — desglose
  console.log("\n► H2 Julio — desglose por estado:");
  const porEstado = {};
  for (const m of movsJulio) {
    porEstado[m.estado] = (porEstado[m.estado] || 0) + 1;
  }
  for (const [est, cnt] of Object.entries(porEstado)) {
    console.log(`  ${est}: ${cnt} filas`);
  }

  console.log("\n► H2 Julio — listado completo:");
  for (const m of movsJulio) {
    console.log(`  ${m.nombre.padEnd(35)} | semana=${m.semana.padEnd(2)} | monto_presupuestado=${String(m.montoPresupuestado).padStart(9)} | estado=${m.estado}`);
  }

  console.log(`\n${"─".repeat(70)}`);
  console.log("RECÁLCULO INDEPENDIENTE");
  console.log(`${"─".repeat(70)}\n`);

  // ── Disponible mensual ─────────────────────────────────────────────────────
  const disponibleMensual = ingresoCamiloTotal + aportesAngieTotal;
  console.log(`Disponible mensual = Ingreso Camilo + Aportes Angie`);
  console.log(`  = ${cop(ingresoCamiloTotal)} + ${cop(aportesAngieTotal)} = ${cop(disponibleMensual)}`);

  // ── Comprometido mensual — desde H1 ───────────────────────────────────────
  // Replica conceptosActivosMes: activos, excluyendo si TODOS sus movs en julio son no_aplica o pospuesto_mes_siguiente
  const MESES_ES = {
    "01": "enero", "02": "febrero", "03": "marzo", "04": "abril",
    "05": "mayo", "06": "junio", "07": "julio", "08": "agosto",
    "09": "septiembre", "10": "octubre", "11": "noviembre", "12": "diciembre",
  };
  const mesNombre = MESES_ES[MES.split("-")[1]] ?? "";

  // Construir mapa conceptoId → movimientos julio
  const movsPorConcepto = {};
  for (const m of movsJulio) {
    if (!movsPorConcepto[m.conceptoId]) movsPorConcepto[m.conceptoId] = [];
    movsPorConcepto[m.conceptoId].push(m);
  }

  const conceptosActivosMes = conceptos.filter(c => {
    if (c.estado !== "activo") return false;
    const movsC = movsPorConcepto[c.id] ?? [];
    if (movsC.length > 0 && movsC.every(m => m.estado === "no_aplica" || m.estado === "pospuesto_mes_siguiente")) return false;
    if (c.frecuencia === "bimestral" && c.mesActivoBimestral) {
      return c.mesActivoBimestral.split(",").map(s => s.trim().toLowerCase()).includes(mesNombre);
    }
    return true;
  });

  console.log(`\nConceptos activos para ${MES}: ${conceptosActivosMes.length}`);
  console.log("(Excluidos si en H2-julio TODOS sus movimientos son no_aplica o pospuesto)\n");

  // Desglose de excluidos
  const excluidos = conceptos.filter(c => {
    if (c.estado !== "activo") return false;
    const movsC = movsPorConcepto[c.id] ?? [];
    return movsC.length > 0 && movsC.every(m => m.estado === "no_aplica" || m.estado === "pospuesto_mes_siguiente");
  });
  if (excluidos.length > 0) {
    console.log("  Conceptos excluidos por no_aplica/pospuesto en H2-julio:");
    for (const c of excluidos) console.log(`    - ${c.nombre} (${c.id})`);
    console.log();
  }

  // Calcular totalComprometido
  let totalComprometido = 0;
  const detalleComprometido = [];
  for (const c of conceptosActivosMes) {
    const factor = c.frecuencia === "semanal" ? 4 : 1;
    const contrib = c.monto * factor;
    totalComprometido += contrib;
    detalleComprometido.push({ nombre: c.nombre, frecuencia: c.frecuencia, monto: c.monto, factor, contrib });
  }

  console.log("► Desglose comprometido mensual (H1 monto × factor):");
  for (const d of detalleComprometido) {
    const label = d.factor === 4 ? `${cop(d.monto)} × 4` : cop(d.monto);
    console.log(`  ${d.nombre.padEnd(40)} ${label.padStart(28)} = ${cop(d.contrib)}`);
  }
  console.log(`\n  TOTAL COMPROMETIDO: ${cop(totalComprometido)}`);

  const diferenciaMensual = disponibleMensual - totalComprometido;
  console.log(`  DIFERENCIA:         ${cop(diferenciaMensual)}`);

  // ── Balance por semana — replicando balancePlanificacion de MesM1Desktop ──
  console.log(`\n${"─".repeat(70)}`);
  console.log("FLUJO POR SEMANA (replica balancePlanificacion MesM1Desktop)");
  console.log(`${"─".repeat(70)}\n`);

  // aporteAngie por semana (desde H4B)
  const aportesPorSemana = {};
  for (const a of aportesAngie) aportesPorSemana[a.semana] = a.monto;

  let remanente = ingresoCamiloTotal;
  const flujoSemanas = [];
  for (const s of SEMANAS) {
    const aporteAngie = aportesPorSemana[s] ?? 0;

    // comprometido semanal: semanales siempre + fijos con mov.semana === s
    let comprometidoSem = 0;
    const detalleSem = [];
    for (const c of conceptosActivosMes) {
      if (c.frecuencia === "semanal") {
        comprometidoSem += c.monto;
        detalleSem.push(`${c.nombre}=${cop(c.monto)}`);
      } else {
        // buscar movimiento de este concepto en julio con semana === s
        const movC = (movsPorConcepto[c.id] ?? []).find(m => m.semana === s && m.estado !== "no_aplica" && m.estado !== "pospuesto_mes_siguiente");
        if (movC) {
          comprometidoSem += c.monto;
          detalleSem.push(`${c.nombre}=${cop(c.monto)}`);
        }
      }
    }

    const disponible = remanente + aporteAngie;
    const diferencia = disponible - comprometidoSem;
    flujoSemanas.push({ semana: s, remanente, aporteAngie, disponible, comprometidoSem, diferencia });
    remanente = diferencia;

    console.log(`${s}:`);
    console.log(`  Remanente anterior: ${cop(flujoSemanas[flujoSemanas.length - 1]?.remanente ?? ingresoCamiloTotal)}`);
    console.log(`  Aporte Angie:       ${cop(aporteAngie)}`);
    console.log(`  Disponible:         ${cop(disponible)}`);
    console.log(`  Comprometido:       ${cop(comprometidoSem)}`);
    console.log(`  FLUJO:              ${diferencia >= 0 ? "+" : ""}${cop(diferencia)}`);
  }

  console.log(`\n${"─".repeat(70)}`);
  console.log("TABLA COMPARATIVA — APP vs RECÁLCULO");
  console.log(`${"─".repeat(70)}\n`);

  const APP = {
    comprometido: 19016211,
    ingresoCamilo: 11450000,
    aportesAngie: 8000000,
    disponible: 19450000,
    diferencia: 433789,
    flujoS1: -95000,
    flujoS2: -265000,
    flujoS3: 130000,
    flujoS4: 434000,
  };

  const RECALC = {
    comprometido: totalComprometido,
    ingresoCamilo: ingresoCamiloTotal,
    aportesAngie: aportesAngieTotal,
    disponible: disponibleMensual,
    diferencia: diferenciaMensual,
    flujoS1: flujoSemanas[0]?.diferencia,
    flujoS2: flujoSemanas[1]?.diferencia,
    flujoS3: flujoSemanas[2]?.diferencia,
    flujoS4: flujoSemanas[3]?.diferencia,
  };

  const rows = [
    ["Métrica", "App", "Recalculado", "Delta", "¿Coincide?"],
    ["─".repeat(30), "─".repeat(14), "─".repeat(14), "─".repeat(12), "─".repeat(10)],
    ["Comprometido mensual", cop(APP.comprometido), cop(RECALC.comprometido), cop(RECALC.comprometido - APP.comprometido), RECALC.comprometido === APP.comprometido ? "✅ Sí" : "❌ NO"],
    ["Ingreso Camilo", cop(APP.ingresoCamilo), cop(RECALC.ingresoCamilo), cop(RECALC.ingresoCamilo - APP.ingresoCamilo), RECALC.ingresoCamilo === APP.ingresoCamilo ? "✅ Sí" : "❌ NO"],
    ["Aportes Angie", cop(APP.aportesAngie), cop(RECALC.aportesAngie), cop(RECALC.aportesAngie - APP.aportesAngie), RECALC.aportesAngie === APP.aportesAngie ? "✅ Sí" : "❌ NO"],
    ["Total disponible", cop(APP.disponible), cop(RECALC.disponible), cop(RECALC.disponible - APP.disponible), RECALC.disponible === APP.disponible ? "✅ Sí" : "❌ NO"],
    ["Diferencia mensual", cop(APP.diferencia), cop(RECALC.diferencia), cop(RECALC.diferencia - APP.diferencia), RECALC.diferencia === APP.diferencia ? "✅ Sí" : "❌ NO"],
    ["Flujo S1", cop(APP.flujoS1), cop(RECALC.flujoS1), cop(RECALC.flujoS1 - APP.flujoS1), RECALC.flujoS1 === APP.flujoS1 ? "✅ Sí" : "❌ NO"],
    ["Flujo S2", cop(APP.flujoS2), cop(RECALC.flujoS2), cop(RECALC.flujoS2 - APP.flujoS2), RECALC.flujoS2 === APP.flujoS2 ? "✅ Sí" : "❌ NO"],
    ["Flujo S3", cop(APP.flujoS3), cop(RECALC.flujoS3), cop(RECALC.flujoS3 - APP.flujoS3), RECALC.flujoS3 === APP.flujoS3 ? "✅ Sí" : "❌ NO"],
    ["Flujo S4", cop(APP.flujoS4), cop(RECALC.flujoS4), cop(RECALC.flujoS4 - APP.flujoS4), RECALC.flujoS4 === APP.flujoS4 ? "✅ Sí" : "❌ NO"],
  ];

  for (const row of rows) {
    console.log(row.map((c, i) => String(c).padEnd([32, 16, 16, 14, 10][i] ?? 10)).join(""));
  }
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
