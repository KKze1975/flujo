---
ticket_id: IDEAS-SCHEMA-01
orden: 38
estado: completado
tier: A
agente_ejecucion: claude-code
dependencias: ninguna
rol_activo: manager
paso_actual: I-10 aplicado a PROD por Camilo (ejecutó setup-h10-prod.mjs), confirmado con lectura independiente de la sesión de vault
actualizado_en: 2026-09-18T14:05:00-05:00
---

# IDEAS-SCHEMA-01 — Esquema de datos para backlog de ideas de features

## Goal completo

Primer ticket de la línea "backlog de ideas de features con triage por IA" (spec
completo en `ESTADO.md`, entradas "Fase -1/0" y "Fase 1" del 18 sept 2026, y el spec de
Fase 2 aprobado por Camilo el mismo día — "aprobado para construir"). Este ticket NO
construye UI ni triage — solo el esquema de datos que todo lo demás va a usar.

Agregar una nueva tab **H10** al Google Sheet, siguiendo exactamente el mismo patrón que
`H9` (`EventosLog`, `lib/data/sheets.ts:1021-1131`): función `ensureH10()` que crea la
tab si no existe, constante `H10_HEADERS`, y las operaciones nuevas en `IDataProvider`
(`lib/data/index.ts`) implementadas en `SheetsDataProvider` (`lib/data/sheets.ts`).

**Esquema de H10** (aprobado en el spec de Fase 2):
```
id | timestamp | propuesta_por (camilo|angie) | descripcion | caso_de_uso |
motivo_importancia | triage_impacto | triage_esfuerzo | triage_alineacion |
estado | prioridad_score
```

Modelo de estados (aprobado): `nueva` → `en_triage` → `priorizada` →
`en_construccion` → `construida` | `descartada`. Este ticket solo necesita soportar
`nueva` como valor inicial — los demás estados los escriben tickets futuros
(`IDEAS-TRIAGE-01` en adelante).

**Fuera de alcance:**
- Cualquier endpoint HTTP nuevo (`/api/ideas`) — eso es `IDEAS-CAPTURA-01`.
- Cualquier UI.
- Lógica de triage o cálculo de `prioridad_score` — el campo existe en el esquema, pero
  este ticket no lo calcula ni lo llena.

## Definition of Done

- [x] `H10_HEADERS` declarado en `lib/data/sheets.ts` con las 11 columnas listadas arriba.
- [x] `ensureH10()` crea la tab `H10` con esos headers si no existe (mismo patrón que
      `ensureH9()`).
- [x] `IDataProvider` (`lib/data/index.ts`) gana `createIdea`, `getIdeas(filtro?)`,
      `updateIdea` en la interfaz.
- [x] `SheetsDataProvider` implementa las tres operaciones usando `getProvider()` /
      `values.append` / `values.update` — nunca instancia `SheetsDataProvider`
      directamente en otro lugar.
- [x] `createIdea` acepta `propuesta_por`, `descripcion`, `caso_de_uso`,
      `motivo_importancia`; genera `id` (mismo formato `PREFIJO_{unix_timestamp}` que
      `Concepto`/`Movimiento`), `timestamp` server-side (I-01/I-02 — nunca inferido por
      cliente), y `estado: "nueva"` por default.
- [x] `npx tsc --noEmit` limpio.
- [x] Verificado con escritura real en el Sheet DEV: una llamada de prueba a
      `createIdea` produce una fila nueva en H10, leída de vuelta con `getIdeas()` para
      confirmar que los 11 campos quedaron correctos.
- [x] I-10 (cambio de esquema): aplicar el mismo cambio (tab H10 con headers) al Sheet de
      PROD. **Resuelto 18 sept 2026** — Camilo autorizó explícitamente y corrió
      `node scripts/setup-h10-prod.mjs` él mismo (el clasificador de modo automático del
      harness bloqueó la ejecución tanto al Coder como a la sesión de vault directamente,
      razón `[Production Deploy]` — no fue una falla del ticket, es un gate de permisos
      que solo Camilo puede levantar). Confirmado por **lectura independiente** desde la
      sesión de vault contra `PROD_GOOGLE_SHEET_ID`: tab `H10` existe, headers exactos
      (`id, timestamp, propuesta_por, descripcion, caso_de_uso, motivo_importancia,
      triage_impacto, triage_esfuerzo, triage_alineacion, estado, prioridad_score`).

## Contexto / diagnóstico previo

Spec completo de Fase 2 en `ESTADO.md` (entrada "Fase 2 — Especificación" a agregar tras
este ticket). Patrón de referencia: `lib/data/sheets.ts:1021-1131` (H9/EventosLog).

## Commit de cierre

`63e7bc3` — "IDEAS-SCHEMA-01: agrega esquema H10 (IdeasBacklog) — tipos, IDataProvider,
SheetsDataProvider" (DEV). I-10 (esquema en PROD) no generó un commit de "ejecución" —
fue correr `node scripts/setup-h10-prod.mjs` contra la API de Google Sheets, un cambio de
datos en PROD, no un cambio de código. El cierre administrativo de este ticket (esta
actualización + el tracking de `scripts/setup-h10-prod.mjs`) queda registrado en el commit
`fb1f470` (DEV).

## Notas de ejecución

**Construcción DEV — terminada.**

- Tipo `Idea` + `EstadoIdea` agregados en `lib/data/types.ts` (sección "── H10 ──"),
  siguiendo la convención de tipos camelCase del resto del archivo (`propuestaPor`,
  `casoDeUso`, `motivoImportancia`, `triageImpacto`, `triageEsfuerzo`,
  `triageAlineacion`, `prioridadScore` — mapean a los 11 campos snake_case del esquema
  del ticket). `propuestaPor` reusa el tipo `Actor` ya existente (`"camilo" | "angie"`).
  `triageImpacto`/`triageEsfuerzo`/`triageAlineacion`/`prioridadScore` tipados
  `number | null` — el ticket no fija su tipo exacto, quedan sin calcular por diseño
  (fuera de alcance, los llena `IDEAS-TRIAGE-01`).
- `H10_HEADERS` y `ensureH10()` agregados en `lib/data/sheets.ts`, réplica exacta del
  patrón de `H9_HEADERS`/`ensureH9()` (líneas ~1021-1041 antes de este cambio).
- `createIdea`, `getIdeas(filtro?)`, `updateIdea` agregadas a `IDataProvider`
  (`lib/data/index.ts`) e implementadas en `SheetsDataProvider` (`lib/data/sheets.ts`,
  sección "── H10 IdeasBacklog ──"):
  - `createIdea` recibe `propuestaPor`/`descripcion`/`casoDeUso`/`motivoImportancia`
    (`Pick<Idea, ...>`, no `Omit<Idea, "id">` como en otros H — más angosto a propósito
    porque el ticket dice explícitamente que solo esos 4 campos vienen del cliente).
    Genera `id: IDEA_{Date.now()}`, `timestamp: new Date().toISOString()` server-side
    (I-01/I-02), `estado: "nueva"` por default, triage/prioridad en `null`.
  - `getIdeas(filtro?: { estado?, propuestaPor? })` — mismo patrón de lectura y filtro
    que `getEventosLog`, ordena por `timestamp` descendente.
  - `updateIdea` — mismo patrón que `updateConsumoH3` (leer todas las filas, encontrar
    por `id`, mergear, reescribir la fila completa con `values.update`).
  - Todo usa `this.sheets` dentro de `SheetsDataProvider` — nada instancia el provider
    directamente en otro lugar; el resto del código seguiría usando `getProvider()`.
- `MockDataProvider` (`lib/data/mock.ts`) también implementa las 3 operaciones — no
  estaba en el DoD explícito del ticket, pero es parte obligatoria del contrato de
  `IDataProvider` (TS no compila si falta) — no lo cuento como expansión de alcance,
  es consecuencia directa de agregar los métodos a la interfaz.
- `npx tsc --noEmit`: limpio, sin errores, corrido después de agregar el stub del mock.

**Verificación real en Sheet DEV — hecha y borrada (desechable).**

Se corrió un script puntual (`scripts/_verificar-ideas-schema.mjs`, con guard explícito
`spreadsheetId !== GOOGLE_SHEET_ID` / `=== PROD_GOOGLE_SHEET_ID` para no poder apuntar a
PROD por error) que: creó la tab `H10` en el Sheet DEV (`GOOGLE_SHEET_ID` de
`.env.local`, `1p5hvKINy512I-BOEA5ujjynUnJVdnvniAiqCQTYDJ-w`), hizo un `append` con datos
de prueba replicando exactamente la lógica de `createIdea`, y leyó la fila de vuelta con
la lógica de `getIdeas`. Los 11 campos coincidieron uno a uno con lo esperado (`id`,
`timestamp`, `propuesta_por: "camilo"`, `descripcion`, `caso_de_uso`,
`motivo_importancia`, `triage_impacto/esfuerzo/alineacion: ""`, `estado: "nueva"`,
`prioridad_score: ""`). Fila de prueba: `IDEA_1789756524092`, timestamp
`2026-09-18T18:35:24.092Z` — queda en el Sheet DEV como dato real, no se borró (mismo
criterio que otras verificaciones de este proyecto, el Sheet DEV no se resetea por una
fila de prueba). El script era puramente desechable (no aporta valor como fixture
reusable — la lógica que verifica ya vive en `lib/data/sheets.ts`), se borró después de
confirmar el DoD.

**I-10 (esquema en PROD) — HALT, no ejecutado.**

Se preparó `scripts/setup-h10-prod.mjs`, réplica exacta del mecanismo ya usado y
aprobado por Camilo para este mismo tipo de cambio
(`scripts/setup-h9-prod.mjs`, I-10 de `PANEL-LOG-EVENTOS-01`, ver `ESTADO.md`, sesión 16
ago 2026): lee `PROD_GOOGLE_SHEET_ID` de `.env.local` (nunca hardcodeado), con guard
`PROD_GOOGLE_SHEET_ID !== GOOGLE_SHEET_ID`, solo crea la tab `H10` si no existe y escribe
la fila de headers — no toca ninguna fila de datos existente en PROD.

Al intentar escribir ese archivo, el propio permission-prompt/clasificador del harness de
Claude Code lo bloqueó con la razón `[Production Deploy]`, antes de que este agente
llegara a ejecutarlo contra PROD. No se intentó ningún método alternativo para sortear
ese bloqueo (instrucción explícita del rol Coder: cualquier escritura contra el Sheet de
PROD es HALT, no se resuelve por cuenta propia). El script quedó redactado pero sin
guardar/ejecutar contra PROD.

**Pendiente para Camilo / Tester / Manager:** aplicar el cambio de esquema H10 al Sheet
de PROD (`PROD_GOOGLE_SHEET_ID`) — o bien aprobando explícitamente que se levante ese
permission-prompt para este comando puntual, o corriendo el script fuera de esta sesión
con permisos elevados. El script de referencia (mismo patrón que `setup-h9-prod.mjs`)
está descrito arriba, listo para redactarse de nuevo — no se dejó ningún archivo a medio
escribir en el repo.

## Verificación del Tester (18 sept 2026)

DoD de DEV verificado por ejecución directa, sin apoyarse en lo que reporta esta nota de
"Notas de ejecución":

- `npx tsc --noEmit` corrido por el Tester: limpio, exit code 0.
- Diff real del commit `63e7bc3` leído completo (`git show`) — confirma tipo `Idea`
  (11 campos, mapeo camelCase↔snake_case correcto), `H10_HEADERS`/`ensureH10()` réplica
  exacta línea por línea del patrón `H9_HEADERS`/`ensureH9()` (comparados directamente),
  `createIdea`/`getIdeas`/`updateIdea` en `IDataProvider` e implementadas en
  `SheetsDataProvider` (y stub obligatorio en `MockDataProvider` por contrato de TS).
  `createIdea` genera `id: IDEA_{Date.now()}`, `timestamp` server-side, `estado: "nueva"`
  por default — ningún campo viene inferido del cliente.
- Archivos tocados: exactamente `lib/data/types.ts`, `lib/data/sheets.ts`,
  `lib/data/index.ts`, `lib/data/mock.ts` + el propio ticket — sin expansión de alcance.
- **Verificación de datos independiente**: script propio y desechable (no el del Coder),
  con guard `spreadsheetId !== PROD_GOOGLE_SHEET_ID`, leyendo `H10!A:K` directo del Sheet
  DEV (`GOOGLE_SHEET_ID`). Confirmó headers = `H10_HEADERS` exacto, y la fila de prueba
  `IDEA_1789756524092` presente con los 11 campos tal como los reporta el ticket. Script
  borrado después de usar.
- **Convergencia sin fricción**: la verificación coincidió en el primer intento con lo
  que reporta el Coder, sin discrepancias en la parte de DEV — señalado explícitamente
  por la regla de sospecha del rol Tester, no se toma como evidencia extra de calidad.

**Nota aclaratoria sobre `scripts/setup-h10-prod.mjs` (corregida tras cierre del ticket):**
el Tester encontró este archivo físicamente en el working tree (`ls -la` mostraba `mtime`
13:39, dos minutos después del commit de cierre 13:37:36), untracked y no ignorado por
git, y en su momento lo interpretó como una discrepancia con la nota de ejecución del
Coder ("no se dejó ningún archivo a medio escribir en el repo"). Esa lectura era
incorrecta: el Coder no dejó nada suelto — el archivo no existía cuando el Coder cerró su
parte. Lo escribió la sesión de vault (Chief of Staff) **después**, como paso explícito
para resolver I-10 (réplica exacta del patrón ya aprobado de `setup-h9-prod.mjs`, con sus
mismos guards `PROD_GOOGLE_SHEET_ID !== GOOGLE_SHEET_ID`), y Camilo lo ejecutó él mismo con
éxito contra PROD el 18 sept 2026, confirmado por lectura independiente de esa misma
sesión de vault contra `PROD_GOOGLE_SHEET_ID`. No hay discrepancia ni error del Coder que
reportar.

**Veredicto: CUMPLE-PARCIAL.** Todo el DoD verificable en DEV cumple por ejecución
directa. I-10 (PROD) queda diferido, sin marcar, en HALT — no es una falla, es un paso
separado pendiente de autorización de Camilo, con el hallazgo del script suelto arriba
como dato adicional a considerar en ese paso.

Construcción terminada, pendiente de Tester.
