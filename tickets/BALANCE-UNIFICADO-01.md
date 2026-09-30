---
ticket_id: BALANCE-UNIFICADO-01
orden: 43
estado: activo
tier: A
agente_ejecucion: claude-code
dependencias: ninguna
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
(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda técnica encontrada, criterios de parada activados)

<!-- Al agregar este ticket a tickets/INDICE.md, la fila DEBE incluir la
columna agente_ejecucion con el mismo valor que el frontmatter de arriba —
ver nota en INDICE.md, "Columna agente_ejecucion" (15 ago 2026). -->
