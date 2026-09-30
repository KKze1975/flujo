---
ticket_id: BALANCE-CIERRES-H5-01
orden: 44
estado: propuesto
tier: B
agente_ejecucion: claude-code
dependencias: BALANCE-UNIFICADO-01
---

# BALANCE-CIERRES-H5-01 — Cálculos de cierre que persisten en H5 usan la definición canónica de comprometido

## Goal completo

Origen: HALT parcial de `BALANCE-UNIFICADO-01` (criterio 3, persiste datos). Decisión de Camilo,
30 sept 2026: estos puntos NO entran al PR #47; van en este ticket aparte.

Hoy tres cálculos que se **escriben** en los cierres usan una fórmula distinta de la definición
canónica de comprometido (`lib/utils/balanceMes.ts`: excluye `pospuesto`, `no_aplica`,
`pospuesto_mes_siguiente`):

- `app/api/mes/[mes]/cerrar-semana/route.ts` l.57: `totalPresupuestado` suma TODOS los estados
  de la semana; se guarda en H5 `total_presupuestado` y alimenta `desviacionTotal = ejecutado - presupuestado`.
- `app/api/mes/[mes]/cerrar-semana/route.ts` l.107: `totalComprometido` del plan de la semana
  siguiente = solo `pendiente`; se guarda en H5 `total_comprometido` y en `balanceProyectado`.
- `app/api/mes/[mes]/cerrar-m1/route.ts` l.29: `totalPresupuestado` de S1 en el cierre.

Cambiarlos altera lo que queda guardado (los cierres ya escritos usaron la fórmula vieja: habría
datos de dos generaciones en la misma columna).

**Propuesta (a validar con Camilo antes de construir, por eso tier B):**
- (a) `total_presupuestado` y `desviacionTotal` de los cierres pasan a `comprometidoDe(movsSemana)`
  **solo hacia adelante**, con una fecha de corte documentada, **sin reescribir cierres antiguos**.
  Lo mismo para `cerrar-m1` l.29.
- (b) **Pregunta abierta para Camilo:** `total_comprometido` del plan siguiente (l.107, hoy solo
  pendientes). ¿Se conserva como "pendiente por comprometer" renombrando su etiqueta, o pasa a
  `comprometidoDe` para que coincida con la vista semanal? No se construye hasta que Camilo decida.

**Fuera de alcance:** reescribir cierres históricos; cambios de esquema en H5 (I-10 si aplicara);
rediseño visual.

## Definition of Done

- [ ] Decisión de Camilo sobre (b) registrada en este ticket, y sobre la fecha de corte de (a), antes de construir.
- [ ] `cerrar-semana` y `cerrar-m1` calculan el comprometido con `comprometidoDe` (o la variante decidida en (b)); grep pegado: sin `reduce` de `montoPresupuestado` fuera de `balanceMes` en esas rutas.
- [ ] Prueba en DEV con datos sintéticos (mes lejano, limpiando): una semana con `pospuesto` y `no_aplica`; el cierre escribe en H5 el valor canónico, leído de vuelta (fila pegada).
- [ ] Cierres anteriores a la fecha de corte quedan intactos (lectura de vuelta antes y después de una fila de PROD, solo lectura).
- [ ] `npx tsc --noEmit` limpio; script de cuadre de `BALANCE-UNIFICADO-01` sigue pasando.
- [ ] Rama propia, PR contra `dev`; sin merge (I-11/I-17). Ninguna escritura a PROD sin aprobación de Camilo.

## Contexto / diagnóstico previo

Ver `BALANCE-UNIFICADO-01.md`, notas de ejecución, sección "Ampliación", HALT parcial. Depende de
ese ticket (función `comprometidoDe` y definición canónica).

## Commit de cierre
(vacío hasta completar)

## Notas de ejecución
(vacío — lo llena Claude Code al cerrar)

<!-- La fila de tickets/INDICE.md debe incluir agente_ejecucion con el mismo valor que el frontmatter. -->
