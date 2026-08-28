---
ticket_id: FIX-BALANCE-SEMANAL-EJECUCION-01
orden: 35
estado: activo
tier: B
agente_ejecucion: cualquiera
dependencias: ninguna
rol_activo: coder
paso_actual: "Leyendo MesM1Desktop.tsx (balanceSemanas/balancePlanificacion) para diseñar la función compartida"
actualizado_en: 2026-08-28T16:00:48-05:00
necesita_aprobacion: no
---

# FIX-BALANCE-SEMANAL-EJECUCION-01 — Unificar remanente semanal y corregir fórmula de la tab Ejecución

## Goal completo

Unificar el cálculo de "remanente encadenado por semana" en una única
función compartida — hoy duplicado en `components/MesM1Desktop.tsx:430-450`
(`balanceSemanas`, tab Ejecución) y `components/MesM1Desktop.tsx:480-504`
(`balancePlanificacion`, tab Planificación) — y cambiar la fórmula de la
tab Ejecución para que cada semana reste `comprometido_restante +
ejecutado_real` en vez de solo `ejecutado`, donde:

- `ejecutado_real` = lo mismo que hoy usa `balanceSemanas` línea 445
  (`ejecutadoH2 + gastoH3PorSemana[s]`).
- `comprometido_restante` = la porción de `comprometido` de esa semana que
  todavía **no** está marcada/contabilizada como ejecutada.

Con esto, el número converge al comprometido total cuando el gasto real
coincide con lo presupuestado, pero refleja correctamente una desviación
(gastar más o menos de lo planificado) — decisión de producto de Camilo,
resuelve el HALT del diagnóstico previo.

La tab **Planificación** (`balancePlanificacion`, líneas 480-504) **no
cambia de comportamiento** — sigue restando `comprometido` completo por
semana, cero regresión, mismo output que hoy.

**Explícitamente fuera de alcance** (candidatos a ticket aparte, no
construir aquí):
- El gate de saldos asimétrico entre desktop y mobile: `MesM1Desktop.tsx:542-548`
  exige `saldosOk` antes de pasar a la tab Ejecución (abre
  `ModalConfirmarSaldos` si falta); `MesM1Mobile.tsx:243` no tiene ningún
  gate equivalente. Hallazgo secundario del diagnóstico, no la causa del
  bug de este ticket.
- El código muerto en `components/MesM1.tsx` y
  `components/m1/VistaPlanificacion.tsx` — nadie los importa fuera de sí
  mismos, contienen una tercera copia divergente de la misma lógica de
  remanente, pero no forman parte del path activo (`/mes/[mes]` →
  `MesM1ClientWrapper.tsx` → `MesM1Desktop.tsx`/`MesM1Mobile.tsx`).
- `disponiblePorCuenta()` (`MesM1Desktop.tsx:391-401`, el bloque de
  `SaldoCuenta`/H4C) — ya está correcto, no tiene el bug, no tocar.

## Definition of Done

- [ ] Existe una única función compartida (nueva, en `lib/` o donde el
      Coder decida que encaje mejor con el patrón ya establecido del
      proyecto) que calcula el remanente encadenado por semana,
      parametrizada por qué restar en cada iteración; ambas tabs de
      `MesM1Desktop.tsx` la consumen en vez de reimplementar el loop cada
      una por su lado.
- [ ] Tab Planificación: mismo output numérico que antes del cambio,
      verificado con el mismo mes/dataset antes y después del refactor.
- [ ] Tab Ejecución: para una semana con ejecución parcial, el remanente
      resta `comprometido_restante + ejecutado_real` — verificado con un
      caso real o sintético donde el gasto ejecutado difiere del
      comprometido, mostrando que el resultado ya no es "casi todo el
      ingreso sin tocar" (el defecto original reportado por Camilo: +20M
      de superávit acumulado en Ejecución frente a -11M de déficit real en
      Planificación semana 2, con casi nada ejecutado en el momento del
      reporte).
- [ ] `tsc --noEmit` limpio.
- [ ] No se modificó `disponiblePorCuenta()` (`MesM1Desktop.tsx:391-401`)
      — ese bloque ya está correcto, prueba de regresión explícita de que
      el saldo de cuenta mostrado no cambia.

## Contexto / diagnóstico previo

Diagnóstico Tier B ya cerrado (rol Diagnóstico, sesión previa, evidencia
directa de código, no hipótesis). HALT de producto ya resuelto por Camilo
(ver Goal completo) — este ticket entra directo `aprobado`, no
`propuesto` ni `diagnostico_listo`.

**Path activo confirmado (I-12):** `/mes/[mes]` → `MesM1ClientWrapper.tsx`
→ `MesM1Desktop.tsx` o `MesM1Mobile.tsx` según ancho de pantalla. El
toggle "Planificación/Ejecución" que muestra el bug es interno a
`components/MesM1Desktop.tsx` (`useState<"planificacion"|"ejecucion">`,
línea 337, botones en líneas 920-932).

**Causa raíz:** dos implementaciones independientes del mismo cálculo
("remanente encadenado por semana"), ambas arrancando de
`ingresoCamiloLocal.montoCop` (`lib/data/types.ts:146-154`), pero restando
cosas distintas:

- Tab **Planificación** — `balancePlanificacion`,
  `MesM1Desktop.tsx:480-504`. Cada semana resta `comprometido` (línea
  499): el presupuesto completo de la semana, se haya ejecutado o no.
- Tab **Ejecución** — `balanceSemanas`, `MesM1Desktop.tsx:430-450`. Cada
  semana resta `ejecutado` (línea 445): solo `ejecutadoH2 +
  gastoH3PorSemana[s]`, lo que ya está marcado como ejecutado en H2/H3B
  para esa semana.

Como el remanente se encadena semana a semana (`remanente = diferencia`,
líneas 449 y 503) y casi nada estaba ejecutado en el momento del reporte
de Camilo, la tab Ejecución mostraba un "superávit" acumulado (+20M) muy
alejado del déficit real de Planificación (-11M en semana 2) — no es que
uno esté numéricamente mal, es que ambas tabs miden cosas conceptualmente
distintas bajo el mismo nombre/layout visual ("Por semana", líneas 778 y
855).

**Dato aparte, no la causa:** ninguna de las dos tabs usa `SaldoCuenta`
(H4C). El saldo de cuenta (10.4M→9.4M que Camilo confirmó) se calcula
correctamente en `disponiblePorCuenta()` (`MesM1Desktop.tsx:391-401`) —
ese bloque no tiene bug, no tocar (ver DoD).

**Candidato de invariante ya existente** — este es el tercer caso del
mismo patrón ya registrado como candidato en `INVARIANTS.md` bajo
"Cálculo de mes/semana operativos desde una única fuente de verdad"
(líneas ~159-171 de ese archivo, origen `FIX-SEMANA-STUB-01`): cálculos
derivados duplicados sin fuente única de verdad — antes con fecha/semana
operativa vía `cicloOperativo()` (`cc51db9`, `FIX-SEMANA-STUB-01`), ahora
con balance semanal (este ticket). No crear un candidato de invariante
nuevo — este ticket es evidencia adicional a favor de promover el
existente, referenciarlo tal cual.

## Commit de cierre
(vacío hasta completar)

## Notas de ejecución
(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda técnica
encontrada, criterios de parada activados)
