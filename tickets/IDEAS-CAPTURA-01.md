---
ticket_id: IDEAS-CAPTURA-01
orden: 39
estado: completado
tier: B
agente_ejecucion: claude-code
dependencias: [IDEAS-SCHEMA-01]
rol_activo: tester
paso_actual: "verificado por Tester — DoD cumplido con evidencia real (API + tsc + visual en navegador)"
actualizado_en: 2026-09-18T15:55:34-05:00
necesita_aprobacion: no
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
- [x] `POST /api/ideas` crea una fila en H10 vía `createIdea` (de `IDEAS-SCHEMA-01`) con
      `propuesta_por`, `descripcion`, `caso_de_uso`, `motivo_importancia`.
- [x] La UI presenta las dos preguntas fijas de profundización antes de confirmar el
      registro — no se guarda la idea sin esas dos respuestas.
- [x] `propuesta_por` se determina explícitamente (selector Camilo/Angie — no hay auth de
      usuario en Flujo hoy, no inventar identidad inferida).
- [x] `npx tsc --noEmit` limpio.
- [x] Verificado con un registro real de idea en dev: POST produce fila en H10 (leída de
      vuelta), y con captura de pantalla confirmando que las dos preguntas de
      profundización aparecen antes de poder confirmar. Verificado dos veces —
      independientemente por el Coder (HTML/logs) y por el Tester con navegador real
      (Claude in Chrome) contra `next dev -p 3212`: se ve el sheet completo, las dos
      preguntas en el orden correcto, el botón deshabilitado hasta completar los 4 campos,
      y el estado de éxito "Idea registrada". Ver "Notas de ejecución — Tester".

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

- **18 sept 2026 — construcción (Coder, Claude Code).** Diseño ya aprobado directamente
  por Camilo (ver Goal completo arriba) — no hizo falta pasar por Antigravity/Stitch.
  Construido:
  - `app/api/ideas/route.ts` (nuevo) — `POST /api/ideas`, valida los 4 campos
    (`propuestaPor`, `descripcion`, `casoDeUso`, `motivoImportancia`), 400 si falta
    alguno, usa `getProvider().createIdea(...)` (de `IDEAS-SCHEMA-01`, ya construido),
    responde `{ idea }`. Nota: ya existía `app/api/ideas/[id]/triage/route.ts` en el
    repo (de `IDEAS-TRIAGE-01`, fuera de este ticket) — no se tocó.
  - `components/m4/SugerirIdea.tsx` (nuevo) — mismo patrón de 3 estados que
    `RegistroRapido.tsx` (`idle`/`enviando`/`exito`), selector Camilo/Angie con
    `.fl-tabs`+`.fl-person` calcado del bloque "¿Quién pagó?" de `InputRegistro.tsx`
    (solo cambia el label a "¿Quién la propone?"), un `textarea` de descripción libre
    (mismo wrapper `.fl-field`-style de `InputRegistro.tsx`) + dos preguntas fijas de
    profundización ("¿En qué momento concreto la usarías?" / "¿Por qué te parece
    importante?") con `.fl-field`, botón `.fl-btn primary block` deshabilitado hasta
    que los 4 campos (descripción + propuestaPor implícito + las 2 preguntas) tengan
    contenido, error inline con el mismo estilo `--neg-soft`/`--neg` (nunca `alert()`).
  - `components/HomeHub.tsx` (modificado) — nuevo estado `ideaSheetOpen` (nombre
    distinto a `sheetOpen`, que sigue siendo el del sheet de "Registrar un gasto"),
    nueva fila `.fl-action` "Sugerir una mejora" / "Ideas para Flujo" con ícono
    `pencil`, ubicada después de `AporteCard` y antes del botón `.fl-btn primary block`
    "Registrar un gasto" (posición exacta aprobada), y el sheet correspondiente
    (mismo wrapper `.sheet-backdrop`/`.sheet`/`.sheet-grip`/`.sheet-head`/`.sheet-body`
    que ya usa "Registro rápido") que monta `SugerirIdea`.
  - `npx tsc --noEmit`: limpio, sin errores.
  - **Verificación real en Sheet DEV** (`GOOGLE_SHEET_ID` de `.env.local`, confirmado
    distinto de `PROD_GOOGLE_SHEET_ID` antes de tocar nada): levanté `next dev -p 3211`
    local y probé:
    - `POST /api/ideas` con los 4 campos → `200`, devolvió la idea creada
      (`IDEA_1789764597137`).
    - `POST /api/ideas` con campos incompletos → `400` con el mensaje de validación
      esperado.
    - Leí H10 de vuelta con un script desechable puntual (`google.sheets` directo,
      mismas credenciales de `.env.local`) — la última fila coincide exactamente:
      `IDEA_1789764597137 | 2026-09-18T20:49:57.137Z | camilo | "Prueba Coder
      IDEAS-CAPTURA-01" | "Verificacion de endpoint desde script de Coder" | "Confirmar
      que la fila queda bien en H10" | "" | "" | "" | nueva`. El script se borró al
      terminar (no quedó en el repo).
  - **Verificación visual: no verificado con navegador real** (este agente no tiene
    acceso a un navegador/Chrome). Sí confirmé por dos vías indirectas: (a) el log del
    server (`next dev`) no mostró errores de compilación ni de runtime al servir `/` ni
    `/api/ideas`; (b) el HTML servido por `GET /` (via `curl`) contiene el texto
    "Sugerir una mejora" de la fila nueva. No es equivalente a confirmar visualmente que
    el sheet se ve bien, el spinner/estado de éxito rendericen correctamente, o que las
    dos preguntas de profundización aparecen en el orden correcto dentro del sheet — eso
    queda pendiente de que el Tester (u otra vía con navegador) lo confirme.
  - Sin desviaciones de alcance. No se tocó ningún endpoint `/api/admin/*` ni archivo
    fuera de lo declarado.

  **Construcción terminada, pendiente de Tester.**

- **18 sept 2026 — verificación (Tester, Claude Code, aislado del razonamiento del
  Coder).** Partí solo del diff del commit de cierre (`6df3a2b`) y del DoD del ticket,
  sin confiar en lo reportado por el Coder.
  - `git show 6df3a2b`: confirmado que toca exactamente `app/api/ideas/route.ts` (nuevo),
    `components/m4/SugerirIdea.tsx` (nuevo), `components/HomeHub.tsx` (modificado) y el
    propio ticket. `app/api/ideas/[id]/triage/route.ts` NO aparece en el diff — confirmado
    que ya existía de `IDEAS-TRIAGE-01` y no se tocó.
  - `app/api/ideas/route.ts`: valida los 4 campos (`propuestaPor` con `esActorValido`,
    `descripcion`/`casoDeUso`/`motivoImportancia` con `.trim()`), 400 si falta alguno, usa
    `getProvider().createIdea(...)` cuya firma en `lib/data/index.ts`/`sheets.ts`/`mock.ts`
    coincide exactamente con lo que se le pasa.
  - `components/HomeHub.tsx`: la fila `.fl-action` nueva está exactamente después del
    bloque `AporteCard`/métricas y antes del botón `.fl-btn primary block` "Registrar un
    gasto" — confirmado por lectura del diff y por captura de pantalla real (ver abajo).
    Ícono `pencil` (no `sparkle`), confirmado en `Icon.tsx` línea 15.
  - `npx tsc --noEmit` corrido por mí (Tester, no confiando en el resultado reportado):
    limpio, exit code 0.
  - **Verificación de datos, independiente del Coder:** levanté `next dev -p 3212`
    (puerto distinto al 3211 que usó el Coder). `POST /api/ideas` con los 4 campos →
    `200`, con datos de prueba propios (`angie`, "Prueba Tester IDEAS-CAPTURA-01").
    `POST /api/ideas` con un campo faltante → `400` con el mensaje de validación. Leí H10
    de vuelta con un script desechable propio (`scripts/tester-check-h10-ideas-captura-01.mjs`,
    confirmé antes `GOOGLE_SHEET_ID !== PROD_GOOGLE_SHEET_ID`) — la última fila coincide
    exactamente con lo enviado. Script borrado al terminar.
  - **Verificación visual — sí se pudo, con Claude in Chrome (navegador real):**
    contra lo que decía el ticket ("sin acceso a navegador en este agente"), este Tester
    sí tiene acceso a un navegador real vía la extensión Claude in Chrome. Navegué a
    `http://localhost:3212`, hice scroll hasta la fila "Sugerir una mejora" / "Ideas para
    Flujo" con ícono lápiz en la posición exacta esperada, la abrí, confirmé el sheet
    completo (selector Camilo/Angie, descripción libre, las dos preguntas fijas en el
    orden correcto, botón "Enviar idea" deshabilitado con los campos vacíos), llené los 4
    campos (botón pasó a habilitado), envié, y confirmé el estado de éxito ("Idea
    registrada" con check verde y botón "Sugerir otra"). Las 3 fases (idle/enviando/éxito)
    se vieron correctamente. Servidor de dev apagado al terminar.
  - **Nota de convergencia:** hubo convergencia sin fricción con lo reportado por el
    Coder en casi todo — el único punto donde mi verificación fue estrictamente más
    fuerte que la suya es la verificación visual (el Coder la dio por no disponible; yo sí
    pude hacerla con navegador real y confirmó exactamente lo que el ticket exigía). No
    encontré ninguna discrepancia entre el diff real y lo que el ticket narra.
  - **Veredicto: CUMPLE.** Los 6 ítems del DoD verificados con evidencia real, incluida la
    verificación visual que antes quedaba pendiente. `estado` pasa a `completado`.

- **18 sept 2026 — reporte (Manager, Claude Code).** Reporte ejecutivo de 4 puntos
  entregado a Camilo/Angie fuera de este archivo (mensaje de cierre de la sesión que
  despachó este ticket). Pendiente identificado y trasladado a Camilo: el commit de
  construcción del Coder (`6df3a2b`) está en `dev` sin `push`, y los cambios que hizo el
  Tester sobre este mismo ticket (marcar DoD, agregar sus notas de verificación) quedaron
  sin commitear encima — el Manager no tiene `Bash` para resolver esto, requiere que
  Camilo (o un agente con `Bash`) lo cierre.

```yaml
metricas_agente:
  coder: { agente: claude-sonnet, tokens: no_medido, reintentos: 0 }
  tester: { agente: claude-sonnet, tokens: no_medido, veredicto: CUMPLE }
  manager: { reportó: si, resumen_4_puntos: si }
  halt: { disparado: no, criterio: null }
```
