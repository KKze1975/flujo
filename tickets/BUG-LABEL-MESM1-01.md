---
ticket_id: BUG-LABEL-MESM1-01
orden: 8
estado: completado
tier: A
agente_ejecucion: antigravity
dependencias: ninguna
---

# BUG-LABEL-MESM1-01 — Botón "Mes siguiente" invoca la función incorrecta

## Goal completo

**Diagnóstico confirmado contra código real (09 ago 2026, verificado por
lectura directa antes de este handoff, no asumido):** en
`components/MesM1Mobile.tsx` línea 403-406, el botón etiquetado "Mes
siguiente" llama:

```tsx
onClick={() => patchar(mov.id, { tipo: "posponer", razonPostergacion: null })}
```

en vez de `tipo: "mover_mes_siguiente"` (la acción real que `PATCH
/api/mes/[mes]/movimientos/[id]` espera para ese caso, ver `CLAUDE.md` §API
routes). El botón hoy pospone el movimiento en la semana actual en vez de
moverlo al mes siguiente — bug de comportamiento, no solo de label.

Este ticket ya tenía este mismo diagnóstico anotado como hallazgo colateral
en `ESTADO.md` (línea 6276, sesión previa) pero nunca se había vertido al
ticket ni cerrado el ciclo DIAGNÓSTICO→CONSTRUCCIÓN — este handoff lo hace.

**No cubre:**
- Ningún otro botón de `MesM1Mobile.tsx` — solo el handler de "Mes
  siguiente" en esa vista.
- No toca `MesM1Desktop.tsx` — verificar por separado si tiene el mismo bug
  antes de asumir que está bien (fuera de alcance de este ticket).

## Definition of Done

- [x] `onClick` del botón "Mes siguiente" en `MesM1Mobile.tsx` pasa
      `tipo: "mover_mes_siguiente"` en vez de `tipo: "posponer"`.
- [x] `tsc --noEmit` limpio tras el fix.
- [x] Verificado en dev (o por lectura de `PATCH
      /api/mes/[mes]/movimientos/[id]`) que ese `tipo` mueve el movimiento
      al mes siguiente y no lo pospone — sin regresión en las demás
      acciones del mismo componente (ejecutar, no_aplica, reasignar_semana).

## Contexto / diagnóstico previo

- `ESTADO.md` línea 6276 (sesión previa): hallazgo colateral durante
  verificación de vigencia de los 9 tickets abiertos.
- Diagnóstico re-confirmado por lectura directa del código real el 09 ago
  2026, como parte del piloto de `brain/doctrine/ARQUITECTURA_MULTIAGENTE.md`
  (equipo de agentes por proyecto, Coder en Antigravity).

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(Ejecutado por Antigravity — 10 ago 2026)

**Qué se hizo:**
- `components/MesM1Mobile.tsx` línea 403: cambiado
  `{ tipo: "posponer", razonPostergacion: null }` →
  `{ tipo: "mover_mes_siguiente" }` en el `onClick` del botón "Mes siguiente".
- Se removió `razonPostergacion: null` porque no es un campo relevante para
  `mover_mes_siguiente` (la ruta PATCH lo ignora).
- Verificado por lectura de `app/api/mes/[mes]/movimientos/[id]/route.ts`
  que `mover_mes_siguiente` sin `semana` es válido para conceptos con
  `semanaDefault` distinto de `"variable"` — el handler calcula el mes
  siguiente y crea la fila de traslado correctamente.
- `tsc --noEmit` limpio.

**Fuera de alcance (explícito del ticket):**
- `MesM1Desktop.tsx` — no se verificó si tiene el mismo bug. El ticket
  dice explícitamente "verificar por separado si tiene el mismo bug antes
  de asumir que está bien (fuera de alcance de este ticket)".

**Deuda técnica encontrada:** ninguna nueva.

**Criterios de HALT activados:** ninguno.

Construcción terminada, pendiente de Tester.
