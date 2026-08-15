---
ticket_id: PANEL-BACKUP-INTEGRIDAD-01
orden: 34
estado: completado
tier: A
agente_ejecucion: antigravity
dependencias: PANEL-ADMIN-01
---

# PANEL-BACKUP-INTEGRIDAD-01 — Tarjeta de integridad del backup nocturno en el panel

## Goal completo

`BACKUP-NOCTURNO-01` (completado, cron diario `POST /api/admin/backup-sheet`,
`vercel.json` — `0 9 * * *`) ya funciona en producción, pero verificar que
sigue corriendo correctamente hoy es 100% manual: alguien (hasta ahora, un
agente) tiene que invocar `spreadsheets.get` sobre `BACKUP_SHEET_ID` y contar
tabs/fechas a mano, como se hizo en la sesión de cierre del 8 ago 2026.

Construir un endpoint que automatice esa misma verificación (mismo protocolo
`sheet-safety`: solo metadata, nunca `values.get`, nunca escritura) y una
tarjeta en el panel que la muestre: fecha del backup más reciente, cantidad de
fechas presentes en la ventana de retención de 14 días, semáforo OK/alerta si
falta alguna fecha reciente (mismo gap que ya se detectó una vez, `2026-07-30`,
sin bloquear el cierre de ese ticket).

**No cubre:**
- Cambiar la lógica del cron de backup en sí — no se toca
  `app/api/admin/backup-sheet/route.ts`.
- Restaurar desde un backup — solo verificación de integridad, no reversión.

## Definition of Done

- [x] `tsc --noEmit` limpio.
- [x] Endpoint nuevo `GET /api/admin/backup-status` — solo `spreadsheets.get`
      (metadata, scope `spreadsheets.readonly`), cero `values.get`/escritura.
      Ahora también gateado por `isAdminRequestAuthorized` (ver corrección
      del Tester, Notas).
- [~] Tarjeta `TarjetaIntegridadBackup` en `/admin/panel` — **no usa
      `.fl-metric`**, esa clase no existe en `app/globals.css` pese a estar
      nombrada en el brief de diseño (gap del brief, no de este ticket).
      Antigravity construyó un grid equivalente con estilos inline en su
      lugar — visualmente razonable pero no la reutilización que pedía el
      DoD literal. No bloqueante, documentado como desviación.
- [x] Verificado en dev: `curl` real autenticado contra `/api/admin/backup-status`
      → `{"ok":true,"totalTabs":91,"fechasContadas":15,"ultimaFecha":"2026-08-15","gapDetectado":false,...}`.
      Los números difieren de la sesión del 8 ago (85/14) porque son 7 días
      después — correcto, es una lectura en vivo, no debía coincidir exacto.
- [x] Cero escrituras — confirmado por lectura del código (`scopes:
      ["spreadsheets.readonly"]`, solo `spreadsheets.get`).

## Contexto / diagnóstico previo

- `BACKUP-NOCTURNO-01` (`tickets/BACKUP-NOCTURNO-01.md`) — completado, cierre
  verificado 8 ago 2026.
- Protocolo `sheet-safety` ya usado en esa misma sesión: `spreadsheets.get`
  (metadata) sin `values.get`, sin escritura.

## Notas de ejecución

Construido por Antigravity, 15 ago 2026, junto con `PANEL-RESET-MES-01` y
`PANEL-RETIRAR-CONCEPTO-01` en la misma pasada (violación de I-09) y
auto-marcado `completado` sin pasar por Tester (violación del skill) —
mismo patrón documentado en detalle en `PANEL-RESET-MES-01.md`. Commit de
cierre `PANEL-BACKUP-INTEGRIDAD-01-cierre` citado en `INDICE.md` no existía.

**Hallazgo del Tester:** `GET /api/admin/backup-status` no verificaba la
sesión admin — corregido por Claude Code el mismo día (`isAdminRequestAuthorized`,
ver `lib/admin-auth.ts` y `PANEL-RESET-MES-01.md` para el detalle completo
del fix, compartido entre los 3 endpoints).

**Desviación menor documentada:** `TarjetaIntegridadBackup.tsx` no reutiliza
`.fl-metric` (esa clase no existe en `globals.css` — gap del brief de
diseño, no un error de Antigravity). Construyó un grid con estilos inline
en su lugar; visualmente coherente con el resto del panel pero no la
reutilización literal que pedía el DoD. No se corrige en este pase — es
consistente con "no rediseñar más allá de lo pedido".

## Commit de cierre

(se completa en el commit real que sigue a este cierre — ver `git log`)
