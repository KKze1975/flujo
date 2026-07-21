# INDICE — Tickets Flujo

| orden | ticket_id | estado | tier | dependencias | commit | notas |
|---|---|---|---|---|---|---|
| 1 | BACKUP-NOCTURNO-01 | aprobado | A | ninguna | | Backup nocturno de solo lectura sobre prod, prerrequisito de cualquier `/goal` con autonomía sobre prod |

**Estados posibles:** `propuesto` \| `aprobado` \| `activo` \| `completado` \| `bloqueado` \| `descartado`

**Tiers:**
- `A` — autónomo completo, ejecutado con `/goal-a {ticket_id}`
- `B` — diagnóstico con HALT antes de escribir, ejecutado con `/goal-b {ticket_id}` (fix posterior vía `/goal-a` tras aprobación explícita)
- `C` — manual, sin `/goal`. **No existe comando automático para Tier C, por diseño.** Los tickets Tier C tocan escritura destructiva o rangos de Sheet sensibles y se ejecutan 100% manualmente, paso a paso, hasta que exista un backup verificado de producción (ver BACKUP-NOCTURNO-01).
