// Regresión de lib/utils/fecha.ts — mes/semana operativos.
// Uso: node --experimental-strip-types scripts/verificar-ciclo-semanas.ts
//
// Cubre el bug de FIX-SEMANA-STUB-01 (cc51db9 tocó cicloOperativo() pero no
// semanaDeFechaEnMes()/semanasDeMes(), corriendo la numeración un lugar en
// meses que empiezan sábado/domingo — ej. agosto 2026). Corre:
//   1. Matriz de los 7 días de la semana como "día 1 del mes" (invariantes
//      genéricas: ningún día fuera de rango, sin semanas huérfanas salvo el
//      caso de cola conocido, mapeo monótono).
//   2. Los casos límite reales que cc51db9 ya había verificado (27-31 jul,
//      1-4 ago, transición jun-jul 2026).
//   3. El caso reportado por Camilo el 3-ago-2026 (hoy = S1, no S2).
//   4. semanaActivaDeMes() para mes actual vs. mes pasado.
//   5. SEMANAS-VIERNES-01: regla nueva (mes del viernes) desde 2026-09, con los
//      valores acordados con Camilo (1 oct 2026) y un barrido 2026-09..2027-12.
//   Los bloques 1-4 describen la regla vieja y SOLO aplican a meses < 2026-09
//   (MES_CORTE_VIERNES); el 31-ago-2026 es ahora un caso de la regla nueva.
//
// Si este script empieza a fallar tras un cambio en fecha.ts, es la señal de
// que se repitió el patrón de cc51db9: se tocó una función de la numeración
// sin sincronizar las demás.

import {
  mesActual,
  semanaActual,
  semanasDeMes,
  semanaDeFechaEnMes,
  diasEnMes,
  semanaActivaDeMes,
  mesDeFecha,
  rangoSemana,
  etiquetaRangoSemana,
  fechaDefaultSemana,
  semanaDeHoyEnMes,
  diasHastaFinSemana,
  mesTieneSemana5,
  MES_CORTE_VIERNES,
} from "../lib/utils/fecha.ts";

let fallos = 0;
let total = 0;

function assertEq(label: string, actual: unknown, esperado: unknown) {
  total++;
  const ok = actual === esperado;
  if (!ok) {
    fallos++;
    console.error(`FALLO  ${label}: esperado=${JSON.stringify(esperado)} actual=${JSON.stringify(actual)}`);
  } else {
    console.log(`ok     ${label} = ${JSON.stringify(actual)}`);
  }
}

function assertTrue(label: string, cond: boolean, detalle = "") {
  total++;
  if (!cond) {
    fallos++;
    console.error(`FALLO  ${label} ${detalle}`);
  } else {
    console.log(`ok     ${label}`);
  }
}

// Fecha a mediodía Bogotá (17:00 UTC) — evita cruces de día por huso horario.
function bogota(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 17, 0, 0));
}

// ── 1. Matriz de los 7 días de la semana como día-1-del-mes (2026 real) ────

const MESES_POR_INICIO: Record<string, string> = {
  Lunes: "2026-06",
  Martes: "2025-04",
  Miércoles: "2026-07",
  Jueves: "2026-01",
  Viernes: "2026-05",
  Sábado: "2026-08",
  Domingo: "2026-02",
};

for (const [nombreDia, mes] of Object.entries(MESES_POR_INICIO)) {
  const [year, month] = mes.split("-").map(Number);
  const semanas = semanasDeMes(mes);
  const totalDias = diasEnMes(mes);
  const usadas = new Set<string>();
  let anterior = "";
  let monotono = true;

  for (let d = 1; d <= totalDias; d++) {
    // 31-ago-2026 (lun) ya es regla nueva (viernes 4-sep => 2026-09 S1): fuera de la matriz legacy.
    if (mes === "2026-08" && d === 31) continue;
    const s = semanaDeFechaEnMes(bogota(year, month, d));
    assertTrue(
      `${mes} (inicia ${nombreDia}) día ${d} → ${s} está en semanasDeMes`,
      semanas.includes(s as never),
      `semanasDeMes(${mes})=${JSON.stringify(semanas)}`
    );
    usadas.add(s);
    if (anterior && s < anterior) monotono = false;
    anterior = s;
  }

  assertTrue(`${mes} (inicia ${nombreDia}) numeración monótona no decreciente`, monotono);
  assertEq(`${mes} (inicia ${nombreDia}) día 1 → S1 (no huérfana)`, semanaDeFechaEnMes(bogota(year, month, 1)), "S1");

  // Toda semana declarada debe tener al menos un día real, salvo el caso de
  // cola conocido y no cubierto por este fix (mes cuyo último día es lunes
  // — ver DT-CICLO-OPERATIVO-UNIFICADO-01, no bloquea este DoD).
  const ultimoDiaEsLunes = new Date(Date.UTC(year, month - 1, totalDias, 12, 0, 0)).getUTCDay() === 1;
  if (!ultimoDiaEsLunes) {
    for (const s of semanas) {
      // S5 legacy de agosto 2026 = solo el 31-ago, hoy reclasificado por la regla nueva.
      if (mes === "2026-08" && s === "S5") continue;
      assertTrue(`${mes} (inicia ${nombreDia}) ${s} no está huérfana`, usadas.has(s));
    }
  }
}

// ── 2. Casos límite reales ya verificados por cc51db9 ──────────────────────

assertEq("mesActual(27-jul-2026)", mesActual(bogota(2026, 7, 27)), "2026-07");
assertEq("semanaActual(27-jul-2026)", semanaActual(bogota(2026, 7, 27)), "S5");
assertEq("mesActual(31-jul-2026)", mesActual(bogota(2026, 7, 31)), "2026-07");
assertEq("semanaActual(31-jul-2026)", semanaActual(bogota(2026, 7, 31)), "S5");

assertEq("mesActual(1-ago-2026, sáb, cola de julio)", mesActual(bogota(2026, 8, 1)), "2026-07");
assertEq("semanaActual(1-ago-2026, sáb, cola de julio)", semanaActual(bogota(2026, 8, 1)), "S5");
assertEq("mesActual(2-ago-2026, dom, cola de julio)", mesActual(bogota(2026, 8, 2)), "2026-07");
assertEq("semanaActual(2-ago-2026, dom, cola de julio)", semanaActual(bogota(2026, 8, 2)), "S5");

assertEq("mesActual(4-ago-2026)", mesActual(bogota(2026, 8, 4)), "2026-08");

// transición jun-jul 2026: junio empieza en lunes, sin caso de cola.
assertEq("mesActual(29-jun-2026)", mesActual(bogota(2026, 6, 29)), "2026-06");
assertEq("mesActual(1-jul-2026)", mesActual(bogota(2026, 7, 1)), "2026-07");

// ── 3. Caso reportado 3-ago-2026: hoy debe ser S1, no S2 ───────────────────

assertEq("mesActual(HOY 3-ago-2026)", mesActual(bogota(2026, 8, 3)), "2026-08");
assertEq("semanaActual(HOY 3-ago-2026) — bug reportado: daba S2", semanaActual(bogota(2026, 8, 3)), "S1");
assertEq("semanaActual(4-ago-2026)", semanaActual(bogota(2026, 8, 4)), "S1");
assertEq("semanaActual(10-ago-2026, siguiente lunes)", semanaActual(bogota(2026, 8, 10)), "S2");

// ── 3b. Caso 31-ago-2026 (antes parche puntual, ahora regla del viernes) ────
// Agosto tiene 5 lunes; el último (31) tiene su viernes (4-sep) en septiembre,
// así que cae en 2026-09 S1 por la regla general (el parche puntual se eliminó).

assertEq("mesActual(31-ago-2026, regla viernes)", mesActual(bogota(2026, 8, 31)), "2026-09");
assertEq("semanaActual(31-ago-2026, regla viernes)", semanaActual(bogota(2026, 8, 31)), "S1");

// ── 4. semanaActivaDeMes: mes actual vs. mes pasado ─────────────────────────

assertEq(
  "semanaActivaDeMes(2026-08, hoy=3-ago) = semanaActual (mes actual)",
  semanaActivaDeMes("2026-08", bogota(2026, 8, 3)),
  "S1"
);
assertEq(
  "semanaActivaDeMes(2026-07, hoy=3-ago) = última semana de julio, no la de hoy",
  semanaActivaDeMes("2026-07", bogota(2026, 8, 3)),
  "S5"
);

// ── 5. SEMANAS-VIERNES-01: regla del viernes desde MES_CORTE_VIERNES ───────

assertEq("MES_CORTE_VIERNES", MES_CORTE_VIERNES, "2026-09");

function ciclo(label: string, y: number, m: number, d: number, mes: string, semana: string) {
  const f = bogota(y, m, d);
  assertEq(`${label} mesActual`, mesActual(f), mes);
  assertEq(`${label} semanaActual`, semanaActual(f), semana);
  assertEq(`${label} mesDeFecha`, mesDeFecha(f), mes);
  assertEq(`${label} semanaDeFechaEnMes`, semanaDeFechaEnMes(f), semana);
}

for (const [y, m, d] of [[2026, 9, 28], [2026, 9, 30], [2026, 10, 1], [2026, 10, 2], [2026, 10, 3], [2026, 10, 4]]) {
  ciclo(`${d}-${m}-${y}`, y, m, d, "2026-10", "S1");
}
ciclo("5-oct-2026", 2026, 10, 5, "2026-10", "S2");
for (const [y, m, d] of [[2026, 10, 26], [2026, 10, 31], [2026, 11, 1]]) {
  ciclo(`${d}-${m}-${y}`, y, m, d, "2026-10", "S5");
}
ciclo("2-nov-2026", 2026, 11, 2, "2026-11", "S1");
ciclo("30-nov-2026", 2026, 11, 30, "2026-12", "S1");
ciclo("28-dic-2026", 2026, 12, 28, "2027-01", "S1");
ciclo("1-ene-2027", 2027, 1, 1, "2027-01", "S1");
ciclo("31-ago-2026", 2026, 8, 31, "2026-09", "S1");
for (let d = 21; d <= 27; d++) ciclo(`${d}-sep-2026`, 2026, 9, d, "2026-09", "S4");

const esperadoSemanas: Record<string, string> = {
  "2026-09": "S1,S2,S3,S4",
  "2026-10": "S1,S2,S3,S4,S5",
  "2026-11": "S1,S2,S3,S4",
  "2026-12": "S1,S2,S3,S4",
  "2027-01": "S1,S2,S3,S4,S5",
  "2026-08": "S1,S2,S3,S4,S5", // legacy, sin cambio
  "2026-07": "S1,S2,S3,S4,S5",
  "2026-06": "S1,S2,S3,S4,S5",
};
for (const [mes, esp] of Object.entries(esperadoSemanas)) {
  assertEq(`semanasDeMes(${mes})`, semanasDeMes(mes).join(","), esp);
}
assertEq("mesTieneSemana5(2026-10)", mesTieneSemana5("2026-10"), true);
assertEq("mesTieneSemana5(2026-09)", mesTieneSemana5("2026-09"), false);

// Rangos y etiquetas
assertEq("rangoSemana(2026-10,S1)", JSON.stringify(rangoSemana("2026-10", "S1")), JSON.stringify({ desde: "2026-09-28", hasta: "2026-10-04" }));
assertEq("rangoSemana(2026-09,S1)", JSON.stringify(rangoSemana("2026-09", "S1")), JSON.stringify({ desde: "2026-08-31", hasta: "2026-09-06" }));
assertEq("etiquetaRangoSemana(2026-10,S1)", etiquetaRangoSemana("2026-10", "S1"), "28 sep–4 oct");
assertEq("etiquetaRangoSemana(2026-10,S2)", etiquetaRangoSemana("2026-10", "S2"), "5–11 oct");
assertEq("etiquetaRangoSemana(2026-06,S1) legacy", etiquetaRangoSemana("2026-06", "S1"), "1–7 jun");
assertEq("rangoSemana(2026-08,S5) legacy = 31-ago", JSON.stringify(rangoSemana("2026-08", "S5")), JSON.stringify({ desde: "2026-08-31", hasta: "2026-08-31" }));
assertEq("fechaDefaultSemana(2026-10,S1) dentro del mes", fechaDefaultSemana("2026-10", "S1"), "2026-10-01");
assertEq("fechaDefaultSemana(2026-10,S2)", fechaDefaultSemana("2026-10", "S2"), "2026-10-05");

// semanaDeHoyEnMes / diasHastaFinSemana
assertEq("semanaDeHoyEnMes(2026-10, hoy=1-oct) = S1", semanaDeHoyEnMes("2026-10", bogota(2026, 10, 1)), "S1");
assertEq("semanaDeHoyEnMes(2026-10, hoy=8-oct) = S2", semanaDeHoyEnMes("2026-10", bogota(2026, 10, 8)), "S2");
assertEq("semanaDeHoyEnMes(2026-11, hoy=8-oct) = S1 (otro mes)", semanaDeHoyEnMes("2026-11", bogota(2026, 10, 8)), "S1");
assertEq("diasHastaFinSemana(2026-10,S1, hoy=1-oct)", diasHastaFinSemana("2026-10", "S1", bogota(2026, 10, 1)), 3);
assertEq("diasHastaFinSemana(2026-10,S1, hoy=4-oct)", diasHastaFinSemana("2026-10", "S1", bogota(2026, 10, 4)), 0);
assertEq("diasHastaFinSemana(2026-10,S1, hoy=10-oct) mínimo 0", diasHastaFinSemana("2026-10", "S1", bogota(2026, 10, 10)), 0);

// Barrido 2026-09..2027-12: cada día cae en una semana de semanasDeMes de su mes de
// ciclo, numeración monótona dentro del ciclo, y rangoSemana cubre 7 días lun-dom.
{
  const orden = ["S1", "S2", "S3", "S4", "S5"];
  const ultimo: Record<string, number> = {};
  let dia = new Date(Date.UTC(2026, 8, 1, 17, 0, 0));
  const fin = Date.UTC(2027, 11, 31, 17, 0, 0);
  let cayoFuera = 0, noMonotono = 0, dias = 0;
  while (dia.getTime() <= fin) {
    const mes = mesActual(dia);
    const sem = semanaActual(dia);
    dias++;
    if (!semanasDeMes(mes).includes(sem)) cayoFuera++;
    const idx = orden.indexOf(sem);
    if (ultimo[mes] !== undefined && idx < ultimo[mes]) noMonotono++;
    ultimo[mes] = idx;
    dia = new Date(dia.getTime() + 86400000);
  }
  assertEq(`barrido ${dias} días: días fuera de semanasDeMes`, cayoFuera, 0);
  assertEq("barrido: violaciones de monotonía", noMonotono, 0);

  let malosRango = 0;
  let meses = 0;
  for (let y = 2026; y <= 2027; y++) {
    for (let m = 1; m <= 12; m++) {
      const mes = `${y}-${String(m).padStart(2, "0")}`;
      if (mes < "2026-09" || mes > "2027-12") continue;
      meses++;
      for (const s of semanasDeMes(mes)) {
        const { desde, hasta } = rangoSemana(mes, s);
        const d1 = new Date(desde + "T12:00:00Z"), d2 = new Date(hasta + "T12:00:00Z");
        const ok = d1.getUTCDay() === 1 && d2.getUTCDay() === 0 && (d2.getTime() - d1.getTime()) / 86400000 === 6;
        if (!ok) { malosRango++; console.error(`FALLO rango ${mes} ${s}: ${desde}..${hasta}`); }
      }
    }
  }
  assertEq(`barrido ${meses} meses: rangoSemana no lun-dom de 7 días`, malosRango, 0);
}

// ── Resultado ────────────────────────────────────────────────────────────

console.log(`\n${total - fallos}/${total} aserciones ok.`);
if (fallos > 0) {
  console.error(`${fallos} fallo(s).`);
  process.exit(1);
}
