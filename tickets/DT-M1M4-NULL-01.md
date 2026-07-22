---
ticket_id: DT-M1M4-NULL-01
orden: 5
estado: propuesto
tier: B
dependencias: ninguna
---

# DT-M1M4-NULL-01 — Unificar tratamiento de semana=null entre M1 y M4

## Goal completo

`semana === null` en H2 (usado para conceptos con `semana_default: variable`,
o para movimientos trasladados de mes vía `mover_mes_siguiente`, que siempre
escribe `semana: null`) se trata de forma **opuesta** en las dos vistas que lo
consumen: M1 lo filtra por igualdad exacta (`m.semana === s`), por lo que un
movimiento con `semana: null` es invisible en cualquier filtro de semana
específica; M4 (`getMovimientosByMesYSemana`) lo trata de forma inclusiva
(aparece en todas las semanas simultáneamente). Esta asimetría está
**confirmada por auditoría de código** en la sesión "Ticket B — 3 julio
2026" (`ESTADO.md` línea ~4850).

**Precisión importante, verificada 22 jul 2026 al migrar este ticket:** el
incidente original que motivó la investigación ("Uber One aparece en S1,
S2, S3, S4 simultáneamente", sesión 2 jul 2026) **no fue explicado por esta
hipótesis** — en ese caso puntual Uber One tenía `semana=S1`, no `null`
(hipótesis HB-1 descartada explícitamente con datos reales, `ESTADO.md`
línea ~4759). La causa real de aquel incidente resultó ser otra (conceptos
duplicados en H1, hallazgo de una sesión posterior, ya sin deuda técnica
abierta). La asimetría M1/M4 es un riesgo estructural real y confirmado por
código — capaz de producir el mismo síntoma visible bajo el escenario que sí
describe (concepto trasladado con `semana: null` real vía
`mover_mes_siguiente`) — pero no se debe cerrar este ticket asumiendo que
"la causa" del incidente de Uber One ya está probada; son dos hallazgos
relacionados pero distintos.

**Este es tier B**: requiere decisión de diseño antes de escribir código —
no es un fix mecánico. Opciones ya identificadas en la sesión de diagnóstico
(no cerradas):
- B1: bloquear el traslado hasta que el usuario asigne semana en M1.
- B2: auto-asignar semana activa del mes destino al trasladar.
- B3 (recomendada en la sesión previa): pedir semana destino explícita al
  usuario en el momento de mover el concepto al mes siguiente.

**No cubre:**
- Cambiar el comportamiento de `semana_default: variable` en general — solo
  el caso específico de movimientos trasladados vía `mover_mes_siguiente`.
- Migración de esquema (candidato a invariante I-16 ya registrado: "estados
  derivados de traslado no deben inferirse por ausencia de valor sin fuente
  única que los declare explícitamente") — evaluar si este ticket la activa
  o si se resuelve con guardia puntual, es parte de la decisión de diseño.

## Definition of Done

**Fase diagnóstico (tier B — HALT obligatorio antes de construir):**
- [ ] Confirmar contra código real (no memoria de sesiones previas) el
      comportamiento actual exacto de M1 y M4 frente a `semana: null`.
- [ ] Presentar las 3 opciones (B1/B2/B3) con trade-offs a Camilo. HALT.
      No proceder a la fase de construcción sin aprobación explícita de una
      opción.

**Fase construcción (una vez aprobada la opción, vía `/goal-a` posterior):**
- [ ] `tsc --noEmit` limpio.
- [ ] M1 y M4 tratan `semana: null` de forma consistente entre sí, según la
      opción aprobada.
- [ ] Caso de prueba: crear un concepto de prueba en dev, trasladarlo vía
      `mover_mes_siguiente` (queda con `semana: null` real), y confirmar que
      ya no aparece en las 4 semanas simultáneamente en M4 tras el fix —
      no es una reproducción del incidente histórico de Uber One (causa
      distinta, ya resuelta), sino del escenario estructural que sí describe
      esta asimetría.
- [ ] Verificado contra Sheet dev, cero llamadas a producción.

## Contexto / diagnóstico previo

- Sesión "Ticket B — 3 julio 2026 [DEBUGGING → DISEÑO → CONSTRUCCIÓN,
  pausada]". STOP activado explícitamente a la espera de esta decisión.
- Relacionado con `DT-MOVER-MES-01` (deuda técnica de la sesión del 2 jul,
  causa raíz compartida: `mover_mes_siguiente` siempre escribe
  `semana: null`).

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda técnica
encontrada, criterios de parada activados)
