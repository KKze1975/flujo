---
ticket_id: PANEL-REVERTIR-CIERRE-01
orden: 32
estado: propuesto
tier: A
agente_ejecucion: antigravity
dependencias: DT-CIERRE-01, PANEL-ADMIN-01
---

# PANEL-REVERTIR-CIERRE-01 — Revertir cierre de semana desde el panel

## Goal completo

Exponer en el panel la acción de revertir un cierre de semana accidental,
para el caso real declarado por Camilo: una semana se cerró por error y hace
falta volver a editarla. **Depende directamente de `DT-CIERRE-01`** (tier A,
`propuesto`, sin construir aún) — ese ticket construye el endpoint
`POST /api/mes/[mes]/revertir-cierre?semana=Sn` que hace el trabajo real
(elimina la fila de H5 y revierte los `Movimiento` `pago_fraccionado` a
`pendiente`). Este ticket **no reconstruye esa lógica** — solo la expone en UI,
gateada por el PIN del panel.

**Orden de construcción obligatorio:** `DT-CIERRE-01` debe completarse y
verificarse primero. Este ticket queda bloqueado hasta entonces (I-09 aplica
igual — no se abre este mientras `DT-CIERRE-01` sigue activo si ya hay otro
ticket en construcción).

**No cubre:**
- La lógica de reversión atómica H5+H2 — es 100% `DT-CIERRE-01`.
- Revertir cierres de mes (H6) — mismo límite que ya declara `DT-CIERRE-01`.

## Definition of Done

- [ ] Confirmar que `DT-CIERRE-01` está `completado` y verificado antes de
      empezar este ticket.
- [ ] `tsc --noEmit` limpio.
- [ ] Tarjeta "Revertir cierre de semana" en `/admin/panel`: selector de
      mes+semana ya cerrada (solo muestra semanas con `CierreSemana` existente
      en H5A — usar `getCierreSemana` para listar candidatas, no adivinar).
- [ ] Confirmación de dos pasos antes de ejecutar.
- [ ] Verificado en dev: cerrar una semana de prueba, revertirla desde el
      panel, confirmar por lectura directa que H5 no tiene la fila y los MOVs
      volvieron a `pendiente` — mismo criterio de verificación que el DoD de
      `DT-CIERRE-01`.
- [ ] Cero llamadas contra producción durante la construcción.

## Contexto / diagnóstico previo

- `DT-CIERRE-01` (`tickets/DT-CIERRE-01.md`) — origen: incidente de cierre
  accidental S4, 24 jun 2026.
- Confirmado en código (sesión 11 ago 2026): "semana cerrada" se determina
  únicamente por la existencia de una fila `CierreSemana` en H5A para ese
  mes+semana (`getCierreSemana` retorna `null` si no existe) — no hay un campo
  `estado` separado en la semana misma.
- Decisión de Camilo (11 ago 2026): reincorporar esta funcionalidad al alcance
  del panel, explícitamente para el caso de necesitar editar una semana
  anterior cerrada por error.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda técnica
encontrada, criterios de parada activados)
