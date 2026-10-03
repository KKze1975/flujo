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
| Flujo | [Vault] Fase -1/0: módulo flujo de caja para Ángela María | en curso | 2026-09-30 | etnografía as-is completada | en espera | ESTADO.md, sesión 19 sept — nueva línea, integrada en Flujo; próximo paso: etnografía directa de Camilo con Ángela María (confirmado pivote de Consultorio) |
| Flujo | [Vault] APORTES-SEMANALES-01 — Arquitecto y tickets de construcción | hecha | 2026-10-01 | tickets creados contra spec + brief §7 | 4 tickets 01A–01D (`4f1386e`); 01A en producción `ed1aac2`, 30 sept | ESTADO.md, sesión 29 sept — `specs/APORTES-SEMANALES-01.md`, `design-handoff/APORTES-SEMANALES-01-brief.md` |
| Flujo | [Producto] APORTES-SEMANALES-01B — Ejecución M1: registrar el aporte del emprendimiento cuando llega (chip `E:`, modal, disponible NU Camilo) | pendiente | 2026-10-03 | aporte real registrable en Ejecución | 01A en producción, 01B GO tras 01A | `tickets/APORTES-SEMANALES-01B.md` |
| Flujo | [Producto] APORTES-SEMANALES-01C — vista semanal: recuadro del emprendimiento; decidir `agente_ejecucion` (antigravity vs claude-code) | pendiente | 2026-10-07 | recuadro visible para ambos actores | decisión de agente pendiente de Camilo | `tickets/APORTES-SEMANALES-01C.md` |
| Flujo | [Producto] APORTES-SEMANALES-01D — móvil, Home, `/meses`, `reset-mes` H11, cierre; decidir AporteCard (3ª barra o solo total) | pendiente | 2026-10-14 | aportes coherentes en todas las superficies | pregunta AporteCard abierta | `tickets/APORTES-SEMANALES-01D.md` |
| Flujo | [Operación] BALANCE-CIERRES-H5-01 — cierres H5 con comprometido canónico solo hacia adelante | pendiente | 2026-10-07 | decisión de Camilo sobre `total_comprometido` del plan | propuesto, sin construir | `tickets/BALANCE-CIERRES-H5-01.md`; ESTADO.md, cierre BALANCE-UNIFICADO-01 30 sept |
| Flujo | [Operación] I-22: `check-ticket.mjs` debe dar NO-GO (no advertencia) si una dependencia no está en INDICE.md | pendiente | 2026-10-07 | dependencia desconocida → NO-GO | invariante promovido, sin implementar | `INVARIANTS.md` I-22; `scripts/check-ticket.mjs` l.~121 |
| Flujo | [Operación] Línea de ideas: INDICE desactualizado (IDEAS-SCHEMA-01 aprobado vs IDEAS-CAPTURA-01 completado) | pendiente | 2026-10-07 | INDICE refleja el estado real | detectado por `check-ticket` tras PR #48 | ESTADO.md, cierre 30 sept |
| Flujo | [Operación] Deuda UI menor: etiqueta "Mes sig." en `pospuesto` dentro del mes (ConceptoBoard); "Disponible esta semana" difiere entre pantallas y HomeHub usa `Math.abs` | pendiente | 2026-10-14 | etiquetas y disponible coherentes | anotado en revisión visual | `tickets/BALANCE-UNIFICADO-01.md`, revisión visual 30 sept |
| Flujo | [Operación] SEMANAS-VIERNES-01 — regla del viernes en rama `feat/semanas-viernes-01`: Camilo termina carga manual de oct S1, luego QA de Angie (I-17), PR dev -> main y deploy (deploy SOLO después de la carga) | bloqueada | 2026-10-03 | mes = Σ semanas en 2026-09 y 2026-10 tras la carga; regla en producción | esperando carga manual | `tickets/SEMANAS-VIERNES-01.md`; ESTADO.md, cierre 1 oct |
| Flujo | [Producto] APORTES-SEMANALES: Camilo indicó (1 oct) que el aporte del emprendimiento va solo en Planeación; confirmar si se descarta 01B y qué se reajusta en 01C y 01D | bloqueada | 2026-10-03 | decisión explícita de Camilo sobre 01B/01C/01D | esperando confirmación | ESTADO.md, cierre 1 oct |

## Cerradas

| Proyecto | Iniciativa | Estado | Fecha de cierre | Puntero |
|---|---|---|---|---|
| Flujo | [Vault] Balance semana vs. mes con conceptos "solo este mes" (CDT $500.000) | hecha | 2026-09-28 | Fix `ea0f5f7`, PR #46 en producción (`5eb39c1`); Camilo confirmó el balance. Ver ESTADO.md, sesión DEBUGGING #2 |
| Flujo | [Vault] Deploy PR #45 a producción | hecha | 2026-09-28 | Falso bloqueo: deploy `dpl_9x5NFUF2…` READY en producción desde 2026-09-18, `flujo-dun.vercel.app` HTTP 200 con "Sugerir una mejora". Ver ESTADO.md, sesión DEBUGGING 28 sept |
| Flujo | [Vault] bug check-ticket.mjs: parseo con `dependencias: [X]` | hecha | 2026-09-30 | PR #48 (`51c192d`) en dev y en producción vía PR #49; 5 tickets verificados antes/después. Ver ESTADO.md, cierre 30 sept |
| Flujo | [Vault] Balance: movimientos con `semana=null` entran al total del mes y a ninguna semana | hecha | 2026-09-30 | BALANCE-UNIFICADO-01 en producción (`06cec8c`); 2 filas de julio corregidas en PROD; cuadre 2026-06..10 con sinSemana=0. Ver ESTADO.md, cierre 30 sept |
