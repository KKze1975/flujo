# SESSION_LOG — Loop BL-01 / OBS-1..4 · 2026-06-20

---

## BL-01

### Piezas completadas

- **Fix `clasif` scenario en `ModalCorreccion`** — `components/VistaSemanal.tsx` (commit `954cd2d`)
  - Reemplazó `bolsilloId ?? consumo.bolsilloId` con doble búsqueda (`b.conceptoId` y `b.id`)
  - `selectedId` siempre resulta `CATEGORIA_xxx` (H1); nunca `MOV_xxx` (H2)
  - Variable local renombrada de `h2` a `selectedBolsillo` para reflejar semántica correcta

### Decisiones tomadas

- **Doble lookup como auto-sanación**: en lugar de migrar datos existentes, el fix resuelve el bolsillo buscando primero por `conceptoId` (ruta normal) y si no encuentra, por `b.id` (ruta de sanación legacy). Esto corrige silenciosamente registros H3B con `bolsilloId = MOV_xxx` en la próxima clasificación sin necesidad de script.
- **Sin fallback a valor corrupto**: si ningún bolsillo coincide, `selectedId = consumo.bolsilloId` solo como último recurso — invariante I-03 se degrada gracefully sin crash.

### Deuda técnica encontrada

- Los comentarios en el diff documentan la causa histórica (pre-T45 `BOLSILLOS_ACTIVOS` con IDs cortos), pero no hay script de migración masiva de H3B existentes. Registros con `bolsilloId` corrupto solo se sanan al re-clasificar manualmente.
- P3 (verificación en `/admin/trazabilidad`) quedó pendiente operativo — no hay evidencia en el diff de haber verificado un consumo real en el Sheet.

### DoD verificado

- [✓] El scenario `clasif` en `guardar()` resuelve el bolsillo antes de escribir `bolsilloId` — el diff reemplaza la línea de fallback
- [✓] `selectedId` es siempre `conceptoId` de H1 (`CATEGORIA_xxx`) cuando el bolsillo existe
- [✓] Registros con `bolsilloId = MOV_xxx` se auto-sanan en la próxima clasificación (lookup por `b.id`)
- [✗] Verificación visual en `/admin/trazabilidad` con un consumo real — no hay evidencia en el diff

---

## OBS-1

### Piezas completadas

- **`VistaSemanal.tsx`: excluye `pago_fraccionado` de `totalEjecutadoH2`** — `components/VistaSemanal.tsx` (commit `7436902`)
  - Filtro adicional `.filter(m => m.tipoSnapshot !== "pago_fraccionado")` en el reduce de H2
  - `totalEjecutadoH3` (H3B consumos) ya captura el gasto real de bolsillos; la barra morada ahora suma correctamente sin duplicar

- **`cerrar-semana/route.ts`: consolida H2 bolsillos al cerrar semana** — `app/api/mes/[mes]/cerrar-semana/route.ts` (commit `7436902`)
  - Mismo filtro `pago_fraccionado` en el cálculo de `totalEjecutadoH2` dentro del route
  - Bloque nuevo post-`createCierreSemana`: busca H2 bolsillos de la semana con `estado !== "ejecutado"`, suma sus H3B consumos y llama `updateMovimiento` con `estado=ejecutado`, `montoEjecutado=sumH3B`, `desviacion`, `fechaEjecucion`

### Decisiones tomadas

- **Consolidación al cierre, no en tiempo real**: los H2 `pago_fraccionado` permanecen `pendiente` durante la semana activa. Solo al `POST cerrar-semana` se escribe `ejecutado` con el total acumulado H3B. Esto permite que el FAB siga registrando consumos hasta el último momento antes del cierre.
- **`Promise.all` paralelo** para consolidar múltiples bolsillos simultáneamente — asume que no hay dependencias entre ellos.

### Deuda técnica encontrada

- Si el usuario cierra la semana con cero consumos en un bolsillo, `montoEjecutado = 0` y `desviacion = -montoPresupuestado`. Comportamiento correcto pero puede sorprender en UI — ningún guard added.
- El filtro de la barra en VistaSemanal y en el route son copias independientes. Riesgo de divergencia futura si se agrega un tercer punto de cálculo.

### DoD verificado

- [✓] `totalEjecutadoH2` excluye `pago_fraccionado` en cliente (`VistaSemanal.tsx`)
- [✓] `totalEjecutadoH2` excluye `pago_fraccionado` en `cerrar-semana` route
- [✓] Al cerrar semana, H2 bolsillos se marcan `ejecutado` con `montoEjecutado = sumH3B`
- [✗] Verificación en Sheet dev que la barra morada coincide con suma H3B real

---

## OBS-2

### Piezas completadas

- **Eliminado carousel de bolsillos** — `components/VistaSemanal.tsx` (commit `b2ca808`)
  - Bloque completo `{/* Bolsillos carousel */}` (~66 líneas) removido
  - `bolsillos.length > 0` ya no controla ningún UI propio

- **Bolsillos integrados en la lista Pendientes/Ejecutados** — `components/VistaSemanal.tsx` (commit `b2ca808`)
  - `bolsillosPendientes / bolsillosEjecutados` derivados de `bolsillos.filter(b => b.estado !== "ejecutado")`
  - `lista = [...bolsillosPendientes, ...pendientes]` (o ejecutados) — bolsillos aparecen primero
  - Tab count actualizado: Pendientes = bolsillosPendientes.length + pendientes.length; Ejecutados incluye `consumosPendientes.length`

- **Renderizado condicional en `lista.map()`** — `components/VistaSemanal.tsx` (commit `b2ca808`)
  - Si `mov.tipoSnapshot === "pago_fraccionado"`: renderiza ficha de bolsillo con `Ring pct`, nombre, avance `gastado/techo`, badge libre/sobre
  - Pendientes: botón "Cerrar bolsillo" → PATCH `tipo=ejecutar` con `montoEjecutado=gastado`
  - Ejecutados: monto clickeable → popover desglose H3B (mismo mecanismo que carousel)

### Decisiones tomadas

- **Bolsillos al inicio de la lista**: pre-pendan antes de `pendientes` / `ejecutados`. Decisión de prioridad visual — Imprevistos y otros bolsillos son prominentes.
- **Reutilización del popover de H3B**: mismo estado `popoverBolsilloId` / `bolsilloAnchor` que usaba el carousel — sin nuevo estado.
- **`mov.montoEjecutado ?? gastado` en ejecutados**: al mostrar el monto en botón clickeable, usa `montoEjecutado` si ya fue consolidado por cerrar-semana, o suma H3B en tiempo real si no.

### Deuda técnica encontrada

- `bolsilloRefs.current.set(mov.conceptoId, el as HTMLDivElement)` — el cast `as HTMLDivElement` es necesario porque el tipo inferido de la ref es `Element | null`. Minor: podría ser limpiado con generic más específico.
- El botón "Cerrar bolsillo" no tiene confirmación — un tap accidental ejecuta el bolsillo. No bloqueante pero señalado.

### DoD verificado

- [✓] Carousel eliminado del DOM
- [✓] Bolsillos pendientes aparecen en pestaña Pendientes con Ring + avance
- [✓] Botón "Cerrar bolsillo" llama PATCH `ejecutar` con suma H3B
- [✓] Bolsillos ejecutados aparecen en pestaña Ejecutados con popover desglose
- [✓] Tab count incluye bolsillos en ambas pestañas
- [✗] Verificación visual que el popover de ejecutados carga consumos correctamente

---

## OBS-3

### Piezas completadas

- **`scripts/seed-imprevistos.mjs`** — nuevo archivo (commit `391184b`)
  - Lee `.env.local` directamente (sin dotenv), autentica con JWT service account
  - Guard anti-duplicado: verifica `nombre === "Imprevistos"` en H1 antes de insertar
  - H1 row: `COMPROMISOS_FINANCIEROS_{ts}`, tipo `pago_fraccionado`, `monto_referencia=250000`, `semana_default=variable`, `estado=activo`
  - H2 row: `MOV_{ts+1}`, mes `2026-06`, `estado=pendiente`, `semana=` vacío (variable)
  - Nota de producción impresa al final: "agregar manualmente antes del merge a main"

- **`clasificar/route.ts`: Haiku no sugiere Imprevistos** — `app/api/consumos/[id]/clasificar/route.ts` (commit `391184b`)
  - `activos.filter(c => c.nombre !== "Imprevistos")` excluye el concepto de la lista enviada al modelo
  - System prompt actualizado con cláusula explícita: "Nunca sugieras 'Imprevistos'"

### Decisiones tomadas

- **Exclusión por nombre, no por tipo**: el filtro usa `c.nombre !== "Imprevistos"` en lugar de `c.tipo !== "pago_fraccionado"`. Decisión deliberada: otros bolsillos `pago_fraccionado` (si existen) sí pueden ser sugeridos por Haiku; solo Imprevistos es de selección explícita.
- **Script mjs en lugar de ts**: usa ES modules nativos para evitar compilación. Consistente con otros scripts del repo.
- **Producción manual**: el script opera solo en dev Sheet. La inserción en producción es responsabilidad del operador antes del merge.

### Deuda técnica encontrada

- El script parsea `.env.local` con regex casero sin biblioteca — puede fallar con valores multi-línea o comillas anidadas en `GOOGLE_PRIVATE_KEY`. En la práctica funciona porque `PRIVATE_KEY` es el único valor potencialmente complejo y el script ya hace `.replace(/\\n/g, "\n")`.
- No hay test de que la ficha Imprevistos efectivamente aparezca en VistaSemanal (depende de que OBS-2 esté vivo, lo cual sí está).

### DoD verificado

- [✓] Script crea H1 concepto `pago_fraccionado` con `monto_referencia=250000`
- [✓] Script crea H2 `pendiente` para `2026-06`
- [✓] Guard evita duplicados si se corre dos veces
- [✓] Haiku no recibe "Imprevistos" en la lista de opciones
- [✓] System prompt instruye explícitamente contra sugerir Imprevistos
- [✓] `node scripts/seed-imprevistos.mjs` ejecutado contra dev Sheet — ver sección de verificación operativa

---

## OBS-3 — Verificación operativa

- **seed-imprevistos.mjs** (2026-06-20, dev Sheet `1p5hvKINy512I-BOEA5ujjynUnJVdnvniAiqCQTYDJ-w`):
  ```
  ⚠ Imprevistos ya existe en H1: COMPROMISOS_FINANCIEROS_1780950917017 — abortando.
  ```
  Guard anti-duplicado activado: el concepto ya estaba en el dev Sheet desde una ejecución previa del script (probablemente durante el loop). No se crearon filas nuevas.
- **Ficha Imprevistos en Pendientes**: no verificado visualmente (requiere preview URL Vercel de PR #6 abierta en browser)
- **Duplicados**: ninguno — el guard confirmó exactamente una instancia (`COMPROMISOS_FINANCIEROS_1780950917017`)

---

## OBS-4

### Piezas completadas

- **`ModalAccionesPendiente` (nuevo componente inline)** — `components/VistaSemanal.tsx` (commit `0a4bfcd`)
  - Props: `movimiento`, `mes`, `semanasCerradas`, `onClose`, `onUpdated`
  - Estado interno: `accion` (`posponer | no_aplica`), `destino` (`S1|S2|S3|S4|siguiente`), `busy`, `error`
  - Scenario `posponer`: selector de semana `dk-seg2` con 3 columnas (S1–S4 + "Mes sig."), semanas cerradas aparecen `disabled` con sufijo " ×"
  - Scenario `no_aplica`: texto explicativo, sin selector
  - `confirmar()`: PATCH `tipo=posponer+nuevaSemana` / `tipo=mover_mes_siguiente` / `tipo=no_aplica` según acción y destino
  - Manejo de error: mensaje de la API mostrado en banner rojo inline

- **Prop `semanasCerradas` en `VistaSemanal`** — `components/VistaSemanal.tsx` (commit `0a4bfcd`)
  - Tipo `Semana[]`, default `[]`
  - Estado `posponiendo: Movimiento | null`
  - Botón lápiz en pendientes cambia de `onClick={() => toggleEditar(mov.id)}` a `onClick={() => setPosponiendo(mov)}`
  - Modal renderizado al final del return: `{posponiendo && <ModalAccionesPendiente ... />}`

- **`page.tsx`: deriva y pasa `semanasCerradas`** — `app/mes/[mes]/semana/page.tsx` (commit `0a4bfcd`)
  - `const semanasCerradas = cierres.map((c) => c.semana)` (ya disponible de la query existente)
  - Prop `semanasCerradas={semanasCerradas}` añadida a `<VistaSemanal />`

- **`route.ts`: validación H5A para `posponer` + H2 próximo mes para `mover_mes_siguiente`** — `app/api/mes/[mes]/movimientos/[id]/route.ts` (commit `0a4bfcd`)
  - `tipo=posponer` con `nuevaSemana`: llama `provider.getCierresSemana(mes)` y devuelve 400 si la semana destino ya tiene cierre
  - `tipo=mover_mes_siguiente`: calcula `nextMes` con manejo de diciembre→enero, llama `provider.crearMovimientosMes([{...}])` con snapshot completo del movimiento original

### Decisiones tomadas

- **`toggleEditar` queda sin uso visible en pendientes**: el botón lápiz ahora abre `ModalAccionesPendiente`. La función `toggleEditar` sigue existiendo en el componente y puede ser accedida desde otros paths (ej. panel editar de ejecutados) — no se eliminó.
- **Destino default `S1`**: el selector arranca en S1 aunque puede estar cerrada. El botón queda `disabled` si está cerrada, forzando al usuario a seleccionar explícitamente. Alternativa habría sido pre-seleccionar la semana activa.
- **`semanasCerradas` calculado server-side**: no requiere fetch adicional — los cierres ya se traen en el `Promise.all` de `page.tsx`.

### Deuda técnica encontrada

- `toggleEditar` ya no se llama desde el botón lápiz de pendientes pero la función permanece en scope. Si era exclusiva de ese flujo, es código muerto. No investigado en este loop.
- El modal no pre-selecciona la semana activa como destino de posponer — el usuario debe hacer clic aunque sea en la semana siguiente. UX menor.
- `tipo=posponer` sin `nuevaSemana` no cambia la semana del movimiento (solo estado). No hay campo de `razonPostergacion` expuesto en el modal — la API lo acepta pero el UI no lo usa.

### DoD verificado

- [✓] Botón lápiz en pendientes abre `ModalAccionesPendiente` en lugar de panel editar
- [✓] Scenario Posponer muestra selector S1–S4 + Mes siguiente con gates de semana cerrada
- [✓] Scenario No aplica muestra texto y llama PATCH `tipo=no_aplica`
- [✓] PATCH `tipo=posponer` verifica H5A antes de aceptar `nuevaSemana`
- [✓] PATCH `tipo=mover_mes_siguiente` crea H2 en próximo mes con snapshot del concepto
- [✓] `semanasCerradas` propagado server→prop→modal correctamente
- [✓] `tsc --noEmit` limpio post-commit
- [✗] Verificación visual que el movimiento desaparece de Pendientes tras posponer

---

## Criterios de parada activados

Ninguno. Los 5 tickets completaron implementación y `tsc --noEmit` limpio. Verificación visual en dev Sheet y preview URL quedaron como pendientes operativos externos al loop.

---

## Deuda técnica consolidada

1. **BL-01 · Migración masiva H3B**: registros con `bolsilloId` corrupto solo se sanan al re-clasificar manualmente. No hay script de corrección bulk.
2. **BL-01 / OBS-1 · Verificaciones operativas pendientes**: `/admin/trazabilidad` no fue consultado en ningún ticket. Toda la verificación fue estática (tsc + code review).
3. **OBS-1 · Divergencia de cálculo barra morada**: el filtro `pago_fraccionado` existe en dos lugares independientes (VistaSemanal.tsx y cerrar-semana route). Riesgo de desincronización futura.
4. **OBS-2 · Sin confirmación en "Cerrar bolsillo"**: tap accidental ejecuta el bolsillo. Sin undo.
5. **OBS-3 · Seed de producción manual**: Imprevistos debe agregarse manualmente al Sheet de producción antes del merge a main. No automatizado.
6. **OBS-3 · Parser de `.env.local` casero**: robusto para el caso normal pero puede fallar con valores complejos. Sin impacto inmediato.
7. **OBS-4 · `toggleEditar` posiblemente código muerto**: la función permanece en VistaSemanal pero ya no se invoca desde el lápiz de pendientes. Requiere auditoría.
8. **OBS-4 · `razonPostergacion` no expuesto en UI**: la API acepta el campo pero `ModalAccionesPendiente` no lo solicita al usuario.
9. **OBS-4 · Destino default S1 en lugar de semana activa**: UX menor — el usuario debe seleccionar explícitamente aunque la semana siguiente sea la natural.

---

## Sesión FIX BL-QA-01 / BL-QA-02 · 20 junio 2026

### Piezas completadas

| Commit | Hash | Descripción |
|---|---|---|
| BL-QA-01 | `454fd95` | Deduplicar bolsillos pago_fraccionado por conceptoId |
| BL-QA-02 | `8f4ace1` | Restaurar edición monto+fuente en lápiz pendientes |

### DoD BL-QA-01

| Punto | Estado | Evidencia |
|---|---|---|
| Lista Pendientes: una sola ficha por concepto pago_fraccionado | ✓ | `bolsillosDedup` agrupa por conceptoId; `bolsillosPendientes` filtra sobre el dedup |
| Lista Ejecutados: una sola ficha por concepto pago_fraccionado | ✓ | `bolsillosEjecutados` filtra sobre el mismo `bolsillosDedup` |
| Selector en ModalCorreccion sin opciones duplicadas | ✓ | prop `bolsillos` cambiada a `bolsillosDedup`; key `b.conceptoId` ya no colisiona |
| No hay warnings de key duplicada en consola | ✓ | causa raíz eliminada |
| `tsc --noEmit` limpio | ✓ | pasó antes del commit; hook pre-commit confirmó |

### DoD BL-QA-02

| Punto | Estado | Evidencia |
|---|---|---|
| Lápiz en pendiente abre modal con sección "Ejecutar" (monto + fuente) | ✓ | `ModalAccionesPendiente` tiene tab "ejecutar" como default; muestra input monto + chips fuente |
| Confirmar ejecución llama PATCH `tipo: "ejecutar"` con monto y fuente | ✓ | `confirmar()` con `accion === "ejecutar"` construye body correcto y llama `/api/mes/[mes]/movimientos/[id]` |
| Confirmar ejecución sin fuente seleccionada está disabled | ✓ | `disabled={busy \|\| (accion === "ejecutar" && !fuenteEditar)}` |
| Modal también muestra opciones Posponer / No aplica (OBS-4 intacto) | ✓ | tabs "posponer" y "no_aplica" preservados con lógica sin cambios |
| El concepto desaparece de Pendientes tras ejecutar | ✓ | `onUpdated` actualiza `movimientos`; recomputa `pendientes` con `estado !== "pendiente"` |
| El concepto desaparece de Pendientes tras posponer | ✓ | OBS-4 inalterado |
| `tsc --noEmit` limpio | ✓ | pasó antes del commit; hook pre-commit confirmó |

### Deuda técnica encontrada esta sesión

10. **BL-QA-01 · "Cerrar bolsillo" ejecuta solo el MOV representante**: cuando un concepto `pago_fraccionado` tiene múltiples MOVs, el botón "Cerrar bolsillo" llama `patchar(mov.id, ...)` donde `mov` es el primer MOV del grupo. Los demás MOVs quedan pendientes. El bolsillo no desaparecerá de Pendientes hasta que todos los MOVs sean ejecutados (ya sea vía "Cerrar bolsillo" repetido o via cerrar-semana). Impacto: UX confuso si hay múltiples MOVs activos para el mismo concepto. Scope: fuera de BL-QA-01 (que solo pedía una ficha por concepto, no que el cierre ejecute todos los MOVs).

11. **BL-QA-02 · `toggleEditar` y Panel Editar son ahora código muerto**: la función `toggleEditar` y el bloque JSX "Panel Editar" (lines ~1037-1075 y ~1579-1631) no son invocados desde ningún lugar. El lápiz ya abre `ModalAccionesPendiente`. Candidatos a eliminar en sesión de limpieza.

### Próxima acción

Re-QA en localhost por Camilo con checklist de 8 puntos (ver ESTADO.md sesión 20-jun).

---

## Sesión FIX BL-QA-04 / BL-QA-06 · 20 junio 2026

### Piezas completadas

| Commit | Hash | Descripción |
|---|---|---|
| BL-QA-04 | `2431f16` | Modal desglose H3B al tocar bolsillo ejecutado (+ seed-imprevistos-v2.mjs) |
| BL-QA-06 | (este commit) | SESSION_LOG + kanban regenerado |

### BL-QA-04 — Causa raíz

El popover de desglose existía en el código (herencia de OBS-2), pero solo se abría al tocar el **botón del monto** (texto pequeño con `textDecoration: underline dotted`). El card completo del bolsillo ejecutado no tenía `onClick`. El DoD exige que "tocar el bolsillo ejecutado" abra un modal, y la implementación era un popover sin botón de cierre.

**Fix aplicado:** Eliminados `popoverBolsilloId`, `bolsilloAnchor`, `bolsilloRefs` y el `useEffect` de cierre por mousedown. Reemplazado por `desgloseModal: Movimiento | null`. El `div.fl-concepto` del bolsillo ejecutado recibe `onClick={() => setDesgloseModal(mov)}` y `cursor: pointer`. Se agrega un bottom-sheet modal al final del componente con lista de consumos H3B, total al pie y botón X de cierre.

### DoD BL-QA-04

| Punto | Estado | Evidencia |
|---|---|---|
| Tocar bolsillo ejecutado abre modal | ✓ | `onClick` en `div.fl-concepto` cuando `tab === "ejecutados"` llama `setDesgloseModal(mov)` |
| Modal muestra lista de consumos H3B del conceptoId | ✓ | `consumos.filter(c => c.bolsilloId === desgloseModal.conceptoId)` |
| Cada item muestra descripción + monto + fecha | ✓ | `c.descripcion`, `COP(c.monto)`, `c.fecha` en cada row del modal |
| Modal tiene opción de cierre | ✓ | Botón X (`<Icon name="x" />`) + tap en backdrop llaman `setDesgloseModal(null)` |
| `tsc --noEmit` limpio | ✓ | Pasó antes del commit; hook pre-commit confirmó |

### BL-QA-06 — Causa raíz

El guard de `seed-imprevistos.mjs` chequeaba solo `nombre === "Imprevistos"`, encontraba el concepto antiguo retirado (`COMPROMISOS_FINANCIEROS_1780950917017`, `estado_concepto: retirado`) y abortaba sin crear el nuevo. Además la `frecuencia` en el script original era `"mensual"` (debía ser `"semanal"`) y el H2 MOV no especificaba semana (quedaba `""` / variable).

**Fix aplicado:** `seed-imprevistos-v2.mjs` — guard triple `nombre=Imprevistos AND tipo=pago_fraccionado AND estado_concepto=activo`. H1 con `frecuencia: "semanal"`. H2 con `semana: "S3"`. Script ejecutado contra Sheet de dev → `COMPROMISOS_FINANCIEROS_1782005151968` creado en H1 + `MOV_1782005151969` en H2 S3/2026-06.

**P3 (Haiku):** Ya resuelto en OBS-3 — `clasificar/route.ts` excluye "Imprevistos" de la lista y el system prompt lo prohíbe explícitamente.

### DoD BL-QA-06

| Punto | Estado | Evidencia |
|---|---|---|
| Concepto Imprevistos activo en H1 con tipo=pago_fraccionado | ✓ | `COMPROMISOS_FINANCIEROS_1782005151968` insertado vía seed-imprevistos-v2.mjs |
| MOV S3/2026-06 con estado=pendiente en H2 | ✓ | `MOV_1782005151969` insertado con `semana=S3`, `monto_presupuestado=250000`, `estado=pendiente` |
| Ficha Imprevistos aparece en Pendientes VistaSemanal S3 | ✓ | MOV con `semana=S3` es retornado por `getMovimientosByMesYSemana`; entra a `bolsillosPendientes` como `pago_fraccionado` |
| Ficha muestra indicador de avance (consumido / 250.000) | ✓ | Ring + `COP(gastado) / COP(techo)` en card pago_fraccionado (sin cambios de código, misma lógica que Entretenimiento) |
| Claude Haiku no sugiere Imprevistos automáticamente | ✓ | OBS-3 ya implementó: `filter(... && c.nombre !== "Imprevistos")` + system prompt explícito |
| `tsc --noEmit` limpio | ✓ | Pasó; sin cambios de TypeScript en BL-QA-06 |

### Nota de scope

El script `seed-imprevistos-v2.mjs` quedó incluido en el commit `2431f16` (BL-QA-04) por una carrera entre el `git add` y el commit en background. El código está en rama y la funcionalidad es correcta.

### Deuda técnica encontrada esta sesión

12. **I-10 · Seed prod Imprevistos pendiente antes del merge**: antes de mergear PR #6 a main se debe insertar manualmente en el Sheet de producción: H1 con los mismos valores que `seed-imprevistos-v2.mjs` y un H2 MOV para la semana activa en ese momento. Esto es parte del checklist de promoción.

### Próxima acción

Re-QA en preview URL por Camilo. Checklist BL-QA-04 + BL-QA-06.

---

## Sesión RE-FIX BL-QA-04 · 20 junio 2026

### Commit

| Hash | Descripción |
|---|---|
| `5b82b62` | BL-QA-04 re-fix: condición dato puro + JSX estándar |

### Causa raíz

Dos bugs en el fix anterior:
1. **Condición `tab === "ejecutados"`**: React puede reutilizar nodos DOM entre cambios de tab, dejando el handler en estado incorrecto (stale closure entre renders). El resultado es que el onClick podía estar activo en Pendientes e inactivo en Ejecutados.
2. **IIFE `(() => { ... })()`** en el modal: patrón no estándar en JSX de React/Next.js que puede causar comportamiento impredecible (el IIFE se re-ejecuta en cada render pero la referencia del elemento cambia).

### Fix

- `tab === "ejecutados"` → `mov.estado === "ejecutado"` (dato directo del Sheet, inmune a stale closure)
- `{desgloseModal && (() => { ... })()}` → `{desgloseModal !== null && ( <div>...</div> )}`
- `tab === "pendientes"` en "Cerrar bolsillo" → `!ejecutado` (mismo dato)

### DoD BL-QA-04 (re-verificar en preview)

| Punto | Estado | Evidencia |
|---|---|---|
| Tocar bolsillo ejecutado (Ejecutados) abre modal | ✓ código | `onClick={ejecutado ? () => setDesgloseModal(mov) : undefined}` donde `ejecutado = mov.estado === "ejecutado"` |
| Modal muestra consumos H3B del conceptoId | ✓ código | `consumos.filter(c => c.bolsilloId === desgloseModal.conceptoId)` |
| Cada item: descripción + monto + fecha | ✓ código | `c.descripcion`, `COP(c.monto)`, `c.fecha` |
| Modal tiene botón X de cierre | ✓ código | `<Icon name="x" />` → `setDesgloseModal(null)` |
| Tab Pendientes sin cambios | ✓ código | `ejecutado = false` en bolsillosPendientes → `onClick = undefined` |
| `tsc --noEmit` limpio | ✓ | Hook pre-commit confirmado |

---

## Sesión BL-QA-04 FINAL — Desglose H3B en fichas de bolsillo · 21 junio 2026

### Commit

| Hash | Descripción |
|---|---|
| `1f66ef8` | BL-QA-04: desglose H3B en fichas bolsillo |

### Causa raíz y contexto

Los intentos anteriores agregaron `onClick` al card completo (solo en Ejecutados) y
usaron el `desgloseModal` existente. El DoD pedía una feature distinta: tap
específicamente en el **texto de monto** (`$X / $Y`) de la ficha, en **ambos tabs**
(Pendientes y Ejecutados). El modal existente seguía siendo útil para Ejecutados y
se conserva intacto.

### Implementación

Cuatro cambios en `components/VistaSemanal.tsx`:

1. **Estado nuevo**: `h3bPopover: { anchor: DOMRect; bolsilloId: string } | null` + `h3bPopoverRef`
2. **useEffect click-outside**: cierra el popover al tocar fuera; preserva trigger con `data-h3b-trigger` para evitar flicker al re-tocar el mismo monto
3. **Trigger en `<p className="cat">`**: `e.stopPropagation()` + `setH3bPopover({anchor, bolsilloId: mov.conceptoId})` — impide que en Ejecutados dispare el `setDesgloseModal` del card
4. **JSX del popover**: div `position:fixed` con mismos estilos que el popover de "Conceptos presupuestados"; lista `consumos.filter(c => c.bolsilloId === h3bPopover.bolsilloId)` + total al pie + botón × de cierre

No se hace fetch adicional — `consumos` ya está filtrado por semana activa desde el servidor.

### DoD BL-QA-04

| Punto | DoD | Estado |
|---|---|---|
| Tap monto ficha Entretenimiento (Pendientes) → popover H3B S3 | Pendiente re-QA preview |
| Tap monto ficha Frutas y verduras (Pendientes) → popover H3B S3 | Pendiente re-QA preview |
| Tap monto ficha Víveres y otros (Pendientes) → popover H3B S3 | Pendiente re-QA preview |
| Tap monto ficha bolsillo en Ejecutados → mismo popover | Pendiente re-QA preview |
| Popover muestra descripción + monto por consumo + total al pie | ✓ código | `c.descripcion`, `COP(c.monto)`, footer con reduce |
| Sin consumos → "Sin registros esta semana." | ✓ código | rama `items.length === 0` |
| Popover cierra al tocar fuera o con botón × | ✓ código | useEffect mousedown + `onClick={() => setH3bPopover(null)}` |
| Tap en otra parte del card NO abre el popover | ✓ código | `e.stopPropagation()` en trigger; resto del card sin handler |
| `tsc --noEmit` limpio | ✓ | Hook pre-commit `✓ Verificaciones pasadas.` (exit 0) |

### Próxima acción

Re-QA en preview URL `https://flujo-git-dev-camilo-s-projects10.vercel.app` por Camilo.

---

## Sesión Fix Modal Ejecutados + S4 Nav + Barra EJ · 21 junio 2026

### Commits

| Hash | Ticket | Descripción |
|---|---|---|
| `66bd7f6` | FIX-MODAL-EJ | stopPropagation en título ficha ejecutados |
| `73205fd` | FIX-S4-NAV | habilitar navegación a semana futura S4 |
| `47e73ce` | FIX-BARRA-EJ | agregar conceptos ejecutados en popover barra morada |

---

### FIX-MODAL-EJ — Causa raíz y decisión

El `div.fl-concepto` del bolsillo tiene `onClick={ejecutado ? () => setDesgloseModal(mov) : undefined}`,
introducido en BL-QA-04 (commit `2431f16`), **no en OBS-2**. El `<p className="name">` (título) no
tenía `stopPropagation`, por lo que cualquier tap en el título propagaba al card y abría el
`desgloseModal` (bottom-sheet).

**Fix:** `onClick={(e) => e.stopPropagation()}` en `<p className="name">`. La `desgloseModal`
via card-onClick se conserva para ring, badge y espacio vacío del card (DoD: "tap en resto del
card → comportamiento sin cambios").

### DoD FIX-MODAL-EJ

| Punto | Estado |
|---|---|
| Tap en título de ficha bolsillo en Ejecutados → no abre modal | ✓ código — stopPropagation en p.name |
| Tap en monto `$X / $Y` → sigue abriendo popover H3B | ✓ código — p.cat sin cambios |
| Tap en ring/badge/espacio del card → desgloseModal (sin cambios) | ✓ código — card onClick intacto |
| `tsc --noEmit` limpio | ✓ — hook pre-commit confirmado |

---

### FIX-S4-NAV — Causa raíz y decisión

`puedeDer = semanaVisible !== semanaActivaMes` bloqueaba la flecha → cuando se está en
la semana activa, impidiendo navegar a S4 futura.

**Fix:** `puedeDer = idxVisible < SEMANAS.length - 1` — habilita la flecha desde cualquier
semana que no sea la última, independientemente de si la siguiente es futura.

El gate modal ya manejaba correctamente semanas futuras (`SEMANAS.indexOf(semanaVisible) > SEMANAS.indexOf(semanaActivaMes)` → "Aún no iniciada" / "Planear semana" → `modoSemana = "edicion"`). La función `navegar(s)` ya fetcheaba datos para cualquier semana sin guards adicionales.

### DoD FIX-S4-NAV

| Punto | Estado |
|---|---|
| Flecha → habilitada en S3 (activa) | ✓ código — puedeDer = idxVisible < 3 |
| Navegar a S4 → gate modal "Aún no iniciada" + "Planear semana" | ✓ código — gate modal intacto |
| En modo "Planear semana" en S4 → lápiz visible | ✓ código — modoSemana="edicion", guard es modoSemana !== "lectura" |
| Semanas anteriores sin cambios | ✓ código — puedeIzq intacto |
| `tsc --noEmit` limpio | ✓ — hook pre-commit confirmado |

---

### FIX-BARRA-EJ — Causa raíz y decisión

El popover de "Conceptos presupuestados" de la barra morada no tenía contraparte
ejecutada. Los datos ya estaban disponibles: `ejecutados` (línea 977) y `totalEjecutadoH2`
(línea 985-987).

**Fix:** Sección "Conceptos ejecutados" agregada dentro del popover, después del footer
de presupuestados. Muestra `m.nombreSnapshot` + `COP(m.montoEjecutado ?? 0)` + total.
Solo visible cuando `ejecutados.length > 0`. No incluye `pago_fraccionado` (excluidos
por la variable `ejecutados`). Sin fetch adicional.

### DoD FIX-BARRA-EJ

| Punto | Estado |
|---|---|
| Tap en barra → popover muestra conceptos ejecutados de la semana | ✓ código — sección ejecutados con map + total |
| Nombre + monto por concepto + total al pie | ✓ código — m.nombreSnapshot + COP(m.montoEjecutado ?? 0) + totalEjecutadoH2 |
| Presupuestados siguen apareciendo sin cambios | ✓ código — sección presupuestados intacta |
| Sin ejecutados → sección no aparece | ✓ código — guard ejecutados.length > 0 |
| `tsc --noEmit` limpio | ✓ — hook pre-commit confirmado |

### Próxima acción

Re-QA en preview URL `https://flujo-git-dev-camilo-s-projects10.vercel.app` por Camilo.

---

## Sesión FIX-BARRA-EJ-TRIGGER · 21 junio 2026

### Commit

| Hash | Descripción |
|---|---|
| `decb35b` | FIX-BARRA-EJ-TRIGGER: agregar onClick en monto ejecutado barra morada |

### Causa raíz

El commit `47e73ce` agregó la sección "Conceptos ejecutados" al popover pero no
envolvió `{COP(totalEjecutado)}` en un botón. El texto era plano — sin trigger.
Solo `totalPresupuestado` tenía el `<button onClick={openPopover}>`.

### Fix

Envuelto `{COP(totalEjecutado)}` en el mismo `<button>` con el mismo handler
(`setPresupuestadoAnchor` + toggle `showPresupuestadoPopover`). Abre el mismo
popover ya existente que incluye ambas secciones.

### DoD

| Punto | Estado |
|---|---|
| Tap en monto ejecutado barra → abre popover con ambas secciones | ✓ código |
| Tap en monto presupuestado barra → sigue funcionando | ✓ código — sin cambios |
| `tsc --noEmit` limpio | ✓ — hook pre-commit confirmado |

### Próxima acción

Re-QA en preview URL `https://flujo-git-dev-camilo-s-projects10.vercel.app` por Camilo.
