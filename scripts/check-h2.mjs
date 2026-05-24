// Verifica el contenido de H2 para el DoD del Ticket 5
// Uso: node scripts/check-h2.mjs

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

async function main() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "H2!A:V",
  });

  const rows = res.data.values ?? [];
  if (rows.length < 2) { console.log("H2 vacía"); return; }

  const [headers, ...data] = rows;
  const col = (row, name) => row[headers.indexOf(name)] ?? "";

  const filas = data.filter(r => r.length > 0 && r[0]);

  console.log(`\n--- H2 total filas: ${filas.length} ---\n`);

  // DoD checks
  const ayudaMamaServicios = filas.find(r => col(r, "nombre_snapshot") === "Ayuda mamá servicios");
  const agua = filas.find(r => col(r, "nombre_snapshot") === "Agua");
  const drSanchez = filas.find(r => col(r, "nombre_snapshot") === "Dr. Sánchez (Angie)");
  const arriendo = filas.find(r => col(r, "nombre_snapshot") === "Arriendo y Administración");
  const estadosPendientes = filas.every(r => col(r, "estado") === "pendiente");

  console.log("✅ DoD — Agua aparece:", !!agua);
  if (agua) console.log("   Agua semana:", col(agua, "semana"), "| estado:", col(agua, "estado"));

  console.log("✅ DoD — Ayuda mamá servicios NO aparece:", !ayudaMamaServicios);

  console.log("✅ DoD — Dr. Sánchez semana = null/vacío:", drSanchez ? (col(drSanchez, "semana") === "" ? "OK (vacío=null)" : `❌ tiene semana=${col(drSanchez, "semana")}`) : "❌ No encontrado");

  console.log("✅ DoD — Arriendo semana = S1:", arriendo ? (col(arriendo, "semana") === "S1" ? "OK" : `❌ tiene semana=${col(arriendo, "semana")}`) : "❌ No encontrado");

  console.log("✅ DoD — Todas con estado=pendiente:", estadosPendientes ? "OK" : "❌ hay estados distintos");

  if (!estadosPendientes) {
    const otros = filas.filter(r => col(r, "estado") !== "pendiente");
    otros.forEach(r => console.log(`   ❌ ${col(r, "nombre_snapshot")} estado=${col(r, "estado")}`));
  }

  console.log("\n--- Todas las filas ---");
  filas.forEach(r => {
    const semana = col(r, "semana") || "null";
    console.log(`  ${col(r, "nombre_snapshot")} | semana=${semana} | monto=${col(r, "monto_presupuestado")} | estado=${col(r, "estado")}`);
  });
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
