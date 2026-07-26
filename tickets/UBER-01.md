---
ticket_id: UBER-01
orden: 12
estado: activo
tier: A
dependencias: ninguna
---

# UBER-01 — Verificación de supuestos de parseo

## Goal completo

Confirmar con evidencia real dos supuestos sin los cuales `UBER-04` no puede
construirse con seguridad: (1) un correo de Uber con perfil "negocio"
seleccionado en la app trae el prefijo `[Business]` en el asunto, simétrico
a `[Personal]`; (2) el correo trae origen/destino en los tipos de servicio
Uber que Camilo usa regularmente, no solo en el que ya se revisó.

Tipo de trabajo: verificación/diagnóstico (DEBUGGING) — no construye código.

## Definition of Done

- [ ] Al menos 1 correo real con `[Business]` confirmado en el asunto.
- [ ] Origen/destino confirmado presente (o ausente, documentado) en al
      menos 2 tipos de servicio Uber distintos.
- [ ] Hallazgos documentados en `ESTADO.md` (sección de cierre de sesión),
      sin cambios de código.

## Contexto / diagnóstico previo

Bloquea `UBER-02` y `UBER-04` hasta confirmar ambos supuestos. Si
`[Business]` no aparece tras varios viajes de trabajo reales, la
clasificación de `UBER-02`/`UBER-04` requiere rediseño (vuelve a fase de
diseño).

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda técnica
encontrada, criterios de parada activados)
