import fs from "fs";
import { google } from "googleapis";

const envContent = fs.readFileSync(".env.local", "utf-8");
const envVars = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx > 0) {
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    envVars[key] = val.replace(/\\n/g, "\n");
  }
}

const H3_HEADERS = [
  "id_consumo", "id_bolsillo", "mes", "semana", "descripcion",
  "monto", "ejecutor", "fuente_en_mano", "fuente_nequi",
  "fuente_camilo", "fuente_angie", "fecha", "comprobante_url", "clasificado",
  "sobre_techo", "id_recarga_origen", "imprevisto",
];

const auth = new google.auth.JWT({
  email: envVars.GOOGLE_CLIENT_EMAIL,
  key: envVars.GOOGLE_PRIVATE_KEY,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

async function ensureH3Prod() {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: envVars.PROD_GOOGLE_SHEET_ID });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === "H3");
  if (!exists) {
    console.log("Creating H3 tab in PROD Sheet...");
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: envVars.PROD_GOOGLE_SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: "H3" } } }] },
    });
  }
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: envVars.PROD_GOOGLE_SHEET_ID,
      range: `H3!A1:${String.fromCharCode(64 + H3_HEADERS.length)}1`,
    });
    const existing = res.data.values?.[0] ?? [];
    if (existing[0] === "id_consumo" && existing.length >= H3_HEADERS.length) return;
  } catch {
    // Write headers
  }
  console.log("Writing H3 headers in PROD Sheet...");
  await sheets.spreadsheets.values.update({
    spreadsheetId: envVars.PROD_GOOGLE_SHEET_ID,
    range: "H3!A1",
    valueInputOption: "RAW",
    requestBody: { values: [H3_HEADERS] },
  });
}

async function main() {
  console.log("=== Migrating August Uber Consumptions from DEV to PROD ===");
  console.log(`DEV Sheet ID: ${envVars.GOOGLE_SHEET_ID}`);
  console.log(`PROD Sheet ID: ${envVars.PROD_GOOGLE_SHEET_ID}`);

  // 1. Read DEV H3
  const devRes = await sheets.spreadsheets.values.get({
    spreadsheetId: envVars.GOOGLE_SHEET_ID,
    range: "H3!A:Q",
  });
  const devRows = devRes.data.values ?? [];
  const devAugUberRows = devRows.filter(r => r[2] === "2026-08" && (r[4] ?? "").includes("Uber"));

  console.log(`Found ${devAugUberRows.length} August Uber rows in DEV Sheet:`);
  for (const r of devAugUberRows) {
    console.log(`  - [${r[11]}] $${r[5]} | ${r[4]}`);
  }

  if (devAugUberRows.length === 0) {
    console.log("No August Uber rows found in DEV Sheet to migrate.");
    return;
  }

  // 2. Ensure PROD H3 tab and headers exist
  await ensureH3Prod();

  // 3. Read PROD H3 existing dedupe keys
  const prodRes = await sheets.spreadsheets.values.get({
    spreadsheetId: envVars.PROD_GOOGLE_SHEET_ID,
    range: "H3!A:Q",
  });
  const prodRows = prodRes.data.values ?? [];
  const prodDedupeKeys = new Set();
  for (const r of prodRows) {
    const desc = r[4] ?? "";
    const m = desc.match(/\[dedupe:([a-f0-9]{8})\]/);
    if (m) prodDedupeKeys.add(m[1]);
  }

  const rowsToAppend = [];
  for (const r of devAugUberRows) {
    const desc = r[4] ?? "";
    const m = desc.match(/\[dedupe:([a-f0-9]{8})\]/);
    const key = m ? m[1] : null;
    if (key && prodDedupeKeys.has(key)) {
      console.log(`Skipping already present in PROD: ${desc}`);
      continue;
    }
    rowsToAppend.push(r);
  }

  if (rowsToAppend.length === 0) {
    console.log("All August Uber rows are already present in PROD Sheet.");
  } else {
    console.log(`\nAppending ${rowsToAppend.length} rows to PROD Sheet H3...`);
    await sheets.spreadsheets.values.append({
      spreadsheetId: envVars.PROD_GOOGLE_SHEET_ID,
      range: "H3!A:Q",
      valueInputOption: "RAW",
      requestBody: { values: rowsToAppend },
    });
    console.log("Append complete!");
  }

  // 4. Verify PROD H3 read-back
  console.log("\n=== Verifying PROD Sheet H3 read-back ===");
  const verifyRes = await sheets.spreadsheets.values.get({
    spreadsheetId: envVars.PROD_GOOGLE_SHEET_ID,
    range: "H3!A:Q",
  });
  const verifyRows = verifyRes.data.values ?? [];
  const prodAugUberRows = verifyRows.filter(r => r[2] === "2026-08" && (r[4] ?? "").includes("Uber"));
  console.log(`Verified ${prodAugUberRows.length} August Uber rows in PROD Sheet:`);
  for (const r of prodAugUberRows) {
    console.log(`  - [${r[11]}] ${r[3]} | $${r[5]} | ${r[4]}`);
  }
}

main().catch(err => console.error(err));
