# Brief de diseño — Captura de ideas con preguntas de profundización (IDEAS-CAPTURA-01)

Rol: Diseñador/Integrador (`.claude/agents/disenador-integrador.md`). Paso 1 de 2 —
este documento es el brief para Antigravity/Stitch. La integración (paso 2) ocurre
cuando Camilo trae de vuelta el HTML/diseño generado. Hoy no hay HTML todavía — este
brief es el insumo para generarlo, no la aprobación de diseño.

## Por qué existe este brief

Ticket `tickets/IDEAS-CAPTURA-01.md`, parte de la línea "backlog de ideas de features
con triage por IA" (spec de Fase 2, `ESTADO.md`, 18 sept 2026 — aprobado por Camilo).
El ticket está **bloqueado**: no existe diseño aprobado para el punto de entrada ni el
formulario de captura (regla no negociable del proyecto, precedente `T21` revertido por
saltarse esto). El spec de Fase 2 identificó un patrón visual reusable
(`components/ui/BottomNav.tsx` + `components/m4/RegistroRapido.tsx`) pero no decide
dónde vive el punto de entrada nuevo — esa decisión es de este brief.

## 1. Flujo to-be, paso a paso

1. A Camilo o a Angie se les ocurre una idea de feature en cualquier momento mientras
   usan Flujo — sin filtro previo entre ellos, cualquiera de los dos puede registrar
   cualquier idea (to-be validado en Fase 1: "todas las ideas se pueden subir").
2. Toca el punto de entrada nuevo de captura de ideas (ubicación **sin decidir todavía**
   — ver sección 3).
3. Se abre un panel de captura, mismo patrón de interacción que "Registrar gasto"
   (sheet que sube desde abajo, no una página nueva) — acción de un toque, sin fricción,
   en el momento, igual que pide el to-be.
4. Describe la idea en texto libre (un campo, sin estructura forzada).
5. Selecciona explícitamente quién la propone — Camilo o Angie. No hay auth de usuario
   en Flujo hoy, así que es un selector visible, nunca inferido.
6. Antes de poder confirmar, responde dos preguntas fijas, en el mismo flujo (no
   pantallas separadas si se puede evitar): (a) caso de uso concreto, (b) por qué le
   parece importante.
7. El botón de confirmar/registrar queda deshabilitado hasta llenar los tres campos
   (descripción + las dos respuestas) — mismo criterio que ya usa el registro de gastos
   (`puedeEnviar` en `InputRegistro.tsx`, botón deshabilitado hasta que el formulario es
   válido).
8. Al confirmar, el panel pasa a un estado de éxito breve (check + mensaje) y se cierra,
   devolviendo a Camilo/Angie a donde estaban — no navega a ninguna vista de revisión
   (esa vista no existe, ver sección 5).

## 2. Patrón visual de referencia — dónde vive y qué reusar exactamente

Fuente real en el repo, ya en uso en producción (no inventar nada nuevo si esto ya
resuelve el caso):

- **`components/ui/BottomNav.tsx`** — el FAB central (`.fl-fab`, ícono `bolt`) que hoy
  dispara `onFabClick` y abre el sheet de registro de gastos. Es un slot único dentro
  del array `ITEMS` (`id: "fab"`), entre "Semana" y "Mes" — no hay un segundo slot de
  FAB en el componente actual. Los otros cuatro ítems (`home`, `semana`, `mes`,
  `historial`) siguen el patrón `.fl-navitem` con ícono (`Icon`, 22px) + label de texto
  corto debajo.
- **`components/m4/RegistroRapido.tsx`** — la pieza que se monta dentro del sheet.
  Reusar su estructura de tres estados: `idle` (formulario), `registrando` (spinner +
  `.fl-ai-pill`), `exito` (ícono `check` en `--pos`, mensaje, botón `fl-btn ghost sm`
  para volver a registrar). Reusar también su patrón de error inline (fondo
  `var(--neg-soft)`, texto `var(--neg)`, `border-radius: 14px`) — nunca `alert()` del
  navegador.
- **`components/m4/InputRegistro.tsx`** — el formulario interno. Calce directo para el
  selector Camilo/Angie: el bloque "¿Quién pagó?" (líneas 166-184) usa `.fl-tabs` +
  `.fl-tab` con un `.fl-person` (`c`/`a`, iniciales "C"/"A" sobre `--persona-c`/
  `--persona-a`) dentro de cada tab — es exactamente el patrón para el selector
  `propuesta_por` de este ticket, mismo componente visual, solo cambia el label. El
  campo de texto libre reusa `.fl-field` + `textarea` sin borde dentro de un contenedor
  `var(--surface)` / `var(--radius-inner)` / `1px solid var(--line)` (líneas 84-101). El
  botón de envío reusa `.fl-btn primary block` con `disabled` mientras el formulario no
  es válido.
- **`components/HomeHub.tsx`** (líneas 151-166) — el wrapper del sheet en sí:
  `.sheet-backdrop` (fondo, cierra al hacer click fuera) → `.sheet` → `.sheet-grip`
  (indicador de arrastre) → `.sheet-head` (título + botón `.icon-btn` con `Icon name="x"`
  para cerrar) → `.sheet-body` (contenido scrolleable, padding `4px 16px 32px`). Mismo
  wrapper, mismo comportamiento, solo cambia qué se monta en `.sheet-body`.
- **Tokens ya definidos** (`app/globals.css`, heredan el tema activo — no fijar uno):
  `--surface`, `--surface-2`, `--ink`, `--ink-soft`, `--ink-faint`, `--line`,
  `--primary`, `--pos`, `--neg`, `--neg-soft`, `--persona-c`, `--persona-a`,
  `--radius-inner`, `--radius-btn`, `--shadow-card`.
- **Clases ya construidas:** `.fl-tabs`/`.fl-tab`/`.fl-tab.on`, `.fl-field`,
  `.fl-input`, `.fl-btn` (`primary`/`ghost`/`block`/`sm`), `.fl-person` (`c`/`a`),
  `.fl-action` (fila ícono+texto+chevron, ver sección 3), `.sheet-backdrop`/`.sheet`/
  `.sheet-grip`/`.sheet-head`/`.sheet-body`, `.fl-ai-pill`, `.icon-btn`.

## 3. Decisión de diseño pendiente — NO resuelta acá, la resuelve el diseño

**Dónde vive el punto de entrada nuevo.** No pisar ni modificar el FAB de "Registrar
gasto" existente (ícono `bolt`) — tiene un propósito distinto (registro de gastos) y uso
diario, y es el ítem central ya establecido de `BottomNav`. Opciones reales observadas
en el código, ninguna descartada de antemano — el diseño decide, no este brief:

- **(a) Un ítem más en `BottomNav`** — el array `ITEMS` hoy tiene 4 nav items + 1 fab
  central; agregar un quinto nav item (ícono + label, patrón `.fl-navitem`) es
  estructuralmente posible pero puede saturar una barra pensada para navegación
  primaria, no para una acción de captura ocasional.
- **(b) Una fila `.fl-action` dentro de `HomeHub`** — junto a las filas existentes
  ("Esta semana", "Inicio de mes", líneas 89-105 de `HomeHub.tsx`), mismo patrón
  ícono+texto+descripción+chevron, ya usado para navegación a otras vistas/acciones.
- **(c) Otra ubicación que el diseño identifique** — no limitada a (a) o (b) si
  Antigravity/Stitch encuentra un patrón mejor dentro del sistema `fl-*` existente.

## 4. El formulario — campos exactos

Un solo flujo de confirmación (sheet), sin pantallas separadas si se puede evitar:

- **Descripción** — texto libre, campo abierto (reusar el `textarea` sin estructura de
  `InputRegistro.tsx`, sin tabs de texto/imagen — acá no hay adjuntar foto).
- **Propuesta por** — selector Camilo/Angie, explícito, patrón `.fl-tabs` + `.fl-person`
  (`c`/`a`) igual que "¿Quién pagó?".
- **Caso de uso concreto** — pregunta fija de profundización 1, campo de texto (puede
  ser el mismo estilo de `textarea` que la descripción, o un `.fl-field` con `input`
  si el diseño lo prefiere más corto).
- **Motivo de importancia** — pregunta fija de profundización 2, mismo criterio que la
  anterior.
- **Botón confirmar** — `.fl-btn primary block`, deshabilitado hasta que los cuatro
  campos tengan contenido (mismo criterio `puedeEnviar` de `InputRegistro.tsx`).

Las dos preguntas de profundización son **fijas, sin IA generativa** — siempre el mismo
texto, no varían por idea. No hay conversación multi-turno.

## 5. Qué NO se necesita diseñar

- **Vista de ideas priorizadas** — descartada del alcance del proyecto (ver entrada
  "Simplificación de alcance", `ESTADO.md`, 18 sept 2026). El triage y la vista
  priorizada ya no se construyen dentro de la app.
- **Cualquier interacción con IA/bot** — no hay generación de preguntas, no hay
  clasificación automática visible en esta vista. El triage es un ticket aparte
  (`IDEAS-TRIAGE-01`), fuera de alcance de este brief.
- **El endpoint `POST /api/ideas`** ni la persistencia en Sheets — eso es construcción,
  no diseño.
