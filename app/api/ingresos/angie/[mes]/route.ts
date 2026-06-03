import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/data/provider";
import type { Semana, CuentaDestinoAngie } from "@/lib/data/types";

const MES_REGEX = /^\d{4}-\d{2}$/;
const SEMANAS: Semana[] = ["S1", "S2", "S3", "S4"];

function fechaDefaultSemana(mes: string, semana: Semana): string {
  const dias: Record<Semana, number> = { S1: 1, S2: 8, S3: 15, S4: 22 };
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
    const ingresos = await getProvider().getIngresosAngie(mes);
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

  let body: { semana: Semana; monto: number; cuentaDestino?: CuentaDestinoAngie; registradoPor?: string; notas?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body inválido." }, { status: 400 });
  }

  if (!SEMANAS.includes(body.semana) || typeof body.monto !== "number" || body.monto <= 0) {
    return Response.json({ error: "semana y monto requeridos." }, { status: 400 });
  }

  const hoy = new Date().toISOString().split("T")[0];
  try {
    const created = await getProvider().createRecargaAngie({
      mes,
      semana: body.semana,
      monto: body.monto,
      fecha: hoy,
      registradoPor: body.registradoPor ?? "angie",
      cuentaDestino: body.cuentaDestino ?? "nu_angie",
      notas: body.notas ?? null,
    });
    return Response.json(created, { status: 201 });
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

  let body: { aportes: Array<{ semana: Semana; monto: number }> };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body inválido." }, { status: 400 });
  }

  if (!Array.isArray(body.aportes)) {
    return Response.json({ error: "aportes debe ser un array." }, { status: 400 });
  }

  const provider = getProvider();
  try {
    const existing = await provider.getIngresosAngie(mes);
    const results = [];

    for (const aporte of body.aportes) {
      if (!SEMANAS.includes(aporte.semana)) continue;
      if (typeof aporte.monto !== "number" || aporte.monto < 0) continue;

      const prev = existing.find((i) => i.semana === aporte.semana);
      if (prev) {
        const updated = await provider.updateIngresoAngie(prev.id, { monto: aporte.monto });
        results.push(updated);
      } else if (aporte.monto > 0) {
        const created = await provider.createIngresoAngie({
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
