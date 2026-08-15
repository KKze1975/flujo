---
ticket_id: PANEL-BACKUP-INTEGRIDAD-01
orden: 34
estado: propuesto
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

- [ ] `tsc --noEmit` limpio.
- [ ] Endpoint nuevo (ej. `GET /api/admin/backup-status`) que replica la
      verificación manual ya usada (metadata únicamente, protocolo
      `sheet-safety`).
- [ ] Tarjeta `TarjetaIntegridadBackup` en `/admin/panel` (ver brief de
      diseño, usa `.fl-metric`).
- [ ] Verificado en dev/prod-solo-lectura: la tarjeta refleja el mismo
      resultado que ya se obtuvo manualmente en la sesión del 8 ago 2026 (85
      tabs, 14 fechas agrupadas, gap conocido en `2026-07-30`).
- [ ] Cero escrituras contra el Sheet de backup durante la construcción —
      es una ruta de solo lectura por diseño.

## Contexto / diagnóstico previo

- `BACKUP-NOCTURNO-01` (`tickets/BACKUP-NOCTURNO-01.md`) — completado, cierre
  verificado 8 ago 2026.
- Protocolo `sheet-safety` ya usado en esa misma sesión: `spreadsheets.get`
  (metadata) sin `values.get`, sin escritura.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda técnica
encontrada, criterios de parada activados)
