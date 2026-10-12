---
ticket_id: APORTES-SEMANALES-01D
orden: 48
estado: propuesto
tier: A
agente_ejecucion: claude-code
dependencias: APORTES-SEMANALES-01A, APORTES-SEMANALES-01B, APORTES-SEMANALES-01C
actualizado_en: 2026-09-30
---

# APORTES-SEMANALES-01D — Móvil, Home, /meses, reset-mes y cierre técnico

Ticket 4 de 4 de `specs/APORTES-SEMANALES-01.md`. Cierra el resto de las superficies "igual que
Angie" (H1b 6-8), garantiza la única fuente de ingreso (F2/I-21) y prepara el paso a producción
(F7). **Tipo: código ejecutable.** `agente_ejecucion: claude-code`: toca `app/page.tsx`,
`app/api/meses/route.ts` y `MesM1Mobile`, consumidos por varias pantallas.

## Goal completo

1. **Móvil (`MesM1Mobile`)**: "Ingresos del mes" = mismo total que escritorio; el aporte del
   emprendimiento solo suma, sin bloque propio (brief §2, última fila). Obtenido de
   `balanceMes.mes.ingreso` alimentado por `ingresosPlaneadosDe` (`-01A`).
2. **Home** (`app/page.tsx` + `HomeHub`): el total de ingresos y `disponibleSemana` incluyen el
   aporte del emprendimiento de la semana (misma función compartida). **`AporteCard`**: el spec
   exige que incluya el emprendimiento pero ni spec ni brief diseñan cómo se ve. Si Camilo ya
   respondió la pregunta abierta (ver reporte del Arquitecto), aplicar su respuesta; si no, **HALT
   parcial**: dejar `AporteCard` visualmente igual, solo con el total corregido, y anotar la
   pregunta. No inventar un tercer segmento.
3. **`/meses`** (`app/api/meses/route.ts` → `PantallaMeses`): `totalIngresos` incluye el aporte del
   emprendimiento; agregar a la respuesta el campo `ingresoEmprendimiento`, junto a `ingresoAngie`.
4. **Única fuente (spec F2, I-21):** `grep` de todos los consumidores (`MesM1Desktop`, `MesM1Mobile`,
   `app/page.tsx`, `app/api/meses/route.ts` y los que aparezcan) consumen
   `ingresosPlaneadosDe`/`calcularBalanceMes`; ninguno suma ingresos por su cuenta. `MesM1.tsx` y
   `m1/VistaPlanificacion.tsx` siguen fuera del path activo (I-12): solo confirmar por trazado de
   imports que sigue siendo así.
5. **`reset-mes`** (`app/api/admin/reset-mes/route.ts`) y el texto de confirmación de
   `/admin/trazabilidad`: incluir la pestaña `H11` (borrar filas del mes con el mismo patrón de las
   otras), con ancho de columnas verificado contra el esquema real (candidato "ancho real al
   limpiar"). Sin esto un reset de mes deja aportes huérfanos.
6. **F5 — re-verificación, no construcción.** La corrección H7 del spec (semana obligatoria al pasar
   un pago al mes siguiente) ya está en producción por `BALANCE-UNIFICADO-01` (`06cec8c`):
   `mover_mes_siguiente` sin semana → 400 en el servidor y picker de semana en `VistaSemanal`,
   `MesM1Mobile` y `VistaPlanificacion`. Este ticket solo la vuelve a verificar contra el código
   actual (posponer S2→S3 y mover al mes siguiente con semana elegida) y NO reconstruye nada; si
   la re-verificación falla, HALT.
7. **Cierre técnico (F7):** `scripts/setup-h11-prod.mjs` (entregado en `-01A`) listo y con
   instrucciones; **el paso de PROD queda como gate humano** (HALT 3, I-10): la pestaña `H11` debe
   existir en PROD, con encabezados leídos de vuelta, **antes** del merge a `main`. PR `dev` → `main`
   solo con aprobación explícita de Angie (I-17); el agente nunca mergea.

**Fuera de alcance:** rediseño visual de `AporteCard` sin decisión de Camilo; arreglar el ingreso
suelto ya anotado en septiembre; reclasificar filas históricas; cambios en el aporte de Angie.

## Definition of Done

Rama `dev`, Sheet **DEV**; datos sintéticos limpiados al cierre.

- [ ] Octubre en DEV con aportes de Angie y del emprendimiento: "Ingresos del mes" de `MesM1Mobile` == `ingresoTotal` de escritorio (dos valores pegados).
- [ ] Home: total de ingresos y `disponibleSemana` incluyen el emprendimiento (captura + valores pegados); `AporteCard` según respuesta de Camilo, o sin cambio visual si sigue pendiente (declarado en las notas).
- [ ] `GET /api/meses` (respuesta pegada, sin Sheet IDs): `totalIngresos` = Camilo + Angie + emprendimiento para un mes de prueba; un mes sin aportes sigue igual que antes (valores antes/después).
- [ ] F2: `grep` pegado: todos los consumidores de ingreso de mes/semana usan la función compartida; no queda `reduce` de ingresos por su cuenta fuera de `balanceMes.ts`/`ingresosPlaneados` (salvo excepciones justificadas por escrito).
- [ ] F2: octubre en DEV, **Σ `diferencia` por semana == `ingresoTotal − totalComprometido`** en escritorio (valores pegados) y `verificar-balance-cuadre.ts` sigue OK (salida pegada; `--prod-readonly` solo lectura, Sheet ID desde variable de entorno, sin imprimirlo).
- [ ] `reset-mes` sobre un mes sintético de DEV borra también las filas de `H11` de ese mes (conteos leídos de vuelta, pegados); texto de confirmación de trazabilidad actualizado.
- [ ] F5 re-verificación pegada: (a) `PATCH … {tipo:"posponer"}` de un pago de S2 a S3 → fila con `semana: S3`, estado `pospuesto`; (b) `PATCH … {tipo:"mover_mes_siguiente"}` sin `semana` → 400; (c) con semana válida del mes siguiente → 200, fila creada con esa `semana` (diff de `/admin/trazabilidad` pegado); (d) Σ semanas == total del mes siguiente (`balanceMes`). Datos sintéticos limpiados.
- [ ] F7: `npx tsc --noEmit` limpio y `npm run lint` sin errores nuevos (salida pegada); pre-commit hook sin Sheet ID de PROD (I-04/I-08); `graphify update .`.
- [ ] **Gate humano (no lo cierra el agente):** Camilo ejecuta (o autoriza explícitamente) `node scripts/setup-h11-prod.mjs`; encabezados de `H11` leídos de vuelta de PROD y pegados **antes** del merge. Sin esa evidencia el ticket queda `completado_parcial`.
- [ ] PR `dev` → `main` abierto con descripción del cambio de esquema; **merge solo con aprobación explícita de Angie** (I-17). Nunca autónomo.
- [ ] Tester como subagente aparte.

## Contexto / diagnóstico previo

- Spec H4 (≥4 copias del ingreso del mes) y riesgo I-21: dos descuadres previos (28 sept CDT).
- `DT-CICLO-OPERATIVO-UNIFICADO-01` (`cron/uber-parser`) sigue abierto y no es de este ticket.
- Orden real de urgencia: `-01A` primero (octubre); este ticket puede esperar, salvo el gate de PROD
  que Camilo necesita antes de cargar aportes en la app de producción.

## Commit de cierre
(vacío hasta completar)

## Notas de ejecución
(vacío — lo llena el Coder al cerrar)
