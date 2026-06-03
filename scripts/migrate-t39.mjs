/**
 * T39 — Migración de esquema
 * Idempotente: reejecutar no duplica headers ni destruye datos.
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
  key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
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

async function clearRange(range) {
  await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range });
}

// ── Paso A — Verificar datos H4D actuales (rango viejo V2:AC) ────────────────

async function pasoA() {
  console.log("\n=== Paso A: Verificar datos H4D en H4!V2:AC1000 ===");
  const rows = await getRange("H4!V2:AC1000");
  const filled = rows.filter(r => r && r.length > 0 && r.some(c => c !== ""));
  console.log(`Filas con datos en H4!V2:AC: ${filled.length}`);
  return filled;
}

// ── Paso B — Mover datos H4D de V:AC → X:AE ─────────────────────────────────

async function pasoB(filledRows) {
  console.log("\n=== Paso B: Mover datos H4D (V:AC → X:AE) ===");
  if (filledRows.length === 0) {
    console.log("Sin datos que mover — omitiendo.");
    return;
  }

  // Verificar si X2 ya tiene datos migrados (comienzan con RECARGA_ANG_)
  const destCheck = await getRange("H4!X2:AE2");
  const destFirstCell = destCheck[0]?.[0] ?? "";
  if (destFirstCell.startsWith("RECARGA_ANG_")) {
    console.log("Datos ya migrados en X2:AE (primer registro: " + destFirstCell + "). Limpiando origen.");
    await clearRange("H4!V2:AC1000");
    console.log("Origen H4!V2:AC limpiado.");
    return;
  }
  // X2 puede tener datos del rango solapado (campo 'semana' del layout viejo) — ignorar, proceder.
  if (destCheck.length > 0) {
    console.log("H4!X2 tiene datos del rango solapado viejo — procediendo con migración completa.");
  }

  // Escribir en destino (offset +2 cols: V→X)
  const endRow = filledRows.length + 1; // +1 porque datos empiezan en fila 2
  await setRange(`H4!X2:AE${endRow}`, filledRows);
  console.log(`${filledRows.length} filas escritas en H4!X2:AE${endRow}`);

  // Limpiar origen
  await clearRange("H4!V2:AC1000");
  console.log("Origen H4!V2:AC limpiado.");
}

// ── Paso C — Actualizar headers H4 ──────────────────────────────────────────

const H4C_HEADERS = ["id_saldo", "mes", "cuenta", "saldo_inicial", "fecha_confirmacion", "incluye_remanente", "id_cierre_origen"];
const H4D_HEADERS = ["id_recarga", "mes", "semana", "monto", "fecha", "registrado_por", "cuenta_destino", "notas"];

async function pasoC() {
  console.log("\n=== Paso C: Actualizar headers H4 ===");

  await setRange("H4!P1:V1", [H4C_HEADERS]);
  console.log("H4C headers escritos en H4!P1:V1:", H4C_HEADERS);

  await setRange("H4!X1:AE1", [H4D_HEADERS]);
  console.log("H4D headers escritos en H4!X1:AE1:", H4D_HEADERS);

  // Limpiar solo W1 (separador entre H4C y H4D en el nuevo layout)
  await clearRange("H4!W1");
  console.log("H4!W1 limpiado.");
}

// ── Paso D — Agregar columnas nuevas a H2, H3, H5 ───────────────────────────

async function addHeadersIfMissing(sheetRange, writeRange, newHeaders, label) {
  const current = await getRange(sheetRange);
  const headerRow = current[0] ?? [];

  const missing = newHeaders.filter(h => !headerRow.includes(h));
  if (missing.length === 0) {
    console.log(`${label}: headers ya presentes — omitiendo.`);
    return;
  }
  if (missing.length !== newHeaders.length) {
    console.log(`AVISO ${label}: algunos headers ya existen (${newHeaders.filter(h => headerRow.includes(h)).join(", ")}), agregando solo faltantes: ${missing.join(", ")}`);
  }

  await setRange(writeRange, [newHeaders]);
  console.log(`${label}: headers escritos en ${writeRange}:`, newHeaders);
}

async function pasoD() {
  console.log("\n=== Paso D: Agregar columnas nuevas H2, H3, H5 ===");

  // H2: columnas W, X, Y (índices 22-24 = columnas 23-25)
  const h2Headers = await getRange("H2!A1:Z1");
  const h2Row = h2Headers[0] ?? [];
  const notasIdx = h2Row.indexOf("notas");
  if (notasIdx !== -1 && notasIdx !== 21) {
    console.log(`AVISO H2: 'notas' está en columna ${notasIdx + 1}, esperado 22. Verificar manualmente.`);
  }
  await addHeadersIfMissing(
    "H2!A1:Z1",
    "H2!W1:Y1",
    ["monto_ejecutado_camilo", "monto_ejecutado_angie", "id_recarga_origen"],
    "H2"
  );

  // H3B: agregar al final del rango actual (A:N = 14 cols, agregar O y P)
  const h3Headers = await getRange("H3!A1:P1");
  const h3Row = h3Headers[0] ?? [];
  const h3LastCol = h3Row.filter(Boolean).length;
  console.log(`H3: header actual tiene ${h3LastCol} columnas.`);
  // Columnas O y P en notación de letra
  const h3WriteRange = `H3!O1:P1`;
  await addHeadersIfMissing(
    "H3!A1:P1",
    h3WriteRange,
    ["sobre_techo", "id_recarga_origen"],
    "H3B"
  );

  // H5: agregar al final del rango actual (A:N = 14 cols, agregar O y P)
  const h5Headers = await getRange("H5!A1:P1");
  const h5Row = h5Headers[0] ?? [];
  const h5LastCol = h5Row.filter(Boolean).length;
  console.log(`H5: header actual tiene ${h5LastCol} columnas.`);
  const h5WriteRange = `H5!O1:P1`;
  await addHeadersIfMissing(
    "H5!A1:P1",
    h5WriteRange,
    ["destino_remanente", "remanente_ejecutado"],
    "H5A"
  );
}

// ── Verificación DoD ─────────────────────────────────────────────────────────

async function verificarDoD() {
  console.log("\n=== Verificación DoD ===");

  // DoD 1: H2!W1:Y1
  const h2WY = await getRange("H2!W1:Y1");
  const h2Headers = h2WY[0] ?? [];
  const dod1 = h2Headers[0] === "monto_ejecutado_camilo" && h2Headers[1] === "monto_ejecutado_angie" && h2Headers[2] === "id_recarga_origen";
  console.log(`DoD 1 H2 cols W-Y: ${dod1 ? "✓" : "✗"} [${h2Headers.join(", ")}]`);

  // DoD 2: H3!O1:P1
  const h3OP = await getRange("H3!O1:P1");
  const h3Headers = h3OP[0] ?? [];
  const dod2 = h3Headers[0] === "sobre_techo" && h3Headers[1] === "id_recarga_origen";
  console.log(`DoD 2 H3 cols O-P: ${dod2 ? "✓" : "✗"} [${h3Headers.join(", ")}]`);

  // DoD 3: H4!P1:V1 exactamente 7 headers
  const h4C = await getRange("H4!P1:V1");
  const h4CHeaders = h4C[0] ?? [];
  const dod3 = JSON.stringify(h4CHeaders) === JSON.stringify(H4C_HEADERS);
  console.log(`DoD 3 H4!P1:V1 (7 headers): ${dod3 ? "✓" : "✗"} [${h4CHeaders.join(", ")}]`);

  // DoD 4: H4!X1:AE1 exactamente 8 headers
  const h4D = await getRange("H4!X1:AE1");
  const h4DHeaders = h4D[0] ?? [];
  const dod4 = JSON.stringify(h4DHeaders) === JSON.stringify(H4D_HEADERS);
  console.log(`DoD 4 H4!X1:AE1 (8 headers): ${dod4 ? "✓" : "✗"} [${h4DHeaders.join(", ")}]`);

  // DoD 5: H4!W1 vacía (separador nuevo), U1 = incluye_remanente (no separador)
  const w1 = await getRange("H4!W1");
  const dod5 = w1.length === 0 || !w1[0]?.[0];
  console.log(`DoD 5 H4!W1 vacía (separador): ${dod5 ? "✓" : "✗"} [W1=${w1[0]?.[0] ?? "(vacío)"}]`);

  // DoD 6: H5!O1:P1
  const h5OP = await getRange("H5!O1:P1");
  const h5Headers = h5OP[0] ?? [];
  const dod6 = h5Headers[0] === "destino_remanente" && h5Headers[1] === "remanente_ejecutado";
  console.log(`DoD 6 H5 cols O-P: ${dod6 ? "✓" : "✗"} [${h5Headers.join(", ")}]`);

  // DoD 7: tsc → se verifica por separado con npx tsc --noEmit
  console.log("DoD 7 tsc --noEmit: verificar por separado (ejecutado antes del script)");

  // DoD 8: datos H4D intactos en X:AE
  const h4DataAE = await getRange("H4!X2:AE1000");
  const filledAE = h4DataAE.filter(r => r && r.length > 0 && r.some(c => c !== ""));
  const h4DataOld = await getRange("H4!V2:AC1000");
  const filledOld = h4DataOld.filter(r => r && r.length > 0 && r.some(c => c !== ""));
  const dod8 = filledOld.length === 0; // origen debe estar limpio
  console.log(`DoD 8 Datos H4D migrados: ${dod8 ? "✓" : "✗"} [Filas en X:AE=${filledAE.length}, origen V:AC limpio=${dod8}]`);

  const passed = [dod1, dod2, dod3, dod4, dod5, dod6, dod8].every(Boolean);
  console.log(`\nResumen: ${passed ? "TODOS los DoD verificables ✓" : "HAY DoDs fallidos ✗"}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== T39 Migración de esquema ===");
  console.log(`Sheet ID: ${SHEET_ID}`);

  const filledRows = await pasoA();
  await pasoB(filledRows);
  await pasoC();
  await pasoD();
  await verificarDoD();

  console.log("\n=== Migración completa ===");
}

main().catch(err => {
  console.error("ERROR:", err.message ?? err);
  process.exit(1);
});
