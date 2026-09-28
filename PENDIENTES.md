# Pendientes en curso — memoria prospectiva de Flujo

> Extensión del mecanismo de `scripts/INICIATIVAS.md` del vault a este proyecto (25 sept 2026,
> decisión de Camilo). Mismo motivo: el bloque "Estado accionable" de `ESTADO.md` se reemplaza
> con cada entrada nueva — lo que no se copia a mano se pierde. Este archivo no se reemplaza,
> solo se agrega o se cambia el estado de una fila.

## Reglas

1. Una iniciativa solo sale de forma explícita. Estado `hecha` o `descartada: <razón>`. Nunca se
   borra una fila: se cambia su estado. Las cerradas se pueden mover a "Cerradas" al final.
2. Toda iniciativa activa tiene fecha de próxima revisión (`AAAA-MM-DD`). Sin fecha no entra.
3. Vencida = la fecha ya pasó. El tablero del vault (`scripts/centro-de-control.py`) la muestra
   como 🧟 Vencida, urgencia Alta.
4. `/cierre` agrega o actualiza filas de lo que la sesión abrió o movió.
5. Estados válidos: `pendiente`, `en curso`, `bloqueada`, `hecha`, `descartada: <razón>`.

## Activas

| Proyecto | Iniciativa | Estado | Próxima revisión | Métrica objetivo | Resultado medido | Puntero |
|---|---|---|---|---|---|---|
| Flujo | [Vault] SEC-EXPOSICION-PUBLICA-01 — decisión Camilo A/B/C | bloqueada | 2026-10-02 | decisión explícita | esperando | ESTADO.md, sesión 19 sept — operación bloqueada; requiere input de Camilo sobre opción elegida |
| Flujo | [Vault] bug check-ticket.mjs: parseo con `dependencias: [X]` | pendiente | 2026-09-30 | bug no reaparece | no verificado aún | ESTADO.md, sesión 19 sept — error en parseo de arrays en campo; categorizado como reactivo/incidentes |
| Flujo | [Vault] Balance: movimientos con `semana=null` entran al total del mes y a ninguna semana | pendiente | 2026-10-05 | mes = suma de semanas | no hay casos en octubre | ESTADO.md, sesión DEBUGGING #2 28 sept — mismo origen de doble fórmula que el bug de CDT |
| Flujo | [Vault] Fase -1/0: módulo flujo de caja para Ángela María | en curso | 2026-09-30 | etnografía as-is completada | en espera | ESTADO.md, sesión 19 sept — nueva línea, integrada en Flujo; próximo paso: etnografía directa de Camilo con Ángela María (confirmado pivote de Consultorio) |

## Cerradas

| Proyecto | Iniciativa | Estado | Fecha de cierre | Puntero |
|---|---|---|---|---|
| Flujo | [Vault] Balance semana vs. mes con conceptos "solo este mes" (CDT $500.000) | hecha | 2026-09-28 | Fix `ea0f5f7`, PR #46 en producción (`5eb39c1`); Camilo confirmó el balance. Ver ESTADO.md, sesión DEBUGGING #2 |
| Flujo | [Vault] Deploy PR #45 a producción | hecha | 2026-09-28 | Falso bloqueo: deploy `dpl_9x5NFUF2…` READY en producción desde 2026-09-18, `flujo-dun.vercel.app` HTTP 200 con "Sugerir una mejora". Ver ESTADO.md, sesión DEBUGGING 28 sept |
