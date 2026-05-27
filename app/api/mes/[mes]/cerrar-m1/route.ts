import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/data/provider";

const MES_REGEX = /^\d{4}-\d{2}$/;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ mes: string }> }
) {
  const { mes } = await params;

  if (!MES_REGEX.test(mes)) {
    return Response.json({ error: "Formato de mes inválido." }, { status: 400 });
  }

  const provider = getProvider();

  try {
    const movsS1 = await provider.getMovimientosByMesYSemana(mes, "S1");

    const pendientes = movsS1.filter((m) => m.estado === "pendiente");
    if (pendientes.length > 0) {
      return Response.json(
        { error: `${pendientes.length} concepto(s) pendientes en S1.` },
        { status: 400 }
      );
    }

    const totalPresupuestado = movsS1.reduce((s, m) => s + m.montoPresupuestado, 0);
    const totalEjecutado = movsS1
      .filter((m) => m.estado === "ejecutado")
      .reduce((s, m) => s + (m.montoEjecutado ?? 0), 0);
    const conceptosPospuestos = movsS1.filter(
      (m) => m.estado === "pospuesto" || m.estado === "pospuesto_mes_siguiente"
    ).length;
    const conceptosNoAplica = movsS1.filter((m) => m.estado === "no_aplica").length;

    const cierre = await provider.createCierreSemana({
      mes,
      semana: "S1",
      fechaCierre: new Date().toISOString().split("T")[0],
      totalPresupuestado,
      totalEjecutado,
      desviacionTotal: totalEjecutado - totalPresupuestado,
      remanenteAngie: 0,
      ubicacionRemanenteAngie: "",
      conceptosPospuestos,
      conceptosNoAplica,
      gastosSinClasificar: 0,
      cerradoPor: "camilo",
      notas: null,
    });

    return Response.json({ ok: true, cierre });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error interno";
    return Response.json({ error: msg }, { status: 500 });
  }
}
