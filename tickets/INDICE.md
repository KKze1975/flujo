# INDICE — Tickets Flujo

| orden | ticket_id | estado | tier | dependencias | commit | notas |
|---|---|---|---|---|---|---|
| 1 | BACKUP-NOCTURNO-01 | pendiente_confirmacion_humana | A | ninguna | `0ec9684` | Arquitectura de contenedor (tercer intento) verificada por lectura directa, DoD del loop cumplido. PR #30 mergeado a `main` 2026-07-22 (`bb3b64b`). Falta confirmar que el cron corrió en producción — rutina de verificación programada para 2026-07-23 04:15 Bogotá. |
| 2 | FIX-CREARMOVIMIENTOSMES-01 | completado | A | ninguna | `FIX-CREARMOVIMIENTOSMES-01-cierre` | Migrado a `values.get`+`values.update` determinístico. DoD verificado en dev vía 2 invocaciones reales consecutivas de `iniciar` (262→331→399 filas), cero sobrescritura, restaurado a 262. |
| 3 | FIX-RESET-COLUMNAS-01 | completado | A | ninguna | `FIX-RESET-COLUMNAS-01-cierre` | Bugs reales confirmados y corregidos: H3 (faltaba col. `imprevisto`) y H5 (faltaban `destino_remanente`/`remanente_ejecutado`) en `reset-mes/route.ts` y varios scripts. Probado en dev con marcadores cruzados — corrupción reproducida sin el fix, ausente con el fix. |
| 4 | DT-CIERRE-01 | propuesto | A | ninguna | | Reversión atómica de cierre de semana (H5+H2). Origen: incidente 24 jun 2026. |
| 5 | DT-M1M4-NULL-01 | diagnostico_listo | B | ninguna | `DT-M1M4-NULL-01-diagnostico` | Causa raíz confirmada por código (M1 excluye null, M4 lo incluye en toda semana no ejecutada; mover_mes_siguiente siempre escribe null). 3 opciones (B1/B2/B3) documentadas con archivos exactos — pendiente que Camilo elija una. |
| 6 | DT-MES-01 | completado | A | ninguna | `DT-MES-01-cierre` | Endpoint H3B ignoraba body.mes — fix de una línea aplicado y verificado en dev con 2 pruebas reales (con/sin body.mes), filas de prueba eliminadas después. |
| 7 | DT-SOBRE-TECHO-01 | propuesto | B | ninguna | | sobre_techo no persiste en H2 — requiere confirmar alcance antes de fix. |
| 8 | BUG-LABEL-MESM1-01 | propuesto | A | ninguna | | Sin diagnóstico de causa raíz confirmado — requiere reproducción antes de construir. |
| 9 | SEC-AUTH-ADMIN-RESET-01 | propuesto | B | ninguna | | /api/admin/reset-mes sin autenticación. Hallazgo AUDIT-FABLE-01. |
| 10 | INVARIANTS-GAP-01 | aprobado | A | ninguna | | Cerrar numeración I-13/I-14/I-16 en INVARIANTS.md real. Puramente documental. |
| 11 | TICKET-B-GUARDIA-01 | activo | A | ninguna | | P1/P2 ya commiteados (ee0b9e1, 291e8bd). Falta DoD bullet 2 + PR. Prerrequisito de facto: FIX-CREARMOVIMIENTOSMES-01. |
| 12 | UBER-01 | completado | A | ninguna | `UBER-01-cierre` | Verificado en Gmail real: [Business] NUNCA aparece (0 de ~201 correos, todo el historial 2020-2026) — supuesto refutado. Origen/destino confirmado en 2 tipos de servicio (Black, Flash Moto). Invalida el diseño de UBER-02. |
| 13 | UBER-02 | diagnostico_listo | B | UBER-01 | `UBER-02-diagnostico` | 3 opciones de esquema H3B documentadas (bolsillo especial / campo separado / tab aislado) — hallazgo clave: ningún total familiar excluye nada hoy, así que 1 y 2 requieren tocar cálculos existentes. Pendiente que Camilo elija. |
| 14 | UBER-03 | propuesto | A | ninguna | | Migración de Fondo transporte (TRANSPORTE_1748100037) a pago_fraccionado — construible en paralelo a UBER-01. |
| 15 | UBER-04 | bloqueado | A | UBER-01, UBER-02, UBER-03 | | Ingesta/parser Gmail de correos Uber → H3B, clasificación [Personal]/[Business]. Zoho Expense fuera de alcance. |

**Estados posibles:** `propuesto` \| `aprobado` \| `activo` \| `completado` \| `bloqueado` \| `descartado`

**Tiers:**
- `A` — autónomo completo, ejecutado con `/goal-a {ticket_id}`
- `B` — diagnóstico con HALT antes de escribir, ejecutado con `/goal-b {ticket_id}` (fix posterior vía `/goal-a` tras aprobación explícita)
- `C` — manual, sin `/goal`. **No existe comando automático para Tier C, por diseño.** Los tickets Tier C tocan escritura destructiva o rangos de Sheet sensibles y se ejecutan 100% manualmente, paso a paso, hasta que exista un backup verificado de producción (ver BACKUP-NOCTURNO-01).
