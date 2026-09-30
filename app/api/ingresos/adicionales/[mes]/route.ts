import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/data/provider";
import type { Semana } from "@/lib/data/types";
import { semanasDeMes } from "@/lib/utils/fecha";

// APORTES-SEMANALES-01A — aporte del emprendimiento (H11). Molde: ingresos/angie/[mes].
// Diferencia con Angie (exigida por el spec): semana fuera de semanasDeMes(mes) o monto
// negativo/no numérico -> 400, no se ignoran en silencio.

const MES_REGEX = /^\d{4}-\d{2}$/;

function fechaDefaultSemana(mes: string, semana: Semana): string {
  const dias: Record<Semana, number> = { S1: 1, S2: 8, S3: 15, S4: 22, S5: 29 };
  return `${mes}-${String(dias[semana]).padStart(2, "0")}`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mes: string }> }
) {
  const { mes } = await params;
  if (!MES_REGEX.test(mes)) {
    return Response.json({ error: "Formato de mes inválido." }, { status: 400 });
  }
  try {
    const aportes = await getProvider().getAportesAdicionales(mes);
    return Response.json(aportes);
  } catch (e: unknown) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Error interno" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ mes: string }> }
) {
  const { mes } = await params;
  if (!MES_REGEX.test(mes)) {
    return Response.json({ error: "Formato de mes inválido." }, { status: 400 });
  }
  const mesNum = Number(mes.slice(5, 7));
  if (mesNum < 1 || mesNum > 12) {
    return Response.json({ error: "Formato de mes inválido." }, { status: 400 });
  }

  let body: { aportes: Array<{ semana: Semana; monto: number }> };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body inválido." }, { status: 400 });
  }

  if (!body || !Array.isArray(body.aportes)) {
    return Response.json({ error: "aportes debe ser un array." }, { status: 400 });
  }

  // Validar TODO antes de escribir: una entrada inválida no deja escrituras parciales.
  const semanasValidas = semanasDeMes(mes);
  for (const aporte of body.aportes) {
    if (!aporte || !semanasValidas.includes(aporte.semana)) {
      return Response.json(
        { error: `Semana inválida para ${mes}: ${String(aporte?.semana)}.` },
        { status: 400 }
      );
    }
    if (typeof aporte.monto !== "number" || !Number.isFinite(aporte.monto) || aporte.monto < 0) {
      return Response.json(
        { error: `Monto inválido en ${aporte.semana}: debe ser un número mayor o igual a 0.` },
        { status: 400 }
      );
    }
  }

  const provider = getProvider();
  try {
    const existing = await provider.getAportesAdicionales(mes);
    const results = [];

    for (const aporte of body.aportes) {
      const prev = existing.find((i) => i.semana === aporte.semana);
      if (prev) {
        const updated = await provider.updateAporteAdicional(prev.id, { monto: aporte.monto });
        results.push(updated);
      } else if (aporte.monto > 0) {
        const created = await provider.createAporteAdicional({
          mes,
          semana: aporte.semana,
          monto: aporte.monto,
          fecha: fechaDefaultSemana(mes, aporte.semana),
          notas: null,
        });
        results.push(created);
      }
    }

    return Response.json(results);
  } catch (e: unknown) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Error interno" },
      { status: 500 }
    );
  }
}
