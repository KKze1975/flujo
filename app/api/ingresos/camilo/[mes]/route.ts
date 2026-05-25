import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/data/provider";
import type { CuentaDestino } from "@/lib/data/types";

const MES_REGEX = /^\d{4}-\d{2}$/;
const CUENTAS: CuentaDestino[] = ["en_mano", "nequi", "camilo", "angie"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mes: string }> }
) {
  const { mes } = await params;
  if (!MES_REGEX.test(mes)) {
    return Response.json({ error: "Formato de mes inválido." }, { status: 400 });
  }
  try {
    const ingresos = await getProvider().getIngresoCamilo(mes);
    return Response.json(ingresos);
  } catch (e: unknown) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Error interno" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mes: string }> }
) {
  const { mes } = await params;
  if (!MES_REGEX.test(mes)) {
    return Response.json({ error: "Formato de mes inválido." }, { status: 400 });
  }

  let body: { montoCop: number; cuentaDestino: CuentaDestino; estado: "pendiente" | "confirmado"; notas?: string | null };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body inválido." }, { status: 400 });
  }

  if (typeof body.montoCop !== "number" || body.montoCop < 0) {
    return Response.json({ error: "montoCop inválido." }, { status: 400 });
  }
  if (!CUENTAS.includes(body.cuentaDestino)) {
    return Response.json({ error: "cuentaDestino inválida." }, { status: 400 });
  }

  const provider = getProvider();
  try {
    // Upsert: update if exists for this mes, create otherwise
    const existing = await provider.getIngresoCamilo(mes);
    const data = {
      mes,
      montoCop: body.montoCop,
      cuentaDestino: body.cuentaDestino,
      estado: body.estado ?? "pendiente",
      fechaConfirmacion: body.estado === "confirmado" ? new Date().toISOString().split("T")[0] : null,
      notas: body.notas ?? null,
    } as const;

    if (existing.length > 0) {
      const updated = await provider.updateIngresoCamilo(existing[0].id, data);
      return Response.json(updated);
    } else {
      const created = await provider.createIngresoCamilo(data);
      return Response.json(created, { status: 201 });
    }
  } catch (e: unknown) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Error interno" },
      { status: 500 }
    );
  }
}
