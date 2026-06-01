// T31-ext: Alinea categoria_snapshot en H2 junio con la categoria actual de H1
// Uso: node scripts/fix-h2-snapshots-categorias.mjs

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

// H1: A=id_concepto B=nombre C=categoria D=tipo E=frecuencia F=mes_activo_bimestral
//     G=monto_referencia H=semana_default I=requiere_aprobacion J=estado_concepto
//     K=fecha_retiro L=notas
// H2: A=id_movimiento B=id_concepto C=mes D=nombre_snapshot E=categoria_snapshot
//     F=tipo_snapshot G=semana H=monto_presupuestado ... V=notas

const MES = "2026-06";

async function main() {
  // 1. Leer H1 — construir mapa id_concepto → categoria actual
  console.log("Leyendo H1...");
  const h1Res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "H1!A1:C200",
  });
  const h1Rows = h1Res.data.values ?? [];
  const categoriaH1 = new Map();
  for (let i = 1; i < h1Rows.length; i++) {
    const r = h1Rows[i];
    const id = r[0] ?? "";
    const cat = r[2] ?? "";
    if (id) categoriaH1.set(id, cat);
  }
  console.log(`  ${categoriaH1.size} conceptos indexados desde H1\n`);

  // 2. Leer H2 completo
  console.log("Leyendo H2...");
  const h2Res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "H2!A1:E500",
  });
  const h2Rows = h2Res.data.values ?? [];
  console.log(`  ${h2Rows.length - 1} movimientos en H2 total\n`);

  // 3. Comparar categoria_snapshot con H1 para filas de junio 2026
  const discrepancias = [];

  for (let i = 1; i < h2Rows.length; i++) {
    const r = h2Rows[i];
    const mes = r[2] ?? "";
    if (mes !== MES) continue;

    const idConcepto = r[1] ?? "";
    const nombreSnap = r[3] ?? "";
    const catSnap = r[4] ?? "";
    const semana = ""; // no lo necesitamos del rango A:E — solo para log

    const catH1 = categoriaH1.get(idConcepto);
    if (!catH1) continue; // concepto no existe en H1 (e.g. retirado con concepto eliminado)

    if (catSnap !== catH1) {
      const fila = i + 1; // 1-based en la hoja
      discrepancias.push({ fila, nombre: nombreSnap, semana, catActual: catSnap, catCorrecta: catH1 });
    }
  }

  if (discrepancias.length === 0) {
    console.log("✓ No hay discrepancias — H2 ya está alineado con H1.");
    return;
  }

  // Leer semana para el log (columna G = índice 6) — relectura con rango ampliado
  const h2Full = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "H2!A1:G500",
  });
  const h2FullRows = h2Full.data.values ?? [];

  console.log(`Discrepancias encontradas: ${discrepancias.length}`);
  for (const d of discrepancias) {
    const fullRow = h2FullRows[d.fila - 1] ?? [];
    const semanaVal = fullRow[6] ?? "?";
    console.log(`  Fila ${String(d.fila).padStart(3)} | ${d.nombre.padEnd(25)} | semana=${semanaVal} | "${d.catActual}" → "${d.catCorrecta}"`);
  }

  // 4. batchUpdate atómico — solo columna E (categoria_snapshot)
  console.log("\nEjecutando batchUpdate atómico...");
  const batchData = discrepancias.map(d => ({
    range: `H2!E${d.fila}`,
    values: [[d.catCorrecta]],
  }));

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: batchData,
    },
  });
  console.log("batchUpdate completado.\n");

  // 5. Verificar post-update
  console.log("Verificando post-update...");
  const verifRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "H2!A1:E500",
  });
  const verifRows = verifRes.data.values ?? [];

  let errores = 0;
  for (const d of discrepancias) {
    const r = verifRows[d.fila - 1] ?? [];
    const catFinal = r[4] ?? "";
    const ok = catFinal === d.catCorrecta;
    const fullRow = h2FullRows[d.fila - 1] ?? [];
    console.log(`  ${ok ? "✓" : "✗"} Fila ${d.fila} ${d.nombre} semana=${fullRow[6] ?? "?"} → "${catFinal}"`);
    if (!ok) errores++;
  }

  if (errores > 0) {
    console.error(`\n${errores} error(es) en verificación.`);
    process.exit(1);
  }

  // Confirmar que no quedan discrepancias en junio
  let restantes = 0;
  for (let i = 1; i < verifRows.length; i++) {
    const r = verifRows[i];
    if ((r[2] ?? "") !== MES) continue;
    const idConcepto = r[1] ?? "";
    const catSnap = r[4] ?? "";
    const catH1 = categoriaH1.get(idConcepto);
    if (catH1 && catSnap !== catH1) restantes++;
  }

  if (restantes > 0) {
    console.error(`\nAún quedan ${restantes} discrepancia(s) en H2 junio.`);
    process.exit(1);
  }

  console.log(`\n✓ T31-ext completo — ${discrepancias.length} snapshots corregidos, 0 discrepancias restantes.`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
