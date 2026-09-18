---
ticket_id: IDEAS-CAPTURA-01
orden: 39
estado: bloqueado
tier: B
agente_ejecucion: claude-code
dependencias: [IDEAS-SCHEMA-01]
---

# IDEAS-CAPTURA-01 — Captura de ideas con preguntas de profundización

## Goal completo

Parte de la línea "backlog de ideas de features con triage por IA" (spec de Fase 2,
`ESTADO.md`, 18 sept 2026 — aprobado por Camilo). Construye el endpoint y la UI para que
Camilo o Angie registren una idea en el momento en que se les ocurre, sin filtro previo
entre ellos (to-be validado en Fase 1 — "todas las ideas se pueden subir").

**Preguntas de profundización aprobadas: fijas, sin IA generativa.** Siempre las mismas
dos, tal como las nombró Camilo en Fase 1: (1) caso de uso concreto, (2) por qué le
parece importante a quien la propone. No hay conversación multi-turno ni preguntas que
varíen por idea en esta primera versión.

**BLOQUEADO — no construir sin resolver esto primero:** no existe diseño aprobado para
el punto de entrada/formulario de captura (regla no negociable del proyecto — ver
`CLAUDE.md`, "REGLA ESPECÍFICA DE FLUJO" del Spec Writer, y el precedente `T21`,
revertido por construirse sin diseño). El spec de Fase 2 identificó un patrón visual
reusable (`components/ui/BottomNav.tsx` + `components/m4/RegistroRapido.tsx`, el mismo
FAB de registro rápido de gastos) pero **no decide** dónde vive exactamente el punto de
entrada de esta funcionalidad nueva — esa decisión es del rol Diseñador/Integrador, no
de este ticket. Antes de que un Coder tome este ticket, se necesita el brief de diseño
correspondiente (`.claude/agents/disenador-integrador.md`) y su integración aprobada.

**Fuera de alcance:**
- Triage — eso es `IDEAS-TRIAGE-01`.
- Vista de revisión priorizada — eso es `IDEAS-VISTA-PRIORIZADA-01`.

## Definition of Done

- [ ] Diseño aprobado existe para el punto de entrada y el formulario (brief +
      integración del rol Diseñador/Integrador) — **precondición antes de marcar este
      ticket como `activo`**, no parte del DoD de construcción en sí.
- [ ] `POST /api/ideas` crea una fila en H10 vía `createIdea` (de `IDEAS-SCHEMA-01`) con
      `propuesta_por`, `descripcion`, `caso_de_uso`, `motivo_importancia`.
- [ ] La UI presenta las dos preguntas fijas de profundización antes de confirmar el
      registro — no se guarda la idea sin esas dos respuestas.
- [ ] `propuesta_por` se determina explícitamente (selector Camilo/Angie — no hay auth de
      usuario en Flujo hoy, no inventar identidad inferida).
- [ ] `npx tsc --noEmit` limpio.
- [ ] Verificado con un registro real de idea en dev: POST produce fila en H10 (leída de
      vuelta), y con captura de pantalla o descripción del render confirmando que las dos
      preguntas de profundización aparecen antes de poder confirmar.

## Contexto / diagnóstico previo

Spec de Fase 2 completo en `ESTADO.md`. Patrón visual de referencia:
`components/ui/BottomNav.tsx`, `components/m4/RegistroRapido.tsx`.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío)
