import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/data/provider";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { imprevisto: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body inválido." }, { status: 400 });
  }

  if (typeof body.imprevisto !== "boolean") {
    return Response.json({ error: "imprevisto debe ser boolean." }, { status: 400 });
  }

  const provider = getProvider();
  try {
    const updated = await provider.updateConsumoH3(id, { imprevisto: body.imprevisto });
    return Response.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error interno";
    return Response.json({ error: msg }, { status: 500 });
  }
}
