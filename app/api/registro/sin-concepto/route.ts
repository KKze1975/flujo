import { google } from "googleapis";
import type { NextRequest } from "next/server";

const H3B_HEADERS = [
  "id_consumo", "id_bolsillo", "mes", "semana", "descripcion",
  "monto", "ejecutor", "fuente_en_mano", "fuente_nequi",
  "fuente_camilo", "fuente_angie", "fecha", "comprobante_url", "clasificado",
  "sobre_techo", "id_recarga_origen", "imprevisto",
];

function getSheets() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function ensureH3(sheets: ReturnType<typeof getSheets>) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
  });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === "H3");
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: "H3" } } }] },
    });
  }
  // Write headers if row 1 is missing, wrong, or has fewer columns than H3B_HEADERS
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `H3!A1:${String.fromCharCode(64 + H3B_HEADERS.length)}1`,
    });
    const existing = res.data.values?.[0] ?? [];
    if (existing[0] === "id_consumo" && existing.length >= H3B_HEADERS.length) return;
  } catch {
    // Proceed to write headers
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "H3!A1",
    valueInputOption: "RAW",
    requestBody: { values: [H3B_HEADERS] },
  });
}

function semanaActual(): "S1" | "S2" | "S3" | "S4" {
  const dia = new Date().getDate();
  if (dia <= 7)  return "S1";
  if (dia <= 14) return "S2";
  if (dia <= 21) return "S3";
  return "S4";
}

type Body = {
  mes: string;
  descripcion: string;
  monto: number;
  ejecutor: "camilo" | "angie";
  fuente: "en_mano" | "nequi" | "camilo" | "angie";
  bolsilloId?: string;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body inválido." }, { status: 400 });
  }

  if (!body.mes || !body.monto || !body.ejecutor || !body.fuente) {
    return Response.json({ error: "Campos requeridos incompletos." }, { status: 400 });
  }

  const sheets = getSheets();
  try {
    await ensureH3(sheets);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error creando H3";
    return Response.json({ error: msg }, { status: 500 });
  }

  const id = `CONSUMO_${Date.now()}`;
  const hoy = new Date().toISOString().split("T")[0];
  const semana = semanaActual();
  const clasificado = body.bolsilloId ? "TRUE" : "FALSE";
  const row = [
    id,
    body.bolsilloId ?? "PENDIENTE_CLASIFICACION",
    body.mes,
    semana,
    body.descripcion ?? "",
    String(body.monto),
    body.ejecutor,
    body.fuente === "en_mano" ? "TRUE" : "FALSE",
    body.fuente === "nequi" ? "TRUE" : "FALSE",
    body.fuente === "camilo" ? "TRUE" : "FALSE",
    body.fuente === "angie" ? "TRUE" : "FALSE",
    hoy,
    "",
    clasificado,
    "",
    "",
    "FALSE",
  ];

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "H3!A:Q",
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });
    return Response.json({ id, clasificado: !!body.bolsilloId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error guardando en H3";
    return Response.json({ error: msg }, { status: 500 });
  }
}
