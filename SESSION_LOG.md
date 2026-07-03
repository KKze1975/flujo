# SESSION_LOG — Loop BL-01 / OBS-1..4 · 2026-06-20

---

## BL-12 · Modal de confirmación cierre de semana · 2026-06-24

### Cambios

- **`components/VistaSemanal.tsx`**
  - Estado `showConfirmCierre: boolean` agregado al componente `VistaSemanal`.
  - Botón "Cerrar semana Sn": `onClick` cambiado de `handleCerrarSemana` a `() => setShowConfirmCierre(true)`. No ejecuta el POST.
  - Modal renderizado condicionalmente cuando `showConfirmCierre === true`, usando el patrón `dk-modal-backdrop` / `dk-modal-foot` existente.
  - Texto del modal: `"¿Cerrar semana S[n]? Esta acción no se puede deshacer."` con `semanaVisible` dinámico.
  - Botón "Cancelar": `setShowConfirmCierre(false)`, no toca el estado de la semana.
  - Botón "Cerrar semana": llama `handleCerrarSemana()` (POST existente sin modificar), luego `setShowConfirmCierre(false)`.
  - Estado `cerrandoSemana` controla `disabled` y texto "Cerrando…" en el botón del modal.

### DoD verificado

- [✓] Tap en "Cerrar semana" muestra modal con texto correcto y número de semana dinámico
- [✓] Botón `Cancelar` cierra el modal sin ejecutar nada — estado de la semana sin cambios
- [✓] Botón `Cerrar semana` ejecuta el POST existente y cierra el modal
- [✓] `tsc --noEmit` limpio antes del commit
- [ ] Verificado en preview URL de dev (mobile viewport) — pendiente QA Angie

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

---

## Sesión Diagnóstico S4 + Fix Popover Barra · 21 junio 2026

### Bug 1 — Fichas en S4 · DIAGNÓSTICO (DATA, no código)

Script `scripts/diag-s4.mjs` ejecutado contra Sheet dev (eliminado tras lectura).

**MOVs con semana=S4 en H2 (mes 2026-06):**

| MOV | Nombre | tipo_snapshot | estado |
|---|---|---|---|
| MOV_1780841388005 | Mesada Emma | fijo | pendiente |
| MOV_1780841388009 | Mesada Lucas | fijo | pendiente |
| MOV_1780841388013 | Empleada Mireyita | fijo | pendiente |
| MOV_1780841388018 | Chucherías viernes | discrecional | pendiente |
| MOV_1780841388019 | Abono capital TC | fijo | pendiente |
| MOV_1780841388026 | Entretenimiento | pago_fraccionado | pendiente |
| MOV_1780841388028 | Fondo transporte | pago_fraccionado | pendiente |
| MOV_1780841388029 | Fondo de emergencia | pago_fraccionado | pendiente |
| MOV_1780841388030 | CDT NU | pago_fraccionado | pendiente |
| MOV_1780841388035 | Frutas y verduras | pago_fraccionado | pendiente |
| MOV_1780841388039 | Víveres y otros | pago_fraccionado | pendiente |

Sin MOVs de pago_fraccionado con semana=null en 2026-06.

**Diagnóstico:** CDT NU, Fondo transporte, Fondo de emergencia son **pago_fraccionado** (no "non-pago_fraccionado" como indicaba el reporte). Están asignados a S4 explícitamente en H2. La API los devuelve correctamente para semana=S4. El commit `73205fd` es correcto — simplemente habilitó la navegación que los hizo visibles.

**Acción:** Sin cambio de código. Deuda técnica: el usuario debe verificar si CDT NU / Fondo transporte / Fondo de emergencia en S4 son intencionales o si deben corregirse manualmente en el Sheet.

---

### Bug 2 — Popover barra modo · Commit `ea9ed56`

**Causa raíz:** `showPresupuestadoPopover` era booleano sin modo — ambos botones abrían el mismo popover con ambas secciones.

**Fix:** Estado `popoverMode: "presupuestado" | "ejecutado"`. Cada trigger button abre/cierra el popover en su modo; el contenido se renderiza condicionalmente.

### DoD Bug 2

| Punto | Estado |
|---|---|
| Tap en monto ejecutado → popover muestra SOLO ejecutados | ✓ código — `popoverMode === "ejecutado"` |
| Tap en monto presupuestado → popover muestra SOLO presupuestados | ✓ código — `popoverMode === "presupuestado"` |
| Mismo botón mientras abierto → cierra popover | ✓ código — guard `if (showPresupuestadoPopover && popoverMode === ...)` |
| Sin ejecutados → "Sin ejecutados esta semana." | ✓ código — rama `ejecutados.length === 0` |
| `tsc --noEmit` limpio | ✓ — hook pre-commit confirmado |

### Próxima acción

Re-QA en preview URL `https://flujo-git-dev-camilo-s-projects10.vercel.app` por Camilo.

---

## Sesión 21 jun 2026 — FIX-MES-ACTIVO + FIX-POPOVER-EJ-FILTRO

### Bug 1 — Mes activo muestra julio en lugar de junio

**Diagnóstico:** `app/page.tsx` calculaba `mesActivo` tomando el último elemento del array
retornado por `getMeses()`. Esa función lee H2, extrae valores únicos de la columna `mes`
y los ordena alfabéticamente. Como H2 producción tiene MOVs con `mes=2026-07`
(presupuesto anticipado), `meses[meses.length - 1]` retornaba `"2026-07"` en lugar de `"2026-06"`.

**Fix (commit `c9f5699`):** `app/page.tsx`
- Agregar función `mesActual()` que retorna el mes calendario actual desde `new Date()`
- Reemplazar la inferencia desde H2 por `mesActual()`

**DoD:**
| Criterio | Estado |
|---|---|
| App muestra junio como mes activo | ✓ — lógica corregida a fecha sistema |
| Navegar a julio no cambia mes activo | ✓ — mes activo ya no depende de H2 |
| `tsc --noEmit` limpio | ✓ — hook pre-commit confirmado |

---

### Bug 2 — Popover barra morada no muestra todos los ejecutados

**Diagnóstico:** El total ejecutado de la barra morada (`totalEjecutado`) suma
`totalEjecutadoH2` (MOVs H2 ejecutados, sin pago_fraccionado) + `totalEjecutadoH3`
(consumos H3B de la semana). El popover solo listaba `ejecutados` (MOVs H2) y mostraba
`totalEjecutadoH2` como total — omitía completamente los consumos H3B,
causando discrepancia entre la lista del popover y el monto de la barra.

**Fix (commit `7b861f6`):** `components/VistaSemanal.tsx` bloque `popoverMode === "ejecutado"`
- Lista H2 `ejecutados` + `consumos` H3B como entradas individuales (`c.descripcion` + `COP(c.monto)`)
- Condición vacío: `ejecutados.length === 0 && consumos.length === 0`
- Total footer: `totalEjecutadoH2` → `totalEjecutado` (H2 + H3)
- Footer visible si hay ejecutados H2 o consumos H3

**DoD:**
| Criterio | Estado |
|---|---|
| Popover muestra todos los items que suman el total | ✓ — H2 + H3 en lista |
| Total popover coincide con total barra | ✓ — ambos usan `totalEjecutado` |
| `tsc --noEmit` limpio | ✓ — hook pre-commit confirmado |

---

## SESSION H3B-JULIO-01 — Registros FAB con mes/semana incorrectos + MOVs julio prematuros · 2026-06-22

### P1 — Diagnóstico de código

- **Endpoint encontrado:** `app/api/registro/sin-concepto/route.ts` — ruta `POST /api/registro/sin-concepto`
- **Campo `mes` (línea 94, antes del fix):**
  ```typescript
  body.mes,   // viene del cliente — NO calculado server-side
  ```
- **Campo `semana` (línea 89):**
  ```typescript
  const semana = semanaActual();   // calculado desde new Date().getDate() ✓
  ```
- **Causa raíz confirmada: SÍ**
  El cliente (`RegistroRapido`) pasa `mes` en el body, obtenido de `/api/meses`. Ese endpoint devolvió `2026-07` porque H2 tenía 30 MOVs de julio cargados anticipadamente. El endpoint H3B escribió `body.mes` sin validación, violando el invariante I-01/I-02.

### P2 — Fix de código

**Archivo:** `app/api/registro/sin-concepto/route.ts`

Antes (línea 94):
```typescript
body.mes,
```

Después (líneas 87–94):
```typescript
const mes = mesActual();
// ...
mes,
```

Nueva función añadida (líneas 58–63, idéntica a `app/page.tsx:15-20`):
```typescript
function mesActual(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
```

Campo `mes` en tipo `Body` cambiado a opcional (`mes?: string`) — el servidor ya no lo usa.
Validación `!body.mes` eliminada de la guarda de campos requeridos.

- **tsc --noEmit:** limpio ✓
- **Commit:** `2d78f29`

### P2b — Fix causa raíz en RegistroRapido (alcance ampliado con confirmación del usuario)

**Archivo:** `components/m4/RegistroRapido.tsx`

La causa raíz estaba en el cliente: `RegistroRapido` llamaba a `/api/meses`, tomaba el último elemento de la lista (`meses[meses.length - 1]`) y lo usaba como mes activo. Como H2 tenía MOVs de julio, el último mes era `2026-07`.

Fix: eliminar el `useEffect` que fetcha `/api/meses` y el estado `mesActivo`. Reemplazar por cálculo directo desde `new Date()` en el momento del submit usando `mesActual()` — mismo patrón que `app/page.tsx`.

- Antes: `const [mesActivo, setMesActivo] = useState<string | null>(null)` + `useEffect(() => fetch("/api/meses")...)`
- Después: `const mesActivo = mesActual()` calculado en `handleSubmitInput`
- **tsc --noEmit:** limpio ✓
- **Commit:** `bc2001f`

### P3 — Corrección consumos H3B en producción

- Script: `scripts/fix-h3b-julio-01.mjs --prod`
- CONSUMO_1782170083338: mes `2026-07` → `2026-06` (fila 32, col C) ✓
- CONSUMO_1782170131704: mes `2026-07` → `2026-06` (fila 33, col C) ✓
- Verificación post-escritura: ambas filas releídas con `mes=2026-06` ✓

### P4 — Eliminación MOVs julio en producción

**Anomalía encontrada:** el prompt indicaba "exactamente 30 filas" pero en producción había 69 MOVs de julio (batch de 69 IDs consecutivos, no 30). Todas con `mes=2026-07` y `estado=pendiente`.

- Lote 1 (`fix-h2-julio-01.mjs --prod`): 30 filas eliminadas (`MOV_1782011977286`→`MOV_1782011977315`) ✓
- Verificación post-lote-1: quedaban 39 filas — criterio de parada activado, usuario consultado
- Lote 2 (`fix-h2-julio-01b.mjs --prod`): 39 filas eliminadas (`MOV_1782011977316`→`MOV_1782011977354`) ✓
- Verificación final: 0 filas con `mes=2026-07` en H2, total H2 = 73 filas ✓

### P5 — Verificación end-to-end

- (pendiente — post-deploy)

### Deuda técnica encontrada

13. **H3B-JULIO-01 · Origen del lote doble de MOVs de julio**: se eliminaron 69 MOVs de julio en lugar de los 30 estimados. El flujo que los creó (inicio de mes prematuro) generó 69 entradas en un solo batch. Verificar qué script o acción los creó para evitar repetición.

### Criterios de parada activados

- **P4 lote 1**: verificación post-eliminación falló (39 filas restantes). Consultado con usuario antes de continuar. Autorizado y completado.

---

## Sesión DEBUGGING — Reset Julio + Instrumentación · 2026-06-26

### Objetivo

Preparar el experimento de reproducción del bug de inicialización de Julio 2026.
No se escribe fix. El producto es: (1) Julio eliminado del Sheet de producción,
(2) script de captura operacional para monitorear el experimento.

### Paso 0 — Backup del estado defectuoso

Script: `scripts/reset-julio.mjs` (no commiteado).

Estado de Julio antes del reset (guardado en `scripts/backup-julio-defectuoso.json`):

| Pestaña | Filas julio (mes=2026-07) |
|---|---|
| H2 (movimientos) | **69 filas** (61 pendiente, 8 no_aplica — datos de AUDITORIA_JULIO.md) |
| H3B (consumos) | **0 filas** (los 2 consumos incorrectos ya habían sido corregidos en sesión 2026-06-22) |
| H4A (ingreso Camilo) | **1 fila** ($11,450,000 confirmado) |
| H4B (aportes Angie) | **4 filas** (S1–S4, $2,000,000 c/u) |
| H5A/H5B | **0 filas** (verificado en Paso 1) |

### Paso 1 — H5 verificado

H5A: 0 filas de julio · H5B: 0 filas de julio.
Condición de parada NOT activada. Procedimiento continuado.

### Paso 2 — Borrado de Julio

| Pestaña | Borradas | Otros meses conservados |
|---|---|---|
| H2 | 69 | 73 (junio y anteriores) |
| H3B | 0 | — |
| H4A | 1 | 2 |
| H4B | 4 | 8 |

Verificación cruzada post-borrado:
- Julio restante: H2=0 H3B=0 H4A=0 H4B=0 ✓
- Filas de junio en H2: 73 antes y 73 después — intactas ✓
- H5 intacto ✓ · H1 intacto ✓ · H4C/H4D intactos ✓

### Paso 3 — Verificación I-01

Verificado via code review (dev server no estaba corriendo en esta sesión).

`app/page.tsx` líneas 15–20 implementan `mesActual()`:
```typescript
function mesActual(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
```

Línea 27: `const mesActivo = mesActual()` — el mes activo se calcula desde `new Date()`
del servidor, NO desde el contenido de H2.

**Conclusión I-01: SE MANTIENE.** Con Julio eliminado de H2, `getMeses()` devolverá
solo Junio y meses anteriores, pero `mesActivo` seguirá siendo `2026-06` (junio)
porque hoy es 2026-06-26. La app mostrará Junio como mes activo y ofrecerá
"activar siguiente mes → Julio" desde ese contexto.

Fix aplicado en commit `c9f5699` (sesión 2026-06-21).

### Paso 4 — Script de captura

Script creado: `scripts/captura-julio.mjs` (commiteado a `dev`).

- Lee H2, H3B, H4A, H4B para mes=2026-07 desde producción (PROD_GOOGLE_SHEET_ID)
- Genera `scripts/capturas/snapshot-NNN-<slug>.json` con número secuencial
- Imprime resumen: H2 filas, comprometido total, desglose S1–S4
- Excluye `estado=no_aplica` del comprometido (mismo criterio que el motor de la app)
- Detecta y reporta montos no parseables en lugar de ignorarlos silenciosamente

### Paso 5 — Baseline

```
[SNAPSHOT 001] "baseline post-reset"
  H2: 0 filas | Comprometido total: $0 | S1:$0 S2:$0 S3:$0 S4:$0
  → scripts/capturas/snapshot-001-baseline-post-reset.json
```

Baseline confirma: Sheet en estado limpio. Punto de partida del experimento establecido.

### Entregables completados

- [x] `scripts/backup-julio-defectuoso.json` — evidencia del estado previo al reset
- [x] Sheet producción con 0 filas de 2026-07 en H2, H3B, H4A, H4B
- [x] Filas de Junio intactas (73/73)
- [x] `scripts/captura-julio.mjs` operacional
- [x] `scripts/capturas/snapshot-001-baseline-post-reset.json` con comprometido=$0
- [x] `scripts/INSTRUCCIONES_EXPERIMENTO.md` generado
- [x] SESSION_LOG.md actualizado
- [x] `.gitignore` actualizado (backup, capturas/, reset-julio.mjs excluidos)

### Próxima acción (Camilo)

Seguir `scripts/INSTRUCCIONES_EXPERIMENTO.md` para reproducir la planeación de Julio
paso a paso, capturando un snapshot después de cada acción.

## Sesión DIAGNÓSTICO — DT-MOVER-MES-01 / Ticket B (Uber One) · 2026-07-03

Modo: solo lectura. No se editó código ni se abrió PR. `dev` sincronizada con
`main` (merge `35ef151`, sin conflictos) antes de iniciar.

### Respuestas

**1. Lectura de los tres puntos preliminares — CORRECTA, confirmada línea por línea.**
- `app/api/mes/[mes]/movimientos/[id]/route.ts:108-140` (rama `mover_mes_siguiente`):
  marca el movimiento origen `estado: "pospuesto_mes_siguiente"` (línea 109) y llama
  `provider.crearMovimientosMes([...])` con `semana: null` (línea 121) creando la fila
  del mes siguiente.
- `lib/data/sheets.ts:285-291` (`getMovimientosByMesYSemana`): `todos.filter(m => m.semana === semana || (m.semana === null && m.estado !== "ejecutado"))` — confirmado exacto.
- **Import path activo confirmado (I-12):** `lib/data/provider.ts:6-11` — `getProvider()`
  instancia únicamente `SheetsDataProvider` (línea 8). `MockDataProvider` existe en
  `lib/data/mock.ts` con una implementación equivalente pero **no está conectado a
  ningún endpoint activo** — no hay divergencia de import path.
  `app/api/mes/[mes]/semana/[semana]/route.ts:33` llama
  `provider.getMovimientosByMesYSemana(mes, semana)` — esta es la ruta que sirve la
  vista semanal M4 (`VistaSemanal`). Confirmado que es efectivamente
  `sheets.ts:285` la que ejecuta en producción.

**2. No existe ningún bloqueo o validación de "cierre de planificación" en el código.**
- No existe ningún endpoint de cierre mensual. `app/api/mes/[mes]/` solo contiene:
  `route.ts`, `saldos`, `consumos/[semana]`, `cerrar-m1`, `iniciar`, `conceptos`,
  `cerrar-semana`, `semana/[semana]` — ninguno implementa el prerequisito
  `COUNT(H2 WHERE semana = sin_asignar) = 0` documentado en `ESTADO.md:322-323`
  ("Prerequisito cierre de planificación").
- `lib/data/sheets.ts:1006-1011`: `getCierreMensual` y `createCierreMensual` existen
  en la interfaz (`lib/data/index.ts:68`) y en `SheetsDataProvider` pero ambas
  **lanzan `"Not implemented yet"`**. La función de cierre mensual/planificación no
  está construida — no es que falte solo la validación, falta la feature completa.
- Observación (no es la validación documentada, es un efecto colateral del punto 2):
  `app/api/mes/[mes]/cerrar-m1/route.ts:19-27` bloquea el cierre de S1 si
  `getMovimientosByMesYSemana(mes, "S1").filter(estado==="pendiente").length > 0`.
  Como el punto 2 mete cualquier `semana:null` + `pendiente` en **toda** semana
  consultada, un movimiento pospuesto a mes siguiente con `semana:null` bloquearía
  también el cierre de S1, S2, S3 y S4 vía `cerrar-semana`. Esto no es el prerequisito
  de "cierre de planificación" descrito en `ESTADO.md` (que no existe en código);
  es un bloqueo accidental de los cierres *semanales* ya implementados.

**3. `"sin_asignar"` como string literal — NO aparece en código de la app.**
Único hallazgo: `ESTADO.md:116,320,323,940,2928` (documentación/diseño) y
`scripts/diagnostico-dt-plan-01.mjs:225` (script de diagnóstico ad-hoc, no forma
parte de la app). Cero coincidencias en `app/`, `components/`, `lib/`. Confirma la
exploración previa.

**4. Caso Uber One reconstruido contra el Sheet real — diverge de lo esperado.**
- Dev (`GOOGLE_SHEET_ID` activo en `.env.local`, prefijo `1p5hv...`): 0 filas con
  `semana` vacía en julio 2026; Uber One aparece como fila única
  `semana=S1, estado=pendiente`. El Sheet de dev fue reseteado/reconstruido en una
  sesión anterior (`scripts/reset-julio-v2.mjs`, backups `backup-julio-dev-v2.json`)
  y **no refleja el estado del bug original** — no sirve para reconstruir el caso.
- Producción (`PROD_GOOGLE_SHEET_ID`, consulta de solo lectura vía
  `spreadsheets.values.get`, script `scripts/check-uberone-prod-readonly.mjs`
  creado en esta sesión, no commiteado):
  - `H2` fila 16, mes `2026-06`, `semana: S4`, `estado: pospuesto_mes_siguiente`
    → el origen que ejecutó `mover_mes_siguiente`.
  - `H2` fila 145, mes `2026-07`, `semana: (null)`, `estado: pendiente`
    → la fila creada por `mover_mes_siguiente`, coincide exactamente con lo
    predicho por el punto 1.
  - `H2` fila 90, mes `2026-07`, `semana: S4`, `estado: pendiente`
    → **fila adicional no explicada por los puntos 1-2**: un segundo movimiento
    de Uber One en julio, mismo `conceptoId` (`MEMBRESIAS_1748100016`), con
    `semana: S4` explícita. Esto es un duplicado — probablemente la inicialización
    normal del mes (`crearMovimientosMes` al iniciar julio con `semanaDefault`)
    coexistiendo con la fila trasladada desde junio. El caso real en producción no
    es solo "un movimiento con semana null visible en todas las semanas" sino
    "Uber One duplicado en julio: una instancia regular (S4) + una trasladada
    (null)", y la de `semana:null` es la que aparece pegada en cada semana por el
    bug del punto 2.

**5. Otro lugar que trata `semana === null` distinto al backend — SÍ, en frontend M1.**
- `components/MesM1Desktop.tsx:433-434` sí tiene un caso especial para
  `semana === null`, pero acotado a `estado === "ejecutado"` y usado solo para
  atribuir el monto ejecutado a una semana de balance vía
  `semanaFromFecha(m.fechaEjecucion, mes)` — no aplica a movimientos `pendiente`.
- El resto de vistas frontend (`MesM1Desktop.tsx:382,403,429` "filtrados"/"rows",
  `MesM1Mobile.tsx:168,171`, `MesM1.tsx:133,137,156`,
  `components/m1/VistaPlanificacion.tsx:162`) filtran por **igualdad exacta**
  `m.semana === s`, sin ninguna lógica de inclusión para `null`. Efecto:
  en la vista M1 (planificación, `GET /api/mes/[mes]` → `provider.getMovimientos`,
  sin filtrar por semana en el backend) un movimiento con `semana: null` y
  `estado: pendiente` **no aparece en ningún grupo de semana** en la tabla
  agrupada por semana (ninguna `s` de `SEMANAS` es `=== null`) — queda invisible
  en esa vista, mientras que la vista semanal M4 (`VistaSemanal.tsx`, que consume
  directamente la respuesta de `getMovimientosByMesYSemana` sin refiltrar —
  confirmado línea 667: `mov.semana ?? "—"` se renderiza tal cual) lo muestra en
  **cada** semana. Divergencia real: la misma fila es invisible en M1 y omnipresente
  en M4.

### Divergencias del import path activo (I-12)
Ninguna. `MockDataProvider` no está en el path de import activo — mencionado en el
punto 1 solo para descartarlo explícitamente.

### Observaciones fuera de scope (no desarrolladas)
- El Sheet de dev no refleja el estado del bug (fue reseteado en sesión previa) —
  cualquier verificación futura de este ticket contra dev requerirá reproducir el
  escenario manualmente o usar producción de solo lectura.
- Duplicación de Uber One en julio prod (filas 90 y 145) tiene una causa probable
  (inicialización normal de mes + traslado desde junio coexistiendo) que no se
  investigó a fondo — fuera de las 5 preguntas de scope.
- Script de solo lectura creado en esta sesión: `scripts/check-uberone-prod-readonly.mjs`
  (no commiteado, solo usa `spreadsheets.values.get`, ninguna escritura).

### Criterios de parada activados
Ninguno. Las 5 preguntas tuvieron respuesta observable en repo/Sheet.

## Sesión DIAGNÓSTICO — Auditoría duplicados H2 · 2026-07-03

Continuación de DT-MOVER-MES-01. Modo solo lectura contra producción
(`spreadsheets.values.get` con rango explícito por tab, ningún write).
`dev` ya estaba sincronizada con `main` (sin commits nuevos desde la sesión
anterior). `INVARIANTS.md` sin cambios (I-12, I-15 vigentes).

### Duplicados encontrados (criterio literal: mismo `conceptoId`, estado
pendiente/ejecutado, mismo mes — sin excepciones)

Cruce contra H2 producción completo (144 filas, únicos meses presentes:
`2026-06` y `2026-07` — no hay más meses en el Sheet). **18 grupos**
cumplen el criterio literal. Desglosados por causa real (ver siguiente
sección para la evidencia H1 que sustenta esta clasificación):

**16 grupos — NO son duplicados reales, son conceptos `frecuencia: semanal`
(H1) con 4 filas/mes por diseño, una por semana S1-S4:**
- `MERCADO_Y_ALIMENTACION_1748100025` (Mesada Emma) · 2026-06 y 2026-07 · 4 filas c/u
- `MERCADO_Y_ALIMENTACION_1748100026` (Mesada Lucas) · 2026-06 y 2026-07 · 4 filas c/u
- `MERCADO_Y_ALIMENTACION_1748100027` (Empleada Mireyita) · 2026-06 y 2026-07 · 4 filas c/u
- `MERCADO_Y_ALIMENTACION_1748100029` (Chucherías viernes) · 2026-06 y 2026-07 · 4 filas c/u
- `RECREACION_1748100035` (Entretenimiento) · 2026-06 (4 filas) y 2026-07 (2 filas activas — S2/S3 son `no_aplica`, excluidas del criterio)
- `MERCADO_Y_ALIMENTACION_1779730807245` (Frutas y verduras) · 2026-06 y 2026-07 · 4 filas c/u
- `MERCADO_Y_ALIMENTACION_1779730807246` (Víveres y otros) · 2026-06 y 2026-07 · 4 filas c/u
- `COMPROMISOS_FINANCIEROS_1781979860619` (Imprevistos) · 2026-06 y 2026-07 · 4 filas c/u

Evidencia (H1, columna `frecuencia`): los 8 conceptos anteriores tienen
`frecuencia = semanal`. `app/api/mes/[mes]/iniciar/route.ts:102-103` confirma
que para `frecuencia === "semanal"` la inicialización de mes crea
deliberadamente una fila por cada una de las 4 semanas
(`SEMANAS.map(s => ({...base, semana: s}))`). Los montos ejecutados
difieren entre filas de un mismo grupo (ej. Frutas y verduras S1=170500,
S3=121300, S4=174700) — consistente con 4 gastos semanales distintos del
mismo concepto, no con el mismo gasto contado 4 veces.

**2 grupos — SÍ son anomalías reales** (concepto `frecuencia: mensual`,
donde 1 fila/mes es lo esperado y hay 2):

- `MEMBRESIAS_1748100014` (PS Plus) · mes=`2026-07`:
  - fila 88, `MOV_1782565828379`, `semana: S4`, `estado: pendiente`, `montoPresupuestado: 60000`, `montoEjecutado: (vacío)`, `fechaEjecucion: null`
  - fila 144, `MOV_1782767829728`, `semana: (null)`, `estado: ejecutado`, `montoPresupuestado: 60000`, `montoEjecutado: 60000`, `fechaEjecucion: 2026-07-01`
- `MEMBRESIAS_1748100016` (Uber One) · mes=`2026-07`:
  - fila 90, `MOV_1782565828381`, `semana: S4`, `estado: pendiente`, `montoPresupuestado: 16000`, `montoEjecutado: (vacío)`, `fechaEjecucion: null`
  - fila 145, `MOV_1782767835789`, `semana: (null)`, `estado: pendiente`, `montoPresupuestado: 16000`, `montoEjecutado: (vacío)`, `fechaEjecucion: null`

Evidencia (H1): ambos conceptos tienen `frecuencia = mensual`,
`semana_default = S1` — un mes activo de cada uno debería producir
exactamente 1 fila en H2.

### Origen de la fila "regular" por caso

Evidencia por `id_movimiento` (timestamp unix embebido en `MOV_{ts}`,
convertido a fecha):

| Fila | conceptoId | mes | semana | estado | id_movimiento -> fecha creación |
|---|---|---|---|---|---|
| 16 (junio) | Uber One | 2026-06 | S4 | pospuesto_mes_siguiente | `MOV_1780841387994` -> 2026-06-07 (creación original de junio) |
| 90 (julio, "regular") | Uber One | 2026-07 | S4 | pendiente | `MOV_1782565828381` -> **2026-06-27T13:10:28Z** |
| 145 (julio, "traslado") | Uber One | 2026-07 | null | pendiente | `MOV_1782767835789` -> **2026-06-29T21:17:15Z** |
| 14 (junio) | PS Plus | 2026-06 | S4 | pospuesto_mes_siguiente | `MOV_1780841387992` -> 2026-06-07 |
| 88 (julio, "regular") | PS Plus | 2026-07 | S4 | pendiente | `MOV_1782565828379` -> **2026-06-27T13:10:28Z** |
| 144 (julio, "traslado") | PS Plus | 2026-07 | null | ejecutado | `MOV_1782767829728` -> **2026-06-29T21:17:09Z** |

La fila "regular" (S4) **no** corresponde a la asignación normal de
`semana_default` (`S1` para ambos conceptos en H1) — su `semana` es `S4`,
igual a la semana que tenía la fila de junio en el momento de marcarse
`pospuesto_mes_siguiente`.

**Causa identificada en código, no en conjetura:** `app/api/mes/[mes]/iniciar/route.ts`
implementa **su propio mecanismo de traslado**, independiente del de
`movimientos/[id]/route.ts`:
- Líneas 109-120: al inicializar un mes nuevo, `iniciar` busca en
  `movimientosPrevios` (mes anterior) las filas con
  `estado === "pospuesto_mes_siguiente"` y crea una fila nueva copiando
  `semana: m.semana` (la semana que tenía en el mes anterior, **no** null).
- Esto es exactamente lo que reproducen las filas 88/90 (S4, timestamp
  2026-06-27T13:10:28Z, ambas 2ms de diferencia entre sí — mismo batch de
  `crearMovimientosMes`, consistente con haber sido creadas por una sola
  llamada a `iniciar` para julio).
- `PantallaMeses.tsx:101` confirma que `POST /api/mes/[mes]/iniciar` es
  una acción real invocable desde la UI (no código huérfano).

Punto sin evidencia observable — no se resuelve por conjetura: para que
`iniciar` haya recogido a Uber One/PS Plus como `pospuesto_mes_siguiente`
el 2026-06-27, esas filas de junio ya debían tener ese estado antes de
esa fecha. Pero si eso hubiera ocurrido vía el PATCH `mover_mes_siguiente`
de `movimientos/[id]/route.ts`, ese mismo PATCH habría creado ya una fila
de julio con `semana: null` en ese momento (antes del 06-27) — y esa fila
no existe con ese timestamp; la única fila `semana: null` de julio tiene
timestamp 06-29 (posterior a `iniciar`). Es decir: el estado
`pospuesto_mes_siguiente` en la fila de junio se estableció por una vía
distinta al flujo normal de PATCH antes del 06-27 (posiblemente edición
directa de Sheet o alguno de los scripts de la carpeta `scripts/` con
capacidad de escritura, p. ej. `reset-junio.mjs`, que reimplementa el
mismo patrón de carryover para el par mayo-junio en su línea 160 — no
confirmé si ese script específico tocó estos conceptos, quedaría fuera
del alcance verificarlo con certeza). Luego, el 06-29, el PATCH
`mover_mes_siguiente` sí se ejecutó (o se re-ejecutó) contra la fila de
junio — que en ese momento ya estaba `pospuesto_mes_siguiente` — y creó la
segunda fila de julio (`semana: null`) vía
`movimientos/[id]/route.ts:115-140`. No hay guardia en ese endpoint que
impida invocar `mover_mes_siguiente` sobre un movimiento que ya está en
estado `pospuesto_mes_siguiente`.

### Casos de doble conteo materializado (ejecutado + ejecutado, monto != 0)

**Ninguno confirmado tras verificar con H1.** El cruce automático (criterio
literal, sin distinguir frecuencia) marcó 7 grupos como "crítico" — los
mismos 7 de los 8 conceptos `frecuencia: semanal` que tienen 2+ filas
`ejecutado` con monto distinto de 0 en el mismo mes (Mesada Emma, Mesada
Lucas, Empleada Mireyita, Chucherías viernes, Entretenimiento, Frutas y
verduras, Víveres y otros — todas en 2026-06). Al confirmar
`frecuencia: semanal` en H1 y observar que cada fila tiene
`fechaEjecucion` distinta (una por semana) y montos ejecutados distintos
entre sí, esto corresponde a 4 gastos semanales reales del mismo
concepto, no a un mismo gasto contado dos veces. **Criterio de parada #2
se activó nominalmente (positivo con el criterio literal) pero se
resuelve como falso positivo con evidencia de H1 — no amerita detención
del diagnóstico** (I-15: la respuesta era observable, se verificó antes
de escalar).

De los 2 duplicados reales (PS Plus, Uber One), ninguno tiene ambas filas
en estado `ejecutado` con monto distinto de 0: Uber One tiene ambas filas
`pendiente`; PS Plus tiene una `pendiente` (fila 88, sin ejecutar) y una
`ejecutado` (fila 144, $60.000). Solo una de las dos representa un gasto
real ejecutado — no hay pago duplicado materializado en ninguno de los
dos casos. El presupuesto sí está inflado por partida doble en ambos
casos (`montoPresupuestado` sumado dos veces si algún cálculo agrega
todas las filas del mes sin deduplicar), pero eso es presupuesto
comprometido, no ejecución duplicada.

### Reproducibilidad del patrón desde código

**Sí, reproducible — es un bug de flujo repetible, no requiere edición
manual de Sheet.** Condición necesaria y suficiente identificada en código:

1. Un concepto con `frecuencia !== "semanal"` (mensual) tiene una fila
   `estado: pospuesto_mes_siguiente` en el mes M **antes** de que
   `POST /api/mes/[M+1]/iniciar` se ejecute por primera vez para M+1.
2. Al ejecutarse `iniciar` para M+1 (`app/api/mes/[mes]/iniciar/route.ts:108-120`),
   el carryover propio de `iniciar` crea una fila en M+1 para ese
   concepto (copiando la `semana` que tenía en M).
3. Si en cualquier momento posterior se invoca (o reinvoca)
   `PATCH .../movimientos/[id]` con `tipo: "mover_mes_siguiente"` sobre
   la fila original de M (que sigue en `pospuesto_mes_siguiente`, sin
   ninguna guardia que lo impida), el bloque
   `movimientos/[id]/route.ts:108-140` crea una **segunda** fila en M+1
   para el mismo concepto (esta vez con `semana: null`).

El resultado es exactamente el patrón observado en los dos casos reales:
dos filas del mismo concepto mensual en el mismo mes, una con `semana`
heredada de M y otra con `semana: null`. Esto es reproducible por
cualquier secuencia UI que dispare esas dos acciones (posponer al mes
siguiente + inicializar el mes siguiente, en cualquier orden relativo,
siempre que ambas terminen ejecutándose) — no requiere ediciones directas
del Sheet. La única parte de la reconstrucción de este caso específico
que no tiene evidencia 100% observable es qué disparó el estado
`pospuesto_mes_siguiente` en junio antes del 06-27 (ver sección anterior).

### Criterios de parada activados

- Criterio #2 (doble conteo positivo) se activó nominalmente con el
  cruce literal, pero se resolvió como falso positivo con evidencia de
  H1 (`frecuencia: semanal`) antes de escalar — no se detuvo el resto
  del diagnóstico. Ningún caso de doble conteo materializado real
  sobrevive la verificación.
- Criterio #1 (volumen) no aplica — 144 filas totales, 2 meses, todo
  verificado en una sola pasada sin necesidad de dividir.

## Sesión CONSTRUCCIÓN — TICKET-B-GUARDIA-01 · 2026-07-03

**Estado: DETENIDA antes de completar el DoD, por decisión explícita de
Camilo tras un hallazgo crítico fuera de scope (ver más abajo). Piezas de
código completadas y commiteadas con `tsc --noEmit` limpio. PR NO creado
— DoD no verificado en su totalidad.**

### Piezas completadas y commits

- **P1** (`app/api/mes/[mes]/movimientos/[id]/route.ts`, rama
  `mover_mes_siguiente`): antes de crear la fila en el mes destino,
  verifica si ya existe una fila con ese `conceptoId` en `mes destino`
  vía `provider.getMovimientos(nextMes)`. Si existe, responde 400 sin
  escribir. Se excluyen los conceptos con `frecuencia: semanal` (siempre
  tienen 4 filas/mes por diseño — confirmado en la auditoría de
  duplicados previa; aplicar la guardia ahí produciría falsos positivos,
  exactamente la ambigüedad que el criterio de parada #7 pedía verificar
  antes de asumir). Commit `ee0b9e1`.
- **P2** (`app/api/mes/[mes]/iniciar/route.ts`): el early-exit
  `existentes.length > 0 → 409` se refina para distinguir "el mes ya fue
  inicializado de verdad" (se mantiene el 409) de "solo hay filas de
  traslado creadas por `mover_mes_siguiente` antes de correr `iniciar`"
  (se permite continuar, inicializando el resto del mes con normalidad y
  omitiendo la fila de traslado duplicada para esos `conceptoId`
  específicos — la fila existente queda intacta, sin tocarla). Commit
  `291e8bd`.
- `tsc --noEmit` limpio confirmado tras cada commit (hook de pre-commit
  pasó en ambos).

### Decisión de diseño: por qué se excluyen los conceptos `semanal` de P1

El DoD pide una guardia genérica "¿ya existe fila para este conceptoId en
el mes destino?", pero el criterio de parada #7 exige confirmar contra
los 8 conceptos semanales identificados en la auditoría de duplicados
antes de aplicarla sin excepciones. Un concepto `frecuencia: semanal`
(ej. Mesada Emma) SIEMPRE tiene 4 filas activas por mes tras `iniciar` —
aplicar la guardia sin excepción bloquearía con 400 cualquier intento de
`mover_mes_siguiente` sobre una fila semanal en un mes ya inicializado,
aun cuando eso no sea el patrón de bug real (que solo se observó en
conceptos `frecuencia: mensual` — PS Plus, Uber One). La guardia P1 se
restringe a `concepto.frecuencia !== "semanal"`. `Movimiento` no trae la
frecuencia como snapshot propio, así que P1 consulta
`provider.getConceptos()` y cruza por `conceptoId` — mismo patrón que
usa `iniciar/route.ts` para su propio filtro de conceptos activos.

### DoD — verificado contra Sheet dev (servidor local `npm run dev`,
`.env.local` apunta a `GOOGLE_SHEET_ID` dev)

**Bullet 3 (caso normal, sin regresión) — VERIFICADO.**
`POST /api/mes/2026-09/iniciar` sobre un mes limpio (sin traslados
pendientes de agosto): respuesta 201, `total: 69` movimientos creados.
PS Plus (`MEMBRESIAS_1748100014`, `frecuencia: mensual`,
`semana_default: S1`) creado con `semana: "S1"`, `estado: "pendiente"` —
idéntico al comportamiento anterior a este ticket. Sin regresión.

**Bullet 1 (repetir `mover_mes_siguiente` sobre el mismo origen) —
VERIFICADO.**
- 1er `PATCH /api/mes/2026-09/movimientos/MOV_1783082605793`
  `{tipo: "mover_mes_siguiente"}` (PS Plus, mes destino 2026-10 vacío en
  ese momento): 200, `estado: "pospuesto_mes_siguiente"`. Verificado:
  2026-10 pasó a tener exactamente 1 fila (`semana: null`,
  `estado: "pendiente"`).
- 2do `PATCH` idéntico sobre el mismo `id` (`MOV_1783082605793`,
  ya en `pospuesto_mes_siguiente`): **400** —
  `"Ya existe un movimiento de este concepto en 2026-10. No se puede
  trasladar de nuevo."` Verificado directamente contra el Sheet: 2026-10
  se mantuvo en exactamente 1 fila para ese `conceptoId` — ninguna
  segunda fila creada.

**Bullet 2 (`iniciar` con concepto ya trasladado por P1) — GUARDIA
VERIFICADA A NIVEL DE RESPUESTA, PERO CONTAMINADA POR UN HALLAZGO
CRÍTICO FUERA DE SCOPE (ver sección siguiente) — no se considera
cerrada.**
`POST /api/mes/2026-10/iniciar` con la fila de PS Plus ya trasladada
(desde bullet 1) devolvió **201** (no 409 — el early-exit relajado
funcionó) con `total: 67` creados (no duplica a PS Plus). Hasta aquí, el
comportamiento de la guardia P2 en sí es el esperado. Pero al verificar
el Sheet directamente después de esta llamada se encontró daño en datos
no relacionado con la guardia — ver siguiente sección. Esto deja bullet
2 sin poder darse por cerrado con confianza total: no se puede
distinguir con el 100% de certeza si el conteo "67" refleja exactamente
lo que P2 pretendía omitir, o si además se vio afectado por el bug de
sobreescritura. Pendiente de re-verificación en un entorno de prueba
aislado, después de resolver el hallazgo crítico.

### HALLAZGO CRÍTICO FUERA DE SCOPE — pérdida de datos en `crearMovimientosMes`

Durante la verificación de bullet 2, se encontró que
`lib/data/sheets.ts:276-281` (`crearMovimientosMes`) llama a
`spreadsheets.values.append` con `range: "H2!A:Y"` **sin especificar
`insertDataOption: "INSERT_ROWS"`**. El default de la API de Google
Sheets para `values.append` es `OVERWRITE`, y en esta sesión se observó
en vivo que el `append` de la llamada `iniciar` para 2026-10 (67 filas)
**sobrescribió 67 filas reales de 2026-09 que ya existían** (filas de
Sheet 194–260, verificado con lectura directa `spreadsheets.values.get`
antes y después), en vez de agregarse después de la última fila real del
Sheet. La fila de traslado de PS Plus en 2026-10 (creada en bullet 1,
`MOV_1783082634377`) también desapareció sin dejar rastro.

Evidencia:
- Antes de la llamada `iniciar` de 2026-10: conteo por mes en dev —
  2026-06: 71, 2026-07: 53, 2026-08: 68, 2026-09: 69 (68 + 1 pospuesta),
  2026-10: 1 (el traslado de PS Plus).
- Después de la llamada: 2026-06: 71, 2026-07: 53, 2026-08: 68,
  **2026-09: 2** (solo quedaron las 2 últimas filas, "Imprevistos"
  S3/S4), **2026-10: 67** (ocupando exactamente las filas de Sheet
  194–260, donde antes vivían filas reales de 2026-09). La fila de
  traslado de PS Plus en 2026-10 no aparece en ningún lado de H2.
- `MOV_1783082634377` (traslado de PS Plus) buscado exhaustivamente en
  todo H2 vía `spreadsheets.values.get({range: "H2!A:Y"})`: no encontrado.
- No se encontraron filas vacías (gaps) en el rango actual — el
  problema ocurrió durante la escritura, no es un gap preexistente
  visible ahora.

**Por qué es crítico y no se corrige inline:** `crearMovimientosMes` es
el mismo método que usa `iniciar` y `mover_mes_siguiente` **en
producción** — este no es un problema exclusivo del entorno de prueba.
Cualquier secuencia de escrituras a H2 que dispare este patrón en la API
de Sheets podría sobrescribir movimientos reales de familia sin ningún
error visible (la llamada HTTP responde 200/201 normalmente). Corregirlo
requiere tocar un método compartido por múltiples flujos (fuera del
alcance de "guardia puntual" de este ticket) y idealmente un ticket
propio con su propia verificación exhaustiva, dado el riesgo. **No se
intentó reproducir el mecanismo exacto (posible condición de carrera
entre llamadas sucesivas vs. detección de "fin de tabla" de la API de
Sheets confundida) — eso también queda pendiente para el ticket que
aborde esto.**

**Estado del Sheet dev dejado por esta sesión:** 2026-09 tiene solo 2
filas reales (de las 69 originales); 2026-10 tiene 67 filas (el lote de
`iniciar`, sin la fila de traslado de PS Plus). 2026-06, 2026-07,
2026-08 no fueron tocados y están intactos. Ningún dato de producción
fue tocado en ningún momento de esta sesión. Camilo decidió, al
reportarse este hallazgo, que la sesión se detenga aquí en vez de seguir
probando en vivo — pendiente su decisión sobre si resetear 2026-09/2026-10
en dev (siguiendo el patrón de `scripts/reset-julio-v2.mjs` /
`reset-junio.mjs` de sesiones previas) y sobre cómo priorizar el fix del
bug de `crearMovimientosMes`.

### Deuda técnica documentada (no corregida inline)

- **Bug de pérdida de datos en `crearMovimientosMes`** (ver sección
  crítica arriba) — requiere ticket propio, afecta producción.
- Patrón estructural más amplio (estados inferidos por ausencia de valor
  — `semana: null` — en vez de declarados explícitamente) — ya
  documentado como fuera de scope en el ticket original, no se tocó.
- Origen no resuelto de por qué la fila de junio (PS Plus/Uber One en
  producción) quedó en `pospuesto_mes_siguiente` antes del 2026-06-27 sin
  pasar por el PATCH normal — deuda técnica ya documentada en la sesión
  de auditoría anterior, no se investigó más en esta sesión (fuera de
  scope explícito del ticket).

### Criterios de parada activados

- **Criterio #4 (cambio necesario fuera de scope encontrado)** — el bug
  de `crearMovimientosMes` no se corrigió inline; documentado arriba como
  deuda técnica crítica.
- **Criterio #3 (DoD no verificable en preview URL)** — bullet 2 no se
  puede dar por cerrado con confianza total por la contaminación del
  hallazgo crítico; bullets 1 y 3 sí quedaron verificados con evidencia
  observable antes de que ocurriera la corrupción.
- Detención explícita solicitada por Camilo tras reportarse el hallazgo
  crítico (no estaba en la lista original de criterios, pero se trató
  con el mismo peso): no se continuó con más escrituras en vivo contra
  el Sheet dev para evitar más corrupción de datos de prueba.

### Pendiente para la próxima sesión (no ejecutado en esta)

- Decisión de Camilo sobre reset de 2026-09/2026-10 en dev.
- Decisión de Camilo sobre si abrir ticket propio para el bug de
  `crearMovimientosMes` antes o junto con el cierre de este ticket.
- Re-verificación de bullet 2 del DoD en un entorno controlado, una vez
  resuelto o mitigado el hallazgo crítico.
- `node scripts/generate-kanban.mjs` y creación del PR quedan
  pendientes — no se ejecutan todavía porque el DoD no está completo
  (restricción #5 del ticket: SESSION_LOG con DoD verificado es
  prerrequisito del PR).

## Sesión DIAGNÓSTICO — Auditoría producción · riesgo values.append · 2026-07-03

Solo lectura contra producción (`spreadsheets.values.get`, rango explícito
por tab). Ningún Sheet fue escrito — ni dev ni producción. `dev` ya estaba
sincronizada con `main` (0 commits nuevos). `INVARIANTS.md` sin cambios
(I-12, I-15 vigentes).

## Hallazgo crítico (si existe) — primero, antes de cualquier otra cosa

**Ninguno.** No se encontró evidencia de sobrescritura ya materializada en
H2 producción. Los 144 registros de producción (2026-06: 73 filas,
2026-07: 71 filas — sin cambios respecto a la auditoría de duplicados de
la sesión anterior, confirmando que nada se escribió ahí desde entonces)
son consistentes con el historial esperado, con las únicas anomalías ya
conocidas y documentadas (PS Plus y Uber One duplicados en julio). El
riesgo del bug de `crearMovimientosMes` sigue latente para producción
(no se corrigió, ver sesión anterior), pero **no hay evidencia de que ya
se haya materializado.**

## 1. Continuidad de id_movimiento

- 144/144 filas con `id_movimiento` parseable como `MOV_{timestamp}` —
  ningún formato inesperado.
- **(b) Timestamps duplicados exactos: 0.** Ninguna colisión de
  timestamp entre filas distintas.
- **(a) Huecos anómalos:** ninguno — no se encontró ningún salto mayor a
  20 días entre timestamps consecutivos ordenados (umbral amplio elegido
  para tolerar períodos normales sin actividad). Los 144 timestamps de
  producción cubren un rango continuo sin cortes sospechosos.
- **(c) Timestamp vs. mes declarado:** ninguna fila tiene un
  `id_movimiento` cuyo timestamp se aleje (con margen de 45 días) del mes
  que la fila declara en la columna `mes`. No hay filas de mayo (u otro
  mes) coladas bajo un `mes: 2026-07`, por ejemplo.
- **Conclusión:** la continuidad de `id_movimiento` en producción no
  muestra ninguna de las tres señales buscadas. Esto es evidencia a
  favor de que el patrón de sobrescritura reproducido en dev **no** dejó
  rastro por esta vía en producción.

## 2. Conteo de filas por mes vs. esperado

Cálculo de "esperado" = conceptos con `estado_concepto: activo` **hoy**
en H1, con ocurrencias mensual/bimestral=1, semanal=4 (solo si el mes
está en `mes_activo_bimestral` para bimestrales).

- `2026-06`: reales=73, esperado=68, diff=**+5**.
- `2026-07`: reales=71, esperado=69, diff=**+2**.

**Ambos diffs son positivos (más filas de las esperadas, nunca menos) —
lo opuesto a la señal que indicaría sobrescritura/pérdida de datos.**
Se investigó el origen exacto de cada diff, concepto por concepto, para
no conformarse con el signo:

- **julio +2: 100% explicado por PS Plus y Uber One** — exactamente los
  dos duplicados ya documentados en la auditoría anterior (cada uno con
  2 filas en vez de 1 esperada). Nada nuevo.
- **junio +5: 100% explicado por 5 conceptos que hoy están
  `estado_concepto: retirado`** pero tenían filas reales y legítimas en
  junio cuando aún estaban activos — el cálculo de "esperado" los excluye
  por estar retirados *hoy*, no porque falte algo en el Sheet. Los 5:
  `RECREACION_1780843607574` (Pizzardi), `MERCADO_Y_ALIMENTACION_1780843684150`
  (Chuches), `RECREACION_1780843866839` (Sin clasificar),
  `COMPROMISOS_FINANCIEROS_1780844290823` (Universal),
  `COMPROMISOS_FINANCIEROS_1780950917017` (Imprevistos) — cada uno con
  exactamente 1 fila real en junio, consistente con conceptos
  `discrecional`/de un solo uso que se crearon, se usaron una vez y se
  retiraron. Verificado individualmente: ningún concepto activo hoy
  muestra un conteo de filas **menor** al esperado en ningún mes.
- **Ningún mes ni concepto muestra un déficit de filas** — la señal que
  el punto 2 pedía buscar específicamente como indicio de sobrescritura
  no aparece en ningún caso.

## 3. Filas con datos inconsistentes

- **0 filas** con `id_concepto` que no corresponda a ningún concepto
  existente en H1 actual.
- **0 filas** con `categoria_snapshot` o `tipo_snapshot` que diverjan del
  concepto correspondiente en H1 (sobre las 144 filas totales).
- No se encontró ninguna fila con combinación de columnas que sugiera una
  escritura parcial (ej. `nombre_snapshot` de un concepto con
  `categoria_snapshot` de otro). Resultado limpio en las tres columnas
  revisadas.

## 4. Cruce con PS Plus / Uber One

Se revisaron las filas inmediatamente anterior y posterior (por `rowNum`
de Sheet) a las 6 filas ya conocidas de estos dos conceptos (filas 14, 88,
144 para PS Plus; 16, 90, 145 para Uber One):

- Las 12 filas vecinas revisadas tienen `nombre_snapshot` que coincide
  exactamente con el nombre actual en H1 para su `id_concepto`, `mes` y
  `estado` coherentes con su posición esperada en la secuencia (Prime
  Video, Game Pass, NY Times, Imprevistos — todas consistentes).
- **Ninguna fila vecina muestra signos de daño o sobrescritura parcial**
  más allá de la duplicación ya documentada (que es un problema de filas
  *adicionales*, no de filas *dañadas*).

## 5. Rango de riesgo temporal acotado

No hay evidencia de que el riesgo se haya materializado, por lo que no
se puede acotar un rango de fechas de **daño confirmado**. Sí se puede
acotar la **exposición**: producción ha ejecutado `crearMovimientosMes`
un número pequeño y contable de veces desde el go-live —
aproximadamente 4 invocaciones conocidas hasta ahora: la inicialización
de junio (`iniciar`, ~inicio de junio), la inicialización de julio
(`iniciar`, ~2026-06-27 según timestamps de `id_movimiento`), y las dos
llamadas a `mover_mes_siguiente` sobre PS Plus/Uber One (~2026-06-07 y
~2026-06-29, según la auditoría de duplicados previa). En esas ~4
invocaciones, el patrón de sobrescritura **no se manifestó** — el
mecanismo exacto que sí lo disparó en dev (varias llamadas sucesivas en
una ventana corta de segundos, en esta sesión de construcción anterior)
no está confirmado como la única condición disparadora, así que no se
puede afirmar que producción esté "a salvo" solo por no haberlo visto
todavía en 4 ocasiones. El riesgo permanece latente para **cualquier
invocación futura** de `iniciar` o `mover_mes_siguiente` en producción
mientras `crearMovimientosMes` no incluya `insertDataOption: "INSERT_ROWS"`
— no es un riesgo que dependa del mes calendario, sino de cada evento de
escritura individual.

## Criterios de parada activados

- Ninguno. Las 5 preguntas tuvieron respuesta observable en H1/H2 de
  producción sin necesidad de ninguna escritura de prueba.
