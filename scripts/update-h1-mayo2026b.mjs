// Actualiza H1 — Mayo 2026 batch B:
//   1. Retira Mercado semanal (fila 25)
//   2. Agrega Frutas y verduras, Víveres y otros, Apoyo Mariella
// Uso: node scripts/update-h1-mayo2026b.mjs

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

// Columnas H1:
// A=id_concepto  B=nombre  C=categoria  D=tipo  E=frecuencia  F=mes_activo_bimestral
// G=monto_referencia  H=semana_default  I=requiere_aprobacion
// J=estado_concepto  K=fecha_retiro  L=notas

const hoy = "2026-05-25";
const ts1 = Date.now();
const ts2 = ts1 + 1;
const ts3 = ts1 + 2;

async function main() {
  // ── 1. Retirar Mercado semanal (fila 25) ─────────────────────────────────
  console.log("1. Retirando Mercado semanal (fila 25)...");
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        { range: "H1!J25", values: [["retirado"]] },
        { range: "H1!K25", values: [[hoy]] },
      ],
    },
  });

  // ── 2. Agregar 3 conceptos nuevos al final (filas 42-44) ──────────────────
  console.log("2. Agregando Frutas y verduras, Víveres y otros, Apoyo Mariella...");
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "H1!A:L",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [
        [
          `MERCADO_Y_ALIMENTACION_${ts1}`,
          "Frutas y verduras",
          "Mercado y Alimentación",
          "bolsillo",
          "semanal",
          "",
          200000,
          "variable",
          "FALSE",
          "activo",
          "",
          "",
        ],
        [
          `MERCADO_Y_ALIMENTACION_${ts2}`,
          "Víveres y otros",
          "Mercado y Alimentación",
          "bolsillo",
          "semanal",
          "",
          250000,
          "variable",
          "FALSE",
          "activo",
          "",
          "",
        ],
        [
          `COMPROMISOS_FINANCIEROS_${ts3}`,
          "Apoyo Mariella",
          "Compromisos Financieros",
          "fijo",
          "mensual",
          "",
          100000,
          "S1",
          "FALSE",
          "activo",
          "",
          "",
        ],
      ],
    },
  });

  // ── 3. Verificar ──────────────────────────────────────────────────────────
  console.log("\nVerificando cambios...");
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "H1!A1:L200",
  });

  const rows = res.data.values ?? [];
  const totalConceptos = rows.length - 1;
  const activos = rows.slice(1).filter((r) => r[9] === "activo").length;
  const retirados = rows.slice(1).filter((r) => r[9] === "retirado").length;

  console.log(`\nTotal conceptos en H1: ${totalConceptos}`);
  console.log(`  Activos:   ${activos}`);
  console.log(`  Retirados: ${retirados}`);

  console.log("\nCambios aplicados:");
  for (const [i, row] of rows.entries()) {
    if (i === 0) continue;
    const nombre = row[1] ?? "";
    if (
      nombre === "Mercado semanal" ||
      nombre === "Frutas y verduras" ||
      nombre === "Víveres y otros" ||
      nombre === "Apoyo Mariella"
    ) {
      const fila = i + 1;
      console.log(
        `  Fila ${fila.toString().padStart(2)} | ${(row[9] ?? "").padEnd(8)} | ${nombre} | monto=${row[6]} | semana=${row[7]}`
      );
    }
  }

  console.log("\n✓ H1 actualizado.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
