import type { Semana } from "@/lib/data/types";

export interface RemanenteSemanalPaso<Extra> {
  semana: Semana;
  /** Remanente que entra a esta semana, antes de sumar el aporte de Angie. */
  remanente: number;
  aporteAngie: number;
  /** remanente + aporteAngie: lo disponible antes de restar el gasto/comprometido de la semana. */
  disponible: number;
  /** disponible - restado: se encadena como remanente de la semana siguiente. */
  diferencia: number;
  extra: Extra;
}

/**
 * Calcula el remanente encadenado por semana: cada semana parte del
 * remanente de la anterior, le suma el aporte de Angie, y resta lo que
 * `calcularPaso` decida para esa semana. Única fuente de verdad para este
 * loop — antes duplicado entre `balancePlanificacion` (resta `comprometido`)
 * y `balanceSemanas` (resta `ejecutado`) en `MesM1Desktop.tsx`.
 *
 * Ver FIX-BALANCE-SEMANAL-EJECUCION-01 y el candidato de invariante
 * "Cálculo de mes/semana operativos desde una única fuente de verdad"
 * (`INVARIANTS.md`).
 */
export function remanenteEncadenadoPorSemana<Extra>(
  semanas: Semana[],
  ingresoInicial: number,
  aportePorSemana: (semana: Semana) => number,
  calcularPaso: (
    semana: Semana,
    remanenteEntrante: number,
    disponible: number
  ) => { restar: number; extra: Extra },
): RemanenteSemanalPaso<Extra>[] {
  const resultado: RemanenteSemanalPaso<Extra>[] = [];
  let remanente = ingresoInicial;
  for (const semana of semanas) {
    const aporteAngie = aportePorSemana(semana);
    const disponible = remanente + aporteAngie;
    const { restar, extra } = calcularPaso(semana, remanente, disponible);
    const diferencia = disponible - restar;
    resultado.push({ semana, remanente, aporteAngie, disponible, diferencia, extra });
    remanente = diferencia;
  }
  return resultado;
}
