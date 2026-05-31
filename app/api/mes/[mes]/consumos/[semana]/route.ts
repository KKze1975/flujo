import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/data/provider";
import type { Semana } from "@/lib/data/types";

const MES_REGEX = /^\d{4}-\d{2}$/;
const SEMANAS_VALIDAS: Semana[] = ["S1", "S2", "S3", "S4"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mes: string; semana: string }> }
) {
  const { mes, semana } = await params;

  if (!MES_REGEX.test(mes)) {
    return Response.json({ error: "Formato de mes inválido." }, { status: 400 });
  }
  if (!SEMANAS_VALIDAS.includes(semana as Semana)) {
    return Response.json({ error: "Semana inválida." }, { status: 400 });
  }

  const provider = getProvider();
  try {
    const consumos = await provider.getConsumosByMesYSemana(mes, semana as Semana);
    return Response.json({ consumos });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error interno";
    return Response.json({ error: msg }, { status: 500 });
  }
}
