export const dynamic = "force-dynamic";

import { getProvider } from "@/lib/data/provider";
import HomeHub from "@/components/HomeHub";
import { mesActual, semanaActual } from "@/lib/utils/fecha";

export default async function Home() {
  const provider = getProvider();
  const semana = semanaActual();

  const meses = await provider.getMeses();
  const mesActivo = mesActual();

  let metricas = null;

  if (mesActivo) {
    const [movs, ingresosAngie, ingresosCamilo, cierres] = await Promise.all([
      provider.getMovimientos(mesActivo),
      provider.getIngresosAngie(mesActivo).catch(() => []),
      provider.getIngresoCamilo(mesActivo).catch(() => []),
      provider.getCierresSemana(mesActivo).catch(() => []),
    ]);

    const totalPresupuestado = movs.reduce((s, m) => s + m.montoPresupuestado, 0);
    const totalEjecutado = movs
      .filter((m) => m.estado === "ejecutado")
      .reduce((s, m) => s + (m.montoEjecutado ?? 0), 0);
    const pctEjecutado = totalPresupuestado > 0
      ? Math.round((totalEjecutado / totalPresupuestado) * 100)
      : 0;

    const ingresoSemana = ingresosAngie
      .filter((a) => a.semana === semana)
      .reduce((s, a) => s + a.monto, 0);
    const pendientesSemana = movs
      .filter((m) => m.semana === semana && m.estado === "pendiente")
      .reduce((s, m) => s + m.montoPresupuestado, 0);
    const disponibleSemana = ingresoSemana - pendientesSemana;

    const aporteAngie = ingresosAngie.reduce((s, a) => s + a.monto, 0);
    const aporteCamilo = ingresosCamilo.reduce((s, i) => s + i.montoCop, 0);

    metricas = {
      totalEjecutado,
      totalPresupuestado,
      pctEjecutado,
      semanasCerradas: cierres.length,
      disponibleSemana,
      aporteCamilo,
      aporteAngie,
    };
  }

  return (
    <HomeHub
      mesActivo={mesActivo}
      semanaActiva={semana}
      metricas={metricas}
    />
  );
}
