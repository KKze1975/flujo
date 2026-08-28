---
name: ejecutar-ticket-antigravity
description: >-
  Use this skill when the user asks Antigravity to pick up, execute, or
  continue the next queued ticket assigned to it in Flujo's ticket system
  (tickets/INDICE.md) — e.g. "ejecuta el siguiente ticket", "revisa si hay
  algo pendiente para ti", "toma el ticket de Antigravity", "¿qué tickets
  tienes asignados?". Runs scripts/check-ticket.mjs --next instead of
  reading INDICE.md and reasoning about dependencies by hand.
---

# Ejecutar ticket de Antigravity en Flujo

Este skill reemplaza el copy/paste manual: el sistema de tickets ya existe
(`tickets/`) y ya declara qué ticket te corresponde vía la columna
`agente_ejecucion` de `tickets/INDICE.md` (y el mismo campo en el
frontmatter de cada `tickets/<ID>.md`).

**No leas `INDICE.md` y razones a mano sobre dependencias/estado.** La
primera vez que se corrió este skill (15 ago 2026), razonar manualmente
produjo un error real: se listó como "disponible" un ticket que en
realidad estaba bloqueado por una dependencia sin completar, y se omitió
uno que sí estaba listo. `scripts/check-ticket.mjs` ya hace esa evaluación
de forma determinística (lee dependencias, tier, HALT, WIP=1) — úsalo, no
lo repitas de memoria.

## Pasos

1. **Corre `node scripts/check-ticket.mjs --next antigravity`** desde la
   raíz del repo (`work/flujo`). Esto ya hace todo lo que antes eran los
   pasos 1-4 (leer INDICE.md, verificar WIP=1, filtrar por
   `agente_ejecucion: antigravity`, evaluar dependencias) en un solo
   comando determinístico.
2. Interpreta la salida:
   - `⏸️  Hay ticket(s) activo(s) ahora mismo` → I-09 (WIP=1). NO tomes
     nada nuevo. Repórtalo así — no es "no tienes nada asignado", es que
     ya hay uno en curso (de ti o de otro agente).
   - `No hay ningún ticket con agente_ejecucion: antigravity en estado
     construible` → dilo explícitamente. No inventes trabajo, no ofrezcas
     tickets de otro `agente_ejecucion`.
   - `Hay N ticket(s) ... pero ninguno está listo` → repórtalo con el
     motivo exacto que imprime el script (dependencia sin completar, HALT
     sin resolver). No los tomes igual.
   - `✅ Siguiente ticket para "antigravity": <ID>` → ese es tu ticket.
     Sigue con el paso 3. Si viene con advertencia (`⚠️`), confírmala con
     Camilo antes de construir — no la ignores ni la resuelvas solo.
3. **Corre `node scripts/check-ticket.mjs <ID>`** sobre ese ticket
   puntual — confirma el veredicto antes de tocar código (defensa en
   profundidad, en caso de que el estado haya cambiado entre el paso 1 y
   este).
4. **Antes de escribir código, lee `.claude/agents/coder.md`** (raíz del
   repo) completo — ahí están las reglas de rol, los invariantes de Flujo
   relevantes, y los 8 criterios de HALT. Son las reglas que gobiernan esta
   ejecución, no las repitas de memoria ni las improvises.
5. **Lee `tickets/<ID>.md` completo** — ese es tu Goal y tu DoD.
6. Marca el ticket como `activo` en `tickets/INDICE.md` y en su propio
   frontmatter, **antes** de empezar a construir — para que quede visible
   que está tomado.
7. **Escribe también en el frontmatter del ticket** (misma edición que el
   paso 6, no un archivo aparte): `rol_activo: coder`, `paso_actual:
   "<texto libre, breve, ej. 'escribiendo /api/admin/reset-mes'>"`,
   `actualizado_en: <timestamp real de tu shell — nunca inventado>`.
   **Anclaje determinístico — no depende de tu criterio de "cuándo es
   relevante" (ese criterio ya falló una vez: `PANEL-LOG-EVENTOS-01`,
   16 ago 2026, solo escribió al empezar y al terminar, cero pasos
   intermedios).** Cada ticket tiene una lista de Definition of Done con
   ítems `- [ ]`. Cada vez que marques uno como hecho (`- [ ]` → `- [x]`),
   en esa misma edición actualiza también `paso_actual` (describiendo ese
   ítem) y refresca `actualizado_en`. Si el DoD tiene N ítems, se esperan
   al menos N escrituras de `paso_actual` durante la construcción, no solo
   una al principio y otra al final. Esto es lo que alimenta la pestaña
   Digest de Founder OS (vault `obsidian-mind`); si no lo actualizas, tu
   ticket aparece "sin instrumentar" ahí aunque estés trabajando
   activamente.
8. Construye exactamente contra el DoD del ticket. Nada de alcance nuevo.
9. `tsc --noEmit` limpio antes de terminar (I-07).
10. **Nunca marques el ticket como `completado`** — esa verificación la
    hace el Tester (otro agente, en Claude Code) después. Al terminar la
    construcción, dejas el ticket en `activo` y escribes en su sección
    "Notas de ejecución": qué se hizo, qué quedó fuera de alcance o
    ambiguo, y la frase explícita "Construcción terminada, pendiente de
    Tester". Actualiza también `paso_actual` a esa misma frase y refresca
    `actualizado_en` — es tu último reporte visible en el Digest hasta que
    el Tester tome el ticket.
11. Si durante la ejecución se dispara cualquiera de los 8 criterios de
    HALT de `.claude/agents/coder.md`, DETENTE, deja el ticket en
    `bloqueado`, y explica el motivo exacto en "Notas de ejecución" —
    nunca decidas por tu cuenta cómo resolverlo. Escribe también
    `necesita_aprobacion: alta` y `halt_criterio: <1-8>` en el
    frontmatter — el texto en "Notas de ejecución" lo lee un humano que
    ya abrió el archivo; estos dos campos son lo que hace que el Digest
    lo muestre sin que nadie tenga que abrirlo primero.

## Si te preguntan "¿qué tickets tienes asignados?" sin pedir que construyas

Corre igual el paso 1 (`--next antigravity`) y reporta el resultado tal
cual — no listes todos los tickets `propuesto` del proyecto (esa es la
vista del backlog completo, no la tuya). "Asignado" aquí significa: tiene
`agente_ejecucion: antigravity`, está en un estado construible, y sus
dependencias están completas. Un ticket `propuesto` sin ese campo, o de
otro agente, no es tuyo aunque aparezca en `INDICE.md`.

## Lo que este skill nunca hace

- Mergear a `main` o hacer push directo — I-11.
- Tocar más de un ticket a la vez.
- Marcar un ticket como verificado/completado — solo construye.
- Inventar `agente_ejecucion: antigravity` en un ticket que no lo declara.
- Listar como "disponible" un ticket sin correr `check-ticket.mjs` primero.
