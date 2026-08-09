// Limpieza de datos sintéticos de DT-M1M4-NULL-01 (opción B3).
// Borra en el Sheet DEV:
//   - H1: conceptos "TEST-DT-M1M4-NULL-01-*"
//   - H2: todas las filas de los meses sintéticos 2027-06 (origen) y
//     2027-07 (destino) — meses que solo existen para esta prueba, nunca
//     usados por datos reales.
// Uso: node scripts/limpiar-dt-m1m4-null-01.mjs

import { readFileSync } from "fs";
import { google } from "googleapis";

const MESES_PRUEBA = ["2027-06", "2027-07"];
const PREFIJO_TEST = "TEST-DT-M1M4-NULL-01-";

const envPath = new URL("../.env.local", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const envRaw = readFileSync(envPath, "utf-8");
const env = {};
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
const sheets = google.sheets({ version: "v4", auth });
const spreadsheetId = env.GOOGLE_SHEET_ID;

console.log(`Target: DEV — Sheet ID ${spreadsheetId}\n`);

function parseRows(raw) {
  if (!raw || raw.length === 0) return { headers: [], rows: [] };
  const [headers, ...rows] = raw;
  return { headers, rows };
}

async function limpiarTab({ tab, rangoLeer, colClave, esFilaDePrueba, label }) {
  let raw;
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: rangoLeer });
    raw = res.data.values;
  } catch {
    console.log(`${label}: tab no existe — nada que borrar.`);
    return;
  }
  if (!raw || raw.length < 2) {
    console.log(`${label}: sin datos.`);
    return;
  }
  const { headers, rows } = parseRows(raw);
  const idx = headers.indexOf(colClave);
  if (idx === -1) {
    console.log(`${label}: columna "${colClave}" no encontrada.`);
    return;
  }

  const aBorrar = rows.filter((r) => r[0] && esFilaDePrueba(r, headers));
  const aConservar = rows.filter((r) => r[0] && !esFilaDePrueba(r, headers));

  if (aBorrar.length === 0) {
    console.log(`${label}: sin filas de prueba — nada que borrar.`);
    return;
  }

  console.log(`${label}: borrando ${aBorrar.length} fila(s) de prueba, conservando ${aConservar.length}.`);
  aBorrar.forEach((r) => console.log(`  - ${r.slice(0, 4).join(" | ")}`));

  await sheets.spreadsheets.values.clear({ spreadsheetId, range: rangoLeer });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [headers, ...aConservar] },
  });
}

async function main() {
  await limpiarTab({
    tab: "H2",
    rangoLeer: "H2!A:Y",
    colClave: "mes",
    esFilaDePrueba: (r, headers) => MESES_PRUEBA.includes(r[headers.indexOf("mes")]),
    label: "H2 (movimientos, meses sintéticos 2027-06/07)",
  });

  await limpiarTab({
    tab: "H1",
    rangoLeer: "H1!A:L",
    colClave: "nombre",
    esFilaDePrueba: (r, headers) => (r[headers.indexOf("nombre")] ?? "").startsWith(PREFIJO_TEST),
    label: "H1 (conceptos TEST-DT-M1M4-NULL-01-*)",
  });

  console.log("\nLimpieza completa.");
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
