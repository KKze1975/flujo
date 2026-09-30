// Prueba de cuadre de lib/utils/balanceMes.ts — BALANCE-UNIFICADO-01.
//
// Uso:
//   node --experimental-strip-types scripts/verificar-balance-cuadre.ts
//       -> fixtures sintéticos (sin red, sin Sheet).
//   node --experimental-strip-types scripts/verificar-balance-cuadre.ts --prod-readonly
//       -> además, SOLO LECTURA contra el Sheet de producción (scope
//          spreadsheets.readonly; Sheet ID desde PROD_GOOGLE_SHEET_ID en
//          .env.local — nunca se imprime). Por cada mes: cuadre = 0 y
//          sinSemana = 0. Falla (exit 1) si algún mes no cuadra.
//   --dev-readonly usa GOOGLE_SHEET_ID (DEV) en lugar de PROD.

import { readFileSync } from "node:fs";
import { calcularBalanceMes, comprometidoDe, esComprometido, aportesPorSemanaDe } from "../lib/utils/balanceMes.ts";
import { semanasDeMes } from "../lib/utils/fecha.ts";
import { ingresosPlaneadosDe } from "../lib/utils/ingresosPlaneados.ts";
import type { Semana } from "../lib/data/types.ts";

let fallos = 0;
let total = 0;

function assertEq(label: string, actual: unknown, esperado: unknown) {
  total++;
  if (actual !== esperado) {
    fallos++;
    console.error(`FALLO  ${label}: esperado=${JSON.stringify(esperado)} actual=${JSON.stringify(actual)}`);
  } else {
    console.log(`ok     ${label} = ${JSON.stringify(actual)}`);
  }
}

type M = { semana: Semana | null; estado: string; montoPresupuestado: number };
const mov = (semana: Semana | null, estado: string, montoPresupuestado: number): M => ({ semana, estado, montoPresupuestado });

// ── 1. Fixtures sintéticos ───────────────────────────────────────────────────

function caso(nombre: string, args: Parameters<typeof calcularBalanceMes>[0], esperado: { comprometido: number; ingreso: number }) {
  const b = calcularBalanceMes(args);
  const sumaSemanasComp = b.semanas.reduce((a, s) => a + s.comprometido, 0);
  const sumaSemanasIng = b.semanas.reduce((a, s) => a + s.ingreso, 0);
  assertEq(`${nombre}: mes.comprometido - Σsemanas`, b.mes.comprometido - sumaSemanasComp, 0);
  assertEq(`${nombre}: mes.ingreso - Σsemanas`, b.mes.ingreso - sumaSemanasIng, 0);
  assertEq(`${nombre}: cuadre.comprometido`, b.cuadre.comprometido, 0);
  assertEq(`${nombre}: cuadre.ingreso`, b.cuadre.ingreso, 0);
  assertEq(`${nombre}: sinSemana.cantidad`, b.sinSemana.cantidad, 0);
  assertEq(`${nombre}: cuadre.ok`, b.cuadre.ok, true);
  assertEq(`${nombre}: mes.comprometido esperado`, b.mes.comprometido, esperado.comprometido);
  assertEq(`${nombre}: mes.ingreso esperado`, b.mes.ingreso, esperado.ingreso);
  assertEq(`${nombre}: diferencia = ingreso - comprometido`, b.mes.diferencia, esperado.ingreso - esperado.comprometido);
}

const S4: Semana[] = ["S1", "S2", "S3", "S4"];
const S5: Semana[] = ["S1", "S2", "S3", "S4", "S5"];

caso("mes con S5", {
  movs: [mov("S1", "ejecutado", 100), mov("S2", "pendiente", 200), mov("S5", "pendiente", 50)],
  semanas: S5, ingresoCamilo: 1000, aportesPorSemana: { S1: 10, S5: 5 },
}, { comprometido: 350, ingreso: 1015 });

caso("mes sin S5", {
  movs: [mov("S1", "pendiente", 100), mov("S4", "ejecutado", 300)],
  semanas: S4, ingresoCamilo: 500, aportesPorSemana: { S2: 20 },
}, { comprometido: 400, ingreso: 520 });

caso("pospuesto / no_aplica / pospuesto_mes_siguiente no cuentan", {
  movs: [
    mov("S1", "pendiente", 100), mov("S1", "pospuesto", 999), mov("S2", "no_aplica", 888),
    mov("S3", "pospuesto_mes_siguiente", 777), mov("S3", "ejecutado", 40),
  ],
  semanas: S4, ingresoCamilo: 200, aportesPorSemana: {},
}, { comprometido: 140, ingreso: 200 });

caso("aportes en semanas no consecutivas (S1, S3, S5)", {
  movs: [mov("S2", "pendiente", 10)],
  semanas: S5, ingresoCamilo: 100, aportesPorSemana: { S1: 1, S3: 3, S5: 5 },
}, { comprometido: 10, ingreso: 109 });

caso("ingreso Camilo 0", {
  movs: [mov("S1", "pendiente", 60), mov("S2", "pendiente", 40)],
  semanas: S4, ingresoCamilo: 0, aportesPorSemana: { S1: 30 },
}, { comprometido: 100, ingreso: 30 });

// D1: comprometidoEjecutado / comprometidoRestante por semana (Ejecución los consume).
{
  const b = calcularBalanceMes({
    movs: [
      mov("S1", "ejecutado", 100), mov("S1", "pendiente", 30), mov("S1", "pospuesto", 999),
      mov("S2", "ejecutado", 50), mov("S2", "no_aplica", 888), mov("S3", "pospuesto_mes_siguiente", 777),
    ],
    semanas: S4, ingresoCamilo: 0, aportesPorSemana: {},
  });
  const [s1, s2, s3] = b.semanas;
  assertEq("D1 S1: comprometido (excluye pospuesto)", s1.comprometido, 130);
  assertEq("D1 S1: comprometidoEjecutado", s1.comprometidoEjecutado, 100);
  assertEq("D1 S1: comprometidoRestante = comprometido - ejecutado", s1.comprometidoRestante, 30);
  assertEq("D1 S2: comprometido (excluye no_aplica)", s2.comprometido, 50);
  assertEq("D1 S2: comprometidoRestante", s2.comprometidoRestante, 0);
  assertEq("D1 S3: comprometido (excluye pospuesto_mes_siguiente)", s3.comprometido, 0);
  assertEq("D1: Σ comprometidoRestante + Σ comprometidoEjecutado = mes.comprometido",
    b.semanas.reduce((a, x) => a + x.comprometidoRestante + x.comprometidoEjecutado, 0), b.mes.comprometido);
}

// Ampliación 30 sept 2026: helpers para superficies que solo ven un tramo (semana, categoría).
{
  const movs = [
    mov("S1", "ejecutado", 100), mov("S1", "pendiente", 30), mov("S1", "pospuesto", 999),
    mov("S2", "no_aplica", 888), mov("S2", "pendiente", 5), mov("S3", "pospuesto_mes_siguiente", 777),
  ];
  const b = calcularBalanceMes({ movs, semanas: S4, ingresoCamilo: 0, aportesPorSemana: {} });
  assertEq("comprometidoDe(todo el mes) = mes.comprometido", comprometidoDe(movs), b.mes.comprometido);
  for (const sem of S4) {
    assertEq(`comprometidoDe(slice ${sem}) = balanceMes.semanas[${sem}]`,
      comprometidoDe(movs.filter((m) => m.semana === sem)), b.semanas.find((x) => x.semana === sem)!.comprometido);
  }
  assertEq("esComprometido(pospuesto) es false", esComprometido("pospuesto"), false);
  assertEq("esComprometido(pendiente) es true", esComprometido("pendiente"), true);
  assertEq("aportesPorSemanaDe suma duplicados y respeta semanas", JSON.stringify(aportesPorSemanaDe([
    { semana: "S1", monto: 10 }, { semana: "S1", monto: 5 }, { semana: "S3", monto: 7 },
  ])), JSON.stringify({ S1: 15, S3: 7 }));
}

// ── 1b. APORTES-SEMANALES-01A: Angie + emprendimiento vía ingresosPlaneadosDe ─

function casoAportes(
  nombre: string,
  semanas: Semana[],
  ingresoCamilo: number,
  angie: { semana: Semana; monto: number }[],
  adicional: { semana: Semana; monto: number }[],
  movs: M[],
) {
  const ip = ingresosPlaneadosDe(angie, adicional);
  const b = calcularBalanceMes({ movs, semanas, ingresoCamilo, aportesPorSemana: ip.aportesPorSemana });
  assertEq(`${nombre}: mes.ingreso - Σsemanas.ingreso`, b.mes.ingreso - b.semanas.reduce((a, x) => a + x.ingreso, 0), 0);
  assertEq(`${nombre}: mes.comprometido - Σsemanas.comprometido`, b.mes.comprometido - b.semanas.reduce((a, x) => a + x.comprometido, 0), 0);
  assertEq(`${nombre}: cuadre.ok`, b.cuadre.ok, true);
  semanas.forEach((sem, i) => {
    const esperado = (i === 0 ? ingresoCamilo : 0)
      + angie.filter((x) => x.semana === sem).reduce((a, x) => a + x.monto, 0)
      + adicional.filter((x) => x.semana === sem).reduce((a, x) => a + x.monto, 0);
    assertEq(`${nombre}: ingreso ${sem} = Camilo(solo S1) + Angie + emprendimiento`, b.semanas[i].ingreso, esperado);
    assertEq(`${nombre}: porSemana ${sem}.total = angie + adicional`, ip.porSemana[sem].total, ip.porSemana[sem].angie + ip.porSemana[sem].adicional);
  });
  const totAng = angie.reduce((a, x) => a + x.monto, 0);
  const totAdi = adicional.reduce((a, x) => a + x.monto, 0);
  assertEq(`${nombre}: totales.angie`, ip.totales.angie, totAng);
  assertEq(`${nombre}: totales.adicional`, ip.totales.adicional, totAdi);
  assertEq(`${nombre}: mes.ingreso = Camilo + Angie + emprendimiento`, b.mes.ingreso, ingresoCamilo + totAng + totAdi);
}

casoAportes("A01 semanas no consecutivas (S1,S3,S5), mes con S5", S5, 1000,
  [{ semana: "S2", monto: 40 }], [{ semana: "S1", monto: 7 }, { semana: "S3", monto: 9 }, { semana: "S5", monto: 11 }],
  [mov("S1", "pendiente", 100), mov("S5", "ejecutado", 30)]);
casoAportes("A01 mes sin S5", S4, 500,
  [{ semana: "S4", monto: 25 }], [{ semana: "S2", monto: 2_000_000 }, { semana: "S4", monto: 3_000_000 }],
  [mov("S2", "pendiente", 60), mov("S3", "pospuesto", 999)]);
casoAportes("A01 aporte 0", S4, 100, [], [{ semana: "S2", monto: 0 }], [mov("S1", "pendiente", 10)]);
casoAportes("A01 Angie y emprendimiento en la misma semana", S4, 100,
  [{ semana: "S2", monto: 800 }], [{ semana: "S2", monto: 2000 }], [mov("S2", "pendiente", 500)]);
casoAportes("A01 ingreso Camilo 0", S4, 0, [{ semana: "S1", monto: 30 }], [{ semana: "S1", monto: 5 }, { semana: "S3", monto: 6 }],
  [mov("S1", "pendiente", 20)]);
{
  const ip = ingresosPlaneadosDe([{ semana: "S2", monto: 800 }], [{ semana: "S2", monto: 2000 }]);
  assertEq("A01 aporte de S2 no suma al disponible de S1 ni S3", `${ip.porSemana.S1.total}/${ip.porSemana.S2.total}/${ip.porSemana.S3.total}`, "0/2800/0");
  // aporte del emprendimiento en semana fuera del mes: el cuadre debe fallar en voz alta (no se descarta).
  const b = calcularBalanceMes({
    movs: [], semanas: S4, ingresoCamilo: 0,
    aportesPorSemana: ingresosPlaneadosDe([], [{ semana: "S5", monto: 9 }]).aportesPorSemana,
  });
  assertEq("A01 aporte emprendimiento en S5 de mes sin S5: cuadre.ok es false", b.cuadre.ok, false);
}

// ── 2. Caso que DEBE fallar: semana vacía ────────────────────────────────────

{
  const b = calcularBalanceMes({
    movs: [mov("S1", "pendiente", 100), mov(null, "ejecutado", 60)],
    semanas: S4, ingresoCamilo: 0, aportesPorSemana: {},
  });
  assertEq("semana vacía: sinSemana.cantidad", b.sinSemana.cantidad, 1);
  assertEq("semana vacía: sinSemana.comprometido", b.sinSemana.comprometido, 60);
  assertEq("semana vacía: cuadre.comprometido (referencia - Σsemanas)", b.cuadre.comprometido, 60);
  assertEq("semana vacía: cuadre.ok es false (fallo esperado, no se reparte en silencio)", b.cuadre.ok, false);
  console.log(`       (fallo esperado demostrado: ${JSON.stringify(b.cuadre.errores)})`);
}
{
  const b = calcularBalanceMes({
    movs: [mov("S5", "pendiente", 70)], semanas: S4, ingresoCamilo: 0, aportesPorSemana: { S5: 9 },
  });
  assertEq("S5 en mes sin S5: semanaFueraDeMes.cantidad", b.semanaFueraDeMes.cantidad, 1);
  assertEq("S5 en mes sin S5: cuadre.ok es false", b.cuadre.ok, false);
}

// ── 3. Solo lectura contra el Sheet (opcional) ───────────────────────────────

async function contraSheet(target: "PROD" | "DEV") {
  const env: Record<string, string> = {};
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^"(.*)"$/, "$1");
  }
  const spreadsheetId = target === "PROD" ? env.PROD_GOOGLE_SHEET_ID : env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error(`Falta el Sheet ID de ${target} en .env.local`);
  const { google } = await import("googleapis");
  const auth = new google.auth.JWT({
    email: env.GOOGLE_CLIENT_EMAIL,
    key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const get = async (range: string) =>
    ((await sheets.spreadsheets.values.get({ spreadsheetId, range })).data.values ?? []) as string[][];

  console.log(`\nTarget: ${target} — operación: lectura (scope readonly), tabs H2 y H4`);
  const h2 = await get("H2!A:Y");
  const h4a = await get("H4!A:G");
  const h4b = await get("H4!I:N");
  const [h2h, ...h2rows] = h2;
  const col2 = (r: string[], n: string) => r[h2h.indexOf(n)] ?? "";
  const filas = h2rows.filter((r) => r[0]).map((r, i) => ({
    id: col2(r, "id_movimiento"), fila: i + 2, mes: col2(r, "mes"),
    concepto: col2(r, "nombre_snapshot"), estado: col2(r, "estado"),
    semana: (col2(r, "semana") || null) as Semana | null,
    montoPresupuestado: Number(col2(r, "monto_presupuestado")) || 0,
  }));
  const meses = [...new Set(filas.map((f) => f.mes))].sort();

  const [h4ah, ...h4arows] = h4a;
  const [h4bh, ...h4brows] = h4b;

  for (const mes of meses) {
    const movs = filas.filter((f) => f.mes === mes);
    const ingresoCamilo = h4arows
      .filter((r) => r[0] && r[h4ah.indexOf("mes")] === mes)
      .reduce((a, r) => a + (Number(r[h4ah.indexOf("monto_cop")]) || 0), 0);
    const aportesPorSemana: Partial<Record<Semana, number>> = {};
    for (const r of h4brows.filter((r) => r[0] && r[h4bh.indexOf("mes")] === mes)) {
      const s = r[h4bh.indexOf("semana")] as Semana;
      aportesPorSemana[s] = (aportesPorSemana[s] ?? 0) + (Number(r[h4bh.indexOf("monto")]) || 0);
    }
    const b = calcularBalanceMes({ movs, semanas: semanasDeMes(mes), ingresoCamilo, aportesPorSemana });
    console.log(
      `${mes}: movs=${movs.length} mes.comprometido=${b.mes.comprometido} mes.ingreso=${b.mes.ingreso} ` +
      `cuadre(ing=${b.cuadre.ingreso}, comp=${b.cuadre.comprometido}) sinSemana=${b.sinSemana.cantidad} fueraDeMes=${b.semanaFueraDeMes.cantidad}`
    );
    for (const idx of b.sinSemana.ids) {
      const f = movs[idx];
      console.log(`       fila sin semana: ${f.id} (fila H2 ${f.fila}) concepto="${f.concepto}" estado=${f.estado} monto=${f.montoPresupuestado}`);
    }
    // Tabla ANTES/DESPUÉS por pantalla (ampliación 30 sept 2026). ANTES = fórmulas de HEAD (7662ae7).
    const cop = (n: number) => n.toLocaleString("es-CO");
    const antesTodo = movs.reduce((a, m) => a + m.montoPresupuestado, 0);
    const antesSem = (sem: Semana) => movs.filter((m) => m.semana === sem && m.estado !== "no_aplica" && m.estado !== "pospuesto_mes_siguiente")
      .reduce((a, m) => a + m.montoPresupuestado, 0);
    const antesSemTodo = (sem: Semana) => movs.filter((m) => m.semana === sem).reduce((a, m) => a + m.montoPresupuestado, 0);
    const despMes = b.mes.comprometido;
    console.log(`TABLA ${mes} | inicio/lista meses/api meses/MesM1(Balance mes): ${cop(antesTodo)} -> ${cop(despMes)}`);
    for (const sw of b.semanas) {
      const sliceSem = movs.filter((m) => m.semana === sw.semana);
      total++;
      if (comprometidoDe(sliceSem) !== sw.comprometido) { fallos++; console.error(`FALLO  ${mes} ${sw.semana}: comprometidoDe(slice) != balanceMes`); }
      console.log(
        `TABLA ${mes} ${sw.semana} | VistaSemanal total: ${cop(antesSem(sw.semana))} -> ${cop(sw.comprometido)}` +
        ` | api semana: ${cop(comprometidoDe(sliceSem))} = ${cop(sw.comprometido)}` +
        ` | ConceptoBoard columna/MesM1 Balance ${sw.semana}: ${cop(antesSemTodo(sw.semana))} -> ${cop(sw.comprometido)}`
      );
    }
    total++;
    if (!b.cuadre.ok) {
      fallos++;
      console.error(`FALLO  ${target} ${mes}: ${b.cuadre.errores.join("; ")}`);
    } else {
      console.log(`ok     ${target} ${mes} cuadra`);
    }
  }
}

const args = process.argv.slice(2);
if (args.includes("--prod-readonly")) await contraSheet("PROD");
else if (args.includes("--dev-readonly")) await contraSheet("DEV");

console.log(`\n${total - fallos}/${total} aserciones ok.`);
if (fallos > 0) {
  console.error(`${fallos} fallo(s).`);
  process.exit(1);
}
