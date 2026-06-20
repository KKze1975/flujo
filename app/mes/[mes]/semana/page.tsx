export const dynamic = "force-dynamic";

import { getProvider } from "@/lib/data/provider";
import VistaSemanal from "@/components/VistaSemanal";
import type { Semana, Actor } from "@/lib/data/types";

function semanaActual(): Semana {
  const dia = new Date().getDate();
  if (dia <= 7)  return "S1";
  if (dia <= 14) return "S2";
  if (dia <= 21) return "S3";
  return "S4";
}

const MESES_FULL = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatMes(mes: string): string {
  const [, monthStr] = mes.split("-");
  return MESES_FULL[Number(monthStr)] ?? mes;
}

export default async function SemanaPage({
  params,
  searchParams,
}: {
  params: Promise<{ mes: string }>;
  searchParams: Promise<{ actor?: string }>;
}) {
  const { mes } = await params;
  const { actor: actorParam } = await searchParams;
  const actor: Actor = actorParam === "angie" ? "angie" : "camilo";
  const semana = semanaActual();
  const provider = getProvider();

  const [movimientos, cierres, consumos, ingresosAngie, saldosCuenta, movimientosMes, consumosMes] = await Promise.all([
    provider.getMovimientosByMesYSemana(mes, semana).catch(() => []),
    provider.getCierresSemana(mes).catch(() => []),
    provider.getConsumosByMesYSemana(mes, semana).catch(() => []),
    provider.getIngresosAngie(mes).catch(() => []),
    provider.getSaldosCuenta(mes).catch(() => []),
    provider.getMovimientos(mes).catch(() => []),
    provider.getConsumosByMes(mes).catch(() => []),
  ]);

  const cierreSemana = cierres.find((c) => c.semana === semana) ?? null;
  const semanasCerradas = cierres.map((c) => c.semana);

  const saldoBrutoAngie = saldosCuenta.find(s => s.cuenta === "nu_angie")?.saldoInicial ?? 0;
  const ejecutadoH2Angie = movimientosMes
    .filter(m => m.estado === "ejecutado" && m.fuenteAngie)
    .reduce((s, m) => s + (m.montoEjecutado ?? m.montoPresupuestado), 0);
  const gastoH3Angie = consumosMes
    .filter(c => c.fuenteAngie)
    .reduce((s, c) => s + c.monto, 0);
  const disponibleNuAngie = saldoBrutoAngie - ejecutadoH2Angie - gastoH3Angie;

  return (
    <VistaSemanal
      mes={mes}
      mesLabel={formatMes(mes)}
      semanaActiva={semana}
      movimientosInit={movimientos}
      cierreSemana={cierreSemana}
      semanasCerradas={semanasCerradas}
      consumosInit={consumos}
      ingresosAngie={ingresosAngie}
      actor={actor}
      disponibleNuAngie={disponibleNuAngie}
    />
  );
}
