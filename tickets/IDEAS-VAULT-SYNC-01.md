---
ticket_id: IDEAS-VAULT-SYNC-01
orden: 42
estado: aprobado
tier: A
agente_ejecucion: claude-code
dependencias: [IDEAS-SCHEMA-01]
---

# IDEAS-VAULT-SYNC-01 — Script de sincronización de ideas hacia el vault

## Goal completo

Parte de la línea "backlog de ideas de features con triage por IA" (spec de Fase 2,
`ESTADO.md`, 18 sept 2026 — aprobado por Camilo). Construye el mecanismo para que las
ideas de H10 aparezcan legibles desde una sesión del vault (`obsidian-mind`), como pidió
el to-be ("verlas priorizadas con contexto... como en estas sesiones").

**Mecanismo aprobado:** script en `flujo/scripts/` (mismo patrón que los `*.mjs` ya
documentados en `CLAUDE.md`, sección "Scripts", ej. `generate-kanban.mjs`) que lee H10
vía `SheetsDataProvider`/`getIdeas()` y regenera un archivo markdown plano dentro del
propio repo: `flujo/IDEAS-BACKLOG.md`. Como `work/flujo` ya es symlink hacia este mismo
repo, ese archivo queda automáticamente legible desde cualquier sesión del vault sin
conector nuevo — mismo mecanismo con el que ya se lee `ESTADO.md` de cada proyecto-hijo.

**Disparo:** manual (`node scripts/generar-ideas-backlog.mjs`) en esta primera versión —
no se agrega ningún cron nuevo sin que Camilo lo pida explícitamente.

**Formato de `IDEAS-BACKLOG.md`** (una sección por idea, ordenadas por `prioridad_score`
descendente): id, quién la propuso, descripción, caso de uso, motivo de importancia,
triage (impacto/esfuerzo/alineación), estado. Reusar el mismo estilo markdown plano que
ya usa `brain/ideas-raw.md` en el vault para un propósito análogo (no inventar un formato
nuevo).

**Fuera de alcance:**
- Cualquier escritura desde el vault de vuelta hacia el Sheet — este ticket es de solo
  lectura/generación, unidireccional.
- Automatización del disparo (cron, hook) — manual por ahora.

## Definition of Done

- [ ] `scripts/generar-ideas-backlog.mjs` existe, usa `getProvider()`/`getIdeas()` (nunca
      instancia `SheetsDataProvider` directamente).
- [ ] Genera/sobrescribe `flujo/IDEAS-BACKLOG.md` con todas las ideas de H10, ordenadas
      por `prioridad_score` descendente, en el formato descrito arriba.
- [ ] Ideas sin triage completo (`estado: nueva`) aparecen en una sección aparte
      ("Sin triage todavía"), no mezcladas con las priorizadas.
- [ ] `npx tsc --noEmit` limpio (o `node --check` si el script es JS puro sin tipos).
- [ ] Verificado corriendo el script contra el Sheet DEV real (con al menos las ideas de
      prueba de `IDEAS-TRIAGE-01` ya cargadas) y leyendo el `IDEAS-BACKLOG.md` resultante
      para confirmar que el contenido coincide con lo que hay en el Sheet.

## Contexto / diagnóstico previo

Spec de Fase 2 completo en `ESTADO.md`. Referencia de formato: `brain/ideas-raw.md` del
vault. Referencia de patrón de script: `scripts/generate-kanban.mjs`.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena el Coder al cerrar)
