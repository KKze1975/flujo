// Corrección única de filas H2 con `semana` vacía — BALANCE-UNIFICADO-01.
//
// Uso (Node >= 22.6, importa lib/utils/fecha.ts, por eso el flag):
//   node --experimental-strip-types scripts/fix-semana-vacia-h2.mjs --target DEV|PROD            # dry-run (default)
//   node --experimental-strip-types scripts/fix-semana-vacia-h2.mjs --target DEV --apply         # escribe en DEV
//   node --experimental-strip-types scripts/fix-semana-vacia-h2.mjs --target PROD --apply --confirmo-prod
//
// - `--target` es obligatorio: DEV usa GOOGLE_SHEET_ID, PROD usa PROD_GOOGLE_SHEET_ID (.env.local).
//   Los Sheet IDs nunca se imprimen ni se escriben aquí (I-04/I-08).
// - Dry-run por defecto: scope spreadsheets.readonly, no escribe nada.
// - `--apply`: scope de escritura; sobre PROD exige además `--confirmo-prod`
//   (y, por proceso del ticket, aprobación explícita de Camilo antes de correrlo).
// - Semana propuesta: semanaDeFechaEnMes(fecha_ejecucion) (fuente única, lib/utils/fecha.ts),
//   solo si la fila tiene fecha_ejecucion y esa fecha cae en el `mes` de la fila.
//   Sin fecha derivable -> se reporta y NO se toca (no se inventa semana).
// - Por cada fila: muestra el contenido ACTUAL antes de tocarla, escribe SOLO la celda
//   `semana` (no reescribe la fila), y lee de vuelta la fila tras escribir.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { semanaDeFechaEnMes } from "../lib/utils/fecha.ts";

const require = createRequire(import.meta.url);
const { google } = require("googleapis");

const args = process.argv.slice(2);
const targetIdx = args.indexOf("--target");
const target = targetIdx >= 0 ? args[targetIdx + 1] : undefined;
const apply = args.includes("--apply");
const confirmoProd = args.includes("--confirmo-prod");

if (target !== "DEV" && target !== "PROD") {
  console.error("Falta --target DEV|PROD (obligatorio, sin default).");
  process.exit(2);
}
if (apply && target === "PROD" && !confirmoProd) {
  console.error("Escritura sobre PROD requiere --confirmo-prod (y aprobación explícita de Camilo).");
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

const colLetra = (idx) => String.fromCharCode(65 + idx); // H2 tiene < 26 columnas (A:Y)

async function leerH2() {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H2!A:Y" });
  return res.data.values ?? [];
}

console.log(`Target: ${target}`);
console.log(`Modo: ${apply ? "APPLY (escribe)" : "DRY-RUN (solo lectura)"}`);
console.log("Tab: H2 Movimientos — Operación: " + (apply ? "update de la celda semana" : "lectura"));

const rows = await leerH2();
const headers = rows[0];
const iId = headers.indexOf("id_movimiento");
const iMes = headers.indexOf("mes");
const iSemana = headers.indexOf("semana");
const iFecha = headers.indexOf("fecha_ejecucion");
if ([iId, iMes, iSemana, iFecha].includes(-1)) {
  console.error("H2 no tiene las columnas esperadas (id_movimiento, mes, semana, fecha_ejecucion).");
  process.exit(1);
}

const candidatas = [];
rows.slice(1).forEach((r, i) => {
  if (r[iId] && !(r[iSemana] ?? "").trim()) candidatas.push({ fila: i + 2, r });
});
console.log(`\nFilas con semana vacía: ${candidatas.length}`);

let escritas = 0;
let omitidas = 0;
for (const { fila, r } of candidatas) {
  const actual = Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""]).filter(([, v]) => v !== ""));
  console.log(`\n--- ${r[iId]} (fila H2 ${fila}) — contenido ACTUAL ---`);
  console.log(JSON.stringify(actual, null, 2));

  const fecha = (r[iFecha] ?? "").trim();
  const mes = r[iMes];
  if (!fecha || !fecha.startsWith(mes)) {
    console.log(`  -> OMITIDA: sin fecha_ejecucion dentro de ${mes}; semana no derivable sin ambigüedad. No se toca.`);
    omitidas++;
    continue;
  }
  const propuesta = semanaDeFechaEnMes(new Date(fecha + "T12:00:00"));
  console.log(`  -> semana propuesta: ${propuesta} (semanaDeFechaEnMes de ${fecha})`);

  if (!apply) continue;

  // Re-lectura justo antes de escribir: misma fila, mismo id, semana todavía vacía.
  const fresca = await leerH2();
  const filaFresca = fresca[fila - 1];
  if (!filaFresca || filaFresca[iId] !== r[iId] || (filaFresca[iSemana] ?? "").trim() !== "") {
    console.error(`  -> ABORTA esta fila: cambió desde la lectura inicial (id o semana distintos). No se escribe.`);
    omitidas++;
    continue;
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `H2!${colLetra(iSemana)}${fila}`,
    valueInputOption: "RAW",
    requestBody: { values: [[propuesta]] },
  });
  const despues = (await leerH2())[fila - 1];
  console.log(`  -> ESCRITA. Lectura de vuelta: id=${despues[iId]} mes=${despues[iMes]} semana=${despues[iSemana]}`);
  if (despues[iId] !== r[iId] || despues[iSemana] !== propuesta) {
    console.error("  -> VERIFICACIÓN FALLÓ: la lectura de vuelta no coincide.");
    process.exit(1);
  }
  escritas++;
}

console.log(`\nResumen: candidatas=${candidatas.length} escritas=${escritas} omitidas=${omitidas} modo=${apply ? "apply" : "dry-run"} target=${target}`);
