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
