export const dynamic = "force-dynamic";

import { getProvider } from "@/lib/data/provider";
import PantallaMeses from "@/components/PantallaMeses";

export default async function Home() {
  const provider = getProvider();

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

  return <PantallaMeses resúmenes={resúmenes} />;
}
