---
ticket_id: DT-INTERPRETAR-IA-SEMANA-01
orden: 27
estado: propuesto
tier: B
dependencias: ninguna
---

# DT-INTERPRETAR-IA-SEMANA-01 — IA infiere `semana` con fallback hardcodeado en /api/registro/interpretar

## Goal completo

`app/api/registro/interpretar/route.ts:37` — el `SYSTEM_PROMPT` de Claude Sonnet le pide al
modelo derivar `semana` del texto/imagen, con la regla explícita "sin referencia temporal → S1".
Esto es exactamente el patrón que `INVARIANTS.md` I-01 prohíbe ("la semana activa se calcula
server-side... nunca la infiere... un modelo de IA") y el mismo patrón que `CLAUDE.md` señala
como origen del "bug S1, jun 2026" que motivó esa regla.

Mitigante encontrado: el valor de la IA no se escribe directo — `components/m4/PropuestaCard.tsx`
lo usa como valor inicial de un campo editable (`useState<Semana>(interpretacion.semana)`) que el
usuario puede corregir antes de confirmar. Severidad menor que una escritura ciega, pero sigue
siendo una violación de I-01 en espíritu: el fallback "sin referencia → S1" puede coincidir
silenciosamente con la semana real por casualidad, o el usuario puede no darse cuenta de que debe
corregirlo.

Ticket de **diagnóstico**, tier B: decidir si el server debe derivar `semana` de una fecha real
(mensaje/imagen con fecha, o `semanaActual()`/`semanaActivaDeMes()`) como valor inicial en vez de
pedírselo a la IA, dejando a la IA solo la extracción de descripción/monto/categoría/fuente.

## Definition of Done

- [ ] Diagnóstico: confirmar que ningún flujo actual escribe `interpretacion.semana` directo a
      Sheet sin pasar por el campo editable de `PropuestaCard.tsx`.
- [ ] Proponer opción de fix (quitar `semana` del schema que devuelve la IA; el server la deriva).
- [ ] HALT — esperar aprobación de Camilo antes de construir.

## Contexto / diagnóstico previo

Hallazgo tangencial durante el diagnóstico de `FIX-SEMANA-STUB-01` (sesión de debugging,
3-ago-2026). No es la causa del bug reportado ese día — se documenta como deuda técnica separada.

## Commit de cierre
(vacío)

## Notas de ejecución
(vacío)
