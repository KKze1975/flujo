// B1: Verifica si Energía aparece duplicado en H2
// Uso: node scripts/check-b1-energia.mjs

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

// H2 columnas: A=id_movimiento B=id_concepto C=mes D=nombre_snapshot E=categoria_snapshot
//              F=tipo_snapshot G=semana H=monto_presupuestado I=monto_ejecutado J=desviacion
//              K=estado L=ejecutor M=fuente_en_mano N=fuente_nequi O=fuente_camilo P=fuente_angie
//              Q=fecha_ejecucion R=razon_desviacion S=razon_postergacion T=comprobante_url
//              U=pendiente_aprobacion V=notas

async function main() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "H2!A1:V500",
  });

  const rows = res.data.values ?? [];
  const header = rows[0];
  console.log("Columnas H2:", header?.join(" | "));
  console.log(`Total filas (con header): ${rows.length}\n`);

  // Filtrar filas con "Energ" en nombre_snapshot (col D = index 3)
  const energiaRows = rows.slice(1).filter(r => (r[3] ?? "").toLowerCase().includes("energ"));
  console.log(`Filas con 'Energía' en H2: ${energiaRows.length}`);
  for (const r of energiaRows) {
    console.log(`  id=${r[0]} | concepto=${r[1]} | mes=${r[2]} | nombre=${r[3]} | cat=${r[4]} | semana=${r[6]} | estado=${r[10]}`);
  }

  // Buscar cualquier concepto duplicado (mismo nombre_snapshot + semana + estado)
  console.log("\nConceptos con nombre duplicado en mismo mes+semana:");
  const seenMap = new Map();
  for (const r of rows.slice(1)) {
    const key = `${r[2]}_${r[3]}_${r[6]}`;
    if (!seenMap.has(key)) seenMap.set(key, []);
    seenMap.get(key).push(r[0]);
  }
  for (const [key, ids] of seenMap) {
    if (ids.length > 1) {
      console.log(`  ${key}: ${ids.join(", ")}`);
    }
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
