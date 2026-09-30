---
ticket_id: APORTES-SEMANALES-01A
orden: 45
estado: propuesto
tier: A
agente_ejecucion: claude-code
dependencias: BALANCE-UNIFICADO-01
actualizado_en: 2026-09-30
---

# APORTES-SEMANALES-01A — Aportes del emprendimiento: persistencia, fuente única y planificación M1 (mínimo usable)

Ticket 1 de 4 de `specs/APORTES-SEMANALES-01.md` (APROBADO por Camilo, 29 sept 2026). Diseño
aprobado: `design-handoff/APORTES-SEMANALES-01-brief.md` §2 y §7, mock
`design-handoff/APORTES-SEMANALES-01-mock.html`. **Tipo: código ejecutable.**
`agente_ejecucion: claude-code` por sensibilidad arquitectónica: agrega métodos a `IDataProvider`
(`lib/data/index.ts`, `sheets.ts`, `mock.ts`) y toca `MesM1Desktop`, consumido por varias vistas.
Es el ticket urgente: al cerrarlo Camilo puede ingresar y ver los aportes por semana en la
planificación de M1 y suman al balance (octubre 2026 empieza el 1 oct).

## Goal completo

1. **Persistencia (spec F1).** Entidad `AporteAdicional` (`id`, `mes`, `semana`, `monto`, `fecha`,
   `notas`), copia de `IngresoAngie` (H4B): **un monto por semana, upsert por semana**. Métodos
   `getAportesAdicionales(mes)`, `createAporteAdicional`, `updateAporteAdicional` en `IDataProvider`,
   `SheetsDataProvider` y `mock.ts`. **Ubicación en el Sheet (decisión de arquitectura, tomada
   aquí): pestaña nueva `H11` ("AportesEmprendimiento") con `ensureH11()`**, mismo patrón que
   `ensureH9`/`ensureH10`. NO se usa un rango nuevo dentro de `H4`: `H4!X:AE` es el rango legacy
   H4D (I-05, y `reset-mes` lo borra) y ya hubo un incidente de spillover entre rangos de H4
   (`fix-h4-spillover.mjs`). `ensureH11` verifica completitud del esquema (todas las columnas, no
   solo A1). Escritura solo con `values.update`/`values.append` con `insertDataOption:
   "INSERT_ROWS"`.
2. **API** `GET/PUT /api/ingresos/adicionales/[mes]` (copia de `app/api/ingresos/angie/[mes]/route.ts`).
   Diferencia con Angie, exigida por el spec: semana fuera de `semanasDeMes(mes)` o monto negativo
   o no numérico → **400** (Angie los ignora en silencio; aquí no). Monto 0 sobre una semana ya
   existente la deja en 0 (patrón Angie); monto 0 sobre semana sin fila no crea fila. Semana y mes
   validados server-side (I-01/I-02).
3. **Fuente única (spec F2, I-21).** Nueva función pura `ingresosPlaneadosDe(...)` (en
   `lib/utils/`) que, dadas las filas de Angie y del emprendimiento, devuelve
   `{ porSemana: Record<Semana, {angie, adicional, total}>, aportesPorSemana }`, donde
   `aportesPorSemana` (= angie + adicional por semana) se pasa al mapa extensible que ya acepta
   `calcularBalanceMes` (`lib/utils/balanceMes.ts`). **Se construye encima de `calcularBalanceMes`;
   prohibida una fórmula nueva de ingreso de mes o de semana.** El mes sigue siendo Σ semanas.
4. **Planificación M1 escritorio** (`components/MesM1Desktop.tsx`; primero trazar el import activo
   hasta `app/`, I-12 — `MesM1.tsx`/`VistaPlanificacion.tsx` están fuera del path activo). Réplica
   de las superficies de Angie según brief §2 y mock (etiquetas, orden y distintivo ya aprobados; no
   se inventan tokens ni clases, brief §1):
   - Sidebar de planificación: bloque **"Aportes emprendimiento"** justo debajo de "Aportes Angie",
     un input por semana de `semanasDeMes(mes)`, botón **"Guardar aportes emprendimiento"**; siempre
     visible, todas las semanas en 0 en meses sin aportes (P5).
   - "Balance mes": fila **"Aportes emprendimiento"** debajo de "Aportes Angie"; "Total disponible" =
     Camilo + Σ Angie + Σ emprendimiento.
   - "Por semana" (planificación): chip **`E:$monto`** junto al `A:`, en `--primary`, con badge "E".
   - El ingreso del mes/semana que muestra Ejecución ya sale de `balanceMes`; debe incluir el aporte
     (verificar, no reescribir). El chip `E:` y el botón de edición en Ejecución van en
     `APORTES-SEMANALES-01B`.
   - La página de M1 (`app/mes/[mes]/page.tsx` y wrapper) carga `getAportesAdicionales(mes)` y lo
     pasa como prop.
5. **Script de creación de la pestaña en PROD** `scripts/setup-h11-prod.mjs` (copia de
   `scripts/setup-h10-prod.mjs`, mismos guards DEV≠PROD, Sheet ID solo desde `.env.local`).
   **Se entrega pero NO se ejecuta contra PROD** (HALT 3, I-10): lo corre Camilo, o el Coder con su
   aprobación explícita, antes del merge (ver `APORTES-SEMANALES-01D`).

**Fuera de alcance:** Ejecución (`APORTES-SEMANALES-01B`), `VistaSemanal` (`-01C`), móvil, Home,
`/meses`, `reset-mes` (`-01D`); confirmar que un aporte llegó; línea por contrato; amarrar pagos a
aportes; tocar H4A/H4B/H2/H5A/H5B; el aporte de Angie y el de principio de mes de Camilo.

## Definition of Done

Todo en rama `dev`, Sheet **DEV** (I-04/I-08: ningún Sheet ID en archivos ni en la salida pegada).
Datos de prueba sintéticos en DEV (mes 2026-10 o sintético) **limpiados al cierre**.

- [ ] I-03 previo, solo lectura: `spreadsheets.get` sobre DEV pegado (solo títulos de pestañas) confirma que `H11` no existe antes de construir, y `H4!X:AE` sigue siendo H4D legacy sin tocar.
- [ ] `PUT /api/ingresos/adicionales/2026-10` con montos en S2 y S4 → 200; `GET` del mismo mes devuelve exactamente esas dos filas (respuestas HTTP pegadas).
- [ ] Segundo PUT sobre S2 actualiza la misma fila; GET pegado: una fila por semana, sin duplicados.
- [ ] PUT con semana fuera de `semanasDeMes(mes)` (ej. `S5` en un mes de 28 días) → 400; PUT con monto negativo → 400 (dos respuestas pegadas). PUT con monto 0 sobre S2 existente la deja en 0; monto 0 sobre semana sin fila no crea fila (GET pegado).
- [ ] `/admin/trazabilidad`: diff tras los PUT sin cambios en H2, H3B, H4A, H4B, H5A, H5B (diff pegado). Si trazabilidad no muestra la pestaña nueva, GET pegado como evidencia y se declara la limitación (no se modifica trazabilidad en este ticket).
- [ ] Función `ingresosPlaneadosDe` existe y se consume desde `MesM1Desktop`; `grep` pegado: no hay otra suma de aportes/ingreso de mes o semana en `MesM1Desktop.tsx` fuera de `balanceMes`/`ingresosPlaneadosDe`.
- [ ] Script de verificación (extender `scripts/verificar-balance-cuadre.ts` o hermano, salida pegada) con fixtures sintéticos: aporte adicional en semanas no consecutivas, mes con y sin S5, aporte 0, aportes de Angie y del emprendimiento en la misma semana, ingreso Camilo 0: `mes − Σ semanas = 0` para ingreso y comprometido, y el ingreso de una semana = Camilo (solo S1) + Angie + emprendimiento. Aserciones 58/58 previas siguen OK.
- [ ] Octubre en DEV con aportes: en planificación de escritorio **Σ `diferencia` por semana == `ingresoTotal − totalComprometido`** (diferencia 0, valores pegados).
- [ ] El aporte de S2 suma al disponible de S2 y no al de S1 ni S3 en "Por semana" de planificación (valores pegados).
- [ ] Sidebar: bloque "Aportes emprendimiento" con un input por semana y botón; guardar y recargar persiste (captura antes/después + GET pegado). Mes sin aportes (p. ej. DEV 2026-09): bloque visible con todas las semanas en 0 (captura). Bloque de Angie sin cambios visibles (captura antes/después).
- [ ] "Balance mes" muestra la fila "Aportes emprendimiento" y "Total disponible" = Camilo + Σ Angie + Σ emprendimiento (valores pegados). Chip `E:` visible junto a `A:` en "Por semana" de planificación (captura).
- [ ] `scripts/setup-h11-prod.mjs` existe y aborta si `PROD_GOOGLE_SHEET_ID` falta o coincide con DEV; **no ejecutado contra PROD** (declararlo explícitamente en las notas). Probado solo con `node --check` o dry-run que no escriba.
- [ ] `npx tsc --noEmit` limpio; `npm run lint` sin errores nuevos (salida pegada); `graphify update .`; ningún Sheet ID en archivos commiteados.
- [ ] Rama propia, PR contra `dev`, sin merge (I-11/I-17). Tester como subagente aparte (no verificación inline).

## Contexto / diagnóstico previo

- Molde: H4B/`IngresoAngie`, `ModalAporteAngie`, sidebar "Aportes Angie" de `MesM1Desktop` (spec H1/H1b).
- `BALANCE-UNIFICADO-01` (completado, `06cec8c`) dejó `calcularBalanceMes` con el mapa
  `aportesPorSemana: Semana -> monto` extensible: este ticket solo alimenta ese mapa.
- Riesgo I-21: cuatro copias históricas del ingreso del mes; aquí se cubre el path de M1 escritorio.
  Móvil, Home y `/meses` se alinean en `-01D`.
- Corrección H7 del spec (semana obligatoria al mover al mes siguiente) ya está en producción vía
  `BALANCE-UNIFICADO-01`; se re-verifica en `-01D`, no se reconstruye.

## Commit de cierre
(vacío hasta completar)

## Notas de ejecución
(vacío — lo llena el Coder al cerrar)
