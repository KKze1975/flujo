---
ticket_id: PRUEBA-CRON-01
orden: 35
estado: propuesto
tier: A
agente_ejecucion: antigravity
dependencias: ninguna
---

# PRUEBA-CRON-01 — Ticket desechable para validar el ciclo cron→Coder→Tester→Manager

## Goal completo

**Esto NO es trabajo de producto.** Es un ticket de prueba, desechable,
creado para validar de punta a punta el mecanismo propuesto en
`ARQUITECTURA_MULTIAGENTE.md` §12.15/§13 del vault: un cron que invoca
Antigravity con `--dangerously-skip-permissions --sandbox` y recoge
tickets vía `check-ticket.mjs --next antigravity`, sin que Camilo dispare
cada paso a mano.

DoD deliberadamente trivial y de bajo riesgo — sin tocar Sheet, rutas,
componentes existentes, ni ningún archivo real de la app:

Crear el archivo `lib/utils/prueba-cron-marker.ts` con una función pura
exportada `pruebaCronMarker()` que retorna exactamente el string
`"prueba-cron-01-ok"`. Ningún otro archivo se modifica. No se importa
ni se conecta a ninguna ruta/componente — el archivo queda aislado a
propósito, para que verificar el DoD sea trivial y el impacto de
cualquier error sea cero sobre la app real.

**No cubre:** nada de negocio. No es un ejemplo de cómo escribir código
de producto — es solo la carga de prueba del mecanismo.

## Definition of Done

- [ ] `lib/utils/prueba-cron-marker.ts` existe y exporta
      `pruebaCronMarker(): string` que retorna exactamente
      `"prueba-cron-01-ok"`.
- [ ] `npx tsc --noEmit` limpio.
- [ ] Ningún otro archivo del repo fue modificado.

## Contexto / diagnóstico previo

Sesión de vault, 16 ago 2026 — Camilo pidió probar el cron autónomo de
Antigravity antes de dejarlo corriendo de verdad contra el backlog real.
No había ningún ticket real listo (`check-ticket.mjs --next antigravity`
no devolvía nada construible) — este ticket se creó específicamente para
no bloquear la prueba del mecanismo por falta de carga de trabajo.

## Commit de cierre
(vacío hasta completar)

## Notas de ejecución

**Este ticket se elimina después de la prueba** (archivo de código, este
`.md`, y su fila en `INDICE.md`) — no queda como deuda ni como precedente
de "ticket de prueba" permanente en el backlog real.
