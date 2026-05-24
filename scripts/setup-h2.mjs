// Crea la pestaña H2 en el Google Sheet y escribe los headers
// Uso: node scripts/setup-h2.mjs

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

const HEADERS = [
  "id_movimiento", "id_concepto", "mes", "nombre_snapshot",
  "categoria_snapshot", "tipo_snapshot", "semana",
  "monto_presupuestado", "monto_ejecutado", "desviacion", "estado",
  "ejecutor", "fuente_en_mano", "fuente_nequi", "fuente_camilo", "fuente_angie",
  "fecha_ejecucion", "razon_desviacion", "razon_postergacion",
  "comprobante_url", "pendiente_aprobacion", "notas",
];

async function main() {
  // Obtener sheets existentes
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetNames = meta.data.sheets?.map(s => s.properties?.title) ?? [];

  if (!sheetNames.includes("H2")) {
    console.log("Creando pestaña H2...");
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: "H2" } } }],
      },
    });
    console.log("✓ Pestaña H2 creada.");
  } else {
    console.log("Pestaña H2 ya existe.");
  }

  console.log("Escribiendo headers en H2...");
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "H2!A1",
    valueInputOption: "RAW",
    requestBody: { values: [HEADERS] },
  });

  console.log(`✓ Headers escritos (${HEADERS.length} columnas): ${HEADERS.join(", ")}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
