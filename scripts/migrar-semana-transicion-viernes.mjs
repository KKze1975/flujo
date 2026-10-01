// Migración única — SEMANAS-VIERNES-01: la semana de transición 28-sep..4-oct-2026
// pasa de (2026-09, S5) a (2026-10, S1) por la regla del viernes.
//
// Uso (Node >= 22.6; mismo patrón que fix-semana-vacia-h2.mjs):
//   node scripts/migrar-semana-transicion-viernes.mjs --target DEV|PROD                       # dry-run (default, solo lectura)
//   node scripts/migrar-semana-transicion-viernes.mjs --target DEV --apply --h4b separado
//   node scripts/migrar-semana-transicion-viernes.mjs --target PROD --apply --h4b separado --confirmo-prod
//
// - `--target` obligatorio (sin default). DEV = GOOGLE_SHEET_ID, PROD = PROD_GOOGLE_SHEET_ID (.env.local).
//   Los Sheet IDs nunca se imprimen ni se escriben aquí (I-04/I-08).
// - Dry-run por defecto: scope spreadsheets.readonly. `--apply` abre scope de escritura;
//   sobre PROD exige además `--confirmo-prod` (y aprobación explícita de Camilo).
// - Migra SOLO filas con mes==="2026-09" && semana==="S5" -> mes "2026-10", semana "S1" en:
//   H2 (A:Y), H3 (A:Q), H4B IngresoAngie (H4!I:N), H5B PlanSemana (H5B!A:I).
// - Escribe SOLO las 2 celdas mes y semana (values.batchUpdate, RAW). Por fila: muestra el
//   contenido ACTUAL, re-lee justo antes de escribir (aborta la fila si cambió id o mes/semana),
//   y lee de vuelta para verificar.
// - NO toca H5A (tab H5, CierreSemana): la CUENTA (filas con (2026-09,S5) o (2026-10,S1)); si
//   hay >0, --apply aborta sin escribir nada.
// - `--h4b separado` es obligatorio para --apply: mueve la fila H4B tal cual y deja las dos
//   filas de ingreso Angie en la misma semana. Cualquier otro valor aborta ("decisión de Camilo pendiente").
// - Los conflictos (ids duplicados en 2026-10 S1, dos ingresos Angie, fechas del 28-sep..4-oct
//   fuera de 2026-10 S1) solo se INFORMAN para decisión de Camilo; el script no actúa sobre ellos.
// - Idempotente: tras aplicar, un dry-run da 0 candidatas.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { google } = require("googleapis");

const MES_ORIGEN = "2026-09", SEM_ORIGEN = "S5";
const MES_DESTINO = "2026-10", SEM_DESTINO = "S1";

const args = process.argv.slice(2);
const flagVal = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const target = flagVal("--target");
const apply = args.includes("--apply");
const confirmoProd = args.includes("--confirmo-prod");
const h4bOpcion = flagVal("--h4b");

if (target !== "DEV" && target !== "PROD") {
  console.error("Falta --target DEV|PROD (obligatorio, sin default).");
  process.exit(2);
}
if (apply && target === "PROD" && !confirmoProd) {
  console.error("Escritura sobre PROD requiere --confirmo-prod (y aprobación explícita de Camilo).");
  process.exit(2);
}
if (apply && h4bOpcion !== "separado") {
  console.error("decisión de Camilo pendiente: --apply exige --h4b separado (única opción implementada: mueve la fila H4B tal cual y deja las dos filas en la semana).");
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

// Letra de columna (A..Z, AA..) a partir de un índice 0-based absoluto de la hoja.
const colLetra = (idx) => {
  let n = idx + 1, s = "";
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
};

// tab: nombre de hoja. range: rango de lectura. offset: índice absoluto de la primera columna del rango
// (H4B empieza en I => 8: la letra de columna = columna I + índice, NO columna A + índice).
const TABS = [
  { clave: "H2", tab: "H2", range: "H2!A:Y", offset: 0 },
  { clave: "H3", tab: "H3", range: "H3!A:Q", offset: 0 },
  { clave: "H4B", tab: "H4", range: "H4!I:N", offset: 8 },
  { clave: "H5B", tab: "H5B", range: "H5B!A:I", offset: 0 },
];

async function leer(range) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return res.data.values ?? [];
}

const norm = (v) => (v ?? "").toString().trim();

console.log(`Target: ${target}`);
console.log(`Modo: ${apply ? "APPLY (escribe)" : "DRY-RUN (solo lectura)"}`);
console.log(`Migración: (${MES_ORIGEN}, ${SEM_ORIGEN}) -> (${MES_DESTINO}, ${SEM_DESTINO}) — solo celdas mes y semana`);

// ── H5A (tab H5): solo contar ─────────────────────────────────────────────
let h5aCount = 0;
let h5aError = null;
try {
  const h5 = await leer("H5!A:P");
  if (h5.length > 0) {
    const iM = h5[0].indexOf("mes"), iS = h5[0].indexOf("semana");
    if (iM === -1 || iS === -1) throw new Error("H5 sin columnas mes/semana");
    h5aCount = h5.slice(1).filter((r) => {
      const m = norm(r[iM]), s = norm(r[iS]);
      return (m === MES_ORIGEN && s === SEM_ORIGEN) || (m === MES_DESTINO && s === SEM_DESTINO);
    }).length;
  }
} catch (e) {
  h5aError = e instanceof Error ? e.message : String(e);
}
console.log(`\nH5A (CierreSemana, tab H5) con (${MES_ORIGEN},${SEM_ORIGEN}) o (${MES_DESTINO},${SEM_DESTINO}): ${h5aError ? `NO SE PUDO LEER (${h5aError})` : h5aCount}`);

// ── Candidatas por tab ────────────────────────────────────────────────────
const datos = {}; // clave -> { spec, rows, headers, iId, iMes, iSemana, candidatas }
for (const spec of TABS) {
  const rows = await leer(spec.range);
  if (rows.length === 0) {
    console.log(`\n[${spec.clave}] sin datos.`);
    datos[spec.clave] = { spec, rows, headers: [], candidatas: [] };
    continue;
  }
  const headers = rows[0];
  const iId = 0;
  const iMes = headers.indexOf("mes");
  const iSemana = headers.indexOf("semana");
  if (iMes === -1 || iSemana === -1) {
    console.error(`[${spec.clave}] no tiene columnas mes/semana en el encabezado. Aborta.`);
    process.exit(1);
  }
  const candidatas = [];
  rows.slice(1).forEach((r, i) => {
    if (norm(r[iId]) && norm(r[iMes]) === MES_ORIGEN && norm(r[iSemana]) === SEM_ORIGEN) {
      candidatas.push({ fila: i + 2, r });
    }
  });
  datos[spec.clave] = { spec, rows, headers, iId, iMes, iSemana, candidatas };
  console.log(`\n[${spec.clave}] (${spec.tab}, rango ${spec.range}) candidatas: ${candidatas.length}`);
  for (const { fila, r } of candidatas) {
    const actual = Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""]).filter(([, v]) => v !== ""));
    console.log(`--- ${r[iId]} | tab ${spec.tab} | fila ${fila} | celdas ${spec.tab}!${colLetra(spec.offset + iMes)}${fila} (mes), ${spec.tab}!${colLetra(spec.offset + iSemana)}${fila} (semana) — contenido ACTUAL ---`);
    console.log(JSON.stringify(actual));
  }
}

// ── Conflictos para decisión de Camilo (solo informar) ────────────────────
console.log("\n=== Conflictos para decisión de Camilo (solo informativo, el script no actúa) ===");
{
  const d = datos.H2;
  if (d.headers.length) {
    const h = d.headers;
    const g = (r, n) => norm(r[h.indexOf(n)]);
    const resumen = (fila, r) => `fila ${fila} id=${g(r, "id_movimiento")} ${g(r, "mes")}/${g(r, "semana")} estado=${g(r, "estado")} presup=${g(r, "monto_presupuestado")} ejec=${g(r, "monto_ejecutado")} fecha_ejecucion=${g(r, "fecha_ejecucion")}`;
    const destinoRows = d.rows.slice(1).map((r, i) => ({ fila: i + 2, r }))
      .filter(({ r }) => norm(r[d.iId]) && g(r, "mes") === MES_DESTINO && g(r, "semana") === SEM_DESTINO);
    let a = 0;
    for (const c of d.candidatas) {
      const idc = g(c.r, "id_concepto");
      if (!idc) continue;
      for (const o of destinoRows.filter(({ r }) => g(r, "id_concepto") === idc)) {
        a++;
        console.log(`(a) id_concepto=${idc} duplicaría en ${MES_DESTINO} ${SEM_DESTINO}:\n      candidata: ${resumen(c.fila, c.r)}\n      existente: ${resumen(o.fila, o.r)}`);
      }
    }
    if (a === 0) console.log("(a) H2: ninguna candidata coincide en id_concepto con filas ya existentes en 2026-10 S1.");

    const iF = h.indexOf("fecha_ejecucion");
    const candSet = new Set(d.candidatas.map((c) => c.fila));
    let c3 = 0;
    d.rows.slice(1).forEach((r, i) => {
      const fila = i + 2, f = norm(r[iF]);
      if (candSet.has(fila) || !f || f < "2026-09-28" || f > "2026-10-04") return;
      if (g(r, "mes") === MES_DESTINO && g(r, "semana") === SEM_DESTINO) return;
      c3++;
      console.log(`(c) H2 NO candidata con fecha en 28-sep..4-oct fuera de 2026-10 S1: ${resumen(fila, r)}`);
    });
    if (c3 === 0) console.log("(c) H2: ninguna fila no candidata con fecha_ejecucion 2026-09-28..2026-10-04 fuera de 2026-10 S1.");
  }
}
{
  const d = datos.H4B;
  if (d.headers.length) {
    const h = d.headers;
    const g = (r, n) => norm(r[h.indexOf(n)]);
    const existentes = d.rows.slice(1).map((r, i) => ({ fila: i + 2, r }))
      .filter(({ r }) => norm(r[d.iId]) && g(r, "mes") === MES_DESTINO && g(r, "semana") === SEM_DESTINO);
    if (d.candidatas.length > 0 && existentes.length > 0) {
      for (const c of d.candidatas) {
        console.log(`(b) H4B: ya hay ingreso Angie en ${MES_DESTINO} ${SEM_DESTINO}; quedarían dos filas en la semana:`);
        console.log(`      candidata: fila ${c.fila} id=${g(c.r, "id_ingreso")} monto=${g(c.r, "monto")} fecha=${g(c.r, "fecha")}`);
        for (const o of existentes) console.log(`      existente: fila ${o.fila} id=${g(o.r, "id_ingreso")} monto=${g(o.r, "monto")} fecha=${g(o.r, "fecha")}`);
      }
    } else {
      console.log("(b) H4B: sin conflicto (no hay ingreso Angie previo en 2026-10 S1 o no hay candidata).");
    }
  }
}

const totalCand = Object.values(datos).reduce((n, d) => n + d.candidatas.length, 0);
console.log(`\nResumen candidatas: ${TABS.map((t) => `${t.clave}=${datos[t.clave].candidatas.length}`).join(" ")} total=${totalCand} | H5A=${h5aError ? "ERROR" : h5aCount}`);

if (!apply) {
  console.log(`Resumen: modo=dry-run target=${target} (no se escribió nada)`);
  process.exit(0);
}

// ── APPLY ─────────────────────────────────────────────────────────────────
if (h5aError || h5aCount > 0) {
  console.error(`\nABORTA --apply: ${h5aError ? "no se pudo contar H5A" : `H5A tiene ${h5aCount} fila(s) con (${MES_ORIGEN},${SEM_ORIGEN}) o (${MES_DESTINO},${SEM_DESTINO})`}. Este script no toca cierres; reportar a Camilo.`);
  process.exit(1);
}

let escritas = 0, omitidas = 0;
for (const spec of TABS) {
  const d = datos[spec.clave];
  for (const { fila, r } of d.candidatas) {
    const id = r[d.iId];
    const fresca = await leer(spec.range);
    const f = fresca[fila - 1];
    if (!f || f[d.iId] !== id || norm(f[d.iMes]) !== MES_ORIGEN || norm(f[d.iSemana]) !== SEM_ORIGEN) {
      console.error(`ABORTA fila ${spec.clave} ${id} (fila ${fila}): cambió desde la lectura inicial (id o mes/semana distintos). No se escribe.`);
      omitidas++;
      continue;
    }
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: [
          { range: `${spec.tab}!${colLetra(spec.offset + d.iMes)}${fila}`, values: [[MES_DESTINO]] },
          { range: `${spec.tab}!${colLetra(spec.offset + d.iSemana)}${fila}`, values: [[SEM_DESTINO]] },
        ],
      },
    });
    const despues = (await leer(spec.range))[fila - 1];
    console.log(`ESCRITA ${spec.clave} ${id} fila ${fila}. Lectura de vuelta: id=${despues?.[d.iId]} mes=${despues?.[d.iMes]} semana=${despues?.[d.iSemana]}`);
    if (!despues || despues[d.iId] !== id || norm(despues[d.iMes]) !== MES_DESTINO || norm(despues[d.iSemana]) !== SEM_DESTINO) {
      console.error("VERIFICACIÓN FALLÓ: la lectura de vuelta no coincide.");
      process.exit(1);
    }
    escritas++;
  }
}
console.log(`\nResumen: candidatas=${totalCand} escritas=${escritas} omitidas=${omitidas} modo=apply target=${target}`);
