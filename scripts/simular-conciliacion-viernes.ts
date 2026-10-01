// SEMANAS-VIERNES-01 — simulación en memoria de la conciliación, sobre un snapshot de SOLO LECTURA.
//
// Uso:
//   node --experimental-strip-types scripts/simular-conciliacion-viernes.ts <ruta/prod.json>
// El snapshot es un JSON {"H2!A:Y": [...], "H3!A:Q": [...], "H4!A:G": [...], "H4!I:N": [...], "H5B!A:I": [...]}
// (fila 0 = encabezados). Sin credenciales ni red: usa la MISMA lógica que el script de migración
// (scripts/lib/conciliacion-viernes.mjs) y calcularBalanceMes / semanasDeMes del código nuevo.
// Cubre las 4 variantes: --h2-ejecutadas-s2 revertir|retirar x --h4b oct|sep. Sale != 0 si alguna exigencia falla.
// Nota: el ingreso del emprendimiento (H11) no está en el snapshot, por eso el ingreso del mes es solo Camilo + Angie.

import { readFileSync } from "node:fs";
import { calcularBalanceMes } from "../lib/utils/balanceMes.ts";
import { semanasDeMes } from "../lib/utils/fecha.ts";
import type { Semana } from "../lib/data/types.ts";
import { planificar, aplicarOps, norm, MES_ORIGEN, MES_DESTINO, SEM_DESTINO } from "./lib/conciliacion-viernes.mjs";

const ruta = process.argv[2];
if (!ruta) { console.error("Uso: simular-conciliacion-viernes.ts <snapshot.json>"); process.exit(2); }
const snap = JSON.parse(readFileSync(ruta, "utf-8"));
const base = { H2: snap["H2!A:Y"], H3: snap["H3!A:Q"], H4B: snap["H4!I:N"], H5B: snap["H5B!A:I"] };
const h4a: string[][] = snap["H4!A:G"];

const col = (rows: string[][], r: string[], n: string) => norm(r[rows[0].indexOf(n)]);
const fmt = (n: number) => n.toLocaleString("es-CO");

function movsDe(rows: string[][], mes: string) {
  return rows.slice(1).filter((r) => norm(r[0]) && col(rows, r, "mes") === mes).map((r) => ({
    semana: (col(rows, r, "semana") || null) as Semana | null,
    estado: col(rows, r, "estado"),
    montoPresupuestado: Number(col(rows, r, "monto_presupuestado")) || 0,
  }));
}
function balance(t: typeof base, mes: string, semanas: Semana[]) {
  const ingresoCamilo = h4a.slice(1).filter((r) => norm(r[0]) && col(h4a, r, "mes") === mes)
    .reduce((a, r) => a + (Number(col(h4a, r, "monto_cop")) || 0), 0);
  const aportesPorSemana: Partial<Record<Semana, number>> = {};
  for (const r of t.H4B.slice(1).filter((r) => norm(r[0]) && col(t.H4B, r, "mes") === mes)) {
    const s = col(t.H4B, r, "semana") as Semana;
    aportesPorSemana[s] = (aportesPorSemana[s] ?? 0) + (Number(col(t.H4B, r, "monto")) || 0);
  }
  return calcularBalanceMes({ movs: movsDe(t.H2, mes), semanas, ingresoCamilo, aportesPorSemana });
}
function linea(etq: string, b: ReturnType<typeof balance>) {
  const suma = b.semanas.reduce((a, s) => a + s.comprometido, 0);
  console.log(`  ${etq.padEnd(34)} comprometido mes=${fmt(b.mes.comprometido)} | Σ semanas=${fmt(suma)} | fueraDeMes=${b.semanaFueraDeMes.cantidad} (${fmt(b.semanaFueraDeMes.comprometido)}) | sinSemana=${b.sinSemana.cantidad} | ingreso mes=${fmt(b.mes.ingreso)} | cuadre.ok=${b.cuadre.ok}`);
}

let fallos = 0;
const exigir = (ok: boolean, msg: string) => { console.log(`  [${ok ? "ok" : "FALLO"}] ${msg}`); if (!ok) fallos++; };

const semSep = semanasDeMes("2026-09"), semOct = semanasDeMes("2026-10");
console.log(`semanasDeMes(2026-09) = ${semSep.join(",")} | semanasDeMes(2026-10) = ${semOct.join(",")}`);
exigir(semSep.length === 4 && semOct.length === 5, "sep 4 semanas, oct 5 semanas (regla del viernes)");

console.log("\n== ANTES (snapshot sin conciliar) ==");
const antesSep = balance(base, "2026-09", semSep), antesOct = balance(base, "2026-10", semOct);
linea("2026-09 (código nuevo, 4 semanas)", antesSep);
linea("2026-09 (referencia 5 semanas)", balance(base, "2026-09", ["S1", "S2", "S3", "S4", "S5"]));
linea("2026-10", antesOct);
const comprometidoOctAntes = antesOct.mes.comprometido;
const sumaEjec = (t: typeof base) => t.H2.slice(1).filter((r) => norm(r[0]) && ["2026-09", "2026-10"].includes(col(t.H2, r, "mes")))
  .reduce((a, r) => a + (Number(col(t.H2, r, "monto_ejecutado")) || 0), 0);
const ejecAntes = sumaEjec(base);

for (const h2S2 of ["revertir", "retirar"] as const) {
  for (const h4b of ["oct", "sep"] as const) {
    console.log(`\n== DESPUÉS: --h2-ejecutadas-s2 ${h2S2} --h4b ${h4b} ==`);
    const plan = planificar(base, { h2S2, h4b });
    exigir(plan.pendientes.length === 0, `sin decisiones pendientes (${plan.pendientes.join("; ") || "ninguna"})`);
    const post = aplicarOps(base, plan.ops) as typeof base;
    const sep = balance(post, "2026-09", semSep), oct = balance(post, "2026-10", semOct);
    linea("2026-09", sep); linea("2026-10", oct);
    for (const [nombre, b] of [["2026-09", sep], ["2026-10", oct]] as const) {
      const suma = b.semanas.reduce((a, s) => a + s.comprometido, 0);
      exigir(b.mes.comprometido === suma && b.semanaFueraDeMes.cantidad === 0 && b.sinSemana.cantidad === 0 && b.cuadre.ok, `${nombre}: mes = Σ semanas, fueraDeMes 0, sinSemana 0, cuadre ok`);
    }
    const dOct = oct.mes.comprometido - comprometidoOctAntes;
    const retiradoS2 = h2S2 === "retirar" ? plan.ambiguos.reduce((a, x) => a + (Number(x.presup) || 0), 0) : 0;
    const fusiones = plan.filasH2.filter((f) => f.codigo === "a" || f.codigo === "e").length;
    console.log(`  comprometido oct: ANTES ${fmt(comprometidoOctAntes)} -> DESPUÉS ${fmt(oct.mes.comprometido)} (Δ ${fmt(dOct)}); no sube 1.109.996: ${dOct < 1109996 ? "cierto" : "FALSO"}`);
    console.log(`    explicación: Δ = -(presupuesto de las S2 retiradas ${fmt(retiradoS2)}) + efecto de fusiones/reubicaciones (${fusiones} fila(s) tipo a/e${fusiones ? ", revisar" : ": ninguna en este snapshot"})`);
    exigir(dOct === -retiradoS2, "Δ oct explicado por completo (0 con revertir; -presupuesto de S2 con retirar)");
    exigir(dOct < 1109996, "el comprometido de oct NO sube 1.109.996");
    // Un solo registro por concepto en oct S1; ninguna ejecución se cuenta dos veces.
    const cuentaPorConcepto: Record<string, number> = {};
    for (const r of post.H2.slice(1)) {
      if (norm(r[0]) && col(post.H2, r, "mes") === MES_DESTINO && col(post.H2, r, "semana") === SEM_DESTINO) {
        const c = col(post.H2, r, "id_concepto"); cuentaPorConcepto[c] = (cuentaPorConcepto[c] ?? 0) + 1;
      }
    }
    const dups = Object.entries(cuentaPorConcepto).filter(([, n]) => n > 1);
    exigir(dups.length === 0, `ningún id_concepto con más de una fila en ${MES_DESTINO} ${SEM_DESTINO} (${dups.map(([c]) => c).join(", ") || "ninguno"})`);
    const quedanSepS5 = post.H2.slice(1).filter((r) => norm(r[0]) && col(post.H2, r, "mes") === MES_ORIGEN && col(post.H2, r, "semana") === "S5").length;
    exigir(quedanSepS5 === 0, "no queda ninguna fila H2 en sep S5");
    // Ejecuciones: el total ejecutado de sep+oct solo puede bajar por (b) R ejecutada con T ejecutada y por las S2 revertidas/retiradas.
    const ejecDespues = sumaEjec(post);
    const retiradoB = plan.filasH2.filter((f) => f.codigo === "b" && f.resuelta && f.R.estado === "ejecutado").reduce((a, f) => a + (Number(f.R.monto) || 0), 0);
    const quitadoS2 = plan.ambiguos.reduce((a, x) => a + (Number(x.monto) || 0), 0);
    exigir(ejecAntes - ejecDespues === retiradoB + quitadoS2, `ejecución sin doble conteo: ejecutado ${fmt(ejecAntes)} -> ${fmt(ejecDespues)} (Δ ${fmt(ejecAntes - ejecDespues)} = R duplicadas ${fmt(retiradoB)} + S2 ${fmt(quitadoS2)})`);
    const h4bOct = post.H4B.slice(1).filter((r) => norm(r[0]) && col(post.H4B, r, "mes") === MES_DESTINO && col(post.H4B, r, "semana") === SEM_DESTINO)
      .map((r) => `${col(post.H4B, r, "monto")} (${col(post.H4B, r, "fecha")})`);
    console.log(`  ingreso Angie ${MES_DESTINO} ${SEM_DESTINO} resultante: ${h4bOct.join(" + ")} | H5B sep S5 restantes: ${post.H5B.slice(1).filter((r) => norm(r[0]) && col(post.H5B, r, "mes") === MES_ORIGEN && col(post.H5B, r, "semana") === "S5").length}`);
    // Idempotencia: replanificar sobre el resultado da 0 acciones.
    const replan = planificar(post, { h2S2, h4b });
    exigir(replan.totalAcciones === 0, `idempotente: re-plan sobre el resultado = ${replan.totalAcciones} acciones`);
  }
}

console.log(fallos === 0 ? "\nSIMULACIÓN OK: todas las exigencias cumplidas." : `\nSIMULACIÓN CON ${fallos} FALLO(S).`);
process.exit(fallos === 0 ? 0 : 1);
