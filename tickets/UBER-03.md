---
ticket_id: UBER-03
orden: 14
estado: propuesto
tier: A
dependencias: ninguna
---

# UBER-03 — Migración de Fondo transporte a pago_fraccionado

## Goal completo

`TRANSPORTE_1748100037` cambia de tipo: `fijo` / `semana_default: S4` a
tipo: `pago_fraccionado` con seguimiento semanal. Monto sin cambio
($350.000). Requiere el mismo cambio de esquema en Sheet dev y prod (I-10)
antes de mergear.

Puede construirse en paralelo a `UBER-01` — no depende del parser de Uber.

## Definition of Done

- [ ] Cambio aplicado y verificado en Sheet dev.
- [ ] Cambio aplicado y verificado en Sheet prod (I-10).
- [ ] Bolsillo Transporte visible con seguimiento semanal en preview URL,
      sin viajes de Uber todavía cargados (construcción aislada del
      parser).

## Contexto / diagnóstico previo

Prepara el terreno para `UBER-04` (parser Uber → H3B), pero es
independiente en construcción y puede cerrarse antes de que exista el
parser.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda técnica
encontrada, criterios de parada activados)
