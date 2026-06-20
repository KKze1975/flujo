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
