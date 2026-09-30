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

- [~] I-03 previo, solo lectura: `spreadsheets.get` sobre DEV pegado (solo títulos de pestañas) confirma que `H11` no existe antes de construir, y `H4!X:AE` sigue siendo H4D legacy sin tocar.
  - **Tester PARCIAL:** al llegar el Tester H11 ya existía (creada por el Coder); no reproducible. Por lectura: H4!X1:AE1 sigue siendo H4D legacy (id_recarga,mes,semana,monto,...). Evidencia del Coder sin reproducir.
- [x] `PUT /api/ingresos/adicionales/2026-10` con montos en S2 y S4 → 200; `GET` del mismo mes devuelve exactamente esas dos filas (respuestas HTTP pegadas).
  - **Tester OK:** PUT S2=2M,S4=3M -> 200 con 2 filas; GET devuelve exactamente esas 2 (reproducido por Tester, dev local sobre DEV).
- [x] Segundo PUT sobre S2 actualiza la misma fila; GET pegado: una fila por semana, sin duplicados.
  - **Tester OK:** PUT S2=2.5M -> 200, misma id; GET: 2 filas, sin duplicados.
- [x] PUT con semana fuera de `semanasDeMes(mes)` (ej. `S5` en un mes de 28 días) → 400; PUT con monto negativo → 400 (dos respuestas pegadas). PUT con monto 0 sobre S2 existente la deja en 0; monto 0 sobre semana sin fila no crea fila (GET pegado).
  - **Tester OK:** 2026-02 S5 -> 400; monto -5 -> 400; monto "abc" -> 400; body mixto valido+invalido -> 400 sin escritura parcial; S2 existente con 0 -> queda 0; S3 sin fila con 0 -> no crea fila (GET).
- [x] `/admin/trazabilidad`: diff tras los PUT sin cambios en H2, H3B, H4A, H4B, H5A, H5B (diff pegado). Si trazabilidad no muestra la pestaña nueva, GET pegado como evidencia y se declara la limitación (no se modifica trazabilidad en este ticket).
  - **Tester OK:** Hashes sha256 por pestana (H1,H2,H4,H5,H3,H5B,H9,H10) identicos antes y despues de todos los PUT; H4X:AE1 igual. Limitacion declarada: trazabilidad no lista H11; no se abrio /admin/trazabilidad (requiere PIN), la evidencia es hash + GET.
- [x] Función `ingresosPlaneadosDe` existe y se consume desde `MesM1Desktop`; `grep` pegado: no hay otra suma de aportes/ingreso de mes o semana en `MesM1Desktop.tsx` fuera de `balanceMes`/`ingresosPlaneadosDe`.
  - **Tester OK:** grep: unicos reduce en MesM1Desktop.tsx son de movimientos (l.418, 490, 571, 911, 944), ninguno suma aportes/ingreso; aportes salen de ingresosPlaneadosDe -> calcularBalanceMes.
- [x] Script de verificación (extender `scripts/verificar-balance-cuadre.ts` o hermano, salida pegada) con fixtures sintéticos: aporte adicional en semanas no consecutivas, mes con y sin S5, aporte 0, aportes de Angie y del emprendimiento en la misma semana, ingreso Camilo 0: `mes − Σ semanas = 0` para ingreso y comprometido, y el ingreso de una semana = Camilo (solo S1) + Angie + emprendimiento. Aserciones 58/58 previas siguen OK.
  - **Tester OK:** node --experimental-strip-types scripts/verificar-balance-cuadre.ts -> 140/140 aserciones ok (reproducido).
- [x] Octubre en DEV con aportes: en planificación de escritorio **Σ `diferencia` por semana == `ingresoTotal − totalComprometido`** (diferencia 0, valores pegados).
  - **Tester OK:** Preview Vercel: S2=2M,S3=1M,S4=3M: Balance mes Total 6.000.000, comprometido 50.000, Diferencia 5.950.000; cadena por semana S2 +1.9M, S3 +3.0M, S4 +6.0M, S5 +6.0M (compacto) == 5.95M. Sept: 23.000.000-19.493.207=3.506.793 == S5 +3.5M.
- [x] El aporte de S2 suma al disponible de S2 y no al de S1 ni S3 en "Por semana" de planificación (valores pegados).
  - **Tester OK:** Con S2=2M,S4=3M: S1 E:$0 +$0; S2 E:$2.0M +$1.9M; S3 E:$0 +$1.9M (arrastre, no aporte propio).
- [x] Sidebar: bloque "Aportes emprendimiento" con un input por semana y botón; guardar y recargar persiste (captura antes/después + GET pegado). Mes sin aportes (p. ej. DEV 2026-09): bloque visible con todas las semanas en 0 (captura). Bloque de Angie sin cambios visibles (captura antes/después).
  - **Tester OK:** Preview Vercel (Chrome real): bloque con 5 inputs y boton; tipeado S3=1000000 + click real en 'Guardar aportes emprendimiento' -> fila en H11 (GET Sheet), recarga conserva 2M/1M/3M. 2026-09: bloque visible todo vacio; Angie intacto (20M/2M/1M). Sin capturas guardadas a disco: verificado por screenshot + texto DOM.
- [x] "Balance mes" muestra la fila "Aportes emprendimiento" y "Total disponible" = Camilo + Σ Angie + Σ emprendimiento (valores pegados). Chip `E:` visible junto a `A:` en "Por semana" de planificación (captura).
  - **Tester OK:** Fila 'Aportes emprendimiento' bajo Aportes Angie; Total disponible 6.000.000 = 0 + 0 + 6.000.000; chip E: en Por semana junto a A: (screenshot + DOM).
- [x] `scripts/setup-h11-prod.mjs` existe y aborta si `PROD_GOOGLE_SHEET_ID` falta o coincide con DEV; **no ejecutado contra PROD** (declararlo explícitamente en las notas). Probado solo con `node --check` o dry-run que no escriba.
  - **Tester OK:** node --check OK; revisado: aborta si falta PROD_GOOGLE_SHEET_ID o == DEV; dry-run usa scope readonly; Tester NO lo ejecuto (ni dry-run ni --apply).
- [~] `npx tsc --noEmit` limpio; `npm run lint` sin errores nuevos (salida pegada); `graphify update .`; ningún Sheet ID en archivos commiteados.
  - **Tester PARCIAL:** tsc limpio (exit 0) y npm run build OK, reproducidos. No verificados: npm run lint global, graphify (no instalado).
- [~] Rama propia, PR contra `dev`, sin merge (I-11/I-17). Tester como subagente aparte (no verificación inline).
  - **Tester PARCIAL:** Rama propia sin PR ni merge (HEAD c9ebc0a); PR fuera del alcance del Tester. Tester es agente aparte.

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
**Construcción terminada, pendiente de Tester.** Rama `feat/aportes-semanales-01a`. Sin PR, sin merge. Casillas del DoD sin marcar (las marca el Tester).

### Construido
- `lib/data/types.ts`, `index.ts`, `sheets.ts`, `mock.ts`: `AporteAdicional` + `getAportesAdicionales` / `createAporteAdicional` / `updateAporteAdicional`. Pestaña `H11` (headers `id_aporte, mes, semana, monto, fecha, notas`), `ensureH11()` crea la pestaña si falta y verifica TODOS los headers (A1:F1), no solo A1. Escritura solo `values.update` / `values.append` con `INSERT_ROWS`.
- `app/api/ingresos/adicionales/[mes]/route.ts`: GET/PUT. Valida todo antes de escribir; semana fuera de `semanasDeMes(mes)`, monto negativo o no numérico -> 400. Monto 0 sobre fila existente la deja en 0; sobre semana sin fila no crea fila.
- `lib/utils/ingresosPlaneados.ts`: `ingresosPlaneadosDe(angie, adicionales)` -> `{ porSemana, aportesPorSemana, totales }`. `aportesPorSemana` alimenta `calcularBalanceMes`; no hay fórmula nueva. Un aporte en semana fuera del mes no se descarta (el cuadre falla en voz alta). No importa `balanceMes` (agrupación local) para poder cargarse desde `verificar-balance-cuadre.ts` sin alias `@/`.
- `components/MesM1Desktop.tsx` (path activo verificado: `app/mes/[mes]/page.tsx` -> `MesM1ClientWrapper` -> `MesM1Desktop`): sidebar "Aportes emprendimiento" bajo el de Angie, fila en "Balance mes", chip `E:` (`--primary`) en "Por semana" de planificación, badge "E" con tokens existentes. Ejecución: el disponible por semana ahora suma Angie + emprendimiento (antes solo Angie); el "↪ remanente entrante" descuenta también el aporte. Sin chip `E:` ni botón en Ejecución (van en 01B).
- `app/mes/[mes]/page.tsx` y `MesM1ClientWrapper.tsx`: cargan `getAportesAdicionales(mes)` y lo pasan como prop.
- `scripts/setup-h11-prod.mjs`: dry-run por defecto (scope readonly), `--apply` escribe. Guards: aborta si falta `PROD_GOOGLE_SHEET_ID` o coincide con DEV. No imprime Sheet IDs. **NO ejecutado contra PROD**, solo `node --check`.
- `scripts/verificar-balance-cuadre.ts`: fixtures A01 (semanas no consecutivas, mes con y sin S5, aporte 0, Angie+emprendimiento misma semana, Camilo 0, aporte en S5 de mes sin S5 falla en voz alta).

### Evidencia (DEV)
- I-03: `spreadsheets.get` DEV antes: `H1, H2, H4, H5, H3, H5B, H9, H10` (sin H11); `H4!X1:AE1` = headers H4D legacy (`id_recarga, mes, semana, monto, ...`), sin tocar.
- PUT 2026-10 S2=2.000.000, S4=3.000.000 -> 200; GET devuelve exactamente esas 2 filas. Segundo PUT S2=2.500.000 actualiza la misma fila (GET: 2 filas, sin duplicados). `2026-02` S5 -> 400; monto -5 -> 400; monto "abc" -> 400. Monto 0 en S2 existente -> queda 0; monto 0 en S3 sin fila -> no crea fila.
- Hash/filas de H2, H3B(H3), H4A, H4B, H4C, H5A, H5B idénticos antes y después de los PUT. Limitación: `/admin/trazabilidad` no lista la pestaña H11 (no se modificó trazabilidad en este ticket); evidencia = GET + hashes.
- `node --experimental-strip-types scripts/verificar-balance-cuadre.ts`: 140/140 (baseline previo medido: 66/66, no 58/58; las previas siguen OK).
- Render SSR de `MesM1Desktop` (página temporal, borrada) sobre DEV 2026-10 (S2=2M, S4=3M; sin ingreso Camilo ni Angie): Balance mes: Comprometido 50.000, Aportes emprendimiento 5.000.000, Total disponible 5.000.000, Diferencia 4.950.000. Por semana: S2 `E:$2.0M` (+1.9M), S4 `E:$3.0M`; S1 y S3 `E:$0`; la diferencia encadenada de S5 (+4.95M) == ingresoTotal - totalComprometido. 2026-09 (sin aportes): bloque visible con las 5 semanas vacías (placeholder 0), Angie sin cambios (S1 2.000.000, S2 1.000.000), `E:$0` en todas.
- Datos de prueba H11 en DEV limpiados (queda solo el header).
- `npx tsc --noEmit` limpio; `npm run build` OK; `eslint` sobre los archivos tocados: 0 errores (warnings preexistentes). `npm run lint` global tiene 196 errores preexistentes en otros archivos.

### Desviaciones / pendientes
- No se pudieron tomar capturas de pantalla: el Chrome de la extensión no alcanza el dev server de Crostini. Se sustituyó por render SSR del componente (arriba). El Tester debería revisar visualmente en escritorio.
- `graphify update .` no ejecutado: `graphify` no está instalado en este entorno.
- Guardar y recargar persiste: verificado por GET tras PUT y por hidratación de los inputs desde la prop en el render; no se probó el click real del botón en navegador.
- Ejecución cambia visiblemente (el disponible de cada semana ahora incluye el aporte del emprendimiento); es lo pedido ("debe incluir el aporte").
- Antes del merge, Camilo: `node scripts/setup-h11-prod.mjs` (dry-run) y luego `node scripts/setup-h11-prod.mjs --apply` (o lo hace el Coder con su OK explícito, ver 01D).



## Verificación del Tester (30 sept 2026, agente aparte, sobre c9ebc0a)
**Veredicto: CUMPLE-PARCIAL (sin NO CUMPLE funcional; un bug menor abierto).** `[x]` verificado, `[~]` parcial (motivo en cada casilla).

Sospecha de convergencia cómoda: mis resultados coinciden con el reporte del Coder sin fricción; por eso se reprodujeron PUT/GET, hashes, build, verificación y la UI en navegador real (no SSR), y se probaron casos que el Coder no (body mixto, duplicados).

Cobertura visual: SI, Chrome real sobre el preview de Vercel de la rama (deployment READY de c9ebc0a, equipo camilo-s-projects10, proyecto flujo). Comparte Sheet con DEV: los aportes que escribí por API aparecieron en la UI. No se guardaron capturas a disco. El dev server local no era alcanzable desde el Chrome.

**Bug (no corregido) B1, severidad baja:** un PUT cuyo body repite la misma semana (ej. `[{S1,10},{S1,20}]`) sobre una semana sin fila crea DOS filas (S1 duplicada), porque `existing` no se refresca dentro del bucle de `route.ts`. Viola "una fila por semana". La UI nunca envia duplicados (un input por semana), por eso no afecta el flujo normal; `ingresosPlaneadosDe` sumaria ambas. Sugerencia: dedupe/400 por semana repetida en el body.

**Observaciones:** (1) `ensureH11` crea la pestana en runtime si falta (patron ensureH9/H10): en PROD eso ocurriria en el primer request si Camilo no corre antes `setup-h11-prod.mjs`; ya cubierto por 01D. (2) `npm run lint` global (196 errores preexistentes) y `graphify update .` no verificados. (3) Ejecucion: el disponible por semana ahora suma el aporte (declarado por el Coder); no se inspecciono la pestana Ejecucion en navegador, es alcance de verificacion de 01B.

Limpieza: H11 DEV queda solo con header (`[["id_aporte","mes","semana","monto","fecha","notas"]]`) y hashes de las otras pestanas iguales al estado inicial. Nada escrito en PROD.
