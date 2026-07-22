# INDICE — Tickets Flujo

| orden | ticket_id | estado | tier | dependencias | commit | notas |
|---|---|---|---|---|---|---|
| 1 | BACKUP-NOCTURNO-01 | pendiente_confirmacion_humana | A | ninguna | `0ec9684` | Arquitectura de contenedor (tercer intento) verificada por lectura directa, DoD del loop cumplido. PR #30 mergeado a `main` 2026-07-22 (`bb3b64b`). Falta confirmar que el cron corrió en producción — rutina de verificación programada para 2026-07-23 04:15 Bogotá. |
| 2 | FIX-CREARMOVIMIENTOSMES-01 | aprobado | A | ninguna | | Bug de pérdida de filas (`values.append` sin `INSERT_ROWS`) confirmado en dev, nunca construido pese a aprobación previa (verificado 9 jul 2026). Migrado de la narrativa de `ESTADO.md` a ticket formal 22 jul 2026. |
| 3 | FIX-RESET-COLUMNAS-01 | aprobado | A | ninguna | | Rangos de reset desalineados tras T39/T40 y DT-HEADER-H2-01. Migrado de narrativa ESTADO.md 22 jul 2026. |
| 4 | DT-CIERRE-01 | propuesto | A | ninguna | | Reversión atómica de cierre de semana (H5+H2). Origen: incidente 24 jun 2026. |
| 5 | DT-M1M4-NULL-01 | propuesto | B | ninguna | | semana=null tratado opuesto en M1 vs M4. Requiere decisión de diseño (B1/B2/B3) antes de construir. |
| 6 | DT-MES-01 | aprobado | A | ninguna | | Endpoint H3B ignora body.mes — fix de una línea ya especificado. |
| 7 | DT-SOBRE-TECHO-01 | propuesto | B | ninguna | | sobre_techo no persiste en H2 — requiere confirmar alcance antes de fix. |
| 8 | BUG-LABEL-MESM1-01 | propuesto | A | ninguna | | Sin diagnóstico de causa raíz confirmado — requiere reproducción antes de construir. |
| 9 | SEC-AUTH-ADMIN-RESET-01 | propuesto | B | ninguna | | /api/admin/reset-mes sin autenticación. Hallazgo AUDIT-FABLE-01. |
| 10 | INVARIANTS-GAP-01 | aprobado | A | ninguna | | Cerrar numeración I-13/I-14/I-16 en INVARIANTS.md real. Puramente documental. |
| 11 | TICKET-B-GUARDIA-01 | activo | A | ninguna | | P1/P2 ya commiteados (ee0b9e1, 291e8bd). Falta DoD bullet 2 + PR. Prerrequisito de facto: FIX-CREARMOVIMIENTOSMES-01. |

**Estados posibles:** `propuesto` \| `aprobado` \| `activo` \| `completado` \| `bloqueado` \| `descartado`

**Tiers:**
- `A` — autónomo completo, ejecutado con `/goal-a {ticket_id}`
- `B` — diagnóstico con HALT antes de escribir, ejecutado con `/goal-b {ticket_id}` (fix posterior vía `/goal-a` tras aprobación explícita)
- `C` — manual, sin `/goal`. **No existe comando automático para Tier C, por diseño.** Los tickets Tier C tocan escritura destructiva o rangos de Sheet sensibles y se ejecutan 100% manualmente, paso a paso, hasta que exista un backup verificado de producción (ver BACKUP-NOCTURNO-01).
