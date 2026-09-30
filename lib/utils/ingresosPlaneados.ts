import type { Semana } from "@/lib/data/types";

/**
 * APORTES-SEMANALES-01A (I-21) — fuente única de los aportes planeados por semana.
 *
 * Une las filas de Angie (H4B) y del emprendimiento (H11) y produce:
 *  - `porSemana`: desglose angie / adicional / total por semana (para chips A: / E:).
 *  - `aportesPorSemana`: angie + adicional por semana, listo para el mapa extensible
 *    de `calcularBalanceMes` (lib/utils/balanceMes.ts).
 *
 * NO calcula ingreso de mes ni de semana: eso lo hace `calcularBalanceMes` (mes = Σ semanas).
 * Un aporte en una semana fuera del mes NO se descarta: queda en `aportesPorSemana` para que
 * el cuadre de `calcularBalanceMes` falle en voz alta.
 */

// Agrupa filas por semana (suma si hay varias). Local a propósito: este archivo debe
// poder cargarse sin alias `@/` desde scripts/verificar-balance-cuadre.ts (node strip-types).
function porSemanaDe(rows: { semana: Semana; monto: number }[]): Partial<Record<Semana, number>> {
  const out: Partial<Record<Semana, number>> = {};
  for (const r of rows) out[r.semana] = (out[r.semana] ?? 0) + r.monto;
  return out;
}

export const TODAS_LAS_SEMANAS: Semana[] = ["S1", "S2", "S3", "S4", "S5"];

export interface AportesSemana {
  angie: number;
  adicional: number;
  total: number;
}

export interface IngresosPlaneados {
  porSemana: Record<Semana, AportesSemana>;
  aportesPorSemana: Partial<Record<Semana, number>>;
  /** Totales del mes por fuente (incluye cualquier semana recibida, también fuera del mes). */
  totales: AportesSemana;
}

export function ingresosPlaneadosDe(
  angie: { semana: Semana; monto: number }[],
  adicionales: { semana: Semana; monto: number }[],
): IngresosPlaneados {
  const a = porSemanaDe(angie);
  const e = porSemanaDe(adicionales);
  const porSemana = {} as Record<Semana, AportesSemana>;
  const aportesPorSemana: Partial<Record<Semana, number>> = {};
  for (const s of TODAS_LAS_SEMANAS) {
    const ang = a[s] ?? 0;
    const adi = e[s] ?? 0;
    porSemana[s] = { angie: ang, adicional: adi, total: ang + adi };
    if (s in a || s in e) aportesPorSemana[s] = ang + adi;
  }
  const sum = (m: Partial<Record<Semana, number>>) =>
    Object.values(m).reduce<number>((acc, v) => acc + (v ?? 0), 0);
  const totAngie = sum(a);
  const totAdi = sum(e);
  return { porSemana, aportesPorSemana, totales: { angie: totAngie, adicional: totAdi, total: totAngie + totAdi } };
}
