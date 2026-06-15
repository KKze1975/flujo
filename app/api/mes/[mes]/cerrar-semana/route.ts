import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/data/provider";
import type { Semana } from "@/lib/data/types";

const MES_REGEX = /^\d{4}-\d{2}$/;
const SEMANAS: Semana[] = ["S1", "S2", "S3", "S4"];
const SEMANA_SIGUIENTE: Record<Semana, Semana | null> = {
  S1: "S2", S2: "S3", S3: "S4", S4: null,
};

type Body = {
  semana: Semana;
  notas?: string | null;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mes: string }> }
) {
  const { mes } = await params;

  if (!MES_REGEX.test(mes)) {
    return Response.json({ error: "Formato de mes inválido." }, { status: 400 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body inválido." }, { status: 400 });
  }

  const { semana, notas } = body;

  if (!SEMANAS.includes(semana)) {
    return Response.json({ error: "Semana inválida." }, { status: 400 });
  }

  const provider = getProvider();

  try {
    const [gastosPorSemana, movsSemana, ingresosAngie, consumosSemana] = await Promise.all([
      provider.getGastosSinClasificarPorSemana(mes),
      provider.getMovimientosByMesYSemana(mes, semana),
      provider.getIngresosAngie(mes).catch(() => []),
      provider.getConsumosByMesYSemana(mes, semana).catch(() => []),
    ]);

    const gastosSinClasificar = gastosPorSemana[semana] ?? 0;
    if (gastosSinClasificar > 0) {
      return Response.json(
        { error: `Hay ${gastosSinClasificar} gasto(s) sin clasificar en ${semana}. Clasificalos antes de cerrar.` },
        { status: 400 }
      );
    }

    const totalPresupuestado = movsSemana.reduce((s, m) => s + m.montoPresupuestado, 0);
    const totalEjecutadoH2 = movsSemana
      .filter((m) => m.estado === "ejecutado")
      .reduce((s, m) => s + (m.montoEjecutado ?? 0), 0);
    const totalEjecutadoH3 = consumosSemana.reduce((s, c) => s + c.monto, 0);
    const totalEjecutado = totalEjecutadoH2 + totalEjecutadoH3;
    const conceptosPospuestos = movsSemana.filter(
      (m) => m.estado === "pospuesto" || m.estado === "pospuesto_mes_siguiente"
    ).length;
    const conceptosNoAplica = movsSemana.filter((m) => m.estado === "no_aplica").length;
    const hoy = new Date().toISOString().split("T")[0];

    // remanenteAngie = aporte planeado H4B - consumos fuenteAngie H3B
    const aportePlaneadoSemana = ingresosAngie.find((a) => a.semana === semana)?.monto ?? 0;
    const gastosAngie = consumosSemana.filter((c) => c.fuenteAngie).reduce((s, c) => s + c.monto, 0);
    const remanenteAngie = aportePlaneadoSemana - gastosAngie;

    // aporteAngiePlaneado para H5B = H4B de la semana siguiente
    const semanaSiguiente = SEMANA_SIGUIENTE[semana];
    const aporteAngiePlaneado = semanaSiguiente
      ? (ingresosAngie.find((a) => a.semana === semanaSiguiente)?.monto ?? 0)
      : 0;

    // Escribir H5 Rango A — cierre
    const cierre = await provider.createCierreSemana({
      mes,
      semana,
      fechaCierre: hoy,
      totalPresupuestado,
      totalEjecutado,
      desviacionTotal: totalEjecutado - totalPresupuestado,
      remanenteAngie,
      ubicacionRemanenteAngie: "nu_angie",
      conceptosPospuestos,
      conceptosNoAplica,
      gastosSinClasificar,
      cerradoPor: "camilo",
      notas: notas ?? null,
      destinoRemanente: "carry_over",
      remanenteEjecutado: null,
    });

    // Escribir H5 Rango B — plan semana siguiente
    let plan = null;
    if (semanaSiguiente) {
      const movsSiguiente = await provider.getMovimientosByMesYSemana(mes, semanaSiguiente);
      const totalComprometido = movsSiguiente
        .filter((m) => m.estado === "pendiente")
        .reduce((s, m) => s + m.montoPresupuestado, 0);
      const balanceProyectado = remanenteAngie + aporteAngiePlaneado - totalComprometido;

      plan = await provider.createPlanSemana({
        mes,
        semana: semanaSiguiente,
        fechaPlan: hoy,
        aporteAngiePlaneado,
        remanenteAngieArrastrado: remanenteAngie,
        totalComprometido,
        balanceProyectado,
        notas: null,
      });
    }

    return Response.json({ ok: true, cierre, plan });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error interno";
    return Response.json({ error: msg }, { status: 500 });
  }
}
