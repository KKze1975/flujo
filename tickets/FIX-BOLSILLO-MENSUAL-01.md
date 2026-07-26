---
ticket_id: FIX-BOLSILLO-MENSUAL-01
orden: 16
estado: completado_parcial
tier: B
dependencias: ninguna
---

# FIX-BOLSILLO-MENSUAL-01 — Bolsillos pago_fraccionado mensuales se cierran prematuramente cada semana

## Goal completo

Los bolsillos `pago_fraccionado` con `frecuencia: mensual` (**Mercado mensual**,
**Frida**, y **Fondo transporte** tras `UBER-03`) deben acumular gasto a lo
largo de las 4 semanas del mes sin resetearse — un gasto en S1 y otro en S2
contra el mismo bolsillo deben sumarse, no tratarse como presupuestos
independientes por semana. Esto es distinto de los bolsillos `pago_fraccionado`
con `frecuencia: semanal` (**Frutas y verduras**, **Víveres y otros**,
**Entretenimiento**, **Imprevistos**), que sí deben seguir reseteándose cada
semana — cada semana tiene su propio presupuesto independiente, por diseño.

**No cubre:** bolsillos semanales — sin cambios en su comportamiento.
Ningún cambio de esquema en H1 para los 3 conceptos mensuales — `UBER-03`
ya dejó `Fondo transporte` con `semana_default: S1`, sin cambios adicionales
necesarios ahí (ver Diagnóstico).

## Definition of Done

**Fase diagnóstico (tier B — HALT obligatorio antes de construir):** ver
sección "Diagnóstico" abajo.

**Fase construcción (una vez aprobada la opción, vía `/goal-a` posterior):**
- [x] `tsc --noEmit` limpio.
- [x] `cerrar-semana` ya no marca `ejecutado` a bolsillos mensuales — quedan
      `pendiente` indefinidamente dentro del mes. **Verificado con prueba
      real en dev** (ver Notas de ejecución): Transporte siguió `pendiente`
      tras cerrar S1 con un consumo real registrado.
- [x] Los bolsillos semanales (Frutas y verduras, Víveres y otros,
      Entretenimiento, Imprevistos) **no cambian de comportamiento** —
      prueba de regresión explícita. **Verificado**: Entretenimiento sí
      quedó `ejecutado` normalmente al cerrar S1, sin cambios.
- [ ] El "gastado" mostrado para un bolsillo mensual en `VistaSemanal` es
      la suma de **todo el mes** — código implementado (`gastadoBolsillo`/
      `consumosDeBolsillo` en `VistaSemanal.tsx`), **no verificado
      visualmente en esta sesión**: el navegador de Claude en Chrome estaba
      apuntando al Chromebook de Camilo, no al Workspace donde corre el dev
      server — la UI nunca cargó. El payload RSC confirmado por `curl` sí
      trae los datos correctos (`conceptosCatalogo`, `movimientosMesInit`,
      `consumosMesInit`) llegando al componente.
- [ ] El bolsillo mensual es visible/seleccionable en las 4 semanas —
      mismo motivo, no verificado visualmente en esta sesión.
- [ ] Prueba en dev: registrar 2 consumos de prueba contra el mismo
      bolsillo mensual en 2 semanas distintas — **parcialmente hecho**: se
      verificó el efecto en `cerrar-semana` (arriba), falta la verificación
      visual del acumulado en pantalla.
- [x] Cero llamadas contra producción durante la construcción.

## Diagnóstico (Tier B — pendiente de aprobación del plan)

### Causa raíz — confirmada contra código real (hecho)

1. **`cerrar-semana` cierra CUALQUIER bolsillo `pago_fraccionado` presente
   esa semana, sin distinguir mensual de semanal** —
   `app/api/mes/[mes]/cerrar-semana/route.ts:121-137`:
   ```ts
   const bolsilloMovs = movsSemana.filter(m => m.tipoSnapshot === "pago_fraccionado" && m.estado !== "ejecutado");
   // ... marca ejecutado con montoEjecutado = suma de consumosSemana (solo esa semana)
   ```
   Para un bolsillo mensual anclado a `S1`, cerrar S1 lo marca `ejecutado`
   con el gasto de S1 únicamente — cualquier gasto posterior en S2-S4 queda
   guardado en H3B pero **nunca vuelve a sumarse al bolsillo**, porque ya
   está "cerrado".

2. **El cálculo de "gastado" en `VistaSemanal.tsx` usa solo consumos de la
   semana visible**, no del mes — confirmado en al menos 6 sitios:
   líneas 179, 365, 1187, 1413, 1614/2067-2083, 2124. Todos filtran
   `consumos.filter(c => c.bolsilloId === ...)`, donde `consumos` viene de
   `getConsumosByMesYSemana` (`app/mes/[mes]/semana/page.tsx:34`) —
   estrictamente scoped a la semana.

3. **El bolsillo mensual solo aparece como "bolsillo" en su semana ancla**
   — `bolsillos = movimientos.filter(tipoSnapshot === "pago_fraccionado")`
   (`VistaSemanal.tsx:979`), y `movimientos` viene de
   `getMovimientosByMesYSemana(mes, semana)`, filtrado por
   `m.semana === semana` — un bolsillo con `semana: "S1"` fijo no aparece
   en `movimientos` cuando se ve S2/S3/S4.

4. **Matiz importante, verificado con datos reales de producción** (no
   solo teoría): la clasificación automática de consumos
   (`app/api/consumos/[id]/clasificar`, Claude Haiku) lee `getConceptos()`
   directamente de H1, **sin restricción de semana** — por eso "Mercado
   mensual" en prod sí tiene consumos repartidos en las 4 semanas de julio
   pese al problema de arriba. El registro automático no está bloqueado;
   el problema es de **cierre prematuro y de visualización**, no de que
   sea imposible clasificar.

5. **No existe ningún endpoint de cierre de mes** (`H6`/`CierreMensual` sin
   ruta implementada) — confirmado por búsqueda en `app/api`. No hay un
   evento de "fin de mes" al que enganchar una resolución final de estos
   bolsillos.

### Plan de fix propuesto

**Parte A — dejar de auto-ejecutar bolsillos mensuales en `cerrar-semana`:**
excluir del loop de líneas 121-137 cualquier bolsillo `pago_fraccionado`
cuyo concepto tenga `frecuencia: mensual` — quedan `estado: pendiente`
indefinidamente dentro del mes (nunca se "cierran" automáticamente; su
gasto se sigue calculando en vivo desde H3B). Como el punto 4 de la
consecuencia observó: `VistaSemanal.tsx:988-993` **ya excluye**
`pago_fraccionado` del total ejecutado vía H2 — el total general de la
semana no depende de que estos bolsillos lleguen a `ejecutado`, así que
dejarlos `pendiente` todo el mes no rompe ese cálculo.

**Parte B — bolsillo mensual visible y acumulado en las 4 semanas:** usar
`movimientosMes`/`consumosMes` (ya fetched en `page.tsx:37-38`, hoy sin
pasar a `VistaSemanal`) como fuente para los bolsillos mensuales
específicamente, en vez de los props scoped-a-semana (`movimientos`/
`consumos`). Esto **no requiere tocar `semana_default` en H1** — evita el
riesgo que habíamos identificado antes (cambiar a `variable` interactuaría
mal con el loop de `cerrar-semana` sin la Parte A ya aplicada). Con la
Parte A resuelta, cambiar `semana_default` deja de ser necesario porque el
bolsillo mensual se construye desde datos de todo el mes, no desde el
`movimientos` scoped a semana.

**Cómo distinguir "mensual" de "semanal" en estos 2 puntos** — `Movimiento`
no trae `frecuencia` hoy, solo `Concepto` (H1) la tiene. 2 opciones:

- **Opción 1 — `frecuenciaSnapshot` nueva en H2** (mismo patrón que
  `nombreSnapshot`/`categoriaSnapshot`/`tipoSnapshot`, que ya existen).
  Requiere migración de esquema (mismo tipo de cambio que `T39`/`T45`).
  Ventaja: disponible directo, sin joins en tiempo de ejecución, funciona
  automáticamente para cualquier bolsillo mensual futuro sin tocar código
  de nuevo.
- **Opción 2 — lookup de `conceptos` en tiempo de ejecución.**
  `cerrar-semana` ya tiene `provider` disponible (server-side, trivial).
  `VistaSemanal` (client component) necesitaría un nuevo prop `conceptos`
  pasado desde `page.tsx` (que hoy no los fetch para esta vista). Ventaja:
  sin migración de esquema. Desventaja: acopla más lógica a runtime joins,
  un fetch adicional en `page.tsx`.

**Sin recomendación vinculante** — ambas opciones son razonables. La
Opción 1 sigue el patrón arquitectónico ya establecido en H2 (snapshots);
la Opción 2 evita tocar el esquema del Sheet.

**Decisión de Camilo (sesión de chat): Opción 2.** Razón, con evidencia
propia de este proyecto: cada vez que se ha migrado el esquema de H2 en
este proyecto, algo se rompió después sin ser notado de inmediato —
`DT-HEADER-H2-01` (header desplazado de fila) y `FIX-RESET-COLUMNAS-01`
(las funciones de reset nunca se actualizaron tras `T39`/la migración que
agregó `imprevisto`, corrompiendo datos en silencio durante meses). La
Opción 1 repite ese mismo patrón de riesgo (rangos de lectura que hay que
recordar actualizar en cada punto de uso). La Opción 2 es aditiva —no
reinterpreta ningún rango existente— y no puede romper silenciosamente
algo que ya funciona.

### Caso de falla a inyectar en la prueba (construcción, no esta fase)

1. En dev, mes de prueba: registrar un consumo de $50.000 contra "Fondo
   transporte" en S1, y otro de $30.000 en S2.
2. Cerrar S1 (`cerrar-semana`). Verificar por lectura directa que el H2 de
   Transporte **sigue `pendiente`**, no `ejecutado` — reproduce el defecto
   si no se corrige.
3. Ver el bolsillo en S1, S2, S3 y S4: en las 4 debe mostrar "gastado:
   $80.000 de $350.000" — no $50.000 en S1 y $30.000 en S2 por separado, y
   debe aparecer como opción seleccionable en las 4.
4. Prueba de regresión: repetir el mismo patrón con "Entretenimiento"
   (semanal) — cerrar S1 SÍ debe marcarlo `ejecutado` con solo el gasto de
   S1, sin cambios respecto al comportamiento actual.

## Commit de cierre

`FIX-BOLSILLO-MENSUAL-01-parcial: Parte A verificada, Parte B pendiente
de verificación visual` (ver historial de `dev`).

## Notas de ejecución

**Implementado (Opción 2 aprobada — lookup en tiempo de ejecución, sin
migrar esquema de H2):**

- `app/api/mes/[mes]/cerrar-semana/route.ts`: agregado fetch de
  `provider.getConceptos()` en paralelo con el resto de datos ya
  fetcheados; el loop que marca bolsillos `pago_fraccionado` como
  `ejecutado` ahora excluye los que tienen `frecuencia: "mensual"` en su
  concepto de H1.
- `app/mes/[mes]/semana/page.tsx`: `movimientosMes`/`consumosMes` (ya se
  fetchaban para el cálculo de saldo de Angie, sin usar para esto) y
  `conceptos` (fetch nuevo) ahora se pasan como props nuevos a
  `VistaSemanal`.
- `components/VistaSemanal.tsx`: helper `gastadoBolsillo`/
  `consumosDeBolsillo` que elige la fuente de datos (mes completo vs.
  semana visible) según si el concepto del bolsillo es mensual — usado en
  los 6+ puntos que antes calculaban "gastado" solo con la semana visible
  (líneas originales 179, 365, 1187, 1413, 1659, 2114-2130, 2171 antes de
  los cambios). La lista de `bolsillos` mostrada ahora mezcla los
  semanales scoped-a-semana con los mensuales tomados de todo el mes, para
  que estos últimos aparezcan en las 4 semanas. `ModalCorreccion` (la
  M5, submodal de corrección) recibió los mismos datos como props nuevos
  para no quedar con el defecto original en ese flujo específico.

**Decisión de simplicidad documentada, no un descuido:**
`movimientosMesInit`/`consumosMesInit` son snapshot de la carga de página
— no se mantienen sincronizados con mutaciones locales dentro de la misma
sesión de navegación (hay 9 puntos donde `consumos`/`movimientos` se
actualizan localmente vía `setConsumos`/`setMovimientos`; replicar cada
uno también en las versiones "mes" habría multiplicado el riesgo de
inconsistencia que este ticket busca evitar). Efecto práctico: si
registras un consumo nuevo contra un bolsillo mensual y NO recargas la
página, el acumulado mostrado puede quedar desactualizado por ese ítem
hasta el siguiente refresh. Aceptable para el alcance de este ticket —
señalado aquí como deuda conocida, no oculto.

**Verificado con prueba real en dev (Parte A, `cerrar-semana`):** mes de
prueba `2027-10`, sembrado con 1 movimiento de Transporte (mensual, S1,
$350.000 presupuestado) y 1 de Entretenimiento (semanal, S1, $250.000),
más consumos reales: $50.000 contra Transporte en S1, $30.000 contra
Transporte en S2, $100.000 contra Entretenimiento en S1.
`POST /api/mes/2027-10/cerrar-semana {semana:"S1"}` invocado contra el
dev server real. Leído de vuelta directamente de H2:
- Transporte: `estado: pendiente` (sin cambios) — **correcto, no se
  cerró prematuramente**.
- Entretenimiento: `estado: ejecutado`, `montoEjecutado: 100000`,
  `desviacion: -150000` — **comportamiento normal sin regresión**.

Primer intento de seed tuvo una condición de carrera (2 llamadas
`values.append` consecutivas a H2 colisionaron en la misma fila,
perdiendo una) — corregido escribiendo ambas filas en una sola llamada
`append` con array de 2 filas. Documentado por si se reutiliza el patrón
de seed en pruebas futuras de otros tickets.

**No verificado en esta sesión (Parte B, UI):** el navegador de Claude en
Chrome estaba conectado al Chromebook de Camilo, no al Workspace donde
corre el dev server — la página nunca cargó para inspección visual
(`get_page_text`/`screenshot` fallaban con "Frame with ID 0 is showing
error page" repetidamente, incluso tras recrear el tab varias veces). Se
confirmó indirectamente que el servidor sí renderiza correctamente:
`curl` contra la misma URL devolvió 200 con el payload RSC completo,
incluyendo `conceptosCatalogo` con los conceptos reales de H1 — prueba de
que los nuevos props llegan al componente. Camilo verificará visualmente
contra el preview de Vercel tras el push a `dev`.

Datos de prueba (`2027-10` en H2/H3) eliminados después vía
`deleteDimension`, dev Sheet restaurado a baseline — verificado con
lectura posterior (0 filas de `2027-10` en H2).

Cero llamadas contra producción en toda la sesión de construcción.
