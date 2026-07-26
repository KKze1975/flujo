import type { Semana } from "@/lib/data/types";

// Devuelve las partes de fecha en hora Colombia (Bogotá, UTC-5, sin DST)
function getColombiaDate(fecha: Date): { year: number; month: number; day: number } {
  const [y, m, d] = fecha
    .toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
    .split("-")
    .map(Number);
  return { year: y, month: m, day: d }; // month: 1-indexed (enero = 1)
}

// Mes operativo en formato YYYY-MM.
// Regla Iniciativa E: día >= 29 pertenece al ciclo del mes siguiente.
export function mesActual(fecha: Date = new Date()): string {
  const { year, month, day } = getColombiaDate(fecha);
  if (day >= 29) {
    // month es 1-indexed → pasado al constructor 0-indexed como "siguiente mes"
    // JS maneja diciembre (month=12) → enero del año siguiente automáticamente
    const next = new Date(year, month, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

// Semana operativa S1-S4, calculada como offset desde el inicio del ciclo (día 29 del mes anterior).
// S5 fuera de alcance: offsetDias >= 28 se absorbe en S4 (workaround documentado, Iniciativa E pendiente).
export function semanaActual(fecha: Date = new Date()): Semana {
  const { year, month, day } = getColombiaDate(fecha);
  let cicloYear = year;
  let cicloMonth = month; // 1-indexed
  if (day < 29) {
    cicloMonth -= 1;
    if (cicloMonth === 0) { cicloMonth = 12; cicloYear -= 1; }
  }
  // Aritmética pura de días calendarios Colombia (sin componente de hora)
  // Si cicloMonth=febrero y año no-bisiesto: new Date(year,1,29) hace rollover a marzo 1 — ver ESTADO.md
  const ini = new Date(cicloYear, cicloMonth - 1, 29).getTime();
  const hoy = new Date(year, month - 1, day).getTime();
  const offset = Math.floor((hoy - ini) / 86_400_000);
  if (offset < 7)  return "S1";
  if (offset < 14) return "S2";
  if (offset < 21) return "S3";
  return "S4";
}

// ── SEMANA5-01 ───────────────────────────────────────────────────────────
// Regla independiente del ciclo dia-29 de mesActual()/semanaActual() (ver
// tickets/SEMANA5-01.md, seccion "Discrepancia de modelo"): S5 son los dias
// 29 en adelante del propio mes calendario que nombra el string `mes`
// ("YYYY-MM"), no el ciclo operativo anclado en el mes anterior.

// Dias reales del mes calendario "YYYY-MM" (28-31, o 29 en febrero bisiesto).
export function diasEnMes(mes: string): number {
  const [year, month] = mes.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

// Existe S5 si y solo si el mes tiene 29+ dias -- excluye febrero no bisiesto.
export function mesTieneSemana5(mes: string): boolean {
  return diasEnMes(mes) >= 29;
}

// Duracion de S5 en dias (1-3), solo valida si mesTieneSemana5(mes) === true.
export function duracionSemana5(mes: string): number {
  return diasEnMes(mes) - 28;
}

// Lista de semanas validas para el mes, incluyendo S5 condicionalmente.
export function semanasDeMes(mes: string): Semana[] {
  const base: Semana[] = ["S1", "S2", "S3", "S4"];
  return mesTieneSemana5(mes) ? [...base, "S5"] : base;
}

// Semana siguiente a `semana` dentro del mismo mes, o null si es la ultima
// (S4 sin S5, o S5). Usado por cerrar-semana para encadenar el plan H5B.
export function semanaSiguienteDe(semana: Semana, mes: string): Semana | null {
  const orden = semanasDeMes(mes);
  const idx = orden.indexOf(semana);
  return idx >= 0 && idx < orden.length - 1 ? orden[idx + 1] : null;
}
