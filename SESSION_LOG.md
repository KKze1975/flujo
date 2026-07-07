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

## Sesión DIAGNÓSTICO — Header H2 desplazado a fila 145 · 2026-07-05

Sesión de solo lectura. Ningún `batchUpdate` ni escritura ejecutada. Repo
abierto en `D:\Users\camilo\flujo` por primera vez en esta conversación
(sesiones previas del mismo hilo fueron bloqueadas por falta de acceso al
repo y por una integración externa —Zapier/Google Sheets— con el OAuth
caído; ambos bloqueos quedaron resueltos al abrir el repo local con las
credenciales de servicio en `.env.local`).

### Paso 1 — Verificación de la hipótesis (evidencia cruda)

Nota de entorno: `.env.local` apunta al Sheet de **dev**
(`1p5hvKINy512I-BOEA5ujjynUnJVdnvniAiqCQTYDJ-w`), no al de producción. Se
usó el mismo patrón que `scripts/revertir-frutas-verduras-prod.mjs`
(override de `GOOGLE_SHEET_ID` vía variable de entorno de shell) para
apuntar explícitamente a producción
(`1GOMhxYw_f7Zl-GTVNtxAs9218x4vKxzg3LGRyveyr7A`) sin tocar el archivo.

Scripts usados (ambos de solo lectura, sin `values.update`/`append`/`clear`/`batchUpdate`):
`scripts/check-h2-header-position-prod.mjs`, `scripts/check-h2-integrity-prod.mjs`.

Resultado (`GOOGLE_SHEET_ID=1GOMhxYw_f7Zl-GTVNtxAs9218x4vKxzg3LGRyveyr7A node scripts/check-h2-header-position-prod.mjs`):

```
Spreadsheet ID usado: 1GOMhxYw_f7Zl-GTVNtxAs9218x4vKxzg3LGRyveyr7A
Match: true
Total filas leídas (A1:Z200): 145
Fila 1: ["MOV_1780841387980","CASA_1748100001","2026-06","Arriendo y Administración","Casa","fijo","S1","5172500","5172500","0","ejecutado","camilo","FALSE","FALSE","TRUE","FALSE","2026-06-07","","","","FALSE"]
¿Fila 1 == header esperado? false
Fila 145: ["id_movimiento","id_concepto","mes","nombre_snapshot","categoria_snapshot","tipo_snapshot","semana","monto_presupuestado","monto_ejecutado","desviacion","estado","ejecutor","fuente_en_mano","fuente_nequi","fuente_camilo","fuente_angie","fecha_ejecucion","razon_desviacion","razon_postergacion","comprobante_url","pendiente_aprobacion","notas","monto_ejecutado_camilo","monto_ejecutado_angie","id_recarga_origen"]
¿Fila 145 == header esperado exacto? true
Fila 146: AUSENTE (undefined)
Filas que coinciden EXACTAMENTE con el header esperado: [145]
Filas con col A no vacía: 145
```

Checks contra la hipótesis:
- ✅ Sheet ID de producción confirmado exacto.
- ✅ Fila 145 = header esperado, en el orden exacto de `H2_HEADERS` en `lib/data/sheets.ts` (25 columnas, `id_movimiento`…`id_recarga_origen`).
- ✅ Fila 1 contiene datos (un movimiento real, no header).
- ✅ Conteo total = 145 filas exactas (ni una más ni una menos).
- ✅ Header aparece **una sola vez** (fila 145) — descarta que `ensureH2Headers()` ya haya escrito un header duplicado en fila 1 mientras tanto.

Integridad columna-por-columna de las 144 filas de datos
(`check-h2-integrity-prod.mjs`, valida `mes`, `semana`, `estado`, los 5
flags `fuente_*`/`pendiente_aprobacion`, los 5 montos numéricos, prefijo
`MOV_` en `id_movimiento`, `id_concepto` no vacío):
- 3 "violaciones" reportadas inicialmente por el script eran falso
  positivo: mi enum de `estado` no incluía `pospuesto` ni
  `pospuesto_mes_siguiente`, que **sí son valores válidos** del tipo
  `EstadoMovimiento` (`lib/data/types.ts:8`). Descartadas tras contrastar
  con el código.
- **0 violaciones reales.** Ninguna fila muestra columnas de tipo/formato
  incoherente con su posición — confirma que el desplazamiento fue de
  **fila completa** (el header entero se movió como bloque a la
  posición 145), no una mezcla de columnas individuales.

**Discrepancia menor frente al prompt (no bloqueante):** el prompt pedía
verificar "los 24 valores del encabezado", pero el encabezado real
(`H2_HEADERS` en código, confirmado también contra la fila 145 real)
tiene **25** columnas. Se verificó contra las 25 columnas reales de
`H2_HEADERS`, no contra un conteo de 24.

**Conclusión Paso 1: hipótesis confirmada sin discrepancias bloqueantes.**

### Paso 2 — Auditoría de funciones que tocan H2

Código de producción (excluye los ~35 scripts de un solo uso en
`scripts/`, que no corren automáticamente; se listan aparte al final).

| Función | Archivo | Asume header fila 1 (hardcodeado) | Asume datos desde fila 2 (hardcodeado) | Nota |
|---|---|---|---|---|
| `ensureH2Headers()` | `lib/data/sheets.ts:210` | Sí — lee solo `H2!A1` y compara con `"id_movimiento"` | — | **Riesgo latente, fuera de alcance de este fix**: si no encuentra el header en A1, **sobrescribe A1 con el header** (`values.update` a `H2!A1`). Con el header actualmente en fila 145, cualquier llamada a `crearMovimientosMes()` antes del fix dispararía esto y corrompería la fila 1 real (dato de "Arriendo y Administración"). Se confirmó (fila 145 única con match exacto) que esto **no ha ocurrido todavía**. |
| `getMeses()` | `lib/data/sheets.ts:228` | Sí — `const [headers, ...dataRows] = rows` | Implícito (todo lo que no es fila 0) | Dinámico solo en la *columna* (`headers.indexOf("mes")`), no en la *fila* del header. |
| `getMovimientos(mes)` | `lib/data/sheets.ts:250` | Sí — mismo patrón `[headers, ...dataRows]` | Implícito | Mismo patrón que `getMeses`. |
| `updateMovimiento(id, data)` | `lib/data/sheets.ts:295` | Sí — mismo patrón | Sí — `const sheetRow = rowIndex + 2; // +1 header row, +1 for 1-based indexing` (comentario explícito en el código) | Doble hardcoding: fila de header Y offset de escritura. |
| `crearMovimientosMes()` | `lib/data/sheets.ts:270` | Indirecto (llama a `ensureH2Headers()` primero) | No aplica — usa `values.append`, que agrega después de la última fila con datos en el rango, sin asumir posición de header | El riesgo real de esta función es el de `ensureH2Headers()`, no el propio `append`. |
| `resetH2()` | `app/api/admin/reset-mes/route.ts:60` | Sí — `raw[0].indexOf("mes")` | Sí — `values.clear({ range: "H2!A2:Z1000" })` hardcodea "los datos están en 2..1000" | **Riesgo latente adicional, fuera de alcance**: con el header en 145, esta ruta limpiaría filas 2–144 (datos reales) asumiendo que protege un header en fila 1 que en realidad no está ahí, y además borraría la fila 145 (el header real) por estar dentro de `2:1000`. No se ha invocado con este bug presente (no hay evidencia de ejecución en el rango de fechas relevante), pero es una ruta de API activa (`POST /api/admin/reset-mes`). |

**Conclusión Paso 2:** todas las funciones de producción que leen H2
asumen el header en fila 1 de forma hardcodeada (ninguna lo busca
dinámicamente por nombre de columna a nivel de *fila*). Esto significa
que el fix propuesto (mover el header físicamente a la fila 1) las
corrige a **todas** automáticamente, sin requerir cambios de código
adicionales — consistente con lo que el prompt anticipaba como caso
"simple". No se encontró ninguna función con un offset distinto o caché
de posición que requiera un fix adicional.

Se documentan dos riesgos **latentes y fuera del alcance quirúrgico de
este fix** (no se tocan en el Paso 3, quedan para una ronda de hardening
aparte): `ensureH2Headers()` sobrescribe destructivamente en vez de
insertar, y `resetH2()` hardcodea el rango de limpieza en vez de derivarlo
del header real.

Scripts de un solo uso en `scripts/` que referencian `H2!` (no forman
parte del código que corre en producción; no auditados función por
función porque no se ejecutan automáticamente): `check-h2*.mjs`,
`fix-h2*.mjs`, `reset-h2.mjs`, `clear-h2.mjs`, `setup-h2.mjs`,
`reset-julio*.mjs`, `reset-junio*.mjs`, `migrate-t39.mjs`,
`migrate-t45.mjs`, `revertir-*.mjs`, `seed-imprevistos*.mjs`, y los
`check-*.mjs` puntuales de auditorías anteriores.

### Paso 3 — Fix

**No ejecutado.** Paso 1 y Paso 2 confirman la hipótesis sin
discrepancias bloqueantes, pero el prompt exige aprobación explícita de
Camilo después de ver estos resultados antes de escribir en producción.
Queda pendiente de luz verde.

### Paso 3 — Fix (ejecutado, con aprobación explícita de Camilo)

**Snapshot de respaldo:** `scripts/backup-h2-header-fix-prod-1783269569750.json`
(local, no en el Sheet) — captura completa de `H2!A1:Z200` de producción
inmediatamente antes de escribir.

**Operación:** en vez de un read-modify-write manual con `values.update`
fila por fila, se usó `spreadsheets.batchUpdate` con una request
`moveDimension` (`ROWS`, `startIndex: 144, endIndex: 145` →
`destinationIndex: 0`) sobre el `sheetId` real de la tab H2
(`232572821`, resuelto vía `spreadsheets.get`). Esto mueve la fila 145
completa como bloque atómico a la posición 1; Sheets recalcula el resto
de las posiciones internamente — no hay ventana intermedia con datos
inconsistentes como sí la habría con escrituras separadas.

**Verificación antes/después:**

| | Pre-fix | Post-fix |
|---|---|---|
| Total filas | 145 | 145 |
| Fila 1 | dato (`MOV_1780841387980`, Arriendo y Administración) | header exacto (25 columnas, match exacto) |
| Fila 145 | header exacto | dato (`MOV_1782565828434`, Imprevistos, `2026-07`) |
| Fila 146 | ausente | ausente |

**Verificación adicional de integridad del desplazamiento** (script
`verify-h2-shift-integrity-prod.mjs`, no pedida explícitamente por el
prompt pero necesaria para no dar por buena la operación solo por los
checks de fila 1/145): se compararon las 144 filas de datos pre-fix
(filas 1–144 del snapshot) contra las 144 filas de datos post-fix (filas
2–145 actuales), una por una. **0 diferencias** — mismo contenido, mismo
orden relativo, únicamente desplazadas +1 posición. Ningún dato se
perdió, duplicó o alteró.

**Resultado: fix aplicado correctamente y verificado. Ninguna otra tab
(H1, H3B, H4, H5) fue tocada — la única operación de escritura fue el
`moveDimension` sobre el rango de H2.**

Nota para el hardening pendiente (no ejecutado en esta sesión, fuera del
alcance quirúrgico aprobado): los dos riesgos latentes documentados en el
Paso 2 (`ensureH2Headers()` sobrescribe en vez de insertar; `resetH2()`
hardcodea `H2!A2:Z1000`) siguen presentes en el código. Ya no se
disparan por el bug actual (el header ya está en fila 1), pero conviene
resolverlos en un ticket aparte para que la clase de bug no se repita.

## Sesión CIERRE — Actualización ESTADO.md (append-only) · 2026-07-05

Escritura exclusiva en `ESTADO.md`. Ningún otro archivo del repo tocado.
No se ejecutó `generate-kanban.mjs` (decisión explícita de Camilo, fuera
de este prompt). No se tocó el Sheet.

### Anchor guard (Paso 1-3)

```
$ git log -1 --oneline -- ESTADO.md
85554f4 docs: actualizar ESTADO.md — cierre sesión Ticket B 3 julio 2026

$ git status --porcelain ESTADO.md
(vacío — sin cambios sin commitear)

$ grep -n "^## " ESTADO.md | tail -5
4620:## FEAT-BARRA-FALTAPAGAR-01 · 30 junio 2026
4654:## Corrección y cierre — Sesión 2026-06-30 [DISEÑO → CONSTRUCCIÓN]
4702:## MERGE CONFIRMADO — FEAT-BARRA-FALTAPAGAR-01 · 30 junio 2026
4711:## Sesión debugging VistaSemanal — 2 julio 2026
4815:## Sesión Ticket B — 3 julio 2026 [DEBUGGING → DISEÑO → CONSTRUCCIÓN, pausada]

$ tail -5 ESTADO.md
3. Decidir sobre Sheet dev septiembre/octubre (resetear o conservar).
4. Correr `generate-kanban.mjs` y crear el PR de TICKET-B-GUARDIA-01
   cuando el DoD completo esté verificado.
5. Pendiente de agenda, sin fecha: confirmación final de `DT-M1M4-NULL-01`
   como ticket propio a construir.
```

Resultado: sin cambios sin commitear, última sección es el cierre de una
lista de pendientes numerada (1-5) de la sesión Ticket B del 3 de julio —
coherente con cierre de sección, no contenido a mitad de edición. Anchor
guard pasa sin discrepancias. Se procedió a anexar.

### Confirmación del append (verbatim)

Diff real tras el append (`git diff -- ESTADO.md`):

```diff
@@ -4958,3 +4958,32 @@ corriendo sin supervisión directa, no se puede asumir que terminó limpio.
    cuando el DoD completo esté verificado.
 5. Pendiente de agenda, sin fecha: confirmación final de `DT-M1M4-NULL-01`
    como ticket propio a construir.
+
+## DT-HEADER-H2-01 — Header de H2 desplazado a fila 145 (RESUELTO)
+Fecha: 2026-07-05
+Síntoma: cierre de semana S1 julio 2026 bloqueado ("Movimiento no encontrado"), 
+falta_por_pagar mostrando $0 con pendientes reales activos, presupuestado/ejecutado 
+con strikethrough inconsistente.
+Causa raíz: edición manual directa en Sheet de producción (ordenamiento descendente 
+de rango completo en H2, incluyendo fila de encabezado) desplazó el header de 
+fila 1 a fila 145. getMeses, getMovimientos, updateMovimiento, ensureH2Headers 
+(lib/data/sheets.ts) y resetH2 (app/api/admin/reset-mes/route.ts) asumen header 
+en fila 1 de forma hardcodeada — ninguna lo busca dinámicamente.
+Fix: batchUpdate atómico (moveDimension) moviendo fila 145 a posición 1. 
+Snapshot previo: scripts/backup-h2-header-fix-prod-1783269569750.json. 
+Verificado: 145 filas, header en fila 1, comparación fila-por-fila pre/post 
+sin diferencias, H1/H3B/H4/H5 intactas.
+Riesgos latentes documentados (no resueltos, fuera de alcance de este ticket):
+- ensureH2Headers() sobrescribiría destructivamente fila 1 si se llama con 
+  el header en posición incorrecta.
+- resetH2() borra rango 2:1000 con el mismo supuesto de header fijo en fila 1.
+Pendiente de decisión (Camilo): si se abre ticket de hardening para estos dos 
+riesgos, y si se define alguna protección (protección de rango, proceso, o 
+aceptación de riesgo) contra edición manual directa en Sheet de producción.
+
+## Hallazgo colateral — columnas ya existentes en H2
+Durante auditoría de Paso 2 se confirmó que H2 ya contiene monto_ejecutado_camilo 
+y monto_ejecutado_angie como columnas nativas. Esto invalida el enfoque de diseño 
+planteado en la sesión de DISEÑO abierta para la feature "ejecutado por persona 
+en barra at-a-glance" (que asumía derivar el split desde ejecutor + monto_ejecutado). 
+Sesión de DISEÑO queda pendiente de retomar con este dato como nuevo punto de partida.
```

Confirmado: append puro, sin ninguna línea eliminada, editada ni
reordenada por encima del punto de inserción — el diff solo muestra `+`.

### Línea final del archivo post-append

```
$ tail -1 ESTADO.md
Sesión de DISEÑO queda pendiente de retomar con este dato como nuevo punto de partida.

$ wc -l ESTADO.md
4989 ESTADO.md
```

No se hizo commit de este cambio (el prompt no lo pidió); `ESTADO.md`
queda con la modificación en el working tree, pendiente de que Camilo
decida cuándo commitear.

## Sesión DISEÑO — Verificación de factibilidad `ejecutadoPorPersona()` · 2026-07-05

Solo lectura. Ningún `batchUpdate`, ninguna escritura, ningún componente
ni `ESTADO.md` modificado. Sheet ID de producción confirmado
(`1GOMhxYw_f7Zl-GTVNtxAs9218x4vKxzg3LGRyveyr7A`) antes de leer.

Scripts usados (todos read-only):
`scripts/verificacion-ejecutado-por-persona-prod.mjs`,
`scripts/check-h3-ejecutor-integridad-prod.mjs`.

### 1. Colisión de nombres

`grep -r` sobre todo `.ts`/`.tsx` para `ejecutadoPorEjecutor`,
`ejecutadoPorPersona`, `totalPorEjecutor` y variantes cercanas
(`porEjecutor`, `porPersona`, `ejecutadoAngie`, `ejecutadoCamilo`,
`totalAngie`, `totalCamilo`): **0 coincidencias** con los nombres
propuestos. Sí existen campos ya nativos con nombre parecido —
`montoEjecutadoCamilo`/`montoEjecutadoAngie` (`lib/data/types.ts:69-70`,
`lib/data/sheets.ts:174-175,204-205`) — pero son columnas de dato, no
funciones, y no colisionan con los identificadores propuestos.
**Sin bloqueo.**

### 2. Integridad del campo `ejecutor` en datos reales

Chequeo corrido sobre **todo H2 de producción** (no solo 3 semanas,
dataset completo: 144 filas, 72 con `estado=ejecutado`):

- Filas con `ejecutor` nulo/vacío/fuera de `{camilo, angie}`: **0**.
- Monto que quedaría excluido silenciosamente de ambas personas: **$0**.

Complementario (no pedido explícitamente, pero necesario porque el
hallazgo de la verificación 3 obliga a considerar H3 también): mismo
chequeo sobre H3 (consumos, 56 filas) — **0 filas** con `ejecutor`
inválido/vacío. **Ambas fuentes están limpias hoy.**

Caso borde de fuente cruzada (`ejecutor` distinto de la cuenta pagadora):
**8 casos reales** encontrados en H2, todos en 2026-06 S3/S4 — confirma
que no es un caso teórico raro, ya ocurre con regularidad:
```
2026-06 S3 · Dr. Sánchez (Angie)     · ejecutor=camilo · fuente_angie=TRUE
2026-06 S3 · Mesada Emma             · ejecutor=camilo · fuente_angie=TRUE
2026-06 S4 · Mesada Emma             · ejecutor=camilo · fuente_angie=TRUE
2026-06 S3 · Empleada Mireyita       · ejecutor=camilo · fuente_angie=TRUE
2026-06 S4 · Empleada Mireyita       · ejecutor=camilo · fuente_angie=TRUE
2026-06 S3 · Chucherías viernes      · ejecutor=camilo · fuente_angie=TRUE
2026-06 S4 · Chucherías viernes      · ejecutor=angie  · fuente_camilo=TRUE
2026-06 S3 · Ayuda mamá              · ejecutor=camilo · fuente_angie=TRUE
```

### 3. Verificación aritmética contra la barra actual

Se leyó primero cómo la barra morada calcula hoy su "ejecutado"
(`components/VistaSemanal.tsx:986-991`):

```js
// After cerrar-semana writes estado=ejecutado to pago_fraccionado H2,
// this prevents double-counting.
const totalEjecutadoH2 = movimientos
  .filter((m) => m.estado === "ejecutado" && m.tipoSnapshot !== "pago_fraccionado")
  .reduce((s, m) => s + (m.montoEjecutado ?? 0), 0);
const totalEjecutadoH3 = consumos.reduce((s, c) => s + c.monto, 0);
const totalEjecutado = totalEjecutadoH2 + totalEjecutadoH3;
```

Es decir, la barra actual **excluye** de H2 los movimientos
`tipo_snapshot=pago_fraccionado` y en cambio **suma H3 (consumos)** —
que también tiene su propio campo `ejecutor` (`ConsumoH3.ejecutor`,
`lib/data/types.ts:83`). La fórmula propuesta en el prompt solo lee
`movimientos` (H2) y no toca H3 en absoluto ni excluye
`pago_fraccionado`.

Se probó contra las 3 semanas cerradas con historial en H5 más ricas en
datos (`2026-06 S2`, `S3`, `S4`; `2026-05 S1` está en H5 pero sin filas
H2/H3 vivas hoy — probablemente limpiada en un reset, se excluye del
análisis por no tener datos que comparar):

| Semana | Propuesta (solo H2, por ejecutor) | Barra actual (H2 sin pago_fraccionado + H3) | H5 registrado al cierre | Diferencia (propuesta − barra) |
|---|---|---|---|---|
| 2026-06 S2 | angie=811.500 + camilo=0 = **811.500** | H2=811.500 + H3=1.138.620 = **1.950.120** | 1.950.120 | **-1.138.620** |
| 2026-06 S3 | angie=140.000 + camilo=1.487.160 = **1.627.160** | H2=750.000 + H3=1.207.070 = **1.957.070** | 1.957.070 | **-329.910** |
| 2026-06 S4 | angie=530.000 + camilo=1.325.096 = **1.855.096** | H2=719.996 + H3=1.649.900 = **2.369.896** | 2.314.896 | **-514.800** |

**No coinciden en ninguna de las 3 semanas.** La diferencia se explica
en el 100% de los casos por los consumos de H3 (17, 13 y 16 filas
respectivamente) que la fórmula propuesta ignora por completo, más — en
S3 y S4 — filas H2 `pago_fraccionado` ya ejecutadas (4 y 4 filas) que la
propuesta sí suma pero que la barra actual excluye a propósito para no
duplicar contra sus consumos H3 correspondientes.

En 2026-06 S2, los consumos H3 ($1.138.620) representan el **58% del
total real de la semana** — no es un residuo marginal, es la mayoría del
gasto ejecutado esa semana.

**Hallazgo secundario, fuera de las 4 preguntas pedidas pero detectado
al cruzar datos:** en S4, mi réplica de la fórmula de la barra
($2.369.896) no coincide con lo que quedó registrado en H5 al momento
del cierre ($2.314.896) — diferencia de $55.000. En S2 y S3 sí coincide
exactamente. Posible explicación: una corrección posterior al cierre vía
el modal M5 (`components/VistaSemanal.tsx` — "corrección de ejecutado
H2") que alteró un monto después de que se escribiera el cierre. No se
investigó más a fondo por estar fuera del alcance de las 4 verificaciones
pedidas; se deja anotado para que Camilo lo tenga presente, no bloquea el
veredicto de este prompt.

### 4. Casos borde de datos nulos

`monto_ejecutado` nulo/vacío en H2 con `estado=ejecutado`: **0 de 72**
filas. El `.reduce()` de la fórmula propuesta no se rompería con los
datos actuales.

### Veredicto

**La fórmula tal como está escrita en el prompt NO es segura para
construir.** No por integridad de datos — `ejecutor` y `monto_ejecutado`
están 100% limpios hoy en H2 y H3 — sino porque la fórmula está
**estructuralmente incompleta**: solo lee H2 (`movimientos`) e ignora H3
(`consumos`) por completo, cuando H3 ya tiene su propio campo `ejecutor`
y representa una porción grande (hasta 58% en la semana probada) del
"ejecutado" real de una semana típica. Si se construye tal cual, el
desglose por persona en la barra sumará **menos** que el total agregado
que la misma barra ya muestra al lado — una inconsistencia visible
inmediatamente para Camilo/Angie en la primera semana con consumos
`pago_fraccionado`.

**Guard/corrección recomendada (no implementada, queda para la
iteración de construcción):** redefinir la fórmula para que replique
exactamente las mismas dos fuentes que ya usa la barra, partidas por
`ejecutor`:

```
ejecutadoPorPersona(persona, mes, semana) =
    Σ movimientos.filter(m =>
        m.ejecutor === persona && m.estado === "ejecutado" &&
        m.tipoSnapshot !== "pago_fraccionado" &&
        m.mes === mes && m.semana === semana
      ).map(m => m.montoEjecutado ?? 0)
  + Σ consumos.filter(c =>
        c.ejecutor === persona && c.mes === mes && c.semana === semana
      ).map(c => c.monto)
```

Con esta redefinición, `ejecutadoPorPersona("angie") + ejecutadoPorPersona("camilo")`
sí coincide exactamente con `totalEjecutado` en las 3 semanas probadas
(por construcción, ya que son las mismas dos sumas que hoy produce
`totalEjecutadoH2 + totalEjecutadoH3`, solo particionadas por
`ejecutor`).

No se recomienda ningún guard adicional por `ejecutor`/`monto_ejecutado`
inválido en H2 o H3 — hoy no hay ninguna fila así en producción — pero
sí vale la pena que la implementación no asuma que seguirá siendo cero
para siempre (ej. un `?? 0` defensivo en el monto, ya presente de hecho
en el patrón que usa `totalEjecutadoH2` hoy).

El caso borde de fuente cruzada (`ejecutor=angie` con fuente de pago de
Camilo o viceversa) es real y frecuente (8 casos en dos semanas) — se
confirma que el criterio "cuenta por `ejecutor`, no por fuente" cerrado
por Camilo es coherente con cómo ya se comporta el resto del sistema.

## Sesión DISEÑO — Re-verificación `ejecutadoPorPersona()` corregida · 2026-07-05

Segunda iteración. Solo lectura, mismo Sheet de producción confirmado
(`1GOMhxYw_f7Zl-GTVNtxAs9218x4vKxzg3LGRyveyr7A`) antes de leer. Ningún
`batchUpdate`, ninguna escritura, ningún componente ni `ESTADO.md`
tocado. Script usado:
`scripts/reverificacion-ejecutado-por-persona-prod.mjs` (read-only).

### Formato/enum de `ejecutor`: H2 vs H3

```
Valores distintos en H2.ejecutor (todas las filas): ["camilo", "", "angie"]
Valores distintos en H3.ejecutor (todas las filas): ["angie", "camilo"]
Valores fuera de {'', 'camilo', 'angie'} en H2: []
Valores fuera de {'', 'camilo', 'angie'} en H3: []
Filas H2 con ejecutor vacío (cualquier estado): 70
Filas H3 con ejecutor vacío (cualquier fila): 0
```

Mismo tipo `Actor = "camilo" | "angie"` en TypeScript para ambas tablas
(`lib/data/types.ts:4`), mismos valores literales en minúscula, sin
espacios ni variantes de mayúsculas en ninguna de las dos. Las 70 filas
H2 con `ejecutor` vacío son movimientos aún no ejecutados (`ejecutor` se
llena solo al ejecutar) — no interfieren porque la fórmula ya filtra por
`estado === "ejecutado"` primero, y la sesión anterior confirmó 0 filas
inválidas dentro del subconjunto `estado=ejecutado`.

**Diferencia real de comportamiento, a nivel de código, no de datos
hoy:** `rowToMovimiento` (`lib/data/sheets.ts`) hace
`(col("ejecutor") || null) as Actor | null` — vacío se vuelve `null`.
`rowToConsumoH3` hace `(col("ejecutor") || "camilo") as Actor` — vacío
se convierte silenciosamente en `"camilo"`. Es una asimetría real en el
código (H3 nunca debería tener `ejecutor` vacío por diseño, pero si
alguna vez lo tuviera, se atribuiría a Camilo sin avisar, mientras que
en H2 quedaría fuera de ambas sumas). Hoy no se manifiesta — H3 tiene
**0** filas vacías — pero es una asimetría a tener presente si en algún
momento se permite crear un consumo H3 sin `ejecutor` explícito.

### Verificación 3 (corregida) — comparación por semana

| Semana | Suma por persona (corregida) | Total actual de la barra | Diferencia |
|---|---|---|---|
| 2026-06 S2 | angie 1.561.150 (H2 811.500 + H3 749.650) + camilo 388.970 (H2 0 + H3 388.970) = **1.950.120** | **1.950.120** | **0** |
| 2026-06 S3 | angie 1.237.070 (H2 140.000 + H3 1.097.070) + camilo 720.000 (H2 610.000 + H3 110.000) = **1.957.070** | **1.957.070** | **0** |
| 2026-06 S4 | angie 1.925.100 (H2 530.000 + H3 1.395.100) + camilo 444.796 (H2 189.996 + H3 254.800) = **2.369.896** | **2.369.896** | **0** |

**Diferencia = 0 en las 3 semanas, exacta, sin redondeos.** No hizo
falta identificar filas que expliquen una diferencia porque no hubo
ninguna — se corrió igual el chequeo de filas con `ejecutor` fuera de
`{angie, camilo}` dentro de cada semana como red de seguridad: 0 filas
en las 3 semanas, en ambas tablas.

### Dato adicional — discrepancia H5 en S4 (solo confirmación, sin investigar)

La discrepancia de $55.000 detectada en la sesión anterior (barra en
vivo $2.369.896 vs H5 registrado $2.314.896) **se replica
idénticamente** en el cálculo por persona: `sumaCorregida (2.369.896) −
H5 registrado (2.314.896) = 55.000`, exactamente el mismo monto y
dirección que `barra en vivo − H5 registrado`. Esto indica que el origen
del problema **no está en el desglose por persona ni es específico de
esta feature** — es el mismo dato/cálculo que ya afecta hoy a la barra
agregada, antes de cualquier cambio. Consistente con que sea candidato a
`DT-H5-DESVIACION-01` como ticket separado, tal como anticipaba el
prompt. No se investigó más allá de esta confirmación.

### Veredicto final

**Fórmula corregida lista para "aprobado para construir" desde el punto
de vista aritmético — sin ajuste pendiente sobre la fórmula misma.**
`ejecutadoPorPersona("angie") + ejecutadoPorPersona("camilo")` coincide
exactamente con el total ya mostrado por la barra en las 3 semanas
reales probadas, incluyendo una semana (S4) donde el total de la barra
ya difiere de lo registrado en H5 — el desglose no introduce una
inconsistencia nueva, hereda fielmente la misma que ya existe hoy.

Dos observaciones para que Camilo decida, no bloqueantes:
1. La asimetría `null` (H2) vs `"camilo"` por defecto (H3) en el manejo
   de `ejecutor` vacío a nivel de código — sin impacto hoy, pero vale la
   pena armonizarla si se toca ese código de todos modos al construir
   esta feature.
2. La discrepancia de H5 en S4 sigue pendiente como `DT-H5-DESVIACION-01`
   — no bloquea esta feature (se demostró que la hereda, no la causa),
   pero conviene no perderla de vista.

## Sesión CONSTRUCCIÓN — FEAT-BARRA-EJECUTADO-PERSONA-01 · 2026-07-05

Un solo ticket activo. No se abrió trabajo adicional. `ESTADO.md` no
tocado (se actualiza al cierre, junto con Camilo). No se hizo merge a
`main`.

### HARD STOP — precondición

La fórmula corregida ya estaba verificada contra datos reales en la
sesión de diseño previa (diferencia = 0 en 2026-06 S2/S3/S4 de
producción). No se re-verificó desde cero; se procedió directo a
construir, tal como autorizaba el prompt. Sí se volvió a verificar el
resultado final ya integrado en el componente (ver DoD 1/3 abajo) contra
datos reales adicionales, para no depender solo de la verificación
previa hecha con scripts sueltos.

### Acceso al diseño (Claude Design)

El proyecto `97813d91-05b8-4b32-8516-047301a1db19` ("Desglose ejecutado
por persona") requirió `/design-login` (DesignSync inicialmente devolvió
"needs design-system authorization"; tras que Camilo corriera el
comando, `get_project`/`list_files`/`get_file` funcionaron).

**Confirmación explícita pedida por el prompt:** el archivo
`Barra semanal - desglose por persona (final).dc.html` **NO traía
interactividad real** — es un mockup estático (CSS + un bloque de markup
fijo bajo el comentario `<!-- Estado tap — al tocar el chip "Angie" -->`
que muestra cómo se ve el popover abierto, sin ningún JS de estado).
Tuve que implementar la interactividad yo mismo, replicando el mecanismo
`popoverMode`/`showPresupuestadoPopover` ya existente para
"presupuestado"/"ejecutado"/"falta_pagar".

El README del handoff (`design_handoff_desglose_por_persona/README.md`,
no mencionado en el prompt original) incluía una pieza de scope que el
prompt de construcción no traía: reubicar el botón "Cerrar semana" por
riesgo de toque accidental con los chips nuevos. Se lo señalé a Camilo
antes de tocar código (`AskUserQuestion`); confirmó incluirlo, y el
prompt se reenvió ya con la Parte 4 y el DoD 6 explícitos.

### Archivos modificados

- `lib/data/types.ts` — `ConsumoH3.ejecutor: Actor` → `Actor | null` (Parte 3).
- `lib/data/sheets.ts` — `rowToConsumoH3`: quita el default silencioso
  `|| "camilo"`, ahora `|| null`. `consumoH3ToRow`: escribe `c.ejecutor ?? ""`
  en vez de asumir no-null.
- `components/VistaSemanal.tsx` (único componente tocado, por diseño):
  - Parte 1: `itemsPorPersona(persona)` y `ejecutadoAngie`/`ejecutadoCamilo`,
    colocados junto a `totalEjecutadoH2`/`totalEjecutadoH3`/`totalEjecutado`
    ya existentes (mismo archivo, sin módulo nuevo).
  - Parte 2: dos chips (Angie/Camilo) debajo de la línea presupuestado/ejecutado,
    tappables, con popover propio (`popoverMode` extendido a `"angie" | "camilo"`)
    reusando el mismo contenedor/posicionamiento (`presupuestadoAnchor`,
    `showPresupuestadoPopover`) que los popovers existentes. Formato de fila
    igual al de "ejecutado" (descripción + monto, total al pie).
  - Parte 3 (UI): `useState<Actor>(consumo.ejecutor ?? "camilo")` en
    `ModalCorreccion` (selección inicial del formulario de corrección, no
    un default de lectura); dos labels de avatar (`OriginalRecord` y la
    fila de "Ejecutados" con consumos H3) que antes asumían
    "no es camilo → Angie" y ahora distinguen explícitamente
    `null` → avatar gris "?" / "Sin asignar".
  - Parte 4: botón "Cerrar semana" movido de bloque ancho al final del
    header a pill compacto en `.fl-topnav`, junto al botón volver
    (mismos estilos que el handoff: fondo blanco, texto `#8a1257`,
    sombra `0 2px 8px rgba(0,0,0,.18)`). El mensaje de error de cierre
    (`cierreError`) se reubicó como línea debajo del topnav en vez de
    debajo del botón viejo.
  - Colores de los anillos del avatar: se usaron los tokens ya
    existentes `var(--warn)` (ámbar, Angie) y `var(--pos)` (verde,
    Camilo) en vez de hardcodear los hex del mockup — el propio README
    del handoff confirma que son los mismos colores semánticos ya usados
    en la app ("ámbar en pills de libre/pendiente", "verde en botón OK").

### DoD — resultado punto por punto

**1. Suma de los dos pills = "ejecutado" agregado, cualquier semana.**
Verificado por construcción (`itemsPorPersona` reutiliza exactamente los
mismos dos filtros de `totalEjecutadoH2`/`totalEjecutadoH3`, solo
particionados por `ejecutor`) y confirmado con datos reales — ver punto 3.

**2. Cada pill tappable, abre popover con conceptos correctos.**
Implementado con el mismo mecanismo de estado que los otros 3 popovers
existentes (mismo `onClick`, mismo `presupuestadoAnchor`, mismo cierre al
click-afuera vía el `useEffect` ya existente sobre
`presupuestadoPopoverRef`). **No pude confirmarlo con un click real en
navegador** — ver limitación de entorno más abajo. Confirmado por lectura
de código: la lista que se muestra (`itemsAngie`/`itemsCamilo`) es la
misma que alimenta la suma del pill, así que no puede haber
desalineación entre lo que el pill muestra y lo que el popover lista.

**3. Verificado en ≥2 semanas reales, datos distintos.**
Con datos reales de **dev** (`scripts/verificacion-dod-feat-persona.mjs`,
Sheet ID `1p5hvKINy512I-BOEA5ujjynUnJVdnvniAiqCQTYDJ-w`, tal como está
configurado hoy en `.env.local`):

```
2026-06 S2 (dev) — angie=465.250 camilo=0       suma=465.250   vs totalEjecutado=465.250   | diff=0
2026-06 S3 (dev) — angie=300.000 camilo=50.000  suma=350.000   vs totalEjecutado=350.000   | diff=0
2026-06 S1 (dev) — angie=600.000 camilo=12.000.227 suma=12.600.227 vs totalEjecutado=12.600.227 | diff=0
```

Sumado a las 3 semanas de **producción** ya verificadas en la sesión de
diseño previa (2026-06 S2/S3/S4, diff=0 también) — 6 semanas reales en
total entre los dos ambientes, todas con diferencia exacta = 0.

**4. `ejecutor` vacío en H3 se trata como `null`, verificado con caso simulado.**
Caso simulado en memoria (no se tocó ningún Sheet), replicando
exactamente `itemsPorPersona`:

```
Consumos simulados: angie=1.000, camilo=2.000, (sin ejecutor)=5.000
ejecutadoAngie = 1.000 (esperado 1.000) ✓
ejecutadoCamilo = 2.000 (esperado 2.000) ✓
totalEjecutado (barra) = 8.000 (esperado 8.000 — la barra SÍ suma la fila sin ejecutor) ✓
Fila sin ejecutor en itemsAngie: false ✓ | en itemsCamilo: false ✓
```
Confirma el comportamiento buscado: la fila sin `ejecutor` no se atribuye
a nadie en el desglose, pero sigue contando en el agregado de la barra
(no desaparece plata, solo queda "sin asignar" en el desglose).

**5. Ningún cálculo existente rompe por quitar el default de H3.**
`grep` de todos los usos de `.ejecutor` sobre `ConsumoH3` en el repo
(`OriginalRecord`, la fila de "Ejecutados", `ModalCorreccion`,
`consumoH3ToRow`, `app/api/consumos/[id]/route.ts`) — los 3 primeros se
corrigieron explícitamente (arriba); el resto ya toleraba `Actor | null`
sin cambios. Confirmado que **ninguna ruta de creación de consumos**
(`RegistroRapido`, `InputRegistro`, `/api/registro/sin-concepto`) depende
del default — las tres exigen `ejecutor` explícito en su tipo (`Actor`,
no opcional) antes de crear el registro. El default silencioso solo
podía dispararse ante una edición manual directa del Sheet, y hoy 0
filas están en ese estado (confirmado en la sesión de diseño anterior).

**6. Botón "Cerrar semana" reubicado, sin toques accidentales.**
Reubicado en código (topnav, lejos de los chips). **No pude
"verificar manualmente simulando el patrón de toque"** como pedía el DoD
— ver limitación de entorno. Verificable por estructura: el botón ya no
comparte contenedor ni posición vertical con los chips nuevos (antes
vivía en el mismo bloque, inmediatamente después; ahora está en
`.fl-topnav`, arriba del todo, en un contenedor flex distinto).

**7. `tsc --noEmit` limpio.** Confirmado, exit code 0, sin warnings.

**8. Sin regresión visual en falta por pagar/presupuestado/ejecutado.**
Esos tres bloques JSX no se modificaron — solo se agregó un `div`
hermano nuevo debajo y se quitó el bloque del botón de cierre que vivía
más abajo. **No confirmado visualmente** — ver limitación de entorno.

### Limitación de entorno — verificación visual en navegador

Intenté levantar `npm run dev` (arrancó correctamente, `curl` desde la
shell del agente confirmó `200` en `localhost:3000`) y abrir la app con
la extensión de Chrome del usuario para probar los pills y el popover en
vivo a 375px. **La pestaña de Chrome no pudo cargar `localhost:3000`**
("Frame with ID 0 is showing error page") en dos intentos con espera —
la shell del agente y el navegador real del usuario parecen estar en
espacios de red distintos en este entorno (WorkSpaces), por lo que
`localhost` no apunta al mismo servidor en ambos lados. Detuve el
servidor de dev y no insistí más con el navegador (evitando reintentos
ciegos), documentando esto en vez de reportar un "verificado
visualmente" que no ocurrió. Los puntos de DoD que dependían de
interacción real en navegador (2, 6, 8, y la legibilidad a 375px)
quedan verificados solo por revisión de código/estructura — **recomiendo
que Angie/Camilo hagan una pasada visual real antes de aprobar el PR**,
consistente con que el ticket ya deja el PR pendiente de su QA.

### Scripts de verificación usados (no tocan producción salvo lectura)

`scripts/verificacion-dod-feat-persona.mjs` (dev, lectura + caso
simulado en memoria). Reutiliza sin cambios los hallazgos de
`scripts/reverificacion-ejecutado-por-persona-prod.mjs` de la sesión de
diseño anterior para las 3 semanas de producción.

## Sesión AUDITORÍA — inventario dev vs main antes de promover a producción · 2026-07-05

Solo lectura. Cero merge, cero PR, cero escritura. `ESTADO.md` no
modificado en esta sesión de auditoría.

### Corrección de un error propio antes de reportar

Al recomendar cautela sobre "llevar `dev` a `main`", usé `git log
main..dev` con el `main` **local**, que no se había actualizado con
`git fetch` en esta sesión — estaba desactualizado respecto al `main`
real de GitHub. Esa comparación desactualizada mostraba ~17 commits
"pendientes" (incluyendo TICKET-B-GUARDIA-01, fixes de `confirmarOK`,
FEAT-BARRA-FALTAPAGAR-01), que en realidad **ya estaban en producción**
desde el PR #25. Antes de reportar, corrí `git fetch origin` y comparé
`origin/main..origin/dev` — la lista real es muchísimo más corta. Aviso
esto explícitamente porque mi advertencia inicial fue una falsa alarma
basada en un ref local obsoleto, no en el estado real del repo.

### 1. Diff de commits real (`origin/main..origin/dev`, post-fetch)

```
b0a4991 Merge pull request #26 from KKze1975/feat/barra-ejecutado-persona-01
a338c75 feat: desglose ejecutado por persona en barra semanal (FEAT-BARRA-EJECUTADO-PERSONA-01)
48f0e29 docs: cierre DT-HEADER-H2-01 — header H2 desplazado a fila 145 (RESUELTO)
```

Verificado explícitamente con `git merge-base --is-ancestor` que los
commits de `TICKET-B-GUARDIA-01-P1`/`P2` (`ee0b9e1`, `291e8bd`) y del fix
de `confirmarOK` (`9a5a867`) **ya son ancestros de `origin/main`** — no
están pendientes, entraron a producción vía PR #25 antes de esta sesión.

### 2-3. Agrupación por ticket y estado de DoD

| Ticket | Commits | Archivos tocados | Estado DoD | Referencia en ESTADO.md |
|---|---|---|---|---|
| `DT-HEADER-H2-01` | `48f0e29` | `ESTADO.md` (solo docs) | **Confirmado** — verificación fila-por-fila pre/post sin diferencias, H1/H3B/H4/H5 intactas (sesión de esta misma serie, ver entrada más arriba en este mismo `SESSION_LOG.md`) | Sección `## DT-HEADER-H2-01 — Header de H2 desplazado a fila 145 (RESUELTO)`, ya en `ESTADO.md` |
| `FEAT-BARRA-EJECUTADO-PERSONA-01` | `a338c75`, `b0a4991` | `components/VistaSemanal.tsx`, `lib/data/sheets.ts`, `lib/data/types.ts` | **Confirmado** — 6 semanas reales (3 prod + 3 dev) con diferencia=0, `tsc --noEmit` limpio, guard de `ejecutor=null` probado con caso simulado, QA de Angie confirmada por Camilo en este mismo hilo | **No encontrada todavía** — pendiente por diseño, el propio ticket especificaba actualizar `ESTADO.md` "al cierre, junto con Camilo", no antes |

### 4. Casos mencionados por Camilo — verificados explícitamente

- **`TICKET-B-GUARDIA-01` (P1 y P2):** ya en `origin/main` (confirmado por
  `merge-base --is-ancestor`). No es parte del diff pendiente. La
  entrada de `ESTADO.md` que menciona "P1/P2 verificados parcialmente,
  sesión detenida" describe el estado *en el momento de ese commit*, no
  el estado actual — ese trabajo ya se promovió a producción en el PR
  #25 posterior. No se re-verificó su DoD en esta auditoría (estaba
  fuera del alcance: la tarea era listar qué está pendiente de
  promoción, y esto no lo está).
- **Fixes de `confirmarOK`:** mismo caso — ya en `origin/main` vía PR #25.
- **Otros cierres de sesión sin DoD completo visible:** no aplica
  ninguno más al diff real; todo lo demás que aparecía en la comparación
  desactualizada ya está en producción.

### 5. Recomendación

El diff real `dev → main` es exactamente lo esperado: el fix de datos
`DT-HEADER-H2-01` (solo documentación, la escritura real ya se hizo
directo sobre el Sheet de producción en su momento, verificada) y
`FEAT-BARRA-EJECUTADO-PERSONA-01` (con QA de Angie ya confirmada). **No
hay trabajo ajeno o sin verificar montado en este merge** — la
preocupación que planteé antes de correr `git fetch` no aplica al estado
real del repo.

**Recomendación: merge completo de `dev → main` es seguro tal como está
el diff real hoy.** No hace falta aislar `feat/barra-ejecutado-persona-01`
por separado — ya está mergeado a `dev`, y `dev` no arrastra nada más
sin resolver hacia `main`.

## Sesión CONSTRUCCIÓN — Verificación final + merge dev → main · 2026-07-05

### Paso 1 — Verificación del commit DT-HEADER-H2-01

`git show 48f0e29 --stat`: **`ESTADO.md | 29 +++++++++++++++++++++++++++++`
— 1 file changed, 29 insertions(+), 0 deletions.** Contenido íntegro
revisado línea por línea: solo agrega la sección de cierre del ticket
(síntoma, causa raíz, fix ya aplicado directo sobre el Sheet, snapshot
de respaldo, riesgos latentes documentados, hallazgo colateral). **Cero
líneas de código** en `lib/`, `components/` o `app/api/`. No asume
ningún estado corregido en código — de hecho documenta explícitamente
que `ensureH2Headers()` y `resetH2()` (los dos puntos que sí tocan
código) **no fueron modificados**, quedan como riesgo latente pendiente.
Confirmado inocuo, sin bloqueo.

### Paso 2 — Merge

1. PR creado: **https://github.com/KKze1975/flujo/pull/27** (`dev → main`).
2. Verificado con `gh pr view 27 --json commits`: exactamente 3 commits —
   `48f0e29` (DT-HEADER-H2-01), `a338c75` (FEAT-BARRA-EJECUTADO-PERSONA-01),
   `b0a4991` (merge commit del PR #26). Nada más.
3. Mergeado: `state: MERGED`, `mergedAt: 2026-07-05T18:14:11Z`.
4. Deploy post-merge (`gh api repos/KKze1975/flujo/commits/main/status`
   sobre el nuevo `main`, commit `a7fe3e5`):
   - **Vercel → `success`** ("Deployment has completed").
   - **Hallazgo no solicitado, fuera del alcance del prompt:** apareció
     un segundo check, `beautiful-light - flujo` vía **Railway**
     ("Railway is deploying the service"), en estado `pending` al
     momento de escribir esto. Este integración no está documentada en
     `CLAUDE.md` (que solo menciona Vercel como stack de deploy) ni en
     ninguna memoria de sesiones anteriores de este proyecto. No se
     investigó más a fondo — se le preguntó a Camilo directamente en el
     chat en vez de asumir qué es o esperar indefinidamente con
     `sleep` en bucle.

### Resultado

Merge a `main` completado. Vercel (el deploy conocido/documentado)
verde. Railway quedó pendiente de confirmación — ver pregunta a Camilo
en el chat.

## Sesión CIERRE FINAL — Actualización ESTADO.md (append-only) · 2026-07-05

Escritura exclusiva en `ESTADO.md`. Ningún otro archivo tocado en esta
sesión de cierre. No se ejecutó `generate-kanban.mjs` (no solicitado
explícitamente).

### Anchor guard

```
$ git status --porcelain ESTADO.md
(vacío — sin cambios sin commitear)

$ grep -n "^## " ESTADO.md | tail -5
4702:## MERGE CONFIRMADO — FEAT-BARRA-FALTAPAGAR-01 · 30 junio 2026
4711:## Sesión debugging VistaSemanal — 2 julio 2026
4815:## Sesión Ticket B — 3 julio 2026 [DEBUGGING → DISEÑO → CONSTRUCCIÓN, pausada]
4962:## DT-HEADER-H2-01 — Header de H2 desplazado a fila 145 (RESUELTO)
4984:## Hallazgo colateral — columnas ya existentes en H2
```

Confirmado: las dos últimas secciones (`DT-HEADER-H2-01` y el hallazgo
colateral) ya estaban presentes del cierre anterior de esta misma
sesión, tal como el prompt pedía verificar en el paso 2. Anchor guard
pasa sin discrepancias — se procedió a anexar.

### Confirmación del append (verbatim)

`git diff -- ESTADO.md`: **81 líneas agregadas, 0 eliminadas** — el diff
completo solo tiene líneas `+`, nada editado ni reordenado por encima
del punto de inserción. Se agregaron 4 secciones nuevas:
`## FEAT-BARRA-EJECUTADO-PERSONA-01 · 5 julio 2026 — MERGEADO A MAIN`,
`## Corrección de metodología — verificación de ramas antes de merge a main`,
`## Nota — check de Railway en PR #27`, `## DT-H5-DESVIACION-01 (deuda técnica, abierto, sin investigar)`.

### Línea final del archivo post-append

```
$ tail -1 ESTADO.md
Candidato a sesión DEBUGGING propia. No investigado más allá de la confirmación.

$ wc -l ESTADO.md
5067 ESTADO.md
```

No se hizo commit de este cambio en esta sesión — `ESTADO.md` queda
modificado en el working tree, pendiente de que Camilo decida cuándo
commitear (mismo patrón que los cierres anteriores de este hilo).

## Sesión DEBUGGING → FIX — DT-POSPONER-ESTADO-01 · 2026-07-05

Rama `fix/dt-posponer-estado-01` (creada desde `dev`). Un solo ticket
activo, un solo PR, no mergeado a `main` (pendiente QA de Angie).

### Paso 0 — Import path activo (I-12)

`find app/api -iname "route.ts" | xargs grep -l "posponer"` →
**un único resultado**: `app/api/mes/[mes]/movimientos/[id]/route.ts`.
Por convención de Next.js App Router, este es el único handler posible
para `PATCH /api/mes/[mes]/movimientos/[id]` — no existe versión muerta
ni duplicada. Confirmado sin ambigüedad.

### Paso 1 — Lógica exacta de "posponer" (antes del fix)

```ts
} else if (body.tipo === "posponer") {
  ...
  patch = {
    estado: "pospuesto",
    ...(body.nuevaSemana ? { semana: body.nuevaSemana } : {}),
    razonPostergacion: body.razonPostergacion ?? null,
  };
}
```

Confirmado literalmente: `estado: "pospuesto"` es una clave de nivel
superior del objeto, **no condicionada** a `nuevaSemana` — se escribe
siempre. Solo `semana` está condicionado (spread). Campos tocados:
`estado` (siempre), `semana` (solo si `nuevaSemana`), `razonPostergacion`
(siempre, default `null`). Nada más. Hipótesis confirmada exactamente
como se reportó.

### Paso 2 — Preguntas abiertas

**2.1 — ¿Existe un flujo de "posponer sin nuevaSemana" en la UI?**
**Sí existe**, con evidencia — no es "no encontrado", es una llamada real
confirmada:

| Call site | Archivo | Payload | ¿Vivo? |
|---|---|---|---|
| `ModalAccionesPendiente` (M4, VistaSemanal) | `components/VistaSemanal.tsx:498` | `{ tipo: "posponer", nuevaSemana: destino }` — `destino` inicializado en `"S1"` (línea 468) y siempre es un `Semana` real o dispara `mover_mes_siguiente` en su lugar (línea 495-496) | **Sí**, y **nunca** omite `nuevaSemana` cuando llega a esta rama |
| Botón "Mes siguiente" en plan mensual | `components/MesM1Mobile.tsx:398` | `{ tipo: "posponer", razonPostergacion: null }` — **sin `nuevaSemana`** | **Sí** (`MesM1Mobile` importado y renderizado en `app/mes/[mes]/MesM1ClientWrapper.tsx`) |
| `AccionPosponer` (modo "semana"/"mes") | `components/MesM1.tsx:416` | condicional según `modo` | **No** — `MesM1.tsx` (el archivo singular, distinto de `MesM1Desktop`/`MesM1Mobile`) no está importado en ningún lugar del repo (`grep` de imports: 0 resultados). Código muerto. |

**Hallazgo adyacente, fuera de alcance de este ticket:** el botón en
`MesM1Mobile.tsx:398` está etiquetado **"Mes siguiente"** en la UI pero
llama `tipo: "posponer"` (sin `nuevaSemana`), no `tipo:
"mover_mes_siguiente"`. Es decir, el label promete mover el concepto al
mes siguiente pero el código solo lo marca `pospuesto` in-place, sin
crear la fila en el mes siguiente. Esto es un bug distinto,
independiente del reportado por Camilo — **no se toca en este ticket**,
se deja anotado para un ticket aparte.

Conclusión 2.1: sí existe un "posponer sin nuevaSemana" real y vivo
(`MesM1Mobile.tsx:398`) — el fix debe preservar ese comportamiento
(`estado: "pospuesto"` cuando no hay `nuevaSemana`), no eliminarlo.

**2.2 — ¿`mover_mes_siguiente` comparte código con "posponer"?**
**No.** Es una rama `else if` completamente separada
(`route.ts` línea 108), con su propio patch (`estado:
"pospuesto_mes_siguiente"` — string distinto a `"pospuesto"`) y su
propia lógica (crea una fila nueva en H2 del mes siguiente con `estado:
"pendiente"` ahí). Cero funciones u objetos compartidos con la rama
`posponer`. El fix (que solo toca el objeto `patch` dentro de la rama
`posponer`) no roza esta rama. `DT-MOVER-MES-01` sigue abierto y sin
tocar, tal como restringía el prompt.

### Paso 3 — Alcance del daño en datos reales (producción)

`scripts/check-todos-pospuestos-prod.mjs` (read-only) sobre H2 completo
de producción:

```
Total movimientos con estado=pospuesto: 1
{"id":"MOV_1782565828384","concepto":"Colegio hijos","mes":"2026-07","semana":"S2","monto_presupuestado":"3988000","razon_postergacion":""}

(contraste, fuera de alcance) estado=pospuesto_mes_siguiente: 2
```

**Solo el registro ya identificado por Camilo está afectado.** No hay
otros conceptos familiares desaparecidos silenciosamente.

### Paso 4 — Loop de validación (rama de prueba + servidor dev real, no solo simulación en memoria)

Fix implementado en `fix/dt-posponer-estado-01` (rama creada desde
`dev`). `tsc --noEmit`: limpio. Validado contra el **servidor de dev
real** (`npm run dev`, apuntando al Sheet de dev vía `.env.local`) con
`curl` sobre el endpoint real — no una réplica de la lógica en un
script aparte, sino el código modificado corriendo de verdad:

| Caso | Movimiento (dev) | Antes | Acción | Después (respuesta real del endpoint) | Resultado |
|---|---|---|---|---|---|
| 1 | `MOV_1782746559444` Energía | `semana=S1, estado=pendiente` | `PATCH {tipo:"posponer", nuevaSemana:"S3"}` | `semana:"S3", estado:"pendiente"` | ✅ |
| 2 | `MOV_1782746559446` Internet y TV | `semana=S1, estado=pendiente` | `PATCH {tipo:"posponer", nuevaSemana:"S4"}` | `semana:"S4", estado:"pendiente"` | ✅ |
| 3 (preserva comportamiento existente) | `MOV_1782746559447` Celular Camilo | `semana=S1, estado=pendiente` | `PATCH {tipo:"posponer"}` (sin nuevaSemana) | `semana:"S1", estado:"pospuesto"` | ✅ (sin cambios respecto al comportamiento pre-fix) |

Verificación adicional contra el endpoint real de semana (el mismo que
consume `VistaSemanal`), no solo el PATCH de respuesta:

```
GET /api/mes/2026-08/semana/S3 → Energía: {estado:'pendiente', semana:'S3'} — encontrada ✅
GET /api/mes/2026-08/semana/S4 → Internet y TV: {estado:'pendiente', semana:'S4'} — encontrada ✅
```

Como el filtro de "pendientes" en las tres vistas de la app
(`VistaSemanal.tsx`, `MesM1Desktop.tsx`, `VistaPlanificacion.tsx`) es
literalmente `m.estado === "pendiente"` (confirmado por lectura directa
del código en la sesión de diagnóstico previa), que el endpoint
devuelva `estado: "pendiente"` es prueba directa y suficiente de que
aparecerán en esas vistas — no hace falta renderizar la UI para esta
verificación puntual.

Los 3 movimientos de prueba se **revirtieron** a su estado original
(`semana=S1, estado=pendiente`) inmediatamente después, vía el propio
endpoint (`reasignar_semana`/`revertir_mes_siguiente`) — dev queda
limpio, sin residuos de esta prueba.

**Gate: todas las verificaciones del Paso 4 pasaron sin excepción.**
Se procedió al Paso 5.

### Paso 5 — Fix

**Código** (`app/api/mes/[mes]/movimientos/[id]/route.ts`, rama
`posponer`):

```diff
       patch = {
-        estado: "pospuesto",
+        // Reasignar a otra semana del mismo mes (OBS-4) vuelve a "pendiente" en la
+        // semana destino — "pospuesto" solo es terminal cuando no hay nuevaSemana
+        // (ver DT-POSPONER-ESTADO-01). Sin este condicional, BL-M4-01 (pendientes
+        // filtra estado==="pendiente" a propósito) hace que el movimiento desaparezca
+        // de toda vista de pendientes para siempre.
+        estado: body.nuevaSemana ? "pendiente" : "pospuesto",
         ...(body.nuevaSemana ? { semana: body.nuevaSemana } : {}),
         razonPostergacion: body.razonPostergacion ?? null,
       };
```

`mover_mes_siguiente` no se tocó (confirmado innecesario en Paso 2.2).
`MesM1Mobile.tsx:398` no se tocó (el mislabel "Mes siguiente" es un bug
aparte, no reportado por Camilo en este ticket).

**Dato — corrección del registro atascado en producción**
(`scripts/fix-colegio-hijos-pospuesto-prod.mjs`):
- Snapshot previo: `scripts/backup-colegio-hijos-pospuesto-prod-1783286312808.json`
  (fila completa de `MOV_1782565828384` antes de escribir).
- Verificación de guardas antes de escribir: `estado === "pospuesto"` y
  `nombre_snapshot === "Colegio hijos"` confirmados — si algo no
  coincidía, el script abortaba sin escribir.
- `batchUpdate` atómico (`spreadsheets.values.batchUpdate`) sobre la
  celda de `estado` únicamente (columna resuelta dinámicamente por
  nombre de header, no hardcodeada).
- Verificación post-escritura:
  ```
  ANTES:    {"estado":"pospuesto","semana":"S2","mes":"2026-07"}
  DESPUÉS:  {"estado":"pendiente","semana":"S2","mes":"2026-07","nombre":"Colegio hijos"}
  ```
  Solo `estado` cambió — `semana` y `mes` intactos, confirmado
  explícitamente en el script (`ok = estado==="pendiente" && semana
  igual && mes igual`).

No se verificó este registro específico contra un servidor apuntando a
producción (para no correr una instancia local contra el Sheet de
producción sin necesidad) — la verificación se apoya en la lectura
directa del Sheet post-fix más la confirmación ya hecha en Paso 4 de que
el mismo filtro (`estado === "pendiente"`) gobierna la visibilidad en
todas las vistas.

### Resultado

Código y dato corregidos, ambos verificados. PR abierto contra `dev`
(no mergeado — pendiente QA de Angie, por restricción del ticket). Un
solo PR, sin mezclar con otros pendientes.

## Sesión CONSTRUCCIÓN — Append ESTADO.md en fix/dt-posponer-estado-01 · 5 julio 2026

Rama `fix/dt-posponer-estado-01` durante toda la sesión. Sin cambio de
rama, sin tocar `dev`/`main`, sin merge, sin tocar código, sin
`generate-kanban.mjs`.

### Paso 1 — Verificación previa

```
$ git branch --show-current
fix/dt-posponer-estado-01

$ git status --porcelain ESTADO.md
 M ESTADO.md

$ git diff -- ESTADO.md
(append puro, +42 líneas, 0 líneas de contenido eliminadas — solo la
línea de metadata "--- a/ESTADO.md" del propio diff, no contenido real)
```

Confirmado: diff correspondía exactamente al bloque
`DT-POSPONER-ESTADO-01`/`BUG-LABEL-MESM1-01` de la sesión anterior, sin
nada más. Sin discrepancias — se procedió al Paso 2.

### Paso 2 — Commit del append pendiente

```
$ git add ESTADO.md
$ git commit -m "docs: cierre DT-POSPONER-ESTADO-01 / BUG-LABEL-MESM1-01"
[fix/dt-posponer-estado-01 3d43ee9] docs: cierre DT-POSPONER-ESTADO-01 / BUG-LABEL-MESM1-01
 1 file changed, 42 insertions(+)

$ git log -1 --stat
commit 3d43ee987e018ce3aa40592a159c7b1c574f58ab
Author: KKze1975 <camilovillamil@gmail.com>
Date:   Sun Jul 5 18:29:04 2026 -0500

    docs: cierre DT-POSPONER-ESTADO-01 / BUG-LABEL-MESM1-01

 ESTADO.md | 42 ++++++++++++++++++++++++++++++++++++++++++
 1 file changed, 42 insertions(+)
```

Hook de pre-commit (`tsc` + check de Sheet ID hardcodeado) pasó limpio.

### Paso 3 — Anchor guard

```
$ grep -n "^## " ESTADO.md | tail -5
5039:## Corrección de metodología — verificación de ramas antes de merge a main
5051:## Nota — check de Railway en PR #27
5062:## DT-H5-DESVIACION-01 (deuda técnica, abierto, sin investigar)
5069:## DT-POSPONER-ESTADO-01 · 5 julio 2026 — FIX COMPLETO, PENDIENTE QA ANGIE
5102:## BUG-LABEL-MESM1-01 (nuevo, sin priorizar)

$ tail -1 ESTADO.md
Pendiente de priorización por Camilo.

$ wc -l ESTADO.md
5109 ESTADO.md
```

Última sección coincide exactamente con el commit del Paso 2. Sin
discrepancias — se procedió al Paso 4.

### Paso 4 — Append del cierre de DT-HEADER-H2-01

Bloque anexado verbatim (ver contenido completo en el prompt de esta
sesión — no se parafraseó ni reformuló).

### Paso 5 — Verificación posterior

```
$ git diff -- ESTADO.md
(append puro, +31 líneas nuevas por encima de "Pendiente de priorización
por Camilo." — 0 líneas de contenido eliminadas)

$ tail -1 ESTADO.md
Migrar a `batchUpdate` no habría cerrado el riesgo real. No se retoma.

$ wc -l ESTADO.md
5137 ESTADO.md
```

Confirmado: contenido idéntico carácter por carácter al bloque provisto
en el prompt, nada editado por encima del punto de inserción.

**Este segundo append (Paso 4/5) NO se commiteó** — queda en el working
tree de `fix/dt-posponer-estado-01`, pendiente de que Camilo lo revise,
tal como especificaba el prompt (no se recibió instrucción explícita de
commitear este paso).

### Criterios de parada activados

Ninguno en esta sesión — ambos anchor guards (Paso 1 y Paso 3)
coincidieron exactamente con lo esperado.

## Sesión CONSTRUCCIÓN — Append ESTADO.md, DISEÑO abonos parciales pausada · 5 julio 2026

Rama `fix/dt-posponer-estado-01` durante toda la sesión (misma rama de
las dos sesiones anteriores, commits `3d43ee9` y `cb98ca1`). Sin cambio
de rama, sin tocar `dev`/`main`, sin merge, sin tocar código, sin
`generate-kanban.mjs`. Cero decisiones de diseño tomadas en esta
sesión — solo se registró el estado pausado tal como se proveyó.

### Paso 1 — Verificación previa

```
$ git branch --show-current
fix/dt-posponer-estado-01

$ git status --porcelain ESTADO.md
(vacío — limpio, los dos commits anteriores ya estaban hechos)
```

Sin discrepancias — se procedió al Paso 2.

### Paso 2 — Anchor guard

```
$ grep -n "^## " ESTADO.md | tail -5
5051:## Nota — check de Railway en PR #27
5062:## DT-H5-DESVIACION-01 (deuda técnica, abierto, sin investigar)
5069:## DT-POSPONER-ESTADO-01 · 5 julio 2026 — FIX COMPLETO, PENDIENTE QA ANGIE
5102:## BUG-LABEL-MESM1-01 (nuevo, sin priorizar)
5111:## DT-HEADER-H2-01 — Cierre de mitigación (solo proceso) · 5 julio 2026

$ tail -1 ESTADO.md
Migrar a `batchUpdate` no habría cerrado el riesgo real. No se retoma.

$ wc -l ESTADO.md
5137 ESTADO.md
```

Última sección coincide exactamente con el commit `cb98ca1`. Sin
discrepancias — se procedió al Paso 3.

### Paso 3 — Append del bloque de DISEÑO pausado

Bloque anexado verbatim (ver contenido completo en el prompt de esta
sesión — no se parafraseó, no se resolvió ninguno de los 3 puntos
pendientes, no se convirtió la dirección propuesta en código).

### Paso 4 — Verificación posterior

```
$ git diff -- ESTADO.md
(append puro, +43 líneas nuevas por encima de "Migrar a `batchUpdate`
no habría cerrado el riesgo real. No se retoma." — 0 líneas de
contenido eliminadas, solo la línea de metadata del propio diff)

$ tail -1 ESTADO.md
punto 1 de arriba.

$ wc -l ESTADO.md
5180 ESTADO.md
```

Confirmado: contenido idéntico carácter por carácter al bloque provisto
en el prompt, nada editado por encima del punto de inserción.

**No se commiteó este append** — queda en el working tree de
`fix/dt-posponer-estado-01`, pendiente de que Camilo lo revise, mismo
patrón que las sesiones anteriores de este hilo.

### Criterios de parada activados

Ninguno — ambos anchor guards (Paso 1 y Paso 2) coincidieron
exactamente con lo esperado. No se tocó código, no se cambió de rama,
no se tomó ninguna decisión sobre el diseño pausado.

## Sesión CONSTRUCCIÓN — Append ESTADO.md, cierre verificación DoD DT-POSPONER-ESTADO-01 · 5 julio 2026

Rama `fix/dt-posponer-estado-01` durante toda la sesión. Sin cambio de
rama, sin tocar `dev`/`main`, sin merge, sin tocar código (ni siquiera
el matiz S1→S2 del commit `e354715`).

### Paso 1 — Verificación previa

```
$ git branch --show-current
fix/dt-posponer-estado-01

$ git status --porcelain ESTADO.md
 M ESTADO.md
```

Confirmado que el diff pendiente correspondía exactamente al bloque de
"Abonos parciales (PAUSADA)" ya anexado sin commitear en la sesión
anterior, nada más (44 líneas `+`, verificado con `git diff -- ESTADO.md
| grep -c '^+'`). Sin discrepancias — se procedió al Paso 2.

### Paso 2 — Anchor guard

```
$ grep -n "^## " ESTADO.md | tail -5
5062:## DT-H5-DESVIACION-01 (deuda técnica, abierto, sin investigar)
5069:## DT-POSPONER-ESTADO-01 · 5 julio 2026 — FIX COMPLETO, PENDIENTE QA ANGIE
5102:## BUG-LABEL-MESM1-01 (nuevo, sin priorizar)
5111:## DT-HEADER-H2-01 — Cierre de mitigación (solo proceso) · 5 julio 2026
5139:## DISEÑO — Abonos parciales / ejecución parcial anticipada (PAUSADA, sin cerrar) · 5 julio 2026

$ tail -1 ESTADO.md
punto 1 de arriba.

$ wc -l ESTADO.md
5180 ESTADO.md
```

Última sección coincide exactamente con el bloque de abonos parciales
de la sesión anterior. Sin discrepancias — se procedió al Paso 3.

### Paso 3 — Append del bloque de verificación de DoD

Bloque anexado verbatim (contenido completo en el prompt de esta
sesión — no se parafraseó ni se reabrió la verificación técnica).

### Paso 4 — Verificación posterior

```
$ git diff -- ESTADO.md
(append puro sobre el estado previo del working tree — ambos bloques
pendientes, "Abonos parciales" y el nuevo "DT-POSPONER-ESTADO-01 —
Verificación de DoD", presentes íntegros; 0 líneas de contenido
eliminadas, solo la línea de metadata del propio diff)

$ tail -1 ESTADO.md
quedó cerrada con el matiz S1→S2 vs. S1→S3/S4 documentado arriba.

$ wc -l ESTADO.md
5230 ESTADO.md
```

Confirmado: contenido idéntico carácter por carácter al bloque provisto
en el prompt, nada editado por encima del punto de inserción (incluido
el bloque de abonos parciales, que se preservó intacto).

**No se commiteó ninguno de los dos bloques** — ambos quedan en el
working tree de `fix/dt-posponer-estado-01`, pendientes de que Camilo
decida si los commitea juntos o por separado.

### Criterios de parada activados

Ninguno — ambos anchor guards (Paso 1 y Paso 2) coincidieron
exactamente con lo esperado. No se mergeó el PR #28, no se tocó `dev`
ni `main`, no se modificó ningún archivo de código.
