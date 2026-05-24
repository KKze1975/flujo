// Actualiza montos confirmados en H1 y retira Ayuda mamá servicios
// Uso: node scripts/update-h1-montos.mjs

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
// Filas en H1 (1=header, data empieza en 2):
//   Fila 21 — SALUD_1748100020 — EPS / ARL / Pensión
//   Fila 22 — SALUD_1748100021 — Plan complementario
//   Fila 23 — SALUD_1748100022 — Dr. Sánchez (Angie)
//   Fila 24 — MERCADO_Y_ALIMENTACION_1748100023 — Mercado mensual
//   Fila 30 — MERCADO_Y_ALIMENTACION_1748100029 — Chucherías viernes
//   Fila 35 — COMPROMISOS_FINANCIEROS_1748100034 — Ayuda mamá servicios

async function main() {
  const data = [
    { range: "H1!G21", values: [[540000]] },   // EPS / ARL / Pensión
    { range: "H1!G22", values: [[740000]] },   // Plan complementario
    { range: "H1!G23", values: [[115000]] },   // Dr. Sánchez (Angie)
    { range: "H1!G24", values: [[600000]] },   // Mercado mensual
    { range: "H1!G30", values: [[40000]] },    // Chucherías viernes
    { range: "H1!J35", values: [["retirado"]] }, // Ayuda mamá servicios → retirado
    { range: "H1!K35", values: [["2026-05-24"]] }, // fecha_retiro
  ];

  console.log("Actualizando H1...");
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data,
    },
  });

  console.log("Verificando filas actualizadas...");
  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: ["H1!A21:L21", "H1!A22:L22", "H1!A23:L23", "H1!A24:L24", "H1!A30:L30", "H1!A35:L35"],
  });

  for (const vr of res.data.valueRanges ?? []) {
    const row = vr.values?.[0];
    if (!row) continue;
    console.log(`  ${row[1]} | monto=${row[6]} | estado=${row[9]}`);
  }
  console.log("✓ H1 actualizado.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
