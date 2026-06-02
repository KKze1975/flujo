import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/data/provider";
import type { Semana } from "@/lib/data/types";

const MES_REGEX = /^\d{4}-\d{2}$/;
const SEMANAS: Semana[] = ["S1", "S2", "S3", "S4"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mes: string; semana: string }> }
) {
  const { mes, semana } = await params;
  if (!MES_REGEX.test(mes) || !SEMANAS.includes(semana as Semana)) {
    return Response.json({ error: "Parámetros inválidos." }, { status: 400 });
  }
  try {
    const todas = await getProvider().getRecargasAngie(mes);
    const recargas = todas.filter((r) => r.semana === semana);
    const total = recargas.reduce((sum, r) => sum + r.monto, 0);
    return Response.json({ recargas, total });
  } catch (e: unknown) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Error interno" },
      { status: 500 }
    );
  }
}
