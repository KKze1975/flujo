import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/data/provider";

const MES_REGEX = /^\d{4}-\d{2}$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mes: string }> }
) {
  const { mes } = await params;

  if (!MES_REGEX.test(mes)) {
    return Response.json(
      { error: "Formato de mes inválido. Use YYYY-MM." },
      { status: 400 }
    );
  }

  const provider = getProvider();
  const movimientos = await provider.getMovimientos(mes);

  if (movimientos.length === 0) {
    return Response.json(
      { error: "El mes no ha sido inicializado.", mes },
      { status: 404 }
    );
  }

  return Response.json(movimientos);
}
