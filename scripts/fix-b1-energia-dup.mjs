// B1: Marca el movimiento duplicado de Energía (S3, pendiente) como no_aplica
// El movimiento correcto (S1, ejecutado) queda intacto.
// Uso: node scripts/fix-b1-energia-dup.mjs

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

// MOV_1780347503035 — Energía | mes=2026-06 | semana=S3 | estado=pendiente (duplicado)
// Debe marcarse como no_aplica para que no aparezca en planificación
// Columna K = estado (índice 10 en 0-based)
// H2 columnas: A=id_movimiento B=id_concepto C=mes D=nombre_snapshot ... K=estado

const TARGET_ID = "MOV_1780347503035";

async function main() {
  console.log("Leyendo H2...");
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "H2!A1:K500",
  });

  const rows = res.data.values ?? [];
  const rowIdx = rows.findIndex((r, i) => i > 0 && r[0] === TARGET_ID);
  if (rowIdx === -1) {
    console.error(`No se encontró ${TARGET_ID} en H2`);
    process.exit(1);
  }

  const fila = rowIdx + 1; // 1-based
  const row = rows[rowIdx];
  console.log(`  Fila ${fila}: id=${row[0]} nombre=${row[3]} semana=${row[6]} estado=${row[10]}`);

  if (row[10] === "no_aplica") {
    console.log("  Ya está no_aplica — no se requiere cambio.");
    return;
  }

  console.log(`  Marcando fila ${fila} como no_aplica...`);
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        { range: `H2!K${fila}`, values: [["no_aplica"]] },
      ],
    },
  });

  // Verificar
  const verif = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `H2!A${fila}:K${fila}`,
  });
  const updated = verif.data.values?.[0];
  console.log(`  Post-update: id=${updated?.[0]} estado=${updated?.[10]}`);
  console.log("✓ B1 data fix completado.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
