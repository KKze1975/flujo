# INDICE — Tickets Flujo

| orden | ticket_id | estado | tier | dependencias | commit | notas |
|---|---|---|---|---|---|---|
| 1 | BACKUP-NOCTURNO-01 | pendiente_confirmacion_humana | A | ninguna | `0ec9684` | Arquitectura de contenedor (tercer intento) verificada por lectura directa, DoD del loop cumplido. PR #30 mergeado a `main` 2026-07-22 (`bb3b64b`). Falta confirmar que el cron corrió en producción — rutina de verificación programada para 2026-07-23 04:15 Bogotá. |
| 2 | FIX-CREARMOVIMIENTOSMES-01 | aprobado | A | ninguna | | Bug de pérdida de filas (`values.append` sin `INSERT_ROWS`) confirmado en dev, nunca construido pese a aprobación previa (verificado 9 jul 2026). Migrado de la narrativa de `ESTADO.md` a ticket formal 22 jul 2026. |

**Estados posibles:** `propuesto` \| `aprobado` \| `activo` \| `completado` \| `bloqueado` \| `descartado`

**Tiers:**
- `A` — autónomo completo, ejecutado con `/goal-a {ticket_id}`
- `B` — diagnóstico con HALT antes de escribir, ejecutado con `/goal-b {ticket_id}` (fix posterior vía `/goal-a` tras aprobación explícita)
- `C` — manual, sin `/goal`. **No existe comando automático para Tier C, por diseño.** Los tickets Tier C tocan escritura destructiva o rangos de Sheet sensibles y se ejecutan 100% manualmente, paso a paso, hasta que exista un backup verificado de producción (ver BACKUP-NOCTURNO-01).
