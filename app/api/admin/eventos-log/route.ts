import { NextRequest, NextResponse } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/admin-auth";
import { getProvider } from "@/lib/data/provider";
import type { TipoEventoLog } from "@/lib/data/types";

export async function GET(req: NextRequest) {
  if (!isAdminRequestAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tipoEvento = searchParams.get("tipoEvento") as TipoEventoLog | null;
  const mes = searchParams.get("mes");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  const provider = getProvider();

  try {
    const eventos = await provider.getEventosLog({
      ...(tipoEvento ? { tipoEvento } : {}),
      ...(mes ? { mes } : {}),
      ...(desde ? { desde } : {}),
      ...(hasta ? { hasta } : {}),
    });
    return NextResponse.json({ eventos });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdminRequestAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const provider = getProvider();

  try {
    const eliminados = await provider.limpiarEventosLogAntiguos(14);
    return NextResponse.json({ ok: true, eliminados });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
