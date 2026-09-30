---
ticket_id: BALANCE-UNIFICADO-01
orden: 43
estado: activo
tier: A
agente_ejecucion: claude-code
dependencias: ninguna
rol_activo: tester
paso_actual: "verificación terminada; reporte al Chief of Staff (D1/D2 pendientes de Camilo)"
actualizado_en: 2026-09-30T09:05:00-05:00
necesita_aprobacion: baja
---

# BALANCE-UNIFICADO-01 — Balance mes = suma de semanas, una sola función, `semana` nunca `null`

## Goal completo

Origen: sesión DEBUGGING #2 (28 sept 2026) y decisiones de Camilo en sesión DISEÑO del vault
(30 sept 2026): **(a)** `semana` nunca es `null`; **(i)** este ticket va ANTES del Arquitecto de
`APORTES-SEMANALES-01`, que construirá encima de la función unificada.

1. **Función única de balance** (nuevo `lib/utils/balanceMes.ts`, pura, sin React) que calcula,
   por semana, `ingreso` y `comprometido` (egresos) a partir de `movs`, el ingreso de Camilo y los
   aportes por semana (mapa `Semana -> monto`, extensible sin tocar la función). El **mes** es
   siempre la **suma de las semanas** (`mes = Σ semanas`), nunca una segunda fórmula. Reemplaza las
   dos fórmulas independientes de `components/MesM1Desktop.tsx` (`totalComprometido`/`ingresoTotal`/
   `diferenciaTotal` del mes vs. `balancePlanificacion`/`balanceSemanas` por semana). Reutiliza
   `remanenteEncadenadoPorSemana` (`lib/utils/balanceSemanal.ts`) sin duplicarlo.
   Definición canónica de "comprometido": movimientos cuyo `estado` NO está en
   `no_aplica | pospuesto | pospuesto_mes_siguiente` (la misma que ya usa el total del mes),
   agrupados por `semana`, sumando `montoPresupuestado`. Si aplicarla cambia un número visible de
   Planificación o Ejecución, el Coder lo registra como desviación y NO decide.
2. **Prueba de cuadre**: `mes - Σ semanas = 0` para ingresos y para comprometido; la función expone
   un cubo `sinSemana` (movimientos con `semana` vacía) que **debe ser 0**; si no lo es, el cuadre
   FALLA en voz alta (no se reparte en silencio).
3. **Semana obligatoria server-side**: todo camino que crea o mueve un movimiento responde
   **400** si falta semana: `mover_mes_siguiente` en `app/api/mes/[mes]/movimientos/[id]/route.ts`
   (hoy `body.semana ?? null`, exige semana solo si `semanaDefault === "variable"`), y cualquier otro
   camino que el Coder inventarie (`iniciar`, `conceptos`, POST de `/api/mes/[mes]`, `ejecutar`
   sobre movimiento con `semana` nula). Los llamadores del cliente sin semana envían una:
   `components/VistaSemanal.tsx` (~l.511), `components/m1/VistaPlanificacion.tsx` (~l.325),
   `components/MesM1Mobile.tsx` (l.403) y los que aparezcan. La semana destino la elige Camilo
   (patrón ya existente en `components/m1/ConceptoBoard.tsx`, picker de semana). `semana` deja de ser
   `Semana | null` en el tipo de filas nuevas (I-16: sin `null` como sentinel).
4. **Corrección única de filas `semana` vacía ya existentes en PROD** — diagnóstico y plan abajo.
   **Ejecutarla requiere aprobación explícita de Camilo**; este ticket entrega el script (dry-run
   por defecto) pero NO lo corre contra PROD sin ese OK.

**Fuera de alcance:** aportes del emprendimiento (`APORTES-SEMANALES-01`), cambios de esquema en el
Sheet, rediseño visual, migrar `sinSemana` en DEV.

## Definition of Done

- [ ] `lib/utils/balanceMes.ts` existe; `MesM1Desktop.tsx` deja de calcular ingreso/comprometido del mes con fórmula propia: el mes se obtiene sumando las semanas devueltas por esa función (grep pegado: no queda otro `reduce` de comprometido/ingreso del mes).
- [ ] Script de prueba (`scripts/verificar-balance-cuadre.ts`, patrón `verificar-ciclo-semanas.ts`, salida pegada) con fixtures sintéticos: cuadre `mes - Σsemanas = 0` para ingresos y comprometido en los casos: mes con S5, mes sin S5, movimientos `pospuesto`/`no_aplica`/`pospuesto_mes_siguiente`, aportes en semanas no consecutivas, ingreso Camilo 0; y un caso con `semana` vacía que hace FALLAR el cuadre (`sinSemana > 0`) — el fallo esperado se demuestra.
- [ ] Mismo script corrido en **solo lectura contra PROD** (Sheet ID desde `PROD_GOOGLE_SHEET_ID`, scope readonly, protocolo `sheet-safety`): para cada mes, cuadre = 0 y `sinSemana = 0` **después** de la corrección aprobada; antes de ella, reporta exactamente las 2 filas nulas conocidas.
- [ ] `PATCH …/movimientos/[id]` `tipo: mover_mes_siguiente` sin `semana` → **400** (respuesta HTTP pegada); con semana válida del mes destino → 200 y la fila nueva en H2 (DEV) trae la semana enviada, leída de vuelta. Igual para cada otro camino inventariado (tabla camino → respuesta 400 pegada).
- [ ] Ningún llamador del cliente envía `mover_mes_siguiente` sin semana (grep pegado); el flujo de `VistaSemanal`/`MesM1Mobile` abre picker de semana del mes siguiente.
- [ ] Script de corrección única `scripts/fix-semana-vacia-h2.mjs`: dry-run por defecto, `--apply` explícito, target declarado (DEV|PROD), muestra el contenido actual de cada fila antes de tocarla, lee de vuelta tras escribir. Dry-run contra PROD pegado; `--apply` sobre PROD NO ejecutado sin aprobación de Camilo.
- [ ] `npx tsc --noEmit` limpio; `npm run lint` sin errores nuevos.
- [ ] Rama propia, PR abierto contra `dev`; sin merge (I-11/I-17).

## Contexto / diagnóstico previo

Diagnóstico de datos, solo lectura contra PROD (30 sept 2026, sheet "Presupuesto Bot 2026", tab H2,
382 filas, meses 2026-06 a 2026-10): **2 filas con `semana` vacía**, ambas julio, `estado: ejecutado`,
`ejecutor: angie`, con `fecha_ejecucion` (semana derivable sin ambigüedad):

| id | mes | concepto | fecha_ejecucion | semana propuesta | fuente |
|---|---|---|---|---|---|
| MOV_1782767829728 | 2026-07 | PS Plus ($60.000) | 2026-07-01 | S1 | `semanaDeFechaEnMes` |
| MOV_1782767835789 | 2026-07 | Uber One ($16.000) | 2026-07-05 | S1 | `semanaDeFechaEnMes` |

Julio 2026 empieza miércoles; primer lunes = día 6; el tramo previo (días 1-5) es S1 (`stub` no
absorbido por junio, porque el primer lunes es > 3). Cada concepto tiene además una fila S5
`pospuesto` en julio; las dos filas nulas son ejecuciones adicionales. `MesM1Desktop` ya las cubre
hoy con un fallback `semanaFromFecha` solo en Ejecución; Planificación y el total del mes no.

Spec relacionado: `specs/APORTES-SEMANALES-01.md` (H6, H7, I-16, candidato "única fuente de verdad
mes/semana"). Este ticket resuelve lo que ese spec dejó fuera: filas nulas ya existentes y
unificación de `comprometido` mes vs. semana.

## Commit de cierre
(vacío hasta completar)

## Notas de ejecución

**Construcción terminada, pendiente de Tester.** Rama `feat/balance-unificado-01`. Sin push, sin PR (el PR contra `dev` lo abre quien corresponda tras el Tester). Casillas del DoD sin marcar: las marca el Tester.

### Desviaciones que esperan decisión de Camilo (criterio HALT del ticket, no decididas por el Coder)

**D1 — La definición canónica de "comprometido" cambiaría un número visible de Ejecución.** Comprobado por lectura contra PROD (script de comparación, solo lectura), por semana y mes:
- Planificación por semana (fórmula por concepto) == canónico en TODOS los meses 2026-06..2026-10 → migrado a `balanceMes` sin cambio visible.
- Ejecución por semana (`balanceSemanas`, `comprometido = items.reduce(...)` sin filtrar estado) != canónico en casi todas las semanas (cuenta filas `pospuesto`/`no_aplica`/`pospuesto_mes_siguiente`). Ej. 2026-06 S4: canónico 1.669.996 vs Ejecución 2.945.996; 2026-07 S1: 8.586.383 vs 8.841.383. Además ese `comprometido` entra en `restar` del encadenado de Ejecución, así que también mueve `diferencia` y el remanente.
- **Decisión tomada por el Coder: NO tocar la fórmula por semana de Ejecución** (`MesM1Desktop.tsx` `balanceSemanas`, reduces de ~l.439/445/453 quedan como estaban). Solo el balance del MES sale de `balanceMes`. Camilo decide si Ejecución adopta la definición canónica (cambia números visibles) o se mantiene.

**D2 — Efecto visible transitorio en julio 2026 (PROD) hasta aplicar la corrección.** Al ser `mes = Σ semanas`, el total "Comprometido" de Planificación de julio pasa de 19.371.207 a 19.295.207 (−76.000, las 2 filas con semana vacía) y el panel muestra "El balance no cuadra: ...". Es la consecuencia buscada del ticket (no repartir en silencio), y se resuelve al correr `fix-semana-vacia-h2.mjs --apply` sobre PROD (requiere OK de Camilo; NO ejecutado).

**D3 (borde latente, sin dato hoy) — `iniciar` con concepto NO semanal de `semana_default` variable.** No hay semana inequívoca. En vez de elegir una, `POST /api/mes/[mes]/iniciar` responde 400 sin escribir nada y lista los conceptos. En H1 (PROD y DEV) hoy ningún concepto no semanal es `variable` (los 7 `variable` son semanales, que ya reciben una fila por semana), así que no cambia el comportamiento actual. Idem traslados heredados (`pospuesto_mes_siguiente`) con semana vacía. Camilo confirma si prefiere otro tratamiento.

Sin choque detectado con `specs/APORTES-SEMANALES-01.md` (`aportesPorSemana` es el mapa extensible `Semana -> monto` que la función ya acepta).

### Archivos tocados
Nuevos: `lib/utils/balanceMes.ts`, `scripts/verificar-balance-cuadre.ts`, `scripts/fix-semana-vacia-h2.mjs`.
Modificados (del ticket): `components/MesM1Desktop.tsx`, `components/VistaSemanal.tsx`, `components/m1/VistaPlanificacion.tsx`, `components/MesM1Mobile.tsx`, `app/api/mes/[mes]/movimientos/[id]/route.ts`, `app/api/mes/[mes]/iniciar/route.ts`.
**Archivos extra declarados** (mínimos, para cumplir "`semana` deja de ser `Semana | null` en filas nuevas" y el picker): `lib/utils/fecha.ts` (helper `mesSiguienteDe`), `lib/data/types.ts` (tipo `NuevoMovimiento`), `lib/data/index.ts`, `lib/data/sheets.ts`, `lib/data/mock.ts` (firma de `crearMovimientosMes`), `app/api/mes/[mes]/conceptos/route.ts` (tipo). `Movimiento.semana` sigue siendo `Semana | null` porque se leen filas heredadas.

### Inventario de caminos que crean/mueven movimientos H2
| Camino | Hoy (antes) | Ahora |
|---|---|---|
| `PATCH …/movimientos/[id]` `mover_mes_siguiente` | `body.semana ?? null`; exigía semana solo si concepto `variable` | 400 si falta `semana` o es inválida para el mes destino; escribe la semana enviada |
| `PATCH …` `ejecutar` sobre mov con `semana` nula | dejaba `semana` nula si el body no traía | 400 si mov.semana nula y no viene `semana`; 400 si inválida |
| `PATCH …` `posponer` sobre mov con `semana` nula | dejaba nula sin `nuevaSemana` | 400 sin `nuevaSemana` si mov.semana nula |
| `PATCH …` `reasignar_semana` | ya validaba con `semanasDeMes` | sin cambio (400 sin semana verificado) |
| `POST /api/mes/[mes]/iniciar` | `variable` no semanal -> `semana: null`; carryover copiaba `m.semana` (podía ser null) | 400 sin escribir si hay variable no semanal o traslado sin semana; tipo `NuevoMovimiento` |
| `POST /api/mes/[mes]/conceptos` | ya exigía `semana` en S1-S4 (400 si no) | sin cambio funcional; tipo `NuevoMovimiento` |
| `PATCH …/cerrar-semana` (`updateMovimiento` de bolsillos) | no toca `semana` | sin cambio |
| `POST /api/admin/reset-mes` | solo `clear` de H2 | sin cambio (no crea) |
| `registro/sin-concepto`, `cron/uber-parser` | escriben H3B, no H2 | fuera de alcance |
Llamadores del cliente con `mover_mes_siguiente` sin semana: `VistaSemanal.tsx`, `m1/VistaPlanificacion.tsx`, `MesM1Mobile.tsx` -> ahora abren picker con `semanasDeMes(mesSiguienteDe(mes))` (incluye S5 si el mes destino la tiene); `ConceptoBoard.tsx` ya tenía picker (S1-S4, sin cambio). Nota: en `VistaPlanificacion` los conceptos `semanal` (varias filas pendientes) se mueven todos a la semana elegida.
Residual conocido: los llamadores de `ejecutar` no envían `semana`; si aparece una fila heredada pendiente con semana nula, el 400 lo hace visible (hoy PROD no tiene ninguna pendiente con semana nula).

### Evidencia por casilla del DoD

**1. `balanceMes.ts` + `MesM1Desktop` sin fórmula propia del mes.**
```
$ grep -n "calcularBalanceMes\|balanceMes\." components/MesM1Desktop.tsx
474: const balanceMes = useMemo(() => calcularBalanceMes({
485: const ingresoTotal = balanceMes.mes.ingreso;
505: const totalComprometido = balanceMes.mes.comprometido;
506: const diferenciaTotal = balanceMes.mes.diferencia;
514: const comprometido = balanceMes.semanas.find((b) => b.semana === s)?.comprometido ?? 0;
```
El `reduce` de comprometido/ingreso DEL MES desapareció. Quedan los `reduce` por semana de Ejecución (l.439/445/453) por D1.

**2. Fixtures sintéticos** (`node --experimental-strip-types scripts/verificar-balance-cuadre.ts`): `51/51 aserciones ok.` Casos: mes con S5 (comprometido 350, ingreso 1015), mes sin S5 (400/520), pospuesto/no_aplica/pospuesto_mes_siguiente (140/200), aportes S1-S3-S5 (10/109), ingreso Camilo 0 (100/30); todos `mes - Σsemanas = 0` y `cuadre.ok = true`. Fallo esperado demostrado:
```
ok     semana vacía: cuadre.ok es false (fallo esperado, no se reparte en silencio) = false
       (fallo esperado demostrado: ["comprometido: referencia - Σ semanas = 60","1 movimiento(s) con semana vacía (comprometido 60)"])
ok     S5 en mes sin S5: cuadre.ok es false = false
```

**3. PROD solo lectura, ANTES de la corrección** (`--prod-readonly`, scope readonly; Sheet ID no impreso):
```
2026-06: ... cuadre(ing=0, comp=0) sinSemana=0   ok
2026-07: movs=79 mes.comprometido=19295207 ... cuadre(ing=0, comp=76000) sinSemana=2
       fila sin semana: MOV_1782767829728 (fila H2 75) concepto="PS Plus" estado=ejecutado monto=60000
       fila sin semana: MOV_1782767835789 (fila H2 76) concepto="Uber One" estado=ejecutado monto=16000
FALLO  PROD 2026-07: comprometido: referencia - Σ semanas = 76000; 2 movimiento(s) con semana vacía
2026-08 / 2026-09 / 2026-10: cuadre(0,0) sinSemana=0   ok
55/56 aserciones ok. 1 fallo(s).
```
Exactamente las 2 filas nulas conocidas. "Después de la corrección aprobada": PENDIENTE (la corrección no se aplicó a PROD).

**4. Endpoint, DEV** (dev server local puerto 3457, `GOOGLE_SHEET_ID`=DEV, datos sintéticos mes 2027-03..07, limpiados después; H1 DEV tocado y restaurado):
```
POST iniciar 2027-03 -> 201, total 77, filas con semana nula: 0
mover_mes_siguiente SIN semana        -> HTTP 400 {"error":"Falta semana destino: todo traslado al mes siguiente exige una semana."}
mover_mes_siguiente semana=null       -> HTTP 400 (mismo mensaje)
mover_mes_siguiente semana=S9         -> HTTP 400 {"error":"semana inválida."}
mover_mes_siguiente semana=S3         -> HTTP 200 {"estado":"pospuesto_mes_siguiente"}
GET mes 2027-04 (lectura de vuelta H2): [('Arriendo y Administración','S3','pendiente')]   <- la semana enviada quedó en H2
ejecutar sobre mov semana nula SIN semana -> 400 "Este movimiento no tiene semana asignada; envía `semana` para ejecutarlo."
ejecutar semana=S9 -> 400 "semana inválida." | semana=S2 -> 200 {estado:ejecutado, semana:S2}
posponer sobre mov semana nula SIN nuevaSemana -> 400 "...envía `nuevaSemana` para posponerlo." | nuevaSemana=S4 -> 200 {estado:pospuesto, semana:S4}
lectura de vuelta H2: [('MOV_TEST_NULL_1','S2','ejecutado'), ('MOV_TEST_NULL_2','S4','pospuesto')]
POST iniciar 2027-06 con traslado previo sin semana -> 400 {"error":"No se puede iniciar el mes: hay movimientos sin semana inequívoca...","conceptosSemanaVariable":[],"trasladosSinSemana":["sintetico traslado sin semana"]}   (GET 2027-06 -> 404: nada escrito)
POST iniciar 2027-07 con concepto no semanal `variable` (H1 DEV) -> 400 {...,"conceptosSemanaVariable":["Arriendo y Administración"],...}   (GET 2027-07 -> 404: nada escrito)
POST /api/mes/2027-03/conceptos sin semana -> 400 | semana=S5 -> 400 ("semana inválida.")
PATCH reasignar_semana sin semana -> 400
```
Limpieza DEV: H2 82 filas (todas 2027-xx) borradas -> queda solo el header (DEV H2 estaba vacío antes de las pruebas); H9 (3 eventos 2027-xx) borrados; `semanaDefault` del concepto de H1 DEV restaurado a S1 (200 leído en la respuesta).

**5. Ningún llamador envía `mover_mes_siguiente` sin semana.**
```
$ grep -rn 'tipo: "mover_mes_siguiente" }' components app  ->  (ninguno)
components/MesM1Mobile.tsx:403 ... semana: s | components/VistaSemanal.tsx:514 ... semana: semanaMesSiguiente
components/m1/VistaPlanificacion.tsx:327 ... semana: semanaDestino | components/m1/ConceptoBoard.tsx:226/863/874 ... semana
```
Los pickers de UI se verificaron por tsc/lint, NO se recorrieron en navegador (aplicado pero NO verificado visualmente).

**6. `fix-semana-vacia-h2.mjs`.** Dry-run PROD (readonly): 2 candidatas, contenido actual de cada fila impreso, propuesta `S1` y `S1` (`semanaDeFechaEnMes` de 2026-07-01 y 2026-07-05); `Resumen: candidatas=2 escritas=0 omitidas=0 modo=dry-run target=PROD`. `--target` obligatorio (sin él: "Falta --target DEV|PROD"); `--apply` sobre PROD exige además `--confirmo-prod` (rechazado sin él: verificado). `--apply` probado en DEV con fila sintética: `-> ESCRITA. Lectura de vuelta: id=MOV_TEST_NULL_4 mes=2027-03 semana=S2`, y fila sin fecha derivable OMITIDA sin tocar. Revalida id y celda vacía justo antes de escribir; escribe solo la celda `semana`. `--apply` sobre PROD: NO ejecutado.

**7. `npx tsc --noEmit`: exit 0. `npm run lint`: 196 errores / 117 warnings a nivel repo (preexistentes); en los 7 archivos tocados: 3 errores / 27 warnings vs. 3 errores / 28 warnings en HEAD (mismos 3 errores preexistentes: `MesM1Mobile` setState-in-effect y 2 de memoización en `VistaPlanificacion`); 0 errores en los 3 archivos nuevos.

**8. Rama/PR:** rama `feat/balance-unificado-01`, commit local sin push; PR contra `dev` pendiente (sin merge, I-11/I-17).

### Deuda técnica encontrada (no tocada)
- `iniciar`: `carryover` copia `semana` del mes anterior; si era S5 y el mes destino no tiene S5 la fila queda fuera de las semanas (ahora el cuadre lo delata como `semanaFueraDeMes`).
- `balanceSemanas` (Ejecución) conserva el fallback `semanaFromFecha` para filas con semana nula; tras la corrección PROD queda sin uso práctico.

<!-- Al agregar este ticket a tickets/INDICE.md, la fila DEBE incluir la
columna agente_ejecucion con el mismo valor que el frontmatter de arriba —
ver nota en INDICE.md, "Columna agente_ejecucion" (15 ago 2026). -->
