import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
const MES_REGEX = /^\d{4}-\d{2}$/;

function getSheets() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return {
    sheets: google.sheets({ version: "v4", auth }),
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
  };
}

type DeleteResult = { label: string; borradas: number };

async function deleteRowsByMes(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  mes: string,
  rangeRead: string,
  rangeClear: string,
  rangeWrite: string,
  label: string
): Promise<DeleteResult> {
  let raw: string[][] | null | undefined;
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: rangeRead });
    raw = res.data.values as string[][] | undefined;
  } catch {
    return { label, borradas: 0 };
  }

  if (!raw || raw.length < 2) return { label, borradas: 0 };

  const [headers, ...rows] = raw;
  const mesI = headers.indexOf("mes");
  if (mesI === -1) return { label, borradas: 0 };

  const junioRows = rows.filter((r) => (r[mesI] ?? "") === mes);
  const otherRows = rows.filter((r) => (r[mesI] ?? "") !== mes && r[0]);

  if (junioRows.length === 0) return { label, borradas: 0 };

  await sheets.spreadsheets.values.clear({ spreadsheetId, range: rangeClear });
  if (otherRows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: rangeWrite,
      valueInputOption: "RAW",
      requestBody: { values: otherRows },
    });
  }

  return { label, borradas: junioRows.length };
}

async function resetH2(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  mes: string
): Promise<DeleteResult> {
  let antes = 0;
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "H2!A:Y" });
    const raw = res.data.values as string[][] | undefined;
    if (raw && raw.length >= 2) {
      const mesI = raw[0].indexOf("mes");
      if (mesI !== -1) antes = raw.slice(1).filter((r) => (r[mesI] ?? "") === mes).length;
    }
  } catch { /* vacía */ }

  if (antes === 0) return { label: "H2", borradas: 0 };

  await sheets.spreadsheets.values.clear({ spreadsheetId, range: "H2!A2:Z1000" });
  return { label: "H2", borradas: antes };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const mes: string = body.mes ?? "";

  if (!MES_REGEX.test(mes)) {
    return NextResponse.json({ error: "Formato de mes inválido. Use YYYY-MM." }, { status: 400 });
  }

  const { sheets, spreadsheetId } = getSheets();

  // ── Reset ──────────────────────────────────────────────────────────────────

  const [h2, h3b, h4a, h4b, h4c, h4d, h5a, h5b] = await Promise.all([
    resetH2(sheets, spreadsheetId, mes),
    deleteRowsByMes(sheets, spreadsheetId, mes, "H3!A:P",   "H3!A2:P10000",   "H3!A2",   "H3B"),
    deleteRowsByMes(sheets, spreadsheetId, mes, "H4!A:G",   "H4!A2:G10000",   "H4!A2",   "H4A"),
    deleteRowsByMes(sheets, spreadsheetId, mes, "H4!I:N",   "H4!I2:N10000",   "H4!I2",   "H4B"),
    deleteRowsByMes(sheets, spreadsheetId, mes, "H4!P:V",   "H4!P2:V10000",   "H4!P2",   "H4C"),
    deleteRowsByMes(sheets, spreadsheetId, mes, "H4!X:AE",  "H4!X2:AE10000",  "H4!X2",   "H4D"),
    deleteRowsByMes(sheets, spreadsheetId, mes, "H5!A:N",   "H5!A2:N10000",   "H5!A2",   "H5A"),
    deleteRowsByMes(sheets, spreadsheetId, mes, "H5B!A:I",  "H5B!A2:I10000",  "H5B!A2",  "H5B"),
  ]);

  return NextResponse.json({
    mes,
    reset: { h2: h2.borradas, h3b: h3b.borradas, h4a: h4a.borradas, h4b: h4b.borradas, h4c: h4c.borradas, h4d: h4d.borradas, h5a: h5a.borradas, h5b: h5b.borradas },
  });
}
