import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/data/provider";
import { isAdminRequestAuthorized } from "@/lib/admin-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequestAuthorized(req)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  let body: { action?: string };
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }

  if (body.action !== "retirar") {
    return Response.json({ error: "Acción no soportada" }, { status: 400 });
  }

  try {
    const provider = getProvider();
    
    // Guardia: verificar movimientos en estado "pendiente" en cualquier mes activo
    const movimientos = await provider.getMovimientos();
    const pendientes = movimientos.filter(
      (m) => m.conceptoId === id && m.estado === "pendiente"
    );

    if (pendientes.length > 0) {
      return Response.json(
        {
          error: `No se puede retirar el concepto porque tiene ${pendientes.length} movimiento(s) pendiente(s) registrado(s).`,
        },
        { status: 400 }
      );
    }

    const retirado = await provider.retirarConcepto(id);
    return Response.json(retirado);
  } catch (e: unknown) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Error interno" },
      { status: 500 }
    );
  }
}
