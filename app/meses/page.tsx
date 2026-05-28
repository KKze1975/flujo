export const dynamic = "force-dynamic";

import { getProvider } from "@/lib/data/provider";
import PantallaMeses from "@/components/PantallaMeses";
import type { SaldoCuenta, Semana } from "@/lib/data/types";

function semanaActual(): Semana {
  const dia = new Date().getDate();
  if (dia <= 7)  return "S1";
  if (dia <= 14) return "S2";
  if (dia <= 21) return "S3";
  return "S4";
}

export default async function MesesPage({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string }>;
}) {
  const { modo } = await searchParams;
  const modoHistorial = modo === "historial";
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

  const semana = semanaActual();
  let metricas = null;

  if (meses.length > 0) {
    const mesReciente = meses[meses.length - 1];
    const [movsReciente, ingresosAngieReciente, ingresosCamiloReciente, cierres, saldosCuenta] = await Promise.all([
      provider.getMovimientos(mesReciente),
      provider.getIngresosAngie(mesReciente).catch(() => []),
      provider.getIngresoCamilo(mesReciente).catch(() => []),
      provider.getCierresSemana(mesReciente).catch(() => []),
      provider.getSaldosCuenta(mesReciente).catch(() => [] as SaldoCuenta[]),
    ]);

    const ingresoSemana = ingresosAngieReciente
      .filter((a) => a.semana === semana)
      .reduce((s, a) => s + a.monto, 0);
    const pendientesSemana = movsReciente
      .filter((m) => m.semana === semana && m.estado === "pendiente")
      .reduce((s, m) => s + m.montoPresupuestado, 0);
    const disponibleSemana = ingresoSemana - pendientesSemana;

    const totalPresupuestado = movsReciente.reduce((s, m) => s + m.montoPresupuestado, 0);
    const totalEjecutado = movsReciente
      .filter((m) => m.estado === "ejecutado")
      .reduce((s, m) => s + (m.montoEjecutado ?? 0), 0);
    const pctEjecutado = totalPresupuestado > 0
      ? Math.round((totalEjecutado / totalPresupuestado) * 100)
      : 0;

    const semanasCerradas = cierres.length;

    const ingresoCamiloMes = ingresosCamiloReciente[0]?.montoCop ?? 0;
    const recaudoSemana =
      ingresosAngieReciente.filter((a) => a.semana === semana).reduce((s, a) => s + a.monto, 0) +
      (semana === "S1" ? ingresoCamiloMes : 0);
    const ejecutadoSemana = movsReciente
      .filter((m) => m.semana === semana && m.estado === "ejecutado")
      .reduce((s, m) => s + (m.montoEjecutado ?? 0), 0);
    const disponibleSemanaSnapshot = recaudoSemana - ejecutadoSemana;

    metricas = {
      semana,
      disponibleSemana,
      totalEjecutado,
      totalPresupuestado,
      pctEjecutado,
      semanasCerradas,
      mes: mesReciente,
      recaudoSemana,
      ejecutadoSemana,
      disponibleSemanaSnapshot,
      saldosCuenta,
    };
  }

  return (
    <PantallaMeses
      resúmenes={resúmenes}
      metricas={metricas}
      modoHistorial={modoHistorial}
    />
  );
}
