import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/data/provider";
import type { Actor, Semana } from "@/lib/data/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: {
    descripcion?: string;
    monto?: number;
    ejecutor?: Actor;
    fuenteEnMano?: boolean;
    fuenteNequi?: boolean;
    fuenteCamilo?: boolean;
    fuenteAngie?: boolean;
    bolsilloId?: string;
    clasificado?: boolean;
    sobreTecho?: boolean;
    semana?: Semana;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body inválido." }, { status: 400 });
  }

  const provider = getProvider();
  try {
    const updated = await provider.updateConsumoH3(id, {
      ...(body.descripcion !== undefined && { descripcion: body.descripcion }),
      ...(body.monto !== undefined && { monto: body.monto }),
      ...(body.ejecutor !== undefined && { ejecutor: body.ejecutor }),
      ...(body.fuenteEnMano !== undefined && { fuenteEnMano: body.fuenteEnMano }),
      ...(body.fuenteNequi !== undefined && { fuenteNequi: body.fuenteNequi }),
      ...(body.fuenteCamilo !== undefined && { fuenteCamilo: body.fuenteCamilo }),
      ...(body.fuenteAngie !== undefined && { fuenteAngie: body.fuenteAngie }),
      ...(body.bolsilloId !== undefined && { bolsilloId: body.bolsilloId }),
      ...(body.clasificado !== undefined && { clasificado: body.clasificado }),
      ...(body.sobreTecho !== undefined && { sobreTecho: body.sobreTecho }),
      ...(body.semana !== undefined && { semana: body.semana }),
    });
    return Response.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error interno";
    return Response.json({ error: msg }, { status: 500 });
  }
}
