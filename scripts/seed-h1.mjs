// Script de uso único — carga los 40 conceptos reales en H1 del Google Sheet
// Uso: node scripts/seed-h1.mjs

import { readFileSync } from "fs";
import { google } from "googleapis";

// ── Leer .env.local ───────────────────────────────────────────────────────────
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

// ── Auth ──────────────────────────────────────────────────────────────────────
const auth = new google.auth.JWT({
  email: env.GOOGLE_CLIENT_EMAIL,
  key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });
const spreadsheetId = env.GOOGLE_SHEET_ID;

// ── Datos: 40 conceptos reales ────────────────────────────────────────────────
// Columnas: id_concepto | nombre | categoria | tipo | frecuencia |
//           mes_activo_bimestral | monto_referencia | semana_default |
//           requiere_aprobacion | estado_concepto | fecha_retiro | notas
const rows = [
  ["CASA_1748100001","Arriendo y Administración","Casa","fijo","mensual","",5172500,"S1","TRUE","activo","",""],
  ["SERVICIOS_PUBLICOS_1748100002","Agua","Servicios Públicos","fijo","bimestral","enero,marzo,mayo,julio,septiembre,noviembre",250000,"S1","FALSE","activo","","Bimestral — provisionado mensualmente"],
  ["SERVICIOS_PUBLICOS_1748100003","Energía","Servicios Públicos","fijo","mensual","",241000,"S1","FALSE","activo","",""],
  ["SERVICIOS_PUBLICOS_1748100004","Gas","Servicios Públicos","fijo","mensual","",195000,"S1","FALSE","activo","",""],
  ["SERVICIOS_PUBLICOS_1748100005","Internet y TV","Servicios Públicos","fijo","mensual","",122000,"S1","FALSE","activo","",""],
  ["SERVICIOS_PUBLICOS_1748100006","Celular Camilo","Servicios Públicos","fijo","mensual","",62000,"S1","FALSE","activo","",""],
  ["SERVICIOS_PUBLICOS_1748100007","Celular Angie","Servicios Públicos","bolsillo","mensual","",80000,"S1","FALSE","activo","","Varía cada mes — techo 80.000"],
  ["MEMBRESIAS_1748100008","Netflix","Membresías y Suscripciones","fijo","mensual","",50000,"S1","FALSE","activo","",""],
  ["MEMBRESIAS_1748100009","Spotify","Membresías y Suscripciones","fijo","mensual","",30000,"S1","FALSE","activo","",""],
  ["MEMBRESIAS_1748100010","Google One","Membresías y Suscripciones","fijo","mensual","",79000,"S1","FALSE","activo","",""],
  ["MEMBRESIAS_1748100011","Claude Pro","Membresías y Suscripciones","fijo","mensual","",105000,"S1","FALSE","activo","","~USD 25 — verificar cobro exacto en COP"],
  ["MEMBRESIAS_1748100012","Disney+","Membresías y Suscripciones","discrecional","mensual","",60000,"S1","FALSE","activo","",""],
  ["MEMBRESIAS_1748100013","Prime Video","Membresías y Suscripciones","discrecional","mensual","",50000,"S1","FALSE","activo","",""],
  ["MEMBRESIAS_1748100014","PS Plus","Membresías y Suscripciones","discrecional","mensual","",60000,"S1","FALSE","activo","",""],
  ["MEMBRESIAS_1748100015","Game Pass","Membresías y Suscripciones","discrecional","mensual","",50000,"S1","FALSE","activo","",""],
  ["MEMBRESIAS_1748100016","Uber One","Membresías y Suscripciones","discrecional","mensual","",16000,"S1","FALSE","activo","",""],
  ["MEMBRESIAS_1748100017","NY Times","Membresías y Suscripciones","discrecional","mensual","",4500,"S1","FALSE","activo","",""],
  ["MEMBRESIAS_1748100018","El País","Membresías y Suscripciones","discrecional","mensual","",45000,"S1","FALSE","activo","",""],
  ["EDUCACION_1748100019","Colegio hijos","Educación","fijo","mensual","",4299000,"S1","TRUE","activo","",""],
  ["SALUD_1748100020","EPS / ARL / Pensión","Salud","fijo","mensual","",0,"S2","FALSE","activo","","Monto pendiente de confirmar"],
  ["SALUD_1748100021","Plan complementario","Salud","fijo","mensual","",0,"S2","FALSE","activo","","Monto pendiente de confirmar"],
  ["SALUD_1748100022","Dr. Sánchez (Angie)","Salud","fijo","mensual","",0,"variable","FALSE","activo","","Monto pendiente de confirmar"],
  ["MERCADO_Y_ALIMENTACION_1748100023","Mercado mensual","Mercado y Alimentación","bolsillo","mensual","",0,"S1","FALSE","activo","","Monto pendiente de confirmar"],
  ["MERCADO_Y_ALIMENTACION_1748100024","Mercado semanal","Mercado y Alimentación","bolsillo","semanal","",550000,"variable","FALSE","activo","",""],
  ["MERCADO_Y_ALIMENTACION_1748100025","Mesada Emma","Mercado y Alimentación","fijo","semanal","",40000,"variable","FALSE","activo","",""],
  ["MERCADO_Y_ALIMENTACION_1748100026","Mesada Lucas","Mercado y Alimentación","fijo","semanal","",120000,"variable","FALSE","activo","","Anticipos y préstamos con trazabilidad en M4"],
  ["MERCADO_Y_ALIMENTACION_1748100027","Empleada Mireyita","Mercado y Alimentación","fijo","semanal","",150000,"variable","FALSE","activo","",""],
  ["MERCADO_Y_ALIMENTACION_1748100028","Provisión Mireyita","Mercado y Alimentación","fijo","mensual","",100000,"S1","FALSE","activo","","Provisión primas y vacaciones"],
  ["MERCADO_Y_ALIMENTACION_1748100029","Chucherías viernes","Mercado y Alimentación","discrecional","semanal","",0,"variable","FALSE","activo","","Monto pendiente de confirmar"],
  ["COMPROMISOS_FINANCIEROS_1748100030","Abono capital TC","Compromisos Financieros","fijo","mensual","",800000,"S4","TRUE","activo","","Intocable — meta liquidación TC"],
  ["COMPROMISOS_FINANCIEROS_1748100031","Pago mínimo tarjetas","Compromisos Financieros","fijo","mensual","",900000,"S2","FALSE","activo","",""],
  ["COMPROMISOS_FINANCIEROS_1748100032","Préstamo Leonardo","Compromisos Financieros","fijo","mensual","",320840,"S1","FALSE","activo","","Cuotas — revisar número de cuotas restantes"],
  ["COMPROMISOS_FINANCIEROS_1748100033","Ayuda mamá","Compromisos Financieros","fijo","mensual","",340000,"S3","FALSE","activo","",""],
  ["COMPROMISOS_FINANCIEROS_1748100034","Ayuda mamá servicios","Compromisos Financieros","fijo","mensual","",100000,"S1","FALSE","activo","","Recurrente desde junio 2026"],
  ["RECREACION_1748100035","Entretenimiento","Recreación","bolsillo","mensual","",1000000,"variable","FALSE","activo","","250.000 semanal — techo 1.000.000"],
  ["RECREACION_1748100036","Ropa","Recreación","discrecional","mensual","",0,"variable","FALSE","activo","","Monto pendiente de confirmar"],
  ["TRANSPORTE_1748100037","Fondo transporte","Transporte","bolsillo","mensual","",350000,"S4","FALSE","activo","","Abono TC Uber"],
  ["METAS_FAMILIARES_1748100038","Fondo de emergencia","Metas Familiares","bolsillo","mensual","",200000,"variable","FALSE","activo","","Meta: 2.000.000"],
  ["METAS_FAMILIARES_1748100039","CDT NU","Metas Familiares","bolsillo","mensual","",0,"variable","FALSE","activo","","Se alimenta de remanentes — sin techo fijo"],
  ["FRIDA_1748100040","Frida","Frida","bolsillo","mensual","",150000,"variable","FALSE","activo","",""],
];

// ── Ejecutar ──────────────────────────────────────────────────────────────────
async function main() {
  console.log("Limpiando filas de prueba en H1...");
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: "H1!A2:L200",
  });

  console.log(`Escribiendo ${rows.length} conceptos reales...`);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "H1!A2",
    valueInputOption: "RAW",
    requestBody: { values: rows },
  });

  console.log(`✓ ${rows.length} conceptos escritos en H1.`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
