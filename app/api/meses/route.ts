import { getProvider } from "@/lib/data/provider";

export async function GET() {
  const provider = getProvider();

  try {
    const meses = await provider.getMeses();

    const resúmenes = await Promise.all(
      meses.map(async (mes) => {
        const [movs, ingresosCamilo, ingresosAngie] = await Promise.all([
          provider.getMovimientos(mes),
          provider.getIngresoCamilo(mes).catch(() => []),
          provider.getIngresosAngie(mes).catch(() => []),
        ]);

        const totalPresupuestado = movs.reduce((s, m) => s + m.montoPresupuestado, 0);
        const totalEjecutado = movs
          .filter((m) => m.estado === "ejecutado")
          .reduce((s, m) => s + (m.montoEjecutado ?? 0), 0);
        const totalPendiente = movs.filter((m) => m.estado === "pendiente").length;
        const ingresoCamilo = ingresosCamilo[0]?.montoCop ?? 0;
        const ingresoAngie = ingresosAngie.reduce((s, a) => s + a.monto, 0);
        const totalIngresos = ingresoCamilo + ingresoAngie;

        return {
          mes,
          totalPresupuestado,
          totalEjecutado,
          superavit: totalIngresos - totalEjecutado,
          totalIngresos,
          ingresoCamilo,
          ingresoAngie,
          totalPendiente,
          totalMovimientos: movs.length,
        };
      })
    );

    return Response.json({ meses: resúmenes });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error interno";
    return Response.json({ error: msg }, { status: 500 });
  }
}
