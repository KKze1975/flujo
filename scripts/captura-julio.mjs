// captura-julio.mjs — Snapshot del Sheet producción para experimento Julio 2026
// Lee H2, H3B, H4A, H4B para mes=2026-07 y genera un archivo numerado en scripts/capturas/.
// Solo lectura — nunca modifica el Sheet.
// Uso: node scripts/captura-julio.mjs "descripción del paso que acabo de hacer"

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { google } from "googleapis";

const __dir = dirname(fileURLToPath(import.meta.url));
const MES = "2026-07";

// ── Credenciales ──────────────────────────────────────────────────────────────

const envRaw = readFileSync(join(__dir, "../.env.local"), "utf-8");
const env = {};
for (const line of envRaw.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const idx = t.indexOf("=");
  if (idx === -1) continue;
  env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim().replace(/^"(.*)"$/, "$1");
}

// Lee producción — leer PROD_GOOGLE_SHEET_ID de .env.local (nunca hardcodear el ID)
const spreadsheetId = env.PROD_GOOGLE_SHEET_ID;
if (!spreadsheetId) {
  console.error("Error: PROD_GOOGLE_SHEET_ID no está definido en .env.local");
  process.exit(1);
}

const auth = new google.auth.JWT({
  email: env.GOOGLE_CLIENT_EMAIL,
  key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

// ── Helpers ───────────────────────────────────────────────────────────────────

async function readRange(range) {
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    return res.data.values ?? [];
  } catch {
    return [];
  }
}

function toObjects(rawRows) {
  if (!rawRows || rawRows.length < 2) return [];
  const [hdrs, ...rows] = rawRows;
  return rows
    .filter(r => r && r[0])
    .map(r => Object.fromEntries(hdrs.map((h, i) => [h || `_col${i}`, r[i] ?? ""])));
}

function filterMes(rawRows) {
  return toObjects(rawRows).filter(o => o.mes === MES);
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function cop(n) {
  if (n === 0) return "$0";
  return "$" + Math.round(n).toLocaleString("es-CO");
}

// ── Main ──────────────────────────────────────────────────────────────────────

const descripcion = (process.argv[2] ?? "").trim() || "sin descripción";

const capturasDir = join(__dir, "capturas");
if (!existsSync(capturasDir)) mkdirSync(capturasDir, { recursive: true });

const existing = existsSync(capturasDir)
  ? readdirSync(capturasDir).filter(f => /^snapshot-\d{3}-.*\.json$/.test(f))
  : [];
const numero = existing.length + 1;
const numStr = String(numero).padStart(3, "0");
const slug = slugify(descripcion);
const filename = `snapshot-${numStr}-${slug}.json`;

// Lee el Sheet
const [rawH2, rawH3B, rawH4A, rawH4B] = await Promise.all([
  readRange("H2!A:Y"),
  readRange("H3!A:P"),
  readRange("H4!A:G"),
  readRange("H4!I:N"),
]);

const h2Julio  = filterMes(rawH2);
const h3bJulio = filterMes(rawH3B);
const h4aJulio = filterMes(rawH4A);
const h4bJulio = filterMes(rawH4B);

// Calcula resumen — excluye estado=no_aplica (mismo criterio que el motor de la app)
const advertencias = [];
let comprometidoTotal = 0;
const comprometidoPorSemana = { S1: 0, S2: 0, S3: 0, S4: 0 };
const montoPorConcepto = [];

for (const row of h2Julio) {
  if (row.estado === "no_aplica") continue;

  const monto = parseFloat(row.monto_presupuestado);
  if (isNaN(monto)) {
    advertencias.push(`${row.id_movimiento}: monto_presupuestado no parseable ("${row.monto_presupuestado}")`);
    continue;
  }

  comprometidoTotal += monto;
  const sem = row.semana;
  if (sem in comprometidoPorSemana) comprometidoPorSemana[sem] += monto;

  montoPorConcepto.push({
    nombre: row.nombre_snapshot,
    semana: row.semana,
    monto,
  });
}

const snapshot = {
  numero,
  timestamp: new Date().toISOString(),
  descripcion,
  H2_julio: {
    conteo: h2Julio.length,
    filas: h2Julio,
  },
  H3B_julio: {
    conteo: h3bJulio.length,
    filas: h3bJulio,
  },
  H4_julio: {
    conteo: h4aJulio.length + h4bJulio.length,
    filas: [
      ...h4aJulio.map(o => ({ _tab: "H4A_ingreso_camilo", ...o })),
      ...h4bJulio.map(o => ({ _tab: "H4B_aportes_angie", ...o })),
    ],
  },
  resumen: {
    comprometido_total: comprometidoTotal,
    comprometido_por_semana: comprometidoPorSemana,
    monto_presupuestado_por_concepto: montoPorConcepto,
    ...(advertencias.length > 0 ? { advertencia: advertencias } : {}),
  },
};

const outPath = join(capturasDir, filename);
writeFileSync(outPath, JSON.stringify(snapshot, null, 2), "utf-8");

// Resumen en consola
const s = comprometidoPorSemana;
console.log(`\n[SNAPSHOT ${numStr}] "${descripcion}"`);
console.log(`  H2: ${h2Julio.length} filas | Comprometido total: ${cop(comprometidoTotal)} | S1:${cop(s.S1)} S2:${cop(s.S2)} S3:${cop(s.S3)} S4:${cop(s.S4)}`);
if (advertencias.length > 0) {
  console.log(`  ⚠️  ${advertencias.length} advertencia(s):`);
  advertencias.forEach(w => console.log(`     ${w}`));
}
console.log(`  → ${outPath}\n`);
