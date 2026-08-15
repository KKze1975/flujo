# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

---

## Commands

```powershell
npm run dev          # dev server on http://localhost:3000
npm run build        # production build
npx tsc --noEmit     # type check — must pass before every commit
npm run lint         # eslint
node scripts/generate-kanban.mjs   # regenerate public/kanban.html after ticket work
```

No test runner is configured. Verification is done visually at `/admin/trazabilidad` and on the dev preview URL.

The pre-commit hook runs `tsc --noEmit` and checks that the production Sheet ID is not hardcoded. Both must pass; `--no-verify` is only allowed for documentation-only commits.

---

## Shell & Machines

- Windows Server + PowerShell. No usar bash para rutas Windows, heredocs ni comandos multi-línea empaquetados; comandos PowerShell separados.
- El dev server corre en esta WorkSpace (localhost:3000). El navegador del usuario puede estar en otra máquina — nunca abrir localhost con `Start-Process` para mostrarle algo al usuario.
- Dev server y procesos largos: usar tareas en background nativas de Claude Code, no `Start-Process` + `Start-Sleep` + polling manual.
- Para leer archivos usar la herramienta Read, nunca `Get-Content | Select-Object -Index`.

## Verification Honesty

- Nunca reportar que un recurso vivo (Sheet, fila de DB, deploy, UI) quedó actualizado sin evidencia leída de vuelta: respuesta HTTP pegada, diff de `/admin/trazabilidad`, o el contenido real de la fila/celda.
- Si un fix no se pudo verificar, decirlo explícitamente: "aplicado pero NO verificado".
- No inventar timestamps (no hay reloj en tiempo real) — usar `git log --format=%ci` como fuente.
- Si un screenshot de browser falla una vez, cambiar a verificación por API/logs y avisar.

---

## Architecture

### Backend: Google Sheets as database

Google Sheets is the only persistence layer. There is no SQL database. All data access goes through a single interface `IDataProvider` (`lib/data/index.ts`) implemented by `SheetsDataProvider` (`lib/data/sheets.ts`). `getProvider()` (`lib/data/provider.ts`) returns the singleton instance. Every API route calls `getProvider()` — never instantiate `SheetsDataProvider` directly.

The Sheet has tabs named by convention:

| Tab | Name | Content |
|-----|------|---------|
| H1 | Conceptos | Master catalog of budget concepts (`Concepto`) |
| H2 | Movimientos | Monthly budget lines per concept (`Movimiento`) |
| H3B | ConsumoH3 | Individual spending records ("bolsillos") |
| H4B | IngresoAngie | Weekly income entries from Angie |
| H4C | SaldoCuenta | Account balances at month start |
| H5A | CierreSemana | Weekly close records |
| H5B | PlanSemana | Plans for the next week |
| H6 | CierreMensual | Monthly close records |

H4D is legacy — never read or write it (I-05).

The Sheet ID is always read from `GOOGLE_SHEET_ID` in `.env.local`. Never hardcode it.

### Data model key types (`lib/data/types.ts`)

- **`Concepto`** (H1): master budget item. `tipo` is `fijo | pago_fraccionado | discrecional`. `id` format: `CATEGORIA_{unix_timestamp}`.
- **`Movimiento`** (H2): monthly instance of a concept. `id` format: `MOV_{unix_timestamp}`. `conceptoId` → FK to H1. `semana` can be null for `semana_default = variable`.
- **`ConsumoH3`** (H3B): individual spend. `bolsilloId` must be the `id_concepto` from H1 (not the `id_movimiento` from H2) — this is a common bug surface (I-03).
- **`CierreSemana`** (H5A): written by `POST /api/mes/[mes]/cerrar-semana`.

### API routes

All routes are under `app/api/`. Route handlers call `getProvider()` and return JSON. Params are always resolved with `await params` (Next.js 16 async params). Key routes:

- `GET/POST /api/mes/[mes]` — list / create movimientos for a month
- `PATCH /api/mes/[mes]/movimientos/[id]` — update a movimiento; `tipo` discriminates action: `ejecutar | posponer | no_aplica | reasignar_semana | mover_mes_siguiente | revertir_mes_siguiente | revertir_ejecucion`
- `POST /api/mes/[mes]/cerrar-semana` — closes a week, writes H5A + H5B
- `POST /api/registro/interpretar` — calls Claude Sonnet to parse a spend description or receipt image into structured JSON
- `POST /api/consumos/[id]/clasificar` — calls Claude Haiku to match a spend to a concepto in H1

### AI integration

Two Claude models are used server-side:

- **`claude-sonnet-4-6`** at `POST /api/registro/interpretar`: parses free-text or image into `InterpretacionM4` (monto, categoría, fuente, semana, confianza).
- **`claude-haiku-4-5-20251001`** at `POST /api/consumos/[id]/clasificar`: matches a spend description to the best active concepto by name. Returns exact concepto name or `NULL`.

The Haiku classifier must **not** suggest "Imprevistos" automatically — only when the user explicitly selects it.

### Pages and components

| Route | Component | Role |
|-------|-----------|------|
| `/` | `HomeHub` | Hub de acceso a meses y registro |
| `/meses` | `PantallaMeses` | Lista de meses activos |
| `/mes/[mes]` | `MesM1` | Vista M1 — planificación mensual desktop/mobile |
| `/mes/[mes]/semana` | `VistaSemanal` | Vista semanal (M4) — ejecución semana a semana |
| `/registro` | page | Registro rápido de gastos |
| `/admin/trazabilidad` | page | Herramienta de diff de Sheet para verificar DoD |

`VistaSemanal` is a large client component. It receives all data server-side from `app/mes/[mes]/semana/page.tsx` and handles: pendientes, ejecutados, bolsillos `pago_fraccionado`, FAB de registro, y modal M5 de corrección.

`MesM1` has desktop/mobile splits (`MesM1Desktop`, `MesM1Mobile`) and a set of modals under `components/m1/`.

### Business invariants

Read `INVARIANTS.md` before writing any code. Critical ones:

- **I-01/I-02**: Semana and mes are always calculated server-side. Never inferred client-side.
- **I-03**: `clasificado = true` in H3B requires `bolsilloId` to be present.
- **I-07**: `tsc --noEmit` must be clean before every commit (enforced by pre-commit hook).
- **I-09**: Only one ticket open at a time — no next ticket until current DoD is verified.
- **I-11**: `main` is protected. All changes go via PR from `dev`.

### DoD verification

`/admin/trazabilidad` is the primary tool for verifying that Sheet writes are correct. Use it after any API change that writes H2, H3B, or H4. It shows diffs between two snapshots and flags invariant violations.

### Scripts

`scripts/` contains one-off migration and seed scripts (`*.mjs`). They run directly with `node scripts/<name>.mjs` and use the same service account credentials. They operate on the dev Sheet unless explicitly configured otherwise.

### Ticket management

Backlog work lives in `tickets/*.md` (one file per ticket, see `tickets/_TEMPLATE.md`) with an index at `tickets/INDICE.md`. Each ticket has a `tier`: `A` (autonomous, run via `/goal-a {ticket_id}`), `B` (diagnosis-only with a mandatory HALT before any fix, run via `/goal-b {ticket_id}`, then `/goal-a` once Camilo approves the plan), or `C` (fully manual, no automated command — reserved for destructive writes or production Sheet ranges until a verified prod backup exists). `tickets/` is not a replacement for `ESTADO.md`. Origin: `SCAFFOLD-TICKETS-01`.

**Antes de invocar cualquier agente de ejecución (Antigravity o Claude Code) sobre un ticket, correr `node scripts/check-ticket.mjs {ticket_id}`.** Existe porque Camilo activa Antigravity manualmente, sin que Claude Code medie como gate — el riesgo real es pedirle a un agente que construya un ticket que todavía no está listo (Tier B sin HALT resuelto, dependencia sin completar, o WIP=1/I-09 roto) sin darse cuenta. El script da un veredicto determinístico (GO/NO-GO) leyendo el `.md` del ticket + `INDICE.md`, y de paso confirma cuál `agente_ejecucion` corresponde. No reemplaza el juicio humano — un NO-GO con advertencia (ej. excepción de WIP ya autorizada) sigue permitiendo continuar si Camilo lo confirma explícitamente. Origin: sesión de vault, 11 ago 2026.

**`ESTADO.md`:** Claude Code puede anexar entradas de cierre de sesión al final del archivo, bajo anchor-guard obligatorio (verificar por lectura el estado real antes de escribir — último commit que tocó el archivo, `git diff` limpio, últimas ~100 líneas leídas). Nunca editar ni borrar contenido previo — es append-only. Cambio de regla aprobado por Camilo, 21 jul 2026 — reemplaza la restricción anterior ("no modificar bajo ninguna circunstancia"). Origin: `ESTADO-UPDATE-01`.

## Protocolo HG SDD (Human-Grounded SDD v6.1)

**Tipos de sesión — declarar al abrir, no mezclar:**
DISEÑO (no código, no tecnología) | CONSTRUCCIÓN (contra spec aprobada) |
DEBUGGING (no proponer fix sin el log de error exacto) | RETROSPECTIVA (no abre tickets).

**DoD = acciones verificables, no estados.**
"El bot registra gastos" no es DoD. "Mensaje produce fila en Sheet en <5s, verificado por 
GET /api/mes/YYYY-MM" sí lo es. Ningún ticket cierra sobre una afirmación sin evidencia 
pegada (respuesta HTTP, diff del Sheet, output de comando).

**DEBUGGING exige log exacto antes de proponer cualquier cambio.**
Sin log de error reproducido, no hay diagnóstico — hay hipótesis. No se toca código sobre 
una hipótesis.

**Dato operativo determinista → lo calcula el servidor, nunca la IA.**
Fecha, semana, mes, actor, sesión: el cliente/prompt no opina, no infiere, no tiene fallback 
hardcoded. Si un SYSTEM_PROMPT tiene un valor de negocio con fallback tipo "sin referencia → 
X", es un bug esperando manifestarse (lección de origen de este proyecto — bug S1, jun 2026).

**Freno Informativo ante Preguntas — Prohibida la ejecución autónoma no solicitada.**
Ante cualquier pregunta o consulta del usuario, el agente debe limitar su respuesta a explicar, diagnosticar o sugerir cursos de acción/opciones. Queda ESTRICTAMENTE PROHIBIDO ejecutar modificaciones de código, commits, escrituras de datos o comandos autónomos de forma reactiva a una pregunta, salvo que exista una orden explícita del usuario o se esté ejecutando un Loop autónomo previamente autorizado (/goal).

**Cierre de sesión — contrato de síntesis.**
Al cerrar, sintetiza el delta de ESTADO.md/SESSION_LOG.md sin preguntar. No es el estado 
canónico — es borrador para corrección de Camilo. Usa anchor-guard: verifica contra el ancla 
conocida antes de escribir; si no coincide, halt — no sobrescribas.

**Higiene de ejecución (candidato §6.5, evidencia Flujo):**
- Nunca reportar éxito sobre un recurso vivo (Sheet, endpoint, deploy) sin evidencia adjunta.
- Verificar merge-base antes de merge/deploy — no desplegar rama divergente del canónico.
- Usa Read, no `Get-Content`. Usa `run_in_background` para el dev server, no `Start-Process`.

**Contexto de stack (para evitar ambigüedad dev/prod):**
Next.js + TypeScript + Tailwind + Google Sheets (MVP) + Vercel. Declarar explícitamente 
DEV vs PROD y el tab exacto antes de tocar Sheets.

## Gobernanza y arquitectura de agentes (actualizado 27 jul 2026)

**Arquitectura de dos capas — generalizada.**
Claude.ai (vía Project) diseña, especifica, y mantiene `ESTADO.md` — Camilo
es el único autor de `ESTADO.md`; ningún agente de ejecución lo edita
directamente salvo el protocolo de anchor-guard ya documentado arriba
("Ticket management").

Cualquier agente de ejecución (Claude Code, Antigravity, Aider, u otro que
se sume) hace el resto: escritura de código, operaciones de Git, lectura/
escritura del Sheet. La capa de ejecución es intercambiable por diseño —
el contexto en `AGENTS.md`/`CLAUDE.md`/`ESTADO.md`/`INVARIANTS.md` es la
interfaz común que cualquier agente debe leer antes de operar, sin importar
cuál sea.

**Fuente de verdad: git sobre Drive.**
Google Drive metadata puede tener 60+ minutos de retraso respecto a los
commits reales del repo. `git log`/`git show` es la fuente autoritativa
siempre que Drive y git diverjan.

**Gates humanos (ver también `INVARIANTS.md` candidatos I-17, I-18).**
- Ningún merge a `main` procede sin aprobación explícita de Angie como QA
  approver, independiente de que la protección técnica de rama (I-11) esté
  satisfecha. Un agente que detecte un PR listo para mergear debe escalar,
  nunca mergear de forma autónoma.
- Todo ticket ejecutado autónomamente debe verificarse en la siguiente
  sesión antes de iniciar trabajo nuevo — ver I-18.
