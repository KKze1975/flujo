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
import { calcularBalanceMes } from "../lib/utils/balanceMes.ts";
import { semanasDeMes } from "../lib/utils/fecha.ts";
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
