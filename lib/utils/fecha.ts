import type { Semana } from "@/lib/data/types";

// Devuelve las partes de fecha en hora Colombia (Bogotá, UTC-5, sin DST)
function getColombiaDate(fecha: Date): { year: number; month: number; day: number } {
  const [y, m, d] = fecha
    .toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
    .split("-")
    .map(Number);
  return { year: y, month: m, day: d }; // month: 1-indexed (enero = 1)
}

// ── SEMANAS-VIERNES-01 (decisión de Camilo, 1 oct 2026) ──────────────────
// Regla vigente desde el mes MES_CORTE_VIERNES: la semana es lunes-domingo y
// su MES es el mes en que cae su VIERNES. S{n} = n-ésimo viernes del mes
// (n = ceil(díaDelViernes / 7)); el nº de semanas del mes = nº de viernes
// (4 o 5). Ej.: lun 28 sep - dom 4 oct tiene su viernes el 2 oct => S1 de
// octubre 2026; 31 ago (lun) tiene su viernes el 4 sep => S1 de septiembre.
//
// Los meses ANTERIORES al corte conservan EXACTAMENTE la regla vieja (semana
// anclada al lunes, S5 corta de fin de mes, "cola" sáb/dom del mes anterior;
// agosto 2026 sigue con S5 = 31 ago). No se reclasifica el historial. Una
// fecha se clasifica por el mes de su viernes: si ese mes >= corte usa la regla
// nueva; si no, la lógica vieja sin cambios. Todo en hora Bogotá.
// Reemplaza el parche puntual del 31-ago-2026, que la regla nueva ya cubre.
export const MES_CORTE_VIERNES = "2026-09";

type YMD = { year: number; month: number; day: number };

const MESES_CORTOS = ["", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function fmtMes(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function fmtISO({ year, month, day }: YMD): string {
  return `${fmtMes(year, month)}-${String(day).padStart(2, "0")}`;
}

// Suma `n` días a una fecha calendario (aritmética UTC a mediodía, sin DST).
function sumarDias({ year, month, day }: YMD, n: number): YMD {
  const d = new Date(Date.UTC(year, month - 1, day + n, 12, 0, 0));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

// Viernes de la semana lunes-domingo a la que pertenece la fecha.
function viernesDeSemana(f: YMD): YMD {
  const dow = new Date(Date.UTC(f.year, f.month - 1, f.day, 12, 0, 0)).getUTCDay();
  const isoDow = (dow + 6) % 7; // lunes = 0 ... domingo = 6
  return sumarDias(f, 4 - isoDow);
}

function usaReglaViernes(mes: string): boolean {
  return mes >= MES_CORTE_VIERNES;
}

// Ciclo con la regla nueva: viernes de la semana define mes y número.
function cicloViernes(f: YMD): { mes: string; semana: Semana } {
  const v = viernesDeSemana(f);
  return { mes: fmtMes(v.year, v.month), semana: `S${Math.ceil(v.day / 7)}` as Semana };
}

// Ciclo con la regla vieja (anclada al lunes), sin cambios respecto de antes.
// Excepción de cierre — un sábado/domingo que cae antes del primer lunes del
// mes (cola de la semana cuyo lunes empezó en el mes anterior) pertenece al
// cierre de ese mes anterior, no al mes nuevo.
function cicloLegacy(f: YMD): { mes: string; semana: Semana } {
  const { year, month, day } = f;
  const dow = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
  const esFinDeSemana = dow === 0 || dow === 6;
  const mondays = obtenerLunesDelMes(year, month);
  const enColaDeMesAnterior = mondays[0] > 1 && day < mondays[0] && esFinDeSemana;

  if (enColaDeMesAnterior) {
    const anterior = new Date(year, month - 2, 1);
    const mesAnterior = fmtMes(anterior.getFullYear(), anterior.getMonth() + 1);
    const semanasMesAnterior = semanasDeMes(mesAnterior);
    return { mes: mesAnterior, semana: semanasMesAnterior[semanasMesAnterior.length - 1] };
  }

  return { mes: fmtMes(year, month), semana: semanaLegacyEnMes(f) };
}

// Ciclo operativo (mes + semana) de una fecha: elige regla por el mes de su viernes.
function cicloDeYMD(f: YMD): { mes: string; semana: Semana } {
  const v = viernesDeSemana(f);
  return usaReglaViernes(fmtMes(v.year, v.month)) ? cicloViernes(f) : cicloLegacy(f);
}

function cicloOperativo(fecha: Date): { mes: string; semana: Semana } {
  return cicloDeYMD(getColombiaDate(fecha));
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

// El "stub" son los días antes del primer lunes del mes (si el mes no empieza
// en lunes). Si el mes empieza en sábado o domingo, ese stub mide 1-2 días y
// es ÍNTEGRAMENTE fin de semana → cicloOperativo() lo desvía entero al cierre
// del mes anterior, sin dejar ningún día real en el mes actual para una "S1"
// corta. Cuando eso pasa, el primer lunes real debe arrancar en S1, igual que
// en un mes que empieza en lunes — no en S2.
// Única fuente de verdad: consumida por semanaDeFechaEnMes() y semanasDeMes().
// Tocar la condición en un solo lugar reintroduce el bug de cc51db9 (semana
// off-by-one en agosto 2026, detectado 3-ago-2026).
function stubAbsorbidoPorMesAnterior(mondays: number[]): boolean {
  return mondays[0] > 1 && mondays[0] <= 3;
}

// Semana operativa S1-S5 (ver SEMANAS-VIERNES-01 arriba: viernes desde el corte, lunes antes).
export function semanaActual(fecha: Date = new Date()): Semana {
  return cicloOperativo(fecha).semana;
}

// ── SEMANA5-01 (SEMANAS-LUNES-01 queda como regla legacy < corte) ─────────

// Dias reales del mes calendario "YYYY-MM" (28-31, o 29 en febrero bisiesto).
export function diasEnMes(mes: string): number {
  const [year, month] = mes.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

// Existe S5 si el mes abarca 5 semanas (5 viernes desde el corte; 5 lunes antes).
export function mesTieneSemana5(mes: string): boolean {
  return semanasDeMes(mes).includes("S5");
}

// Duracion de S5 en dias (1-7), solo valida si mesTieneSemana5(mes) === true.
// Regla nueva: la semana es siempre lunes-domingo completa (7 dias, aunque
// cruce de mes). Regla vieja: dias entre el ultimo lunes y fin de mes.
export function duracionSemana5(mes: string): number {
  if (usaReglaViernes(mes)) return 7;
  const [year, month] = mes.split("-").map(Number);
  const mondays = obtenerLunesDelMes(year, month);
  const totalDias = diasEnMes(mes);
  const ultimoLunes = mondays[mondays.length - 1];
  return (totalDias - ultimoLunes + 1);
}

// Lista de semanas validas para el mes. Regla nueva (>= corte): una por viernes.
export function semanasDeMes(mes: string): Semana[] {
  const [year, month] = mes.split("-").map(Number);
  if (usaReglaViernes(mes)) {
    return viernesDelMes(year, month) >= 5
      ? ["S1", "S2", "S3", "S4", "S5"]
      : ["S1", "S2", "S3", "S4"];
  }
  const mondays = obtenerLunesDelMes(year, month);
  if (mondays[0] > 1 && !stubAbsorbidoPorMesAnterior(mondays)) {
    return mondays.length >= 4 ? ["S1", "S2", "S3", "S4", "S5"] : ["S1", "S2", "S3", "S4"];
  } else {
    return mondays.length >= 5 ? ["S1", "S2", "S3", "S4", "S5"] : ["S1", "S2", "S3", "S4"];
  }
}

function viernesDelMes(year: number, month: number): number {
  let n = 0;
  const total = new Date(year, month, 0).getDate();
  for (let d = 1; d <= total; d++) {
    if (new Date(Date.UTC(year, month - 1, d, 12, 0, 0)).getUTCDay() === 5) n++;
  }
  return n;
}

// Semana siguiente a `semana` dentro del mismo mes, o null si es la ultima.
export function semanaSiguienteDe(semana: Semana, mes: string): Semana | null {
  const orden = semanasDeMes(mes);
  const idx = orden.indexOf(semana);
  return idx >= 0 && idx < orden.length - 1 ? orden[idx + 1] : null;
}

// Semana "activa" de un mes para efectos de edición/cierre (habilita el botón
// "Cerrar semana" y decide si una semana visible es editable o de solo lectura).
// En el mes operativo actual es la semana calendario real de hoy. En cualquier
// otro mes (pasado) TODA semana ya transcurrida debe quedar editable/cerrable
// — no solo la que por casualidad comparte etiqueta con la semana de hoy —
// así que se usa la última semana de ese mes.
// FIX-SEMANA-STUB-01: antes de esto, page.tsx y route.ts usaban semanaActual()
// sin importar el `mes` visible, bloqueando el cierre de semanas pendientes de
// meses pasados (ej. julio S5 sin cerrar, viendo agosto como mes activo).
export function semanaActivaDeMes(mes: string, fecha: Date = new Date()): Semana {
  if (mes === mesActual(fecha)) return semanaActual(fecha);
  const semanas = semanasDeMes(mes);
  return semanas[semanas.length - 1];
}

// Mes siguiente en formato YYYY-MM (BALANCE-UNIFICADO-01: usado por la ruta
// mover_mes_siguiente y por los pickers de semana destino del cliente).
export function mesSiguienteDe(mes: string): string {
  const [year, month] = mes.split("-").map(Number);
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
}

// ── UBER-04 ──────────────────────────────────────────────────────────────
// Mes de una fecha. Regla nueva: mes de su viernes. Regla vieja (viernes en
// mes < corte): mes calendario de la propia fecha. Consistente con cicloOperativo
// para las fechas >= corte (uber-parser usa mesDeFecha + semanaDeFechaEnMes en par).
export function mesDeFecha(fecha: Date): string {
  const f = getColombiaDate(fecha);
  const v = viernesDeSemana(f);
  const mesViernes = fmtMes(v.year, v.month);
  return usaReglaViernes(mesViernes) ? mesViernes : fmtMes(f.year, f.month);
}

// Semana de una fecha dentro de su mes (ver mesDeFecha). Regla nueva: n-esimo
// viernes. Regla vieja: semana Lunes-Domingo dentro del propio mes calendario.
export function semanaDeFechaEnMes(fecha: Date): Semana {
  const f = getColombiaDate(fecha);
  const v = viernesDeSemana(f);
  return usaReglaViernes(fmtMes(v.year, v.month)) ? cicloViernes(f).semana : semanaLegacyEnMes(f);
}

function semanaLegacyEnMes({ year, month, day }: YMD): Semana {
  const mondays = obtenerLunesDelMes(year, month);

  if (mondays[0] > 1 && !stubAbsorbidoPorMesAnterior(mondays)) {
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

// ── SEMANAS-VIERNES-01: helpers de rango/etiqueta (fuente unica, I-21) ─────

// Rango real {desde, hasta} (ISO YYYY-MM-DD) de una semana de un mes, calculado
// escaneando fechas con el mismo ciclo que cicloOperativo (sirve para ambas
// reglas). Regla nueva: siempre lunes-domingo (7 dias, puede cruzar de mes).
// Regla vieja (mes < corte): los dias reales del ciclo (S1/S5 pueden ser parciales; la cola
// sab/dom del mes anterior cuenta en la ultima semana de ese mes). Si la
// semana no existe en el mes, devuelve los limites del mes (no lanza).
export function rangoSemana(mes: string, semana: Semana): { desde: string; hasta: string } {
  const [year, month] = mes.split("-").map(Number);
  const total = new Date(year, month, 0).getDate();
  let desde: YMD | null = null;
  let hasta: YMD | null = null;
  for (let d = -6; d <= total + 7; d++) {
    const f = sumarDias({ year, month, day: 1 }, d - 1);
    // Mes legacy: se escanea con la logica vieja, salvo fechas de un mes posterior
    // cuyo viernes ya cae bajo la regla nueva (ej. sab 5-sep no es "cola de agosto").
    // Asi la S5 legacy de agosto 2026 (31-ago) sigue teniendo su rango.
    const v = viernesDeSemana(f);
    const nuevaRegla = usaReglaViernes(fmtMes(v.year, v.month));
    const c = !usaReglaViernes(mes) && !(nuevaRegla && fmtMes(f.year, f.month) > mes)
      ? cicloLegacy(f)
      : cicloDeYMD(f);
    if (c.mes === mes && c.semana === semana) {
      if (!desde) desde = f;
      hasta = f;
    }
  }
  if (!desde || !hasta) {
    return { desde: fmtISO({ year, month, day: 1 }), hasta: fmtISO({ year, month, day: total }) };
  }
  return { desde: fmtISO(desde), hasta: fmtISO(hasta) };
}

// Etiqueta corta del rango en español: "28 sep–4 oct", o "1–7 jun" si es el mismo mes.
export function etiquetaRangoSemana(mes: string, semana: Semana): string {
  const { desde, hasta } = rangoSemana(mes, semana);
  const [, m1, d1] = desde.split("-").map(Number);
  const [, m2, d2] = hasta.split("-").map(Number);
  if (m1 === m2) return d1 === d2 ? `${d1} ${MESES_CORTOS[m1]}` : `${d1}–${d2} ${MESES_CORTOS[m1]}`;
  return `${d1} ${MESES_CORTOS[m1]}–${d2} ${MESES_CORTOS[m2]}`;
}

// Fecha por defecto (ISO) de un aporte de la semana: max(desde, primer dia del mes),
// para que quede dentro del `mes` (la S1 nueva empieza en el mes anterior).
export function fechaDefaultSemana(mes: string, semana: Semana): string {
  const { desde } = rangoSemana(mes, semana);
  const primero = `${mes}-01`;
  return desde > primero ? desde : primero;
}

// Semana "de hoy" para un mes visible: la semana real de hoy si el mes es el
// mes operativo actual; si no, S1.
export function semanaDeHoyEnMes(mes: string, fecha: Date = new Date()): Semana {
  return mes === mesActual(fecha) ? semanaActual(fecha) : "S1";
}

// Dias (>= 0) desde hoy (Bogota) hasta el domingo (fin) de la semana.
export function diasHastaFinSemana(mes: string, semana: Semana, ahora: Date = new Date()): number {
  const [y, m, d] = rangoSemana(mes, semana).hasta.split("-").map(Number);
  const h = getColombiaDate(ahora);
  const dif = Math.round(
    (Date.UTC(y, m - 1, d) - Date.UTC(h.year, h.month - 1, h.day)) / 86400000
  );
  return Math.max(0, dif);
}
