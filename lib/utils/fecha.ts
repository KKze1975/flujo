import type { Semana } from "@/lib/data/types";

// Devuelve las partes de fecha en hora Colombia (Bogotá, UTC-5, sin DST)
function getColombiaDate(fecha: Date): { year: number; month: number; day: number } {
  const [y, m, d] = fecha
    .toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
    .split("-")
    .map(Number);
  return { year: y, month: m, day: d }; // month: 1-indexed (enero = 1)
}

// Ciclo operativo (mes + semana) de una fecha.
// Regla: el mes es el mes calendario real. Excepción de cierre — un
// sábado/domingo que cae antes del primer lunes del mes (cola de la
// semana cuyo lunes empezó en el mes anterior) pertenece al cierre de
// ese mes anterior, no al mes nuevo. Reemplaza la regla vieja de
// Iniciativa E ("día >= 29 → mes siguiente"), que quedó obsoleta desde
// que SEMANA5-01 representa la última semana dentro del propio mes.
function cicloOperativo(fecha: Date): { mes: string; semana: Semana } {
  const { year, month, day } = getColombiaDate(fecha);
  const dow = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
  const esFinDeSemana = dow === 0 || dow === 6;
  const mondays = obtenerLunesDelMes(year, month);
  const enColaDeMesAnterior = mondays[0] > 1 && day < mondays[0] && esFinDeSemana;

  if (enColaDeMesAnterior) {
    const anterior = new Date(year, month - 2, 1);
    const mesAnterior = `${anterior.getFullYear()}-${String(anterior.getMonth() + 1).padStart(2, "0")}`;
    const semanasMesAnterior = semanasDeMes(mesAnterior);
    return { mes: mesAnterior, semana: semanasMesAnterior[semanasMesAnterior.length - 1] };
  }

  return {
    mes: `${year}-${String(month).padStart(2, "0")}`,
    semana: semanaDeFechaEnMes(fecha),
  };
}

// Mes operativo en formato YYYY-MM.
export function mesActual(fecha: Date = new Date()): string {
  return cicloOperativo(fecha).mes;
}

function obtenerLunesDelMes(year: number, month: number): number[] {
  const mondays: number[] = [];
  const totalDias = new Date(year, month, 0).getDate();
  for (let d = 1; d <= totalDias; d++) {
    const date = new Date(Date.UTC(year, month - 1, d, 12, 0, 0));
    if (date.getUTCDay() === 1) { // 1 = Lunes
      mondays.push(d);
    }
  }
  return mondays;
}

// Semana operativa S1-S5, calculada como ciclo Lunes-Domingo dentro del mes.
export function semanaActual(fecha: Date = new Date()): Semana {
  return cicloOperativo(fecha).semana;
}

// ── SEMANA5-01 / SEMANAS-LUNES-01 ─────────────────────────────────────────

// Dias reales del mes calendario "YYYY-MM" (28-31, o 29 en febrero bisiesto).
export function diasEnMes(mes: string): number {
  const [year, month] = mes.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

// Existe S5 si el mes abarca 5 semanas según la distribución de Lunes.
export function mesTieneSemana5(mes: string): boolean {
  return semanasDeMes(mes).includes("S5");
}

// Duracion de S5 en dias (1-7), solo valida si mesTieneSemana5(mes) === true.
export function duracionSemana5(mes: string): number {
  const [year, month] = mes.split("-").map(Number);
  const mondays = obtenerLunesDelMes(year, month);
  const totalDias = diasEnMes(mes);
  const ultimoLunes = mondays[mondays.length - 1];
  return (totalDias - ultimoLunes + 1);
}

// Lista de semanas validas para el mes, incluyendo S5 condicionalmente.
export function semanasDeMes(mes: string): Semana[] {
  const [year, month] = mes.split("-").map(Number);
  const mondays = obtenerLunesDelMes(year, month);
  if (mondays[0] > 1) {
    return mondays.length >= 4 ? ["S1", "S2", "S3", "S4", "S5"] : ["S1", "S2", "S3", "S4"];
  } else {
    return mondays.length >= 5 ? ["S1", "S2", "S3", "S4", "S5"] : ["S1", "S2", "S3", "S4"];
  }
}

// Semana siguiente a `semana` dentro del mismo mes, o null si es la ultima.
export function semanaSiguienteDe(semana: Semana, mes: string): Semana | null {
  const orden = semanasDeMes(mes);
  const idx = orden.indexOf(semana);
  return idx >= 0 && idx < orden.length - 1 ? orden[idx + 1] : null;
}

// ── UBER-04 ──────────────────────────────────────────────────────────────
export function mesDeFecha(fecha: Date): string {
  const { year, month } = getColombiaDate(fecha);
  return `${year}-${String(month).padStart(2, "0")}`;
}

// Semana de una fecha dentro de su propio mes calendario (Lunes a Domingo).
export function semanaDeFechaEnMes(fecha: Date): Semana {
  const { year, month, day } = getColombiaDate(fecha);
  const mondays = obtenerLunesDelMes(year, month);

  if (mondays[0] > 1) {
    if (day < mondays[0]) return "S1";
    if (day < mondays[1]) return "S2";
    if (day < mondays[2]) return "S3";
    if (mondays[3] && day < mondays[3]) return "S4";
    return "S5";
  } else {
    if (day < mondays[1]) return "S1";
    if (day < mondays[2]) return "S2";
    if (day < mondays[3]) return "S3";
    if (mondays[4] && day < mondays[4]) return "S4";
    if (mondays[4] && day >= mondays[4]) return "S5";
    return "S4";
  }
}
