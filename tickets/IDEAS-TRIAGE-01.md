---
ticket_id: IDEAS-TRIAGE-01
orden: 40
estado: activo
tier: B
agente_ejecucion: claude-code
dependencias: [IDEAS-SCHEMA-01]
rol_activo: coder
paso_actual: "Construcción y tsc limpios; verificación de distinción de triage bloqueada por saldo insuficiente en la API key de Anthropic (.env.local) — código listo, falta correrlo con crédito disponible"
actualizado_en: 2026-09-18T14:25:37-05:00
necesita_aprobacion: alta
halt_criterio: "no encaja exacto en 1-8 — bloqueo externo de billing (saldo Anthropic API insuficiente), confirmado con curl directo a api.anthropic.com fuera de mi código, no reparable por este agente"
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

(vacío hasta completar — la construcción queda commiteada en DEV, pero este ticket no
cierra hasta que el Tester verifique; ver bloqueo de verificación abajo)

## Notas de ejecución

**Construcción — terminada.**

- Endpoint nuevo: `app/api/ideas/[id]/triage/route.ts` (`POST`). **Decisión de disparo**
  (DoD punto 6, cualquiera de las dos formas es válida): endpoint separado invocado
  manualmente, no inline en la creación — porque `IDEAS-CAPTURA-01` (el único lugar que
  crearía una idea vía HTTP) sigue bloqueada por diseño, no existe hoy ningún
  `POST /api/ideas` al que enganchar el triage inline. Mismo patrón de llamada/manejo de
  error que `app/api/consumos/[id]/clasificar/route.ts`: `new Anthropic()` sin key
  explícita (toma `ANTHROPIC_API_KEY` de env), `model: "claude-haiku-4-5-20251001"`,
  `try/catch` alrededor de la llamada.
- El endpoint busca la idea con `getIdeas({ estado: "nueva" })` y la filtra por `id` — si
  no aparece ahí (no existe o ya no está en `nueva`), devuelve 404 sin tocar nada.
- Prompt pide JSON estricto (`triage_impacto`, `triage_esfuerzo`, `triage_alineacion`),
  cruzando explícitamente contra la métrica de éxito citada en el ticket. Se valida en
  código que `triage_impacto` ∈ {alto,medio,bajo}, `triage_esfuerzo` ∈ {S,M,L} y que
  `triage_alineacion` sea string no vacío — si el modelo devuelve JSON inválido o campos
  fuera de esos valores, se responde 502 y **no se llama a `updateIdea`** (la idea queda
  en `nueva`, intacta).
- **`prioridad_score` — fórmula determinística (nunca calculada por el modelo):**
  `impacto_score * 2 - esfuerzo_score`, con `impacto_score = {alto:3, medio:2, bajo:1}` y
  `esfuerzo_score = {S:3, M:2, L:1}` (esfuerzo bajo/S puntúa más alto = más favorable).
  Rango resultante: -1 (impacto bajo + esfuerzo L) a 5 (impacto alto + esfuerzo S).
  Implementada en `calcularPrioridadScore()` dentro del mismo `route.ts`.
- **Estado final tras triage exitoso: `priorizada`, no `en_triage`.** Decisión
  documentada (DoD permite cualquiera de las dos): como el endpoint calcula impacto,
  esfuerzo, alineación y score en un solo turno síncrono, no hay ningún paso intermedio
  real que justifique un estado transitorio — `en_triage` solo tendría sentido si el
  cálculo fuera asíncrono o por etapas, que no es el caso aquí.
- **Decisión no anticipada por `IDEAS-SCHEMA-01`, tomada en este ticket:** esa ticket dejó
  `triageImpacto`/`triageEsfuerzo`/`triageAlineacion` tipados `number | null` en
  `lib/data/types.ts`, señalando explícitamente en su propia nota de ejecución que "el
  ticket no fija su tipo exacto ... lo llena IDEAS-TRIAGE-01". Como este ticket exige
  valores alto/medio/bajo y S/M/L (no numéricos), se corrigieron los tipos a
  `TriageImpacto = "alto"|"medio"|"bajo"`, `TriageEsfuerzo = "S"|"M"|"L"`,
  `triageAlineacion: string | null` (`prioridadScore` se queda `number | null`, es el
  único campo realmente numérico). Se ajustó `rowToIdea()` en `lib/data/sheets.ts` para
  no intentar `Number()` sobre esos 3 campos (antes usaba `numOrNull` para los 4, lo que
  habría producido `NaN` con valores como `"alto"`) — `ideaToRow()` no necesitó cambios,
  ya serializaba con `String()`/`??` de forma compatible. No se toca `MockDataProvider`
  (ya usaba `null` en esos campos, sigue compilando). No lo cuento como expansión de
  alcance: es exactamente el campo que este ticket "llena", según la propia nota del
  ticket anterior.
- `npx tsc --noEmit`: limpio, sin errores.

**Verificación real en Sheet DEV — parcial, con bloqueo externo documentado.**

Se crearon 2 ideas de prueba reales en H10 (Sheet DEV, `GOOGLE_SHEET_ID`), con un script
desechable (`scripts/_verificar-ideas-triage.mjs`, con guard `spreadsheetId !== PROD`),
borrado después de usar:
- `IDEA_1789759396195` (impacto alto esperado): "Conciliación bancaria automática" — el
  caso recurrente documentado en `ESTADO.md` (línea ~7355) como ejemplo de idea perdida,
  y que ataca directo la métrica de éxito del proyecto.
- `IDEA_1789759396196` (impacto bajo esperado): cambio cosmético de color de un botón,
  sin relación con ningún flujo financiero.

Se levantó `next dev` local y se invocó `POST /api/ideas/{id}/triage` contra ambas. Las
dos llamadas fallaron con el mismo error, **no atribuible al código de este ticket**:

```
400 {"type":"error","error":{"type":"invalid_request_error","message":"Your credit
balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade
or purchase credits."}}
```

Confirmado independientemente del endpoint con un `curl` directo a
`https://api.anthropic.com/v1/messages` usando la misma `ANTHROPIC_API_KEY` de
`.env.local` — mismo error exacto, fuera de mi código, así que no es un bug del
endpoint sino saldo insuficiente en la cuenta de Anthropic configurada para este
proyecto.

**Lo que sí quedó verificado con esto, de forma real (no simulada):** el camino de
"Manejo de error" del DoD — cuando la llamada a Haiku falla, el endpoint responde con
error (502... en este caso 502 por fallo de llamada) **y no llama a `updateIdea`**. Se
confirmó leyendo H10 de vuelta después del intento: ambas ideas siguen en `estado: nueva`,
con `triage_impacto`/`triage_esfuerzo`/`triage_alineacion`/`prioridad_score` vacíos — sin
ningún dato inventado.

**Lo que NO quedó verificado:** la parte central del DoD — "confirmando que el triage
distingue entre" la idea de impacto alto y la de impacto bajo — porque nunca se pudo
completar una llamada exitosa a Haiku con la API key disponible. Esto es un bloqueo
externo de billing, no una ambigüedad de diseño ni un defecto de código; no encaja
exacto en los criterios de HALT 1-8 del rol, pero lo reporto con la misma disciplina
(no marco el DoD como cumplido sin evidencia).

**Las 2 ideas de prueba quedan en el Sheet DEV, en `estado: nueva`, sin triage** —
listas para que el Tester (o Camilo, tras recargar crédito en la cuenta de Anthropic)
vuelva a correr `POST /api/ideas/{id}/triage` sobre esos mismos 2 IDs y confirme la
distinción de valores sin tener que recrear datos de prueba. IDs: `IDEA_1789759396195`
(alto esperado), `IDEA_1789759396196` (bajo esperado).

Construcción terminada, pendiente de Tester.
