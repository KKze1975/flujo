// T31: Actualiza categoria en H1 para Hijos y Servicio Domestico
// Uso: node scripts/fix-categorias-h1.mjs

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

// Columnas: A=id B=nombre C=categoria D=tipo E=frecuencia F=mes_activo_bimestral
//           G=monto_referencia H=semana_default I=requiere_aprobacion
//           J=estado_concepto K=fecha_retiro L=notas

const CAMBIOS = [
  { nombreContiene: "Mesada Lucas",       nuevaCategoria: "Hijos" },
  { nombreContiene: "Mesada Emma",        nuevaCategoria: "Hijos" },
  { nombreContiene: "Colegio",            nuevaCategoria: "Hijos" },
  { nombreContiene: "Empleada Mireyita",  nuevaCategoria: "Servicio Domestico" },
  { nombreContiene: "Provisión Mireyita", nuevaCategoria: "Servicio Domestico" },
];

async function main() {
  // 1. Leer H1 completo
  console.log("Leyendo H1...");
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "H1!A1:L200",
  });

  const rows = res.data.values ?? [];
  console.log(`  ${rows.length - 1} conceptos encontrados\n`);

  // 2. Identificar conceptos y preparar cambios
  const batchData = [];
  const encontrados = new Set();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const nombre = row[1] ?? "";
    const categoriaActual = row[2] ?? "";
    const fila = i + 1; // fila 1 es el header

    for (const cambio of CAMBIOS) {
      if (nombre.includes(cambio.nombreContiene)) {
        console.log(`  ${nombre} | "${categoriaActual}" → "${cambio.nuevaCategoria}"`);
        batchData.push({
          range: `H1!C${fila}`,
          values: [[cambio.nuevaCategoria]],
        });
        encontrados.add(cambio.nombreContiene);
        break;
      }
    }
  }

  // Verificar que encontramos los 5
  const noEncontrados = CAMBIOS.filter((c) => !encontrados.has(c.nombreContiene));
  if (noEncontrados.length > 0) {
    console.error("\nERROR: No se encontraron los siguientes conceptos:");
    for (const c of noEncontrados) {
      console.error(`  - "${c.nombreContiene}"`);
    }
    process.exit(1);
  }

  if (batchData.length !== 5) {
    console.error(`\nERROR: Se esperaban 5 cambios, se encontraron ${batchData.length}`);
    process.exit(1);
  }

  console.log(`\n${batchData.length} cambios listos — ejecutando batchUpdate atómico...`);

  // 3. batchUpdate atómico
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: batchData,
    },
  });

  console.log("batchUpdate completado.\n");

  // 4. Verificar releyendo H1 post-update
  console.log("Verificando post-update...");
  const resVerif = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "H1!A1:L200",
  });

  const rowsVerif = resVerif.data.values ?? [];
  let errores = 0;

  for (const cambio of CAMBIOS) {
    const row = rowsVerif.slice(1).find((r) => (r[1] ?? "").includes(cambio.nombreContiene));
    if (!row) {
      console.error(`  ERROR: no se encontró "${cambio.nombreContiene}" en verificación`);
      errores++;
      continue;
    }
    const catReal = row[2] ?? "";
    const ok = catReal === cambio.nuevaCategoria;
    console.log(`  ${ok ? "✓" : "✗"} ${row[1]} | categoria="${catReal}"`);
    if (!ok) errores++;
  }

  if (errores > 0) {
    console.error(`\n${errores} error(es) en verificación.`);
    process.exit(1);
  }

  console.log("\n✓ T31 completo — 5 conceptos actualizados correctamente.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
