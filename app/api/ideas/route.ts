import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/data/provider";
import type { Actor } from "@/lib/data/types";

type Body = {
  propuestaPor?: Actor;
  descripcion?: string;
  casoDeUso?: string;
  motivoImportancia?: string;
};

function esActorValido(v: unknown): v is Actor {
  return v === "camilo" || v === "angie";
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body inválido." }, { status: 400 });
  }

  const { propuestaPor, descripcion, casoDeUso, motivoImportancia } = body;

  if (
    !esActorValido(propuestaPor) ||
    !descripcion?.trim() ||
    !casoDeUso?.trim() ||
    !motivoImportancia?.trim()
  ) {
    return Response.json(
      { error: "Campos requeridos incompletos: propuestaPor, descripcion, casoDeUso, motivoImportancia." },
      { status: 400 }
    );
  }

  try {
    const idea = await getProvider().createIdea({
      propuestaPor,
      descripcion: descripcion.trim(),
      casoDeUso: casoDeUso.trim(),
      motivoImportancia: motivoImportancia.trim(),
    });
    return Response.json({ idea });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error guardando en H10";
    return Response.json({ error: msg }, { status: 500 });
  }
}
