---
ticket_id: IDEAS-TRIAGE-01
orden: 40
estado: aprobado
tier: B
agente_ejecucion: claude-code
dependencias: [IDEAS-SCHEMA-01]
---

# IDEAS-TRIAGE-01 — Triage automático de ideas con Haiku

## Goal completo

Parte de la línea "backlog de ideas de features con triage por IA" (spec de Fase 2,
`ESTADO.md`, 18 sept 2026 — aprobado por Camilo). Construye el paso que toma una idea en
estado `nueva` (creada por `IDEAS-CAPTURA-01`, o insertada manualmente para pruebas
mientras ese ticket sigue bloqueado por diseño) y le calcula el triage.

**Modelo de IA aprobado:** `claude-haiku-4-5-20251001` — mismo modelo ya usado en
`POST /api/consumos/[id]/clasificar` (`app/api/consumos/[id]/clasificar/route.ts`).
Reusar el mismo patrón de llamada/manejo de error de ese endpoint.

**Criterios de triage aprobados** (un turno de Haiku, JSON estructurado como salida):
- `triage_impacto` (alto/medio/bajo): estimado por el modelo a partir de
  `caso_de_uso`/`motivo_importancia`, cruzado contra la métrica de éxito ya declarada
  del proyecto ("mayor adopción de nuevos features con impacto real en la cultura
  financiera y las finanzas de la familia", cita de Camilo, Fase -1/0 de `ESTADO.md`).
- `triage_esfuerzo` (S/M/L): heurística del modelo, no estimación real de ingeniería.
- `triage_alineacion` (texto corto): qué invariante u objetivo de negocio toca, si
  aplica.
- `prioridad_score`: **calculado server-side, nunca por el modelo directamente** (mismo
  principio que I-01/I-02 — dato derivado no delegado a IA sin control). Función
  determinística simple: impacto alto + esfuerzo bajo → score más alto (definir la
  fórmula exacta en la construcción, documentarla en "Notas de ejecución").

Al completar el triage, la idea pasa de `estado: nueva` a `estado: en_triage` y luego a
`priorizada` (o quedan como el mismo paso — decisión de implementación del Coder, siempre
que quede documentada).

**Fuera de alcance:**
- Preguntas de profundización al usuario — eso es `IDEAS-CAPTURA-01` (preguntas fijas,
  sin IA, ya aprobadas en el spec).
- Cualquier UI de revisión — eso es `IDEAS-VISTA-PRIORIZADA-01`.
- Disparo automático (cron) del triage — en esta versión el disparo puede ser parte del
  mismo POST de creación de la idea (llamar triage inline tras `createIdea`) o un
  endpoint separado invocado manualmente; el Coder decide y lo documenta, cualquiera de
  las dos cumple el DoD.

## Definition of Done

- [ ] Función/endpoint que, dada una idea en `H10` con `estado: nueva`, llama a Haiku con
      `descripcion`+`caso_de_uso`+`motivo_importancia` y obtiene los 3 campos de triage
      en JSON.
- [ ] `prioridad_score` calculado server-side con una fórmula determinística documentada
      (no delegada al modelo).
- [ ] `updateIdea` (de `IDEAS-SCHEMA-01`) escribe los 4 campos nuevos + cambia `estado` a
      `en_triage`/`priorizada`.
- [ ] Manejo de error: si Haiku falla o devuelve JSON inválido, la idea queda en `nueva`
      (no se pierde, no se marca con datos inventados) — mismo criterio de honestidad de
      verificación que rige el resto del proyecto.
- [ ] `npx tsc --noEmit` limpio.
- [ ] Verificado con al menos 2 ideas de prueba reales en Sheet DEV: una que debería dar
      impacto alto (ej. relacionada con seguridad o con conciliación bancaria) y una que
      debería dar impacto bajo, confirmando que el triage distingue entre ellas — leído
      de vuelta del Sheet, no solo el log de consola.

## Contexto / diagnóstico previo

Spec de Fase 2 completo en `ESTADO.md`. Patrón de referencia para la llamada a Haiku:
`app/api/consumos/[id]/clasificar/route.ts`.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena el Coder al cerrar)
