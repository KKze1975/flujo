// SEMANAS-VIERNES-01 — CONCILIACIÓN de la semana de transición 28-sep..4-oct-2026.
//
// Decisión de Camilo (1 oct 2026): la S5 de septiembre deja de existir; sus movimientos se CONCILIAN con la
// planeación/ejecución de octubre S1. REEMPLAZAN, no duplican: por concepto queda UNA fila en 2026-10 S1 con el
// estado real; si la fila de sep S5 trae ejecución, esa ejecución prevalece sobre la planeada de octubre.
// El saldo inicial de octubre ya descuenta los gastos del 29-sep (no se ajusta saldo). La lógica de decisión vive
// en scripts/lib/conciliacion-viernes.mjs (compartida con scripts/simular-conciliacion-viernes.ts).
//
// Uso (Node >= 22.6):
//   node scripts/migrar-semana-transicion-viernes.mjs --target DEV|PROD                  # dry-run (default, solo lectura)
//   node scripts/migrar-semana-transicion-viernes.mjs --target DEV --apply --h4b oct|sep [--h2-ejecutadas-s2 revertir|retirar]
//   node scripts/migrar-semana-transicion-viernes.mjs --target PROD --apply ... --confirmo-prod
//
// - `--target` obligatorio. DEV = GOOGLE_SHEET_ID, PROD = PROD_GOOGLE_SHEET_ID (.env.local). Nunca se imprime el Sheet ID.
// - Dry-run por defecto (scope readonly): imprime la TABLA fila a fila de H2, la sección AMBIGUO, H3, H4B y H5B.
// - --apply (scope escritura; PROD exige además --confirmo-prod y aprobación explícita de Camilo):
//     * --h4b oct|sep obligatorio si hay ingreso Angie de sep S5; --h2-ejecutadas-s2 revertir|retirar obligatorio si
//       hay filas ambiguas. Aborta si queda cualquier DECISIÓN sin resolver o si H5A (CierreSemana) tiene filas con
//       (2026-09,S5) o (2026-10,S1) (este script no toca H5A).
//     * Antes de CUALQUIER escritura: backup JSON en /home/camilovillamil/flujo-backups-migracion/ (fuera del repo),
//       con encabezados y las filas afectadas más H2 completo; se lee de vuelta y se verifica.
//     * Actualiza primero (fusiones, reubicaciones, reversiones; values.batchUpdate RAW) y borra después, de MAYOR a
//       MENOR número de fila, re-resolviendo cada fila por id justo antes (no por número guardado). H2/H3/H5B:
//       deleteDimension de la fila; H4B (bloque I:N de la pestaña H4): deleteRange con shift de filas SOLO en I:N,
//       para no arrastrar los bloques H4A/H4C vecinos.
//     * Lee de vuelta y compara el estado final de las 4 tablas contra lo esperado; sale != 0 si algo quedó omitido
//       o la verificación falla. Idempotente: tras aplicar, el dry-run da 0 acciones.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import {
  MES_ORIGEN, SEM_ORIGEN, MES_DESTINO, SEM_DESTINO,
  planificar, aplicarOps, normalizarTabla, imprimirPlan, describirOp, norm,
} from "./lib/conciliacion-viernes.mjs";

const require = createRequire(import.meta.url);
const { google } = require("googleapis");

const args = process.argv.slice(2);
const flagVal = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const target = flagVal("--target");
const apply = args.includes("--apply");
const confirmoProd = args.includes("--confirmo-prod");
const h4bOpcion = flagVal("--h4b");
const h2S2Opcion = flagVal("--h2-ejecutadas-s2");

if (target !== "DEV" && target !== "PROD") {
  console.error("Falta --target DEV|PROD (obligatorio, sin default).");
  process.exit(2);
}
if (apply && target === "PROD" && !confirmoProd) {
  console.error("Escritura sobre PROD requiere --confirmo-prod (y aprobación explícita de Camilo).");
  process.exit(2);
}
if (h4bOpcion !== undefined && h4bOpcion !== "oct" && h4bOpcion !== "sep") {
  console.error("--h4b solo acepta 'oct' o 'sep'.");
  process.exit(2);
}
if (h2S2Opcion !== undefined && h2S2Opcion !== "revertir" && h2S2Opcion !== "retirar") {
  console.error("--h2-ejecutadas-s2 solo acepta 'revertir' o 'retirar'.");
  process.exit(2);
}

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf-8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^"(.*)"$/, "$1");
}
const spreadsheetId = target === "PROD" ? env.PROD_GOOGLE_SHEET_ID : env.GOOGLE_SHEET_ID;
if (!spreadsheetId) {
  console.error(`Falta el Sheet ID de ${target} en .env.local.`);
  process.exit(2);
}

const auth = new google.auth.JWT({
  email: env.GOOGLE_CLIENT_EMAIL,
  key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: [apply
    ? "https://www.googleapis.com/auth/spreadsheets"
    : "https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const sheets = google.sheets({ version: "v4", auth });

const colLetra = (idx) => {
  let n = idx + 1, s = "";
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
};

// offset: índice absoluto de la primera columna del rango (H4B empieza en I => 8).
const TABS = {
  H2: { tab: "H2", range: "H2!A:Y", offset: 0 },
  H3: { tab: "H3", range: "H3!A:Q", offset: 0 },
  H4B: { tab: "H4", range: "H4!I:N", offset: 8, anchoBloque: 6 },
  H5B: { tab: "H5B", range: "H5B!A:I", offset: 0 },
};

async function leer(range) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return res.data.values ?? [];
}
async function leerTablas() {
  const t = {};
  for (const [k, spec] of Object.entries(TABS)) t[k] = await leer(spec.range);
  return t;
}
async function contarH5A() {
  const h5 = await leer("H5!A:P");
  if (h5.length === 0) return 0;
  const iM = h5[0].indexOf("mes"), iS = h5[0].indexOf("semana");
  if (iM === -1 || iS === -1) throw new Error("H5 sin columnas mes/semana");
  return h5.slice(1).filter((r) => {
    const m = norm(r[iM]), s = norm(r[iS]);
    return (m === MES_ORIGEN && s === SEM_ORIGEN) || (m === MES_DESTINO && s === SEM_DESTINO);
  }).length;
}
const conteos = (t) => {
  const datos = (rows) => (rows ?? []).slice(1).filter((r) => norm(r[0])).length;
  const h2 = (t.H2 ?? []);
  const iM = h2[0]?.indexOf("mes") ?? -1, iS = h2[0]?.indexOf("semana") ?? -1;
  const cuenta = (m, s) => h2.slice(1).filter((r) => norm(r[0]) && norm(r[iM]) === m && norm(r[iS]) === s).length;
  return {
    H2: datos(t.H2), H3: datos(t.H3), H4B: datos(t.H4B), H5B: datos(t.H5B),
    "H2 sep S5": cuenta(MES_ORIGEN, SEM_ORIGEN), "H2 oct S1": cuenta(MES_DESTINO, SEM_DESTINO),
  };
};

console.log(`Target: ${target}`);
console.log(`Modo: ${apply ? "APPLY (escribe)" : "DRY-RUN (solo lectura)"}`);
console.log(`Conciliación: (${MES_ORIGEN}, ${SEM_ORIGEN}) -> (${MES_DESTINO}, ${SEM_DESTINO}) — la S5 de septiembre deja de existir`);

let h5aCount = 0, h5aError = null;
try { h5aCount = await contarH5A(); } catch (e) { h5aError = e instanceof Error ? e.message : String(e); }
console.log(`\nH5A (CierreSemana, tab H5) con (${MES_ORIGEN},${SEM_ORIGEN}) o (${MES_DESTINO},${SEM_DESTINO}): ${h5aError ? `NO SE PUDO LEER (${h5aError})` : h5aCount}`);

const tablasPre = await leerTablas();
for (const [k, rows] of Object.entries(tablasPre)) {
  const h = rows[0] ?? [];
  if (!h.includes("mes") || !h.includes("semana")) { console.error(`[${k}] sin columnas mes/semana. Aborta.`); process.exit(1); }
}
const opts = { h2S2: h2S2Opcion, h4b: h4bOpcion };
const plan = planificar(tablasPre, opts);
imprimirPlan(plan);

const antes = conteos(tablasPre);
console.log(`\nResumen acciones: H2=${plan.filasH2.length} ambiguas=${plan.ambiguos.length} H3=${plan.filasH3.length} H4B=${plan.h4b.candidatas.length} H5B=${plan.filasH5B.length} total=${plan.totalAcciones} | H5A=${h5aError ? "ERROR" : h5aCount}`);
if (plan.pendientes.length) {
  console.log("Pendientes de decisión (bloquean --apply):");
  for (const p of plan.pendientes) console.log(`  - ${p}`);
}

if (!apply) {
  console.log(`\nResumen: modo=dry-run target=${target} (no se escribió nada)`);
  process.exit(0);
}

// ── APPLY ─────────────────────────────────────────────────────────────────
if (plan.totalAcciones === 0) {
  console.log("\n0 acciones: nada que aplicar (idempotente).");
  process.exit(0);
}
if (h5aError || h5aCount > 0) {
  console.error(`\nABORTA --apply: ${h5aError ? "no se pudo contar H5A" : `H5A tiene ${h5aCount} fila(s) con (${MES_ORIGEN},${SEM_ORIGEN}) o (${MES_DESTINO},${SEM_DESTINO})`}. Este script no toca cierres; reportar a Camilo.`);
  process.exit(1);
}
if (plan.h4b.candidatas.length > 0 && !h4bOpcion) {
  console.error("ABORTA --apply: falta --h4b oct|sep (decisión de Camilo).");
  process.exit(2);
}
if (plan.pendientes.length) {
  console.error(`ABORTA --apply: ${plan.pendientes.length} decisión(es) sin resolver (ver arriba). No se escribe nada.`);
  process.exit(2);
}

// 1) Backup fuera del repo, leído de vuelta.
const dirBackup = "/home/camilovillamil/flujo-backups-migracion";
if (!existsSync(dirBackup)) mkdirSync(dirBackup, { recursive: true });
const marca = new Date().toISOString().replace(/[:.]/g, "-");
const archivoBackup = `${dirBackup}/${target}-${marca}.json`;
const idsAfectados = { H2: new Set(), H3: new Set(), H4B: new Set(), H5B: new Set() };
for (const o of plan.ops) idsAfectados[o.tab].add(o.id);
for (const f of plan.filasH2) { idsAfectados.H2.add(f.idR); if (f.T) String(f.T.id).split("+").forEach((i) => idsAfectados.H2.add(i)); }
for (const a of plan.ambiguos) { idsAfectados.H2.add(a.id); a.s1.forEach((s) => idsAfectados.H2.add(s.id)); }
for (const c of plan.h4b.candidatas) idsAfectados.H4B.add(c.id);
for (const d of plan.h4b.destino) idsAfectados.H4B.add(d.id);
const afectadas = {};
for (const k of Object.keys(TABS)) {
  afectadas[k] = tablasPre[k].map((r, i) => ({ fila: i + 1, id: norm(r[0]), row: r }))
    .filter((x, i) => i > 0 && idsAfectados[k].has(x.id));
}
const backup = {
  target, generado: new Date().toISOString(), opciones: opts,
  headers: Object.fromEntries(Object.keys(TABS).map((k) => [k, tablasPre[k][0]])),
  afectadas, H2_completo: tablasPre.H2,
};
writeFileSync(archivoBackup, JSON.stringify(backup, null, 2));
{
  const leido = JSON.parse(readFileSync(archivoBackup, "utf-8"));
  let ok = true;
  for (const k of Object.keys(TABS)) {
    for (const x of afectadas[k]) {
      const y = leido.afectadas?.[k]?.find((z) => z.id === x.id && JSON.stringify(z.row) === JSON.stringify(x.row));
      if (!y) { ok = false; console.error(`Backup: falta ${k} ${x.id}`); }
    }
    if (JSON.stringify(leido.headers?.[k]) !== JSON.stringify(tablasPre[k][0])) { ok = false; console.error(`Backup: encabezado ${k} no coincide`); }
  }
  if (JSON.stringify(leido.H2_completo) !== JSON.stringify(tablasPre.H2)) { ok = false; console.error("Backup: H2 completo no coincide"); }
  if (!ok) { console.error("ABORTA: el backup no se pudo verificar. No se escribió nada."); process.exit(1); }
  const n = Object.values(afectadas).reduce((a, v) => a + v.length, 0);
  console.log(`\nBACKUP creado y verificado: ${archivoBackup} (${n} filas afectadas + H2 completo ${leido.H2_completo.length - 1} filas)`);
}

// 2) Ejecución.
const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties(sheetId,title)" });
const gid = (tab) => {
  const s = meta.data.sheets.find((x) => x.properties.title === tab);
  if (!s) throw new Error(`Pestaña ${tab} no encontrada`);
  return s.properties.sheetId;
};

async function resolver(clave, id, esperado) {
  const spec = TABS[clave];
  const rows = await leer(spec.range);
  const headers = rows[0];
  const idxs = rows.map((r, i) => (i > 0 && norm(r[0]) === id ? i : -1)).filter((i) => i > 0);
  if (idxs.length !== 1) throw new Error(`${clave} ${id}: ${idxs.length} filas con ese id`);
  const i = idxs[0];
  for (const [c, v] of Object.entries(esperado ?? {})) {
    const actual = norm(rows[i][headers.indexOf(c)]);
    if (actual !== v) throw new Error(`${clave} ${id} (fila ${i + 1}): ${c} esperado "${v}" y es "${actual}" (cambió desde la lectura inicial)`);
  }
  return { fila: i + 1, headers, row: rows[i], spec };
}

let hechas = 0, omitidas = 0;
async function ejecutarUpdate(o) {
  const { fila, headers, row, spec } = await resolver(o.tab, o.id, o.esperado);
  const data = [], cambios = [];
  for (const [c, v] of Object.entries(o.set)) {
    const j = headers.indexOf(c);
    if (j === -1) throw new Error(`${o.tab}: columna ${c} inexistente`);
    cambios.push(`${c}: "${norm(row[j])}" -> "${v}"`);
    data.push({ range: `${spec.tab}!${colLetra(spec.offset + j)}${fila}`, values: [[v]] });
  }
  await sheets.spreadsheets.values.batchUpdate({ spreadsheetId, requestBody: { valueInputOption: "RAW", data } });
  const despues = (await leer(spec.range))[fila - 1];
  for (const [c, v] of Object.entries(o.set)) {
    if (norm(despues?.[headers.indexOf(c)]) !== norm(v) || norm(despues?.[0]) !== o.id) throw new Error(`VERIFICACIÓN FALLÓ ${o.tab} ${o.id} col ${c}`);
  }
  console.log(`ACTUALIZADA ${o.tab} fila ${fila} id ${o.id}: ${cambios.join("; ")}`);
  hechas++;
}
async function ejecutarDelete(o) {
  const { fila, row, spec } = await resolver(o.tab, o.id, o.esperado);
  console.log(`BORRADO ${o.tab} fila ${fila} id ${o.id}: ${JSON.stringify(row)}`);
  const sheetId = gid(spec.tab);
  const request = o.tab === "H4B"
    ? { deleteRange: { range: { sheetId, startRowIndex: fila - 1, endRowIndex: fila, startColumnIndex: spec.offset, endColumnIndex: spec.offset + spec.anchoBloque }, shiftDimension: "ROWS" } }
    : { deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex: fila - 1, endIndex: fila } } };
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [request] } });
  const rows = await leer(spec.range);
  if (rows.some((r, i) => i > 0 && norm(r[0]) === o.id)) throw new Error(`VERIFICACIÓN FALLÓ: ${o.tab} ${o.id} sigue presente tras el borrado`);
  hechas++;
}

try {
  for (const o of plan.ops.filter((x) => x.tipo === "update")) await ejecutarUpdate(o);
  for (const clave of Object.keys(TABS)) {
    const dels = plan.ops.filter((x) => x.tipo === "delete" && x.tab === clave);
    if (dels.length === 0) continue;
    // De MAYOR a MENOR fila actual; cada una se re-resuelve por id justo antes de borrar.
    const filaDe = new Map(tablasPre[clave].map((r, i) => [norm(r[0]), i + 1]));
    dels.sort((a, b) => (filaDe.get(b.id) ?? 0) - (filaDe.get(a.id) ?? 0));
    for (const o of dels) await ejecutarDelete(o);
  }
} catch (e) {
  omitidas = plan.ops.length - hechas;
  console.error(`\nERROR durante la aplicación: ${e instanceof Error ? e.message : String(e)}`);
  console.error(`Operaciones hechas=${hechas} omitidas=${omitidas}. Backup en ${archivoBackup}. Revisar antes de reintentar.`);
  process.exit(1);
}

// 3) Lectura de vuelta y verificación fila por fila del estado final.
const tablasPost = await leerTablas();
const esperadas = aplicarOps(tablasPre, plan.ops);
let difs = 0;
for (const k of Object.keys(TABS)) {
  const a = normalizarTabla(esperadas[k]), b = normalizarTabla(tablasPost[k]);
  if (a.length !== b.length) { difs++; console.error(`VERIFICACIÓN ${k}: filas esperadas=${a.length - 1} reales=${b.length - 1}`); }
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) { difs++; console.error(`VERIFICACIÓN ${k} fila ${i + 1}: esperado ${JSON.stringify(a[i])} real ${JSON.stringify(b[i])}`); if (difs > 20) break; }
  }
}
const despues = conteos(tablasPost);
console.log("\nRecuento por tab (antes -> después):");
for (const k of Object.keys(antes)) console.log(`  ${k}: ${antes[k]} -> ${despues[k]}`);
const replan = planificar(tablasPost, opts);
console.log(`Re-plan sobre el estado final: ${replan.totalAcciones} acciones (esperado 0).`);
if (replan.totalAcciones !== 0) difs++;
console.log(`\nResumen: operaciones=${plan.ops.length} hechas=${hechas} omitidas=${omitidas} diferencias_verificacion=${difs} modo=apply target=${target} backup=${archivoBackup}`);
if (omitidas > 0 || difs > 0) process.exit(1);
