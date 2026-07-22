---
ticket_id: DT-CIERRE-01
orden: 4
estado: propuesto
tier: A
dependencias: ninguna
---

# DT-CIERRE-01 — Endpoint de reversión atómica de cierre de semana

## Goal completo

`POST /api/mes/[mes]/cerrar-semana` escribe en dos lugares no atómicos: H5
(append del registro de cierre) y H2 (marca como `ejecutado` todos los MOVs
`pago_fraccionado` de la semana). No existe forma de revertir ambas
escrituras juntas. El incidente del 24 jun 2026 (cierre accidental de S4)
requirió reversión manual vía script ad-hoc, y la reversión de H5 sin revertir
H2 dejó 4 MOVs en estado incorrecto (`ejecutado` con `monto_ejecutado`
congelado), corregidos también manualmente.

Construir `POST /api/mes/[mes]/revertir-cierre?semana=Sn` que en una sola
operación: (1) elimina la fila correspondiente de H5, (2) revierte a
`pendiente` todos los MOVs `pago_fraccionado` de esa semana que el cierre
original marcó como `ejecutado` (mismo criterio inverso al que usa
`cerrar-semana` para marcarlos).

**No cubre:**
- Revertir cierres de mes (H6) — solo cierre de semana.
- Deshacer consumos H3B ya registrados durante la semana — esos no los toca
  el cierre y no los debe tocar la reversión.
- Interfaz de usuario para invocar este endpoint — puede quedar como
  herramienta operativa (script o llamada directa) hasta que se diseñe la
  UI, si se decide que la necesita.

## Definition of Done

- [ ] `tsc --noEmit` limpio.
- [ ] Endpoint implementado con escritura atómica (mismo patrón `batchUpdate`
      ya usado en `cerrar-semana` — falla completa o no falla).
- [ ] Prueba en dev: cerrar una semana de prueba con al menos un concepto
      `pago_fraccionado`, luego revertir, verificar por lectura directa que
      H5 no tiene la fila y que el MOV volvió a `pendiente` con
      `monto_ejecutado`, `fecha_ejecucion` limpios — igual que el estado
      pre-cierre.
- [ ] Reproduce y verifica el caso real documentado (4 MOVs del incidente
      24 jun: Servicios públicos, Seguros, Ahorro, Imprevistos) como caso de
      prueba explícito, no solo un caso sintético nuevo.
- [ ] Cero llamadas contra producción durante la construcción.

## Contexto / diagnóstico previo

- Sesión DEBUGGING 24 jun 2026 — incidente de cierre accidental S4,
  reversión manual con script Python en scratchpad, nunca commiteado.
  Deuda técnica registrada en esa sesión como `DT-CIERRE-01`.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda técnica
encontrada, criterios de parada activados)
