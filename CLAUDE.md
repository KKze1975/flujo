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
