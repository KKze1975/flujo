export const dynamic = "force-dynamic";

import { getProvider } from "@/lib/data/provider";
import VistaSemanal from "@/components/VistaSemanal";
import type { Semana } from "@/lib/data/types";

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
}: {
  params: Promise<{ mes: string }>;
}) {
  const { mes } = await params;
  const semana = semanaActual();
  const provider = getProvider();

  const [movimientos, cierres] = await Promise.all([
    provider.getMovimientosByMesYSemana(mes, semana).catch(() => []),
    provider.getCierresSemana(mes).catch(() => []),
  ]);

  const cierreSemana = cierres.find((c) => c.semana === semana) ?? null;

  return (
    <VistaSemanal
      mes={mes}
      mesLabel={formatMes(mes)}
      semanaActiva={semana}
      movimientosInit={movimientos}
      cierreSemana={cierreSemana}
    />
  );
}
