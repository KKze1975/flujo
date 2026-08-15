---
ticket_id: PANEL-FUSIONAR-DUPLICADOS-01
orden: 31
estado: descartado
tier: B
agente_ejecucion: claude-code
dependencias: PANEL-ADMIN-01
---

# PANEL-FUSIONAR-DUPLICADOS-01 — Fusionar/eliminar concepto duplicado en H1

## Goal completo

Al menos 3 incidentes confirmados de conceptos duplicados en H1 (Energía, QA 30
mayo; Entretenimiento, S3 dev; "Apoyo Mariella", **aún sin resolver** —
`ESTADO.md` líneas ~3784/3862, "auditar y retirar el incorrecto"). Cada caso se
resolvió con diagnóstico manual + script ad-hoc distinto — nunca por Camilo, y
nunca con una herramienta reusable.

**Tier B — HALT obligatorio antes de proponer UI**, porque "fusionar" no es
trivial: implica decidir qué pasa con los `Movimiento` (H2) y `ConsumoH3` (H3B)
que ya referencian el `conceptoId` que se va a descartar. Antes de escribir
código:
- [ ] Confirmar contra código real (`lib/data/types.ts`, `lib/data/sheets.ts`)
      todos los puntos donde `conceptoId` es FK (H2, H3B `bolsilloId`,
      cualquier otro).
- [ ] Determinar si "fusionar" = reasignar esas filas al `conceptoId` que se
      conserva (requiere escritura en cascada) o si el alcance real es más
      angosto: solo permitir eliminar un duplicado que **todavía no tiene**
      movimientos asociados (mucho más simple, cubre el caso "Apoyo Mariella"
      si se detectó a tiempo, pero no el caso "Energía" que ya tenía datos).
- [ ] Presentar el hallazgo y la opción recomendada a Camilo. HALT.

**No cubre:**
- Detección automática de duplicados por similitud de nombre (fuera de
  alcance — el panel muestra la lista de conceptos activos, Camilo identifica
  visualmente cuáles son duplicados, no hay heurística de matching).

## Definition of Done

**Fase diagnóstico (Tier B):**
- [ ] Los 3 puntos de HALT de arriba, con evidencia de código citada.

**Fase construcción (tras aprobación del alcance elegido):**
- [ ] `tsc --noEmit` limpio.
- [ ] Acción implementada según el alcance aprobado (reasignación en cascada o
      solo-sin-movimientos-asociados).
- [ ] Verificado en dev con el caso real de "Apoyo Mariella" si sigue sin
      resolver al momento de construir esto — caso de prueba real, no solo
      sintético.
- [ ] Cero llamadas contra producción durante la construcción.

## Contexto / diagnóstico previo

- Incidentes: Energía (QA 30 mayo, `ESTADO.md` línea 599), Entretenimiento (S3
  dev, líneas 3072-3078), Apoyo Mariella (líneas 3784-3862, sin resolver a 11
  ago 2026).

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

**Descartado por decisión explícita de Camilo, 11 ago 2026** — eliminado del
alcance del panel de administración sin construirse. El caso real que lo
originó ("Apoyo Mariella" duplicado en H1, sin resolver a esta fecha — ver
`ESTADO.md` líneas ~3784/3862) sigue abierto como deuda de catálogo, pero se
resuelve manualmente (script ad-hoc o edición directa del Sheet) si hace falta,
no vía panel. Se conserva este archivo por el mismo criterio que
`UBER-02-descartado`: el diagnóstico queda documentado como referencia si el
patrón se repite y se decide reabrir.
