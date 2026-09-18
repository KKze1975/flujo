---
ticket_id: IDEAS-CAPTURA-01
orden: 39
estado: aprobado
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

**DISEÑO APROBADO (18 sept 2026) — ya no bloqueado.** Brief completo en
`design-handoff/IDEAS-CAPTURA-01-brief.md`. En vez de pasar por Antigravity/Stitch,
Camilo pidió una recomendación directa reusando el sistema visual `fl-*` ya existente,
y la aprobó explícitamente ("vamos"). Decisión final:

- **Componente:** una tercera fila `.fl-action` en `components/HomeHub.tsx`, mismo
  patrón exacto que "Esta semana"/"Inicio de mes" (icono + título + descripción +
  flecha).
- **Ubicación:** DESPUÉS de la tarjeta de métricas (`metricas && (...)`) y de
  `AporteCard`, ANTES del botón `.fl-btn primary block` "Registrar un gasto" — menor
  protagonismo que las dos acciones de navegación primaria, porque es una acción
  ocasional, no algo que se mira todos los días.
- **Ícono:** `pencil` (ya existe en `Icon.tsx`) — explícitamente NO `sparkle`, porque
  ese ícono ya señala "esto lo interpretó Claude" en `PropuestaCard.tsx`, y esta
  funcionalidad decidió explícitamente no tener IA de por medio (ver descarte de
  `IDEAS-TRIAGE-01`).
- **Texto:** "Sugerir una mejora" (título) / algo como "Ideas para Flujo" (descripción,
  el Coder puede ajustar la redacción exacta).
- **Interacción:** al tocarla, abre el mismo tipo de sheet (`.sheet-backdrop`/`.sheet`)
  que "Registrar un gasto", con el formulario descrito en el brief (sección 4).

No hace falta pasar por el paso de integración de Antigravity/Stitch — esta aprobación
directa de Camilo satisface la regla `T21` (diseño aprobado explícitamente antes de
construir).

**Fuera de alcance:**
- Triage — eso es `IDEAS-TRIAGE-01`.
- Vista de revisión priorizada — eso es `IDEAS-VISTA-PRIORIZADA-01`.

## Definition of Done

- [x] Diseño aprobado existe para el punto de entrada y el formulario — ver decisión
      completa arriba (tercera fila `.fl-action` en `HomeHub.tsx`, ícono `pencil`,
      posición antes de "Registrar un gasto"), aprobada explícitamente por Camilo.
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

- **18 sept 2026 — brief de diseño listo.** Rol Diseñador/Integrador (paso 1 de 2)
  escribió el brief para Antigravity/Stitch en
  `design-handoff/IDEAS-CAPTURA-01-brief.md`. Cubre el flujo to-be paso a paso, el
  patrón visual real a reusar (`BottomNav.tsx`, `RegistroRapido.tsx`,
  `InputRegistro.tsx`, el wrapper `.sheet-*` de `HomeHub.tsx`), la decisión de dónde
  vive el punto de entrada nuevo (explícitamente NO resuelta acá — nombrada como
  pendiente del diseño, con opciones observadas en el código), el detalle del
  formulario, y qué queda fuera de alcance. **El ticket sigue `bloqueado`**: este brief
  no es la aprobación de diseño, es el insumo para generarla. Falta que Camilo lleve
  el brief a Antigravity/Stitch y traiga el HTML/diseño resultante para la integración
  (paso 2, otra sesión) antes de que este ticket pueda pasar a `activo`.
