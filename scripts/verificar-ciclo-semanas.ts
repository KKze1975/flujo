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
  Martes: "2026-09",
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

// ── Resultado ────────────────────────────────────────────────────────────

console.log(`\n${total - fallos}/${total} aserciones ok.`);
if (fallos > 0) {
  console.error(`${fallos} fallo(s).`);
  process.exit(1);
}
