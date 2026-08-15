---
ticket_id: [ID]
orden: [N]
estado: propuesto
tier: [A|B|C]
agente_ejecucion: [antigravity|claude-code|cualquiera]
dependencias: [ninguna | lista]
---

# [ID] — [Nombre]

## Goal completo
[Descripción + alcance + qué NO cubre]

## Definition of Done
- [ ] [criterio verificable]

## Contexto / diagnóstico previo
[Si aplica — referencia a hallazgo de auditoría, incidente previo, etc.]

## Commit de cierre
(vacío hasta completar)

## Notas de ejecución
(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda técnica encontrada, criterios de parada activados)

<!-- Al agregar este ticket a tickets/INDICE.md, la fila DEBE incluir la
columna agente_ejecucion con el mismo valor que el frontmatter de arriba —
ver nota en INDICE.md, "Columna agente_ejecucion" (15 ago 2026). -->
