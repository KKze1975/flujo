# Auditoría de código — Flujo

**Fecha:** 2026-07-09
**Auditor:** Claude Fable 5 (rol: desarrollador senior externo, consultoría de auditoría)
**Modalidad:** solo lectura — sin cambios de código, sin diffs.

**Alcance cubierto:** `lib/data/sheets.ts` (completo), 16 route handlers en `app/api/**`,
`lib/utils/fecha.ts`, manejo de credenciales (`.env.local`; no existe directorio `config/`),
scripts en `scripts/`, hook de pre-commit, `.gitignore` e historial de git para secretos.

---

## 1. Resumen ejecutivo

1. **Toda la API es pública.** No existe `middleware.ts` ni verificación alguna de identidad en ningún endpoint — incluido `POST /api/admin/reset-mes`, que borra datos de forma irreversible, y dos endpoints que consumen la API de Anthropic con la tarjeta del dueño.
2. **El reset de un mes borra datos de otros meses.** `resetH2` vacía toda la hoja H2 sin reescribir los demás meses, y el patrón general "clear + rewrite" no es atómico: un fallo a mitad de camino pierde todas las filas del bloque.
3. **El reset corrompe columnas silenciosamente.** Los rangos de reset de H3 y H5 usan menos columnas de las que hoy tienen esas tablas; tras un reset con datos de varios meses, las columnas sobrantes quedan desalineadas fila a fila.
4. **Fallos de API disfrazados de "no hay datos".** Nueve lecturas en `sheets.ts` capturan cualquier error y devuelven `[]`; en el peor caso, eso desactiva el guard de "mes ya inicializado" y permite duplicar el mes completo.
5. **Un fallo de red se convierte en decisión de negocio.** Si la llamada a Claude falla en `/clasificar`, el gasto se marca `clasificado=true` + `imprevisto=true` sin `bolsilloId`, violando la invariante I-03 declarada del proyecto.

---

## 2. Hallazgos

### Integridad de datos y operaciones destructivas

**H-01 · Alta — Endpoint de borrado irreversible sin autenticación.**
`app/api/admin/reset-mes/route.ts:81-108`. Cualquiera que conozca la URL puede hacer `POST /api/admin/reset-mes` con `{"mes":"2026-07"}` y borrar H2, H3B, H4A-D, H5A y H5B sin login, token ni confirmación server-side. La única "protección" es un `confirm()` del navegador en `app/admin/trazabilidad/page.tsx:310`, que no protege nada a nivel de API. **Hecho:** grep de `authorization|x-api-key|password|token` sobre `app/` no devuelve nada y no existe `middleware.ts`. **No verificable desde el código:** si el deployment de Vercel tiene protección de plataforma (Vercel Authentication / password protection) delante — eso cambia la severidad práctica; ver pregunta abierta P-1.

**H-02 · Alta — `resetH2` borra todos los meses, no solo el solicitado.**
`app/api/admin/reset-mes/route.ts:60-79`. La función cuenta las filas del mes objetivo pero luego ejecuta `clear H2!A2:Z1000` sin reescribir las filas de otros meses — a diferencia de `deleteRowsByMes` (líneas 42-55), que sí preserva `otherRows`. Si H2 contiene julio y agosto y se resetea julio, agosto desaparece. **Hecho** (el código es inequívoco). El texto del diálogo en `trazabilidad/page.tsx:310` ("H2 queda vacía") sugiere que es conocido, pero el contrato del endpoint es por-mes y las demás hojas sí filtran por mes — la intención queda como pregunta abierta P-2, no como veredicto.

**H-03 · Alta — Patrón clear-then-rewrite no atómico en el reset.**
`app/api/admin/reset-mes/route.ts:47-55`. `deleteRowsByMes` primero ejecuta `values.clear` sobre todo el bloque y después `values.update` con las filas supervivientes. Si el proceso muere o la segunda llamada falla (rate limit de Sheets API, timeout de la función) entre ambos pasos, **todas** las filas del bloque de todos los meses se pierden, no solo las del mes reseteado. Además los 8 resets corren en `Promise.all` (líneas 93-102) sin coordinación con escrituras concurrentes: un consumo registrado durante el reset puede aterrizar en medio del clear y perderse o quedar duplicado. **Hecho** (mecanismo visible en el código); la probabilidad del fallo parcial es **inferencia**.

**H-04 · Alta — Rangos de reset desalineados con el esquema real → corrupción de columnas.**
`app/api/admin/reset-mes/route.ts:95,100`. H3B tiene 17 columnas (A-Q; `imprevisto` es la Q, ver `H3B_HEADERS` en `lib/data/sheets.ts:702-707`), pero el reset lee y limpia solo `H3!A:P`. H5A tiene 16 columnas (A-P; `destino_remanente` y `remanente_ejecutado` son O y P, ver `H5_HEADERS` en `lib/data/sheets.ts:851-858`), pero el reset usa `H5!A:N`. Consecuencia: al resetear un mes cuando hay filas de otros meses, las filas se compactan en A:P (o A:N) pero las columnas Q (o O:P) conservan los valores de las posiciones viejas — cada fila superviviente queda con el `imprevisto`/`destino_remanente` de otra fila. Corrupción silenciosa que ningún código detecta. **Hecho** por lectura de código (conteo de columnas verificado contra los headers); no se ejecutó contra un Sheet real.

**H-05 · Alta — `revertir_mes_siguiente` deja una fila huérfana en el mes siguiente.**
`app/api/mes/[mes]/movimientos/[id]/route.ts:158-159` vs. `:130-157`. `mover_mes_siguiente` crea una fila nueva en H2 para el mes siguiente **y** marca la actual como `pospuesto_mes_siguiente`. `revertir_mes_siguiente` solo revierte el estado de la fila actual a `pendiente`; la fila creada en el mes siguiente no se borra (no existe ningún DELETE de movimientos en el código). Resultado: el mismo concepto queda presupuestado dos veces — `pendiente` en ambos meses — y el guard de `iniciar` (`iniciar/route.ts:67-74`) tratará esa fila huérfana como ilegítima, bloqueando además la inicialización normal del mes siguiente. **Hecho** en cuanto al código; que la semántica esperada sea "borrar la fila destino" es **inferencia**.

**H-06 · Media — `cerrar-semana` no es idempotente ni atómico.**
`app/api/mes/[mes]/cerrar-semana/route.ts:82-137`. No verifica si ya existe un cierre para `(mes, semana)` antes de escribir: dos POST (doble click, retry de red) crean dos filas `CIERRE_*` en H5A y dos planes en H5B. Además es una secuencia de 3+ escrituras (cierre → plan → consolidación de bolsillos vía `Promise.all` de updates) sin rollback: si falla el paso 2 o 3, queda un cierre escrito con bolsillos sin consolidar, y el reintento duplica el cierre. **Hecho.** Nota relacionada: `posponer` sí valida contra semanas cerradas (`movimientos/[id]/route.ts:84-92`) pero `ejecutar` no — se puede ejecutar un movimiento en una semana ya cerrada, alterando totales ya congelados en H5A (pregunta abierta P-6).

**H-07 · Media — Escrituras read-modify-write por índice de fila, sin control de concurrencia.**
`lib/data/sheets.ts:295-328` (`updateMovimiento`), `:109-131` (`updateConcepto`), `:782-811` (`updateConsumoH3`), `:813-847` (`deleteConsumoH3`). Todas localizan la fila por índice en una lectura y escriben/borran por número de fila después. Entre lectura y escritura, otro request puede (a) modificar la misma fila → lost update (el segundo PATCH pisa el primero con datos stale, porque reescribe la fila **completa**), o (b) en H3, borrar una fila → los índices se corren y el update/delete cae en la fila equivocada. El caso (b) es el más grave porque `deleteConsumoH3` es destructivo. **Hecho** (mecanismo); frecuencia con 2 usuarios es **inferencia** (baja pero no nula: el FAB de registro y la clasificación async de `RegistroRapido.tsx:39-43` generan escrituras concurrentes reales sobre H3).

**H-08 · Media — IDs generados con `Date.now()` colisionan bajo concurrencia.**
`lib/data/sheets.ts:272-274` (`MOV_${base+i}` — dos llamadas dentro del mismo intervalo de milisegundos que el tamaño del lote generan IDs solapados), `:98`, `:487`, `:539`, `:936`, `:987`, y `app/api/registro/sin-concepto/route.ts:80` (`CONSUMO_${Date.now()}` — dos registros en el mismo ms colisionan). Con IDs duplicados, `updateMovimiento`/`updateConsumoH3` actualizan silenciosamente la primera fila que matchee. **Hecho** (mecanismo), **inferencia** (probabilidad).

**H-09 · Media — `mover_mes_siguiente` no atómico y guard incompleto.**
`app/api/mes/[mes]/movimientos/[id]/route.ts:108-157`. Crea la fila del mes siguiente **antes** de marcar la actual; si el `updateMovimiento` final falla, la fila destino ya existe y la actual sigue `pendiente`. El guard anti-duplicado (líneas 117-128) explícitamente no aplica a conceptos `frecuencia === "semanal"`, así que para esos el reintento duplica la fila destino. **Hecho.**

### Manejo de errores silencioso

**H-10 · Alta — Nueve lecturas devuelven `[]`/ceros ante cualquier error de la Sheets API.**
`lib/data/sheets.ts:236-238, 258-260, 480-482, 532-534, 585-587, 677-679, 760-762, 777-779, 903-905`. Un 429/500/timeout de Google es indistinguible de "no hay datos". Cadenas de consecuencia concretas: (1) `POST /api/mes/[mes]/iniciar` (`iniciar/route.ts:55,76`) usa `getMovimientos(mes)` como guard de "ya inicializado" — si esa lectura falla y devuelve `[]`, el guard pasa y el mes se **duplica completo** en H2; (2) el guard "no posponer a semana cerrada" (`movimientos/[id]/route.ts:85-91`) se desactiva si `getCierresSemana` falla (`sheets.ts:903-905`); (3) `getGastosSinClasificarPorSemana` devuelve ceros ante fallo (`sheets.ts:677-679`), permitiendo cerrar una semana con gastos sin clasificar — exactamente lo que la validación de `cerrar-semana/route.ts:50-55` intenta impedir. Los `.catch(() => [])` en las rutas (`cerrar-semana/route.ts:45-46`, `meses/route.ts:13-14`, `semana/[semana]/route.ts:34-36`) agravan el patrón. **Hecho** (mecanismo); los escenarios son **inferencia** directa de la composición de funciones.

**H-11 · Alta — Fallo de la API de Anthropic se registra como clasificación de negocio, violando I-03.**
`app/api/consumos/[id]/clasificar/route.ts:52-60`. El `catch` vacío de la llamada a Claude (líneas 52-54) deja `bolsilloId` undefined, y el código escribe `{ imprevisto: true, clasificado: true }`. Es decir: API key vencida, rate limit o timeout ⇒ el gasto queda marcado como "imprevisto" y "clasificado" **sin** `bolsilloId` — estado que `INVARIANTS.md` I-03 declara imposible ("clasificado solo puede ser TRUE si bolsilloId está presente. Nunca TRUE con bolsilloId null"). Además `PATCH /api/consumos/[id]` (`consumos/[id]/route.ts:48-60`) acepta `clasificado: true` sin exigir `bolsilloId`, dejando la invariante sin ninguna guarda server-side. **Hecho** contra el texto de la invariante; si `imprevisto=true` es una excepción sancionada a I-03, es decisión del dueño (pregunta abierta P-4).

### Fechas: datos vs. reloj de servidor

**H-12 · Media — Dos implementaciones contradictorias de "semana actual".**
`lib/utils/fecha.ts:27-44` calcula la semana por ciclo día-29 en timezone Bogotá; `app/api/mes/[mes]/semana/[semana]/route.ts:8-14` (`semanaActivaMes`) usa `new Date().getDate()` — timezone del servidor (UTC en Vercel) — y cortes calendario 1-7/8-14/15-21/22+. Divergen: el 29-31 de cada mes, `fecha.ts` dice "S1 del ciclo siguiente" y `semanaActivaMes` dice "S4"; y entre 19:00 y 24:00 hora Bogotá el `getDate()` UTC ya es el día siguiente. El valor se devuelve al cliente como `semanaActivaMes` (línea 57) para marcar la semana activa en la UI. **Hecho** (ambas implementaciones visibles); qué decide la UI con ese valor es **inferencia**.

**H-13 · Media — Fechas escritas en UTC mientras mes/semana se calculan en Bogotá.**
`new Date().toISOString().split("T")[0]` en `movimientos/[id]/route.ts:58` (`fechaEjecucion`), `cerrar-semana/route.ts:68` (`fechaCierre`), `cerrar-m1/route.ts:41`, `registro/sin-concepto/route.ts:81` (`fecha` del consumo), `ingresos/camilo/[mes]/route.ts:59`, `mes/[mes]/conceptos/route.ts:51`, `lib/data/sheets.ts:595`. Después de las 19:00 en Bogotá, la fecha registrada es la de mañana. En `sin-concepto` la misma fila mezcla `mes`/`semana` calculados en TZ Bogotá (líneas 82-83, correcto) con `fecha` en UTC: un registro del 28 de julio a las 20:00 queda `mes=2026-07, fecha=2026-07-29`, y uno del 31 a las 20:00 queda con combinaciones que no cuadran al auditar. **Hecho.**

**H-14 · Baja — Bordes del ciclo día-29.**
`lib/utils/fecha.ts:36-37`: `new Date(year, 1, 29)` en años no bisiestos rueda a marzo 1 — el propio comentario lo documenta como workaround; el efecto práctico parece benigno (el ciclo de marzo arranca el 1) pero no está testeado (no hay test runner). Y el corte `offset >= 21 → S4` hace que S4 absorba hasta 10 días en ciclos de 31 días (comentario en línea 26 lo reconoce como deuda de "Iniciativa E"). **Hecho** (ambos reconocidos en comentarios); se reporta para que exista en un registro formal y no solo en comentarios.

### Autenticación, validación de input y superficie de ataque

**H-15 · Alta — Cero autenticación en los 16 endpoints, incluidos todos los que mutan estado.**
No existe `middleware.ts` (verificado por glob) ni chequeo de identidad en ningún handler. Mutadores expuestos: `PATCH /api/mes/[mes]/movimientos/[id]`, `POST .../iniciar`, `POST .../cerrar-semana`, `POST .../cerrar-m1`, `POST .../saldos`, `PUT /api/ingresos/angie/[mes]`, `POST /api/ingresos/camilo/[mes]`, `DELETE|PATCH /api/consumos/[id]`, `POST /api/registro/sin-concepto`, `POST /api/mes/[mes]/conceptos`, `PATCH /api/conceptos/[id]`, más el reset de H-01. **Hecho.** Para una app familiar de 2 usuarios esto puede ser una decisión asumida, pero el radio de impacto (borrado + escritura de datos financieros) lo hace el hallazgo estructural #1 junto con P-1.

**H-16 · Media — Endpoints que gastan créditos de Anthropic sin auth ni límites.**
`app/api/registro/interpretar/route.ts:46-125` acepta texto o imagen base64 **sin límite de tamaño** y llama a `claude-sonnet-4-6`; `app/api/consumos/[id]/clasificar` llama a Haiku. Sin autenticación (H-15) ni rate limiting, cualquiera puede hacer un loop de requests y consumir la API key. Además la respuesta del modelo se extrae con `text.match(/\{[\s\S]*\}/)` y `JSON.parse` sin validar el esquema (líneas 113-120): campos ausentes, `monto` no numérico o `semana` fuera de S1-S4 pasan tal cual al cliente. **Hecho** (código); el vector de abuso es **inferencia** estándar.

**H-17 · Media — Validación de input débil en escrituras.**
(a) `PATCH /api/consumos/[id]` (`consumos/[id]/route.ts:26-60`): `monto` sin chequeo de tipo ni signo (un string o negativo se escribe al Sheet), `semana` sin whitelist S1-S4, `bolsilloId` sin verificar que exista en H1 — combinado con I-03, la escritura de un `bolsilloId` arbitrario es plausible desde la UI de corrección M5. (b) `MES_REGEX = /^\d{4}-\d{2}$/` en todas las rutas acepta `2026-99`; `mover_mes_siguiente` (`movimientos/[id]/route.ts:109-112`) generaría `mes=2026-100` como dato persistido. **Hecho.**

### Invariantes de negocio con caminos que las rompen

**H-18 · Media — Movimientos de semana variable se cuentan en el presupuesto de cada semana cerrada.**
`lib/data/sheets.ts:285-291`: `getMovimientosByMesYSemana` incluye todo movimiento con `semana === null` no ejecutado en **cualquier** semana consultada. `cerrar-semana/route.ts:57` suma su `montoPresupuestado` al `totalPresupuestado` del cierre — el mismo monto entra al total de S1, S2, S3 y S4 hasta que se ejecute, inflando `desviacionTotal` de cada H5A. Que aparezcan como pendientes en cada semana parece diseño; que su presupuesto se sume en cada **cierre** parece efecto colateral. **Ambigüedad — pregunta abierta P-3**, no veredicto.

**H-19 · Baja/Media — El reset escribe el rango de H4D, contradiciendo I-05.**
`app/api/admin/reset-mes/route.ts:99` lee y reescribe `H4!X:AE` (etiquetado "H4D") mientras `INVARIANTS.md` I-05 dice "H4D no se escribe ni se lee. Cualquier referencia a H4D en código nuevo es un error". Puede ser la excepción deliberada para limpiar legacy — pregunta abierta P-5. **Hecho** (la contradicción textual existe).

**H-20 · Baja — Doble conteo potencial en `totalEjecutado` de cierres.**
`cerrar-semana/route.ts:59-63` suma ejecutados H2 (excluyendo `pago_fraccionado`) + **todos** los consumos H3B de la semana. Si un consumo H3B se clasifica contra un concepto que también se ejecuta manualmente por H2 (tipo `fijo`/`discrecional` con gastos registrados por el FAB), ese dinero cuenta dos veces. No es verificable con solo el código si el flujo de UI hace ese cruce imposible. **Especulación fundada** — pregunta abierta P-7.

### Deuda de infraestructura no versionada

**H-21 · Media — Las invariantes I-07/I-08 dependen de un hook que no está en el repo.**
El pre-commit (tsc + detección de Sheet ID hardcodeado) vive en `.git/hooks/pre-commit`, que no se versiona: un clon limpio — u otro colaborador, u otro agente — no tiene ninguna de las dos protecciones, y nada en el repo lo instala (no hay `prepare` script en `package.json`, no hay `core.hooksPath`). **Hecho.**

**H-22 · Baja — `ensureH5`/`ensureH5B` reescriben la fila de headers en cada cierre.**
`lib/data/sheets.ts:883-889, 973-979`: aun cuando la hoja ya existe, cada `createCierreSemana`/`createPlanSemana` pisa `H5!A1`/`H5B!A1` con los headers del código. Cualquier columna extra añadida manualmente en el Sheet pierde su header (los datos quedan, el header no). También significa que un deploy viejo puede "downgradear" headers nuevos. **Hecho.**

**H-23 · Positivo (sin hallazgo) — Manejo de secretos correcto.**
`.env*` está en `.gitignore:34`; `git log --all` sobre `.env.local`/`.env` no muestra commits; los 20+ scripts leen `GOOGLE_SHEET_ID`/`PROD_GOOGLE_SHEET_ID` de `.env.local` sin IDs hardcodeados; la private key se lee de env con el replace de `\\n` estándar (`sheets.ts:32-36`). Única observación: la misma máquina dev tiene en `.env.local` la service account con permiso de **escritura** sobre el Sheet de producción (`PROD_GOOGLE_SHEET_ID` presente) — el radio de daño de una máquina comprometida incluye prod.

---

## 3. Plan de acción recomendado

Ordenado por severidad × radio de impacto (no por facilidad). (a) = fix directo sin ambigüedad; (b) = requiere decisión de diseño del dueño antes de construirse.

1. **Poner una capa de autenticación delante de la API, como mínimo de `/api/admin/*`** [H-01, H-15, H-16] — **(b)** requiere decisión: Vercel Deployment Protection, middleware con token compartido, o auth real. Es la condición previa que reduce la explotabilidad de casi todo lo demás.
2. **Rehacer `reset-mes`:** rangos de columnas alineados al esquema real (H3 A:Q, H5 A:P) [H-04] — **(a)**; reemplazar clear-then-rewrite por `deleteDimension` de filas específicas (como ya hace `deleteConsumoH3`), eliminando la ventana de pérdida total [H-03] — **(a)**; y decidir la semántica de `resetH2` (por mes vs. total) [H-02] — **(b)**.
3. **Cerrar los caminos que violan I-03** [H-11, H-17a]: comportamiento ante fallo de Anthropic (¿dejar `clasificado=false`?) y si `imprevisto` exime de `bolsilloId` — **(b)** primero la decisión, después el guard server-side en `updateConsumoH3` — **(a)**.
4. **Distinguir "error de API" de "sin datos" en `sheets.ts`** [H-10]: propagar excepciones en las lecturas que alimentan guards (`getMovimientos` para `iniciar`, `getCierresSemana`, `getGastosSinClasificarPorSemana`) — **(a)**; el guard de `iniciar` duplicando un mes completo es el caso más urgente.
5. **Idempotencia de `cerrar-semana`** [H-06]: rechazar cierre si ya existe `(mes, semana)` en H5A — **(a)**; decidir si `ejecutar` debe bloquearse en semana cerrada [P-6] — **(b)**.
6. **Resolver la fila huérfana de `revertir_mes_siguiente`** [H-05] — **(b)** decidir si revertir debe borrar la fila destino (requiere un delete de movimientos que hoy no existe).
7. **Unificar el cálculo de semana y las fechas a TZ Bogotá** [H-12, H-13]: eliminar `semanaActivaMes` en favor de `semanaActual()` y crear un helper `hoyBogota()` — **(a)**.
8. **IDs con componente aleatorio** (`MOV_`, `CONSUMO_`, etc.) [H-08] — **(a)**.
9. **Validación de input en `PATCH /api/consumos/[id]` y rango de mes 01-12 en `MES_REGEX`** [H-17] — **(a)**.
10. **Versionar el pre-commit hook** (`core.hooksPath` o script `prepare`) [H-21] — **(a)**.

---

## 4. Preguntas abiertas para el dueño

- **P-1:** ¿El deployment de Vercel tiene Deployment Protection / password delante de la URL de producción? No es verificable desde el repo y determina la severidad real de H-01/H-15/H-16.
- **P-2:** ¿Que `resetH2` vacíe **toda** H2 (todos los meses) es intencional — p.ej. porque el modelo operativo es "un solo mes vivo en H2" — o es un bug heredado del experimento de julio? El diálogo de la UI lo insinúa pero el contrato del endpoint es por-mes.
- **P-3:** ¿El `montoPresupuestado` de conceptos de semana variable debe sumarse al `totalPresupuestado` de **cada** cierre semanal mientras no se ejecuten (H-18), o solo al de la semana donde finalmente se ejecutan?
- **P-4:** ¿`imprevisto=true` con `clasificado=true` y sin `bolsilloId` es una excepción sancionada a I-03, o I-03 aplica sin excepciones? El texto de `INVARIANTS.md` dice lo segundo; el código hace lo primero.
- **P-5:** ¿`reset-mes` tocando el rango H4D (X:AE) es la excepción deliberada a I-05 para limpiar legacy, o debe eliminarse?
- **P-6:** ¿Debe poder ejecutarse un movimiento en una semana que ya tiene cierre? Hoy `posponer` lo bloquea pero `ejecutar` no, y el cierre en H5A no se recalcula.
- **P-7:** ¿Puede un mismo gasto existir como ejecución H2 y como consumo H3B clasificado al mismo concepto (doble conteo en `totalEjecutado` del cierre, H-20), o el flujo de UI lo hace imposible?
- **P-8:** ¿Cuál es el volumen esperado de filas por hoja? Los topes fijos de los rangos de clear (`H2!A2:Z1000`, resto `:10000`) fallan silenciosamente por encima de eso.

---

*Nota de contexto: existe una auditoría previa en `audit-adversarial-01/` (sin trackear en git); no se usó como fuente — todos los hallazgos de este documento salen de la lectura directa del código en la sesión de auditoría del 2026-07-09.*
