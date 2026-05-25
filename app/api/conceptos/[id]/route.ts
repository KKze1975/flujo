import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/data/provider";
import type { SemanaDefault } from "@/lib/data/types";

const SEMANAS_VALIDAS: SemanaDefault[] = ["S1", "S2", "S3", "S4", "variable"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { monto?: number; semanaDefault?: SemanaDefault; notas?: string | null };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body inválido." }, { status: 400 });
  }

  if (body.monto !== undefined && (typeof body.monto !== "number" || body.monto < 0)) {
    return Response.json({ error: "monto inválido." }, { status: 400 });
  }
  if (body.semanaDefault !== undefined && !SEMANAS_VALIDAS.includes(body.semanaDefault)) {
    return Response.json({ error: "semanaDefault inválido." }, { status: 400 });
  }

  try {
    const updated = await getProvider().updateConcepto(id, {
      ...(body.monto !== undefined ? { monto: body.monto } : {}),
      ...(body.semanaDefault !== undefined ? { semanaDefault: body.semanaDefault } : {}),
      ...(body.notas !== undefined ? { notas: body.notas } : {}),
    });
    return Response.json(updated);
  } catch (e: unknown) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Error interno" },
      { status: 500 }
    );
  }
}
