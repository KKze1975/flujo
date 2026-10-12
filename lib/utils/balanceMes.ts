import type { Semana } from "@/lib/data/types";

/**
 * BALANCE-UNIFICADO-01 — función única de balance del mes.
 *
 * Calcula por semana `ingreso` y `comprometido`; el mes es SIEMPRE la suma
 * de las semanas (`mes = Σ semanas`), nunca una segunda fórmula. Pura, sin
 * React ni acceso a datos: recibe movimientos, ingreso de Camilo y aportes
 * por semana (mapa Semana -> monto, extensible sin tocar esta función).
 *
 * Definición canónica de "comprometido": movimientos cuyo `estado` NO está
 * en ESTADOS_NO_COMPROMETIDOS, agrupados por `semana`, sumando
 * `montoPresupuestado`.
 *
 * Prueba de cuadre: la función calcula además una referencia bruta directa
 * sobre `movs`/aportes y la compara contra la suma de semanas. Un movimiento
 * con `semana` vacía (o fuera de las semanas del mes) NO se reparte en
 * silencio: cae en un cubo aparte y el cuadre falla en voz alta.
 */

export const ESTADOS_NO_COMPROMETIDOS = ["no_aplica", "pospuesto", "pospuesto_mes_siguiente"] as const;

export interface MovimientoBalance {
  semana: Semana | null;
  estado: string;
  montoPresupuestado: number;
}

export interface BalanceSemanaMes {
  semana: Semana;
  /** Ingreso de la semana: aporte de la semana (+ ingreso de Camilo en la primera semana). */
  ingreso: number;
  comprometido: number;
  /** Parte de `comprometido` cuyos movimientos ya están `ejecutado` (BALANCE-UNIFICADO-01 D1). */
  comprometidoEjecutado: number;
  /** comprometido - comprometidoEjecutado: lo comprometido que aún no está ejecutado (evita doble conteo con el ejecutado real). */
  comprometidoRestante: number;
}

export interface CuboSinAsignar {
  /** Cantidad de movimientos (de cualquier estado) en este cubo. */
  cantidad: number;
  /** Comprometido (definición canónica) que queda fuera de las semanas. */
  comprometido: number;
  ids: number[];
}

export interface BalanceMes {
  semanas: BalanceSemanaMes[];
  /** Mes = Σ semanas. */
  mes: { ingreso: number; comprometido: number; diferencia: number };
  /** Movimientos con `semana` vacía. Debe ser 0. */
  sinSemana: CuboSinAsignar;
  /** Movimientos con semana que no pertenece a `semanas` (ej. S5 en un mes sin S5). Debe ser 0. */
  semanaFueraDeMes: CuboSinAsignar;
  cuadre: {
    /** referencia bruta de ingresos - Σ semanas (debe ser 0). */
    ingreso: number;
    /** referencia bruta de comprometido - Σ semanas (debe ser 0). */
    comprometido: number;
    ok: boolean;
    errores: string[];
  };
}

export function esComprometido(estado: string): boolean {
  return !(ESTADOS_NO_COMPROMETIDOS as readonly string[]).includes(estado);
}

/**
 * Comprometido (definición canónica) de un subconjunto de movimientos ya
 * filtrado por el llamador (una semana, una categoría, un concepto). Es la
 * MISMA regla que usa `calcularBalanceMes`; existe para superficies que solo
 * tienen a mano un tramo de movimientos y no todo el mes (BALANCE-UNIFICADO-01,
 * ampliación 30 sept 2026). Para el total de un mes usa `calcularBalanceMes`.
 */
export function comprometidoDe(movs: { estado: string; montoPresupuestado: number }[]): number {
  return movs.reduce((a, m) => a + (esComprometido(m.estado) ? m.montoPresupuestado : 0), 0);
}

/** Mapa Semana -> aporte a partir de las filas de ingreso de Angie (suma si hay varias por semana). */
export function aportesPorSemanaDe(ingresos: { semana: Semana; monto: number }[]): Partial<Record<Semana, number>> {
  const out: Partial<Record<Semana, number>> = {};
  for (const a of ingresos) out[a.semana] = (out[a.semana] ?? 0) + a.monto;
  return out;
}

export function calcularBalanceMes(args: {
  movs: MovimientoBalance[];
  semanas: Semana[];
  ingresoCamilo: number;
  aportesPorSemana: Partial<Record<Semana, number>>;
}): BalanceMes {
  const { movs, semanas, ingresoCamilo, aportesPorSemana } = args;

  const semanasBalance: BalanceSemanaMes[] = semanas.map((semana, i) => ({
    semana,
    ingreso: (i === 0 ? ingresoCamilo : 0) + (aportesPorSemana[semana] ?? 0),
    comprometido: 0,
    comprometidoEjecutado: 0,
    comprometidoRestante: 0,
  }));
  const porSemana = new Map(semanasBalance.map((s) => [s.semana, s]));

  const sinSemana: CuboSinAsignar = { cantidad: 0, comprometido: 0, ids: [] };
  const semanaFueraDeMes: CuboSinAsignar = { cantidad: 0, comprometido: 0, ids: [] };

  movs.forEach((m, idx) => {
    const monto = esComprometido(m.estado) ? m.montoPresupuestado : 0;
    if (m.semana == null) {
      sinSemana.cantidad++;
      sinSemana.comprometido += monto;
      sinSemana.ids.push(idx);
      return;
    }
    const s = porSemana.get(m.semana);
    if (!s) {
      semanaFueraDeMes.cantidad++;
      semanaFueraDeMes.comprometido += monto;
      semanaFueraDeMes.ids.push(idx);
      return;
    }
    s.comprometido += monto;
    if (m.estado === "ejecutado") s.comprometidoEjecutado += monto;
  });
  for (const s of semanasBalance) s.comprometidoRestante = s.comprometido - s.comprometidoEjecutado;

  const mesIngreso = semanasBalance.reduce((a, s) => a + s.ingreso, 0);
  const mesComprometido = semanasBalance.reduce((a, s) => a + s.comprometido, 0);

  // Referencia bruta, calculada directo sobre las entradas (no sobre las semanas).
  const brutoIngreso =
    ingresoCamilo + Object.values(aportesPorSemana).reduce<number>((a, v) => a + (v ?? 0), 0);
  const brutoComprometido = movs
    .filter((m) => esComprometido(m.estado))
    .reduce((a, m) => a + m.montoPresupuestado, 0);

  const cuadreIngreso = brutoIngreso - mesIngreso;
  const cuadreComprometido = brutoComprometido - mesComprometido;

  const errores: string[] = [];
  if (cuadreIngreso !== 0) errores.push(`ingreso: referencia - Σ semanas = ${cuadreIngreso} (aportes en semanas fuera del mes)`);
  if (cuadreComprometido !== 0) errores.push(`comprometido: referencia - Σ semanas = ${cuadreComprometido}`);
  if (sinSemana.cantidad > 0) errores.push(`${sinSemana.cantidad} movimiento(s) con semana vacía (comprometido ${sinSemana.comprometido})`);
  if (semanaFueraDeMes.cantidad > 0) errores.push(`${semanaFueraDeMes.cantidad} movimiento(s) con semana fuera del mes (comprometido ${semanaFueraDeMes.comprometido})`);

  return {
    semanas: semanasBalance,
    mes: { ingreso: mesIngreso, comprometido: mesComprometido, diferencia: mesIngreso - mesComprometido },
    sinSemana,
    semanaFueraDeMes,
    cuadre: { ingreso: cuadreIngreso, comprometido: cuadreComprometido, ok: errores.length === 0, errores },
  };
}
