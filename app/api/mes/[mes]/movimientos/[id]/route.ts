import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/data/provider";
import type { Semana } from "@/lib/data/types";

const MES_REGEX = /^\d{4}-\d{2}$/;
const SEMANAS_VALIDAS: Semana[] = ["S1", "S2", "S3", "S4"];

type PatchBody =
  | {
      tipo: "ejecutar";
      montoEjecutado: number;
      fuenteEnMano: boolean;
      fuenteNequi: boolean;
      fuenteCamilo: boolean;
      fuenteAngie: boolean;
      razonDesviacion?: string | null;
    }
  | { tipo: "posponer"; nuevaSemana?: Semana }
  | { tipo: "no_aplica" }
  | { tipo: "reasignar_semana"; semana: Semana };

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ mes: string; id: string }> }
) {
  const { mes, id } = await params;

  if (!MES_REGEX.test(mes)) {
    return Response.json({ error: "Formato de mes inválido." }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body inválido." }, { status: 400 });
  }

  if (!body?.tipo || !["ejecutar", "posponer", "no_aplica", "reasignar_semana"].includes(body.tipo)) {
    return Response.json({ error: "tipo inválido." }, { status: 400 });
  }

  const provider = getProvider();

  try {
    const movimientos = await provider.getMovimientos(mes);
    const mov = movimientos.find((m) => m.id === id);
    if (!mov) {
      return Response.json({ error: "Movimiento no encontrado." }, { status: 404 });
    }

    const hoy = new Date().toISOString().split("T")[0];

    let patch: Parameters<typeof provider.updateMovimiento>[1];

    if (body.tipo === "ejecutar") {
      const montoEjecutado = body.montoEjecutado;
      if (typeof montoEjecutado !== "number" || montoEjecutado < 0) {
        return Response.json({ error: "montoEjecutado inválido." }, { status: 400 });
      }
      patch = {
        estado: "ejecutado",
        montoEjecutado,
        desviacion: montoEjecutado - mov.montoPresupuestado,
        ejecutor: "camilo",
        fuenteEnMano: body.fuenteEnMano,
        fuenteNequi: body.fuenteNequi,
        fuenteCamilo: body.fuenteCamilo,
        fuenteAngie: body.fuenteAngie,
        fechaEjecucion: hoy,
        razonDesviacion: body.razonDesviacion ?? null,
      };
    } else if (body.tipo === "posponer") {
      if (body.nuevaSemana && !SEMANAS_VALIDAS.includes(body.nuevaSemana)) {
        return Response.json({ error: "nuevaSemana inválida." }, { status: 400 });
      }
      patch = {
        estado: "pospuesto",
        ...(body.nuevaSemana ? { semana: body.nuevaSemana } : {}),
      };
    } else if (body.tipo === "reasignar_semana") {
      if (!SEMANAS_VALIDAS.includes(body.semana)) {
        return Response.json({ error: "semana inválida." }, { status: 400 });
      }
      patch = { semana: body.semana };
    } else {
      patch = { estado: "no_aplica" };
    }

    const updated = await provider.updateMovimiento(id, patch);
    return Response.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error interno";
    return Response.json({ error: msg }, { status: 500 });
  }
}
