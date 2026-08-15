import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { isAdminRequestAuthorized } from "@/lib/admin-auth";

function getBackupSheets() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return {
    sheets: google.sheets({ version: "v4", auth }),
    spreadsheetId: process.env.BACKUP_SHEET_ID!,
  };
}

export type BackupIntegrityStatus = {
  ok: boolean;
  totalTabs: number;
  fechasContadas: number;
  ultimaFecha: string | null;
  fechasPresentes: string[];
  gapDetectado: boolean;
  mensaje: string;
};

export async function GET(req: NextRequest) {
  if (!isAdminRequestAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!process.env.BACKUP_SHEET_ID) {
    return NextResponse.json(
      { error: "BACKUP_SHEET_ID no configurado en entorno." },
      { status: 500 }
    );
  }

  try {
    const { sheets, spreadsheetId } = getBackupSheets();
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetList = meta.data.sheets ?? [];
    const totalTabs = sheetList.length;

    const fechasSet = new Set<string>();
    for (const s of sheetList) {
      const title = s.properties?.title ?? "";
      // Formato: H1_YYYY-MM-DD o H2_YYYY-MM-DD etc.
      const match = title.match(/_(\d{4}-\d{2}-\d{2})$/);
      if (match) {
        fechasSet.add(match[1]);
      }
    }

    const fechasPresentes = Array.from(fechasSet).sort();
    const fechasContadas = fechasPresentes.length;
    const ultimaFecha = fechasPresentes.length > 0 ? fechasPresentes[fechasPresentes.length - 1] : null;

    // Verificar si la última fecha es de hoy o ayer
    const hoy = new Date().toISOString().split("T")[0];
    const ayerDate = new Date();
    ayerDate.setDate(ayerDate.getDate() - 1);
    const ayer = ayerDate.toISOString().split("T")[0];

    const esReciente = ultimaFecha === hoy || ultimaFecha === ayer;
    const ok = totalTabs > 0 && esReciente;

    return NextResponse.json({
      ok,
      totalTabs,
      fechasContadas,
      ultimaFecha,
      fechasPresentes,
      gapDetectado: !ok,
      mensaje: ok
        ? `Backup al día (${ultimaFecha}). ${totalTabs} pestañas agrupadas en ${fechasContadas} fechas.`
        : `Atención: Último backup registrado es del ${ultimaFecha ?? "desconocido"}.`,
    } satisfies BackupIntegrityStatus);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al consultar estado de backup" },
      { status: 500 }
    );
  }
}
