---
ticket_id: PANEL-RETIRAR-CONCEPTO-01
orden: 30
estado: propuesto
tier: A
agente_ejecucion: antigravity
dependencias: PANEL-ADMIN-01
---

# PANEL-RETIRAR-CONCEPTO-01 — Retirar concepto del catálogo (H1) desde el panel

## Goal completo

Hoy pasar un `Concepto` de `estado: activo` a `retirado` requiere script ad-hoc
o edición directa del Sheet — nunca UI. Confirmado 2+ veces en el historial
(Préstamo Papá, Apoyo Mariella), siempre resuelto por un agente, nunca por
Camilo directamente. Construir la acción en el panel: seleccionar un concepto
activo de H1 y marcarlo `retirado` (con `fechaRetiro` server-side, mismo
criterio que I-01/I-02 de fecha calculada en servidor, nunca inferida del
cliente).

**No cubre:**
- Reactivar un concepto ya retirado (fuera de alcance — no hay evidencia en el
  historial de que se haya necesitado revertir un retiro).
- Editar cualquier otro campo del concepto — eso ya tiene UI
  (`ModalEditarConcepto`), no se toca.

## Definition of Done

- [ ] `tsc --noEmit` limpio.
- [ ] Tarjeta "Retirar concepto" en `/admin/panel`, lista conceptos con
      `estado: activo`.
- [ ] Guardia: si el concepto tiene movimientos `pendiente` en el mes activo,
      el retiro se bloquea con mensaje explícito — no se permite dejar huérfanos
      (verificar con caso real, no solo sintético).
- [ ] `fechaRetiro` se escribe server-side al momento del retiro, nunca la
      manda el cliente.
- [ ] Verificado en dev: retirar un concepto de prueba, confirmar por lectura
      directa de H1 que `estado: retirado` y `fechaRetiro` quedaron escritos,
      y que ya no aparece como opción activa en `ModalAgregarConcepto`/
      `ConceptoBoard`.
- [ ] Cero llamadas contra producción durante la construcción.

## Contexto / diagnóstico previo

- Casos reales sin UI: "Préstamo Papá" y "Apoyo Mariella" (`ESTADO.md`,
  líneas ~3784-3862) — este último aún sin resolver por duplicado, ver
  `PANEL-FUSIONAR-DUPLICADOS-01`.
- `EstadoConcepto` ya declara `"activo" | "retirado"` en `lib/data/types.ts` —
  el modelo de datos ya soporta esto, solo falta la UI y la guardia de
  movimientos pendientes.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda técnica
encontrada, criterios de parada activados)
