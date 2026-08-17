# VIGILANCIA.md — log de auditoría automática
> Generado por rutina programada (Claude Code cloud agent), semanal. Aplica los 9 Pilares de Diseño Técnico de HG SDD (PILARES_DISENO.md, proyecto Agente HG SDD). Es un log append-only — nunca se borra ni se reescribe una entrada anterior. Cada hallazgo es candidato a revisión de Camilo, no una acción tomada.

## Auditoría — 2026-08-10 (UTC)
**Resumen:** 9 hallazgos concretos (5 Pilar 1/Seguridad, 2 Pilar 2/Resiliencia, 1 Pilar 4/Observabilidad, 1 Pilar 6/Eficiencia). Nada nuevo crítico — el único hallazgo de severidad crítica (endpoint admin sin autenticación) ya está registrado como `SEC-AUTH-ADMIN-RESET-01` en el backlog; esta corrida confirma por lectura directa del código que sigue sin mitigar.

### Pilar 1 — Seguridad

1. **`app/api/admin/reset-mes/route.ts:81-108`** — `POST /api/admin/reset-mes` no tiene ninguna verificación de autenticación ni autorización. Acepta `{ mes: "YYYY-MM" }` en el body (única validación: formato regex) y borra vía `values.clear` filas completas de H2, H3, H4A/B/C/D, H5A y H5B para ese mes. Cualquier request no autenticado puede destruir los datos de un mes completo. Corresponde al ticket ya abierto `SEC-AUTH-ADMIN-RESET-01` ("propuesto, sin fix construido" según `ESTADO.md`) — confirmado sin mitigación aplicada. OWASP A01:2021 Broken Access Control.

2. **`app/api/cron/uber-parser/route.ts:78-84`** y **`app/api/admin/backup-sheet/route.ts:156-162`** — el chequeo de autenticación es fail-open: `if (cronSecret) { ...valida Bearer... }`. Si la variable de entorno `CRON_SECRET` no está configurada en el entorno de despliegue, el bloque entero se salta y el endpoint queda sin ninguna protección — no hay ningún chequeo que falle el arranque o la request si la variable falta. `uber-parser` escribe filas nuevas en H3 y marca correos de Gmail como leídos; `backup-sheet` lee la Sheet de producción completa (`PROD_GOOGLE_SHEET_ID`). Ninguno de los dos archivos verifica que `CRON_SECRET` esté efectivamente presente antes de continuar — la protección depende silenciosamente de una configuración externa al repo. OWASP A07:2021 (fail-open auth).

3. **`app/api/registro/sin-concepto/route.ts:52,82`** — el campo `mes` se acepta del body del cliente sin ningún patrón de validación (`body.mes ?? mesActual()`), a diferencia de todos los demás routes bajo `mes/[mes]/...` que sí aplican `MES_REGEX`. Un cliente puede enviar cualquier string arbitrario como `mes`, que queda escrito directamente en H3 vía `values.append`. Viola **I-01/I-02** (mes/semana operativos se calculan server-side, nunca se aceptan del cliente sin validar) y produce filas de H3 con `mes` inconsistente, invisibles para cualquier vista que filtre por mes válido.

4. **`app/api/registro/sin-concepto/route.ts:68,91`** — `body.monto` solo se valida con `!body.monto` (chequeo de truthy), no con `typeof body.monto === "number"` como sí hacen `app/api/consumos/[id]/route.ts` o `app/api/mes/[mes]/movimientos/[id]/route.ts`. Un valor no numérico truthy (ej. `"abc"`, `true`, un objeto) pasa la validación y se persiste vía `String(body.monto)` en la columna `monto` de H3, corrompiendo silenciosamente cualquier suma o cierre de semana que dependa de ese valor.

5. **`package.json:12`** (`"next": "16.2.6"`) — `npm audit` reporta 4 vulnerabilidades de severidad alta sobre las dependencias instaladas actualmente, incluyendo `GHSA-955p-x3mx-jcvp` (Next.js: unauthenticated disclosure of internal Server Function endpoints) y `GHSA-p9j2-gv94-2wf4` (SSRF vía rewrites con hostname controlado por atacante), además de vulnerabilidades heredadas en `postcss` y `sharp`. Fix disponible vía `npm audit fix --force` (sube a `next@16.3.0`, fuera del rango declarado en `package.json`). OWASP A06:2021 Vulnerable and Outdated Components.

### Pilar 2 — Resiliencia

6. **`app/api/mes/[mes]/movimientos/[id]/route.ts:146-192`** (rama `tipo: "mover_mes_siguiente"`) — la fila del mes destino se crea (`provider.crearMovimientosMes`, línea 148) antes de marcar el movimiento origen como `pospuesto_mes_siguiente` (esa escritura ocurre al final del handler, línea 192, común a todas las ramas). Si `provider.updateMovimiento` falla o el proceso se interrumpe entre esas dos escrituras, el resultado es una fila duplicada ya escrita en el mes siguiente más una fila origen que permanece en `pendiente` — sin camino de retry, porque el guard de las líneas 135-144 ya detecta "yaExiste" en el mes destino y bloquea cualquier reintento. Estado inconsistente que ningún endpoint existente puede reparar.

7. **`lib/data/sheets.ts`** — el patrón read-modify-write (leer la columna completa, buscar índice por id con `findIndex`, escribir de vuelta esa fila) se repite en `updateConcepto` (~L109-127), `updateMovimiento` (~L300-333), `updateIngresoCamilo` (~L510-514), `updateIngresoAngie` (~L562-566) y `updateConsumoH3` (~L795-808), sin ningún lock optimista ni control de versión. Dos PATCH concurrentes sobre el mismo id (ej. Camilo y Angie editando casi al mismo tiempo, escenario esperado por diseño del sistema) pueden pisarse: la segunda escritura no ve los cambios de la primera y la sobrescribe (lost update) sin error ni aviso.

### Pilar 4 — Observabilidad/Logs

8. Cero llamadas a `console.log`/`console.error`/`console.warn` bajo `app/` (0 coincidencias por grep). Todos los `catch` de las rutas API devuelven el mensaje de error al cliente pero no dejan ningún rastro server-side de qué escritura falló, con qué payload, ni qué actor la disparó. Reconstruir la causa de un fallo reportado ("el gasto no se registró") depende exclusivamente de logs implícitos de la plataforma de hosting, si están habilitados — no hay logging de aplicación intencional en ningún route handler.

### Pilar 6 — Eficiencia/Desempeño

9. **`lib/data/sheets.ts:300-333`** (`updateMovimiento`) — cada actualización de un movimiento lee la columna completa de H2 (`range: "H2!A:Y"`, todos los meses históricos) antes de escribir una sola fila. Este método se invoca en bucle dentro de `app/api/mes/[mes]/cerrar-semana/route.ts:130-144` (`bolsilloMovs.map(...)` dentro de `Promise.all`) — cerrar una semana con N bolsillos `pago_fraccionado` dispara N lecturas completas de H2 más N escrituras, todas contra la misma cuota de la Sheets API que el propio Pilar 6 señala como límite real (300 req/min). El costo por escritura crece con el tamaño histórico de H2, no con el tamaño de la operación.

---

## Auditoría — 2026-08-17 (UTC)
**Resumen:** Esta corrida audita `dev` (`origin/dev`, HEAD `0d49cf5`), no `main` — `main` sigue congelado en el commit del 9 ago 2026 (21 commits detrás), y `dev` tiene trabajo real no reflejado ahí, incluyendo un panel admin nuevo. Confirmado por lectura de código: el hallazgo crítico de la corrida anterior (`SEC-AUTH-ADMIN-RESET-01`, endpoint admin sin auth) **está corregido**. Pero aparecen 3 hallazgos de severidad crítica no reportados antes: (1) `app/api/admin/reset-mes` borra el H2 de **todos** los meses en cada llamada, no solo el mes pedido — bug destructivo real, no teórico; (2) el fix de autenticación del panel admin se aplicó solo a `/api/admin/*` — casi todos los endpoints que mutan presupuesto/gasto/ingreso (movimientos, consumos, ingresos, cerrar-semana, iniciar, registro, conceptos) siguen sin ningún chequeo de identidad; (3) el Sheet ID de producción está hardcodeado y commiteado en `scripts/auditoria-julio.mjs` y varios `.md` — viola I-04/I-08 explícitamente, y se confirmó que el pre-commit hook que CLAUDE.md describe como guardia de esto no existe (`.git/hooks/pre-commit` no está instalado; el hook real solo corre `tsc`). 28 hallazgos concretos en total repartidos en los 9 pilares.

### Pilar 1 — Seguridad

1. **Fix confirmado — `app/api/admin/reset-mes/route.ts:83-85` + `lib/admin-auth.ts:1-53`.** `SEC-AUTH-ADMIN-RESET-01` (hallazgo #1 de la corrida 2026-08-10) está corregido en `dev`: cookie de sesión firmada HMAC (`ADMIN_SESSION_SECRET`), comparación con `crypto.timingSafeEqual` tanto para el PIN como para la firma de sesión, y falla **cerrado** (401) si `ADMIN_SESSION_SECRET`/`ADMIN_PANEL_PIN` no están configurados. Aplicado también a `backup-status`, `eventos-log` (GET+DELETE) y `conceptos/[id]/retirar`.

2. **CRÍTICO — `app/api/mes/[mes]/movimientos/[id]/route.ts`, `app/api/consumos/[id]/route.ts`, `app/api/consumos/[id]/imprevisto/route.ts`, `app/api/mes/[mes]/iniciar/route.ts`, `app/api/mes/[mes]/cerrar-semana/route.ts`, `app/api/consumos/[id]/clasificar/route.ts`, `app/api/registro/interpretar/route.ts`, `app/api/registro/sin-concepto/route.ts`, `app/api/ingresos/camilo/[mes]/route.ts`, `app/api/ingresos/angie/[mes]/route.ts`, `app/api/conceptos/route.ts`, `app/api/conceptos/[id]/route.ts`** — ninguno de estos handlers llama `isAdminRequestAuthorized` ni ningún otro chequeo de identidad, y no existe `middleware.ts` en el repo que aplique auth de forma global. El fix de PANEL-ADMIN-01 se limitó a `/api/admin/*` (más el retrofit puntual de `conceptos/[id]/retirar`); el resto de la superficie que muta H1-H4 sigue tan abierta como en la auditoría base de julio (`audit-fable-01/findings.md`, H-15). Cualquiera que alcance la URL desplegada puede `PATCH /api/mes/2026-08/movimientos/{id}` para falsificar ejecución de una línea de presupuesto, `DELETE /api/consumos/{id}` para borrar un gasto, o `POST /api/mes/{mes}/cerrar-semana` para cerrar una semana con totales fabricados — sin ninguna credencial. OWASP A01:2021.

3. **`app/api/admin/backup-sheet/route.ts:155-162`** — a diferencia de sus hermanos bajo `/api/admin/*`, esta ruta nunca llama `isAdminRequestAuthorized`; depende solo del chequeo fail-open de `CRON_SECRET` (hallazgo #2 de la corrida anterior — confirmado aún sin corregir, mismo patrón en `app/api/cron/uber-parser/route.ts:78-84`). Con `CRON_SECRET` sin configurar en un entorno (ej. preview), un `GET` no autenticado dispara lecturas completas de H1-H5B de producción y escritura al Sheet de backup, y la respuesta JSON expone el Sheet ID contenedor del backup. OWASP A01:2021.

4. **`app/api/admin/auth/route.ts:9-26`** — la comparación del PIN es timing-safe, pero no hay rate limiting, contador de intentos ni bloqueo. `PinGate.tsx` usa `inputMode="numeric"`, lo que sugiere un PIN corto — sin throttling, es fuerza-bruteable por script. OWASP A07:2021.

5. **`scripts/auditoria-julio.mjs:25`** — Sheet ID de producción (`1GOMhxYw_f7Zl-GTVNtxAs9218x4vKxzg3LGRyveyr7A`) hardcodeado y commiteado (`git log` lo ubica en `50c4c93`), con comentario explícito "Auditoría usa siempre el Sheet de producción". El mismo ID aparece en texto plano en `ESTADO.md:469,2383`, `PROMPT_AGENTE.md:19`, `SESSION_LOG.md` y `AUDITORIA_JULIO.md:5`. Viola directamente I-04/I-08. Confirmado que el guard de pre-commit descrito en CLAUDE.md ("checks that the production Sheet ID is not hardcoded") no existe como tal: `.git/hooks/pre-commit` no está instalado (`core.hooksPath` sin configurar, solo existe `pre-commit.sample`), y el hook real de Claude Code solo corre `tsc --noEmit` — el chequeo de Sheet ID nunca se ejecutó contra estos commits.

6. **`app/api/registro/sin-concepto/route.ts:82,68`** — confirmado aún presente (hallazgo #3/#4 de la corrida anterior): `mes` se acepta del cliente sin regex (`body.mes ?? mesActual()`), viola I-01/I-02; `monto` solo se valida con chequeo de truthy (`!body.monto`), no de tipo — un valor no numérico truthy se persiste vía `String(body.monto)` en H3.

7. **`app/api/consumos/[id]/route.ts:20-65` + `lib/data/sheets.ts:790-819`** — `clasificado` y `bolsilloId` se aceptan como campos independientes en el PATCH y se escriben sin validar que `clasificado=true` implique `bolsilloId` no vacío — viola I-03 server-side. Mismo patrón en el fallback de `app/api/consumos/[id]/clasificar/route.ts:53-61`: si la llamada a Anthropic falla, el catch (vacío) escribe `{imprevisto:true, clasificado:true}` con `bolsilloId` sin definir.

8. **`app/api/registro/interpretar/route.ts:46-125`** — sin auth (ver hallazgo 2) y sin límite de tamaño en `payload.base64` (imagen) ni en `contenido` (texto libre) antes de enviarlo a `claude-sonnet-4-6`. Ver también Pilar 9.

9. **`package.json` (`next@16.2.6`)** — no se pudo confirmar ni descartar con `npm audit` en este entorno (`node_modules` no instalado en el sandbox de auditoría). El hallazgo #5 de la corrida anterior (CVEs `GHSA-955p-x3mx-jcvp`, `GHSA-p9j2-gv94-2wf4`) queda sin verificar esta vez — ni confirmado ni resuelto, pendiente de correr `npm audit` con dependencias instaladas.

### Pilar 2 — Resiliencia

1. **CRÍTICO — `app/api/admin/reset-mes/route.ts:78` (`resetH2`)** — `values.clear({range: "H2!A2:Y1000"})` se ejecuta sin filtrar por mes, a diferencia de `deleteRowsByMes` (usado para H3/H4/H5) que sí preserva `otherRows`. Un `POST /api/admin/reset-mes {mes:"2026-07"}` borra el H2 completo — Movimientos de **todos** los meses, no solo julio.

2. **`app/api/admin/reset-mes/route.ts:98-107`** — las 8 operaciones de reset de tabs corren en un solo `Promise.all` sin try/catch alrededor. Si una falla (ej. rate-limit transitorio), las demás ya mutaron el Sheet, la excepción no se captura (500 genérico), y no queda registro de cuáles de los 8 tabs sí se resetearon.

3. **`app/api/mes/[mes]/movimientos/[id]/route.ts:135-144`** (`mover_mes_siguiente`) — el guard de duplicados solo aplica `if (concepto?.frecuencia !== "semanal")`. Para conceptos con `frecuencia: "semanal"` no hay guard: un reintento tras fallo parcial entre la creación en el mes destino (línea 148) y el update del origen (línea 192) crea una fila duplicada.

4. **`lib/data/sheets.ts:273-291` (`crearMovimientosMes`)** — calcula `nextRow` con un `values.get` de `H2!A:A` y luego escribe con `values.update` en esa fila fija (read-then-write no atómico). Dos llamadas concurrentes (`mes/iniciar` compitiendo con `mover_mes_siguiente`) pueden leer el mismo `nextRow`; la segunda sobrescribe silenciosamente las filas que la primera acaba de escribir.

5. **7 sitios de `values.append` sin `insertDataOption: "INSERT_ROWS"`** en `lib/data/sheets.ts`: `createConcepto:102`, `createIngresoCamilo:496`, `createIngresoAngie:548`, `upsertSaldosCuenta:652`, `createCierreSemana:946`, `createPlanSemana:997`, `createEventoLog:1049` — el mismo patrón que ya causó pérdida real de 67 filas (candidato de INVARIANTS.md, aún no promovido a invariante), presente incluso en la escritura del log de auditoría H9 nuevo.

6. **Sin ruta de restore.** `grep -rn "restore" app/ scripts/` no devuelve nada; `backup-sheet` solo escribe hacia el contenedor de backup, no existe el camino inverso. Combinado con el hallazgo 1 de este pilar: hay un bug destructivo real sin ningún mecanismo de reversión probado — RTO/RPO indefinidos.

7. **`app/api/mes/[mes]/cerrar-semana/route.ts:83-144`** — `createCierreSemana` (H5A), `createPlanSemana` (H5B) y el `Promise.all` de updates de bolsillos son fases separadas sin rollback. Si el proceso muere entre H5A y el `Promise.all`, la semana queda marcada "cerrada" con bolsillos `pago_fraccionado` sin ejecutar y `totalEjecutado` desalineado, sin reconciliación posterior.

### Pilar 3 — Datos y modelo

1. **`app/api/registro/sin-concepto/route.ts:1,12-19,106-111` y `app/api/cron/uber-parser/route.ts:1,17-24,141-146`** — ambos instancian su propio cliente `google.sheets` y escriben directo a H3 sin pasar por `getProvider()`, porque `IDataProvider` (`lib/data/index.ts:40-47`) no tiene método `createConsumoH3` — crear una fila H3B vía la interfaz es estructuralmente imposible hoy.

2. **Consecuencia del hallazgo anterior:** el array de 17 headers de H3B y la lógica de reparación de headers están triplicados de forma independiente en `lib/data/sheets.ts`, `app/api/cron/uber-parser/route.ts:10-15,26-51` y `app/api/registro/sin-concepto/route.ts:5-10,21-49`. Un cambio de esquema H3 (migración I-10) debe aplicarse en tres lugares independientes.

3. **Confirmado aún sin resolver — `app/api/cron/uber-parser/route.ts:106-107`** llama `mesDeFecha()`/`semanaDeFechaEnMes()` directo en vez de pasar por `cicloOperativo()` (que sí aplica la excepción de "cola de mes anterior" en fin de semana, `lib/utils/fecha.ts:19-37` vs `130-133`). Un correo de Uber de un fin de semana justo antes del primer lunes del mes queda archivado bajo el mes calendario crudo, mientras el resto del sistema usa el mes operativo — misma clase de bug que `cc51db9`; candidato `DT-CICLO-OPERATIVO-UNIFICADO-01` de INVARIANTS.md sigue abierto y confirmado presente en código.

4. **`lib/data/types.ts:79-97` (`ConsumoH3`)** — no tiene campo que registre si un valor fue inferido por IA, con qué modelo o confianza. El resultado de `registro/interpretar` (Sonnet) no deja rastro si el usuario lo envía sin editar vía `sin-concepto`; la clasificación de Haiku solo queda marcada en el JSON `detalle` de H9 (`clasificar/route.ts:69-74`), no en la fila H3B misma.

### Pilar 4 — Observabilidad/Logs

1. **`lib/` completo — cero `console.*`** (`grep -rn "console\.(error|log|warn)" lib/` sin resultados). Ningún fallo en `lib/data/sheets.ts`, la única capa de persistencia, se registra server-side.

2. **Solo 4 `console.error` en total en ~21 route files de `app/api`**, y las 4 (`admin/reset-mes/route.ts:123`, `consumos/[id]/clasificar/route.ts:75`, `cerrar-semana/route.ts:158`, `movimientos/[id]/route.ts:216`) registran solo fallos de la propia escritura a H9, no del negocio. El resto de catches (`consumos/[id]/route.ts`, `conceptos/[id]/retirar/route.ts`, `mes/[mes]/route.ts`, `ingresos/*`, `cerrar-m1/route.ts`, `mes/[mes]/saldos/route.ts`) devuelven `error.message` al cliente sin loguear nada server-side.

3. **`app/api/mes/[mes]/iniciar/route.ts` y `app/api/cron/uber-parser/route.ts`** — sin ningún try/catch alrededor del handler completo. Un throw de `values.append` a mitad del loop de `uber-parser` (línea 141-146) se vuelve unhandled rejection sin contexto (qué viaje, cuántas filas ya escritas).

4. **`lib/uber/gmail.ts:112-116` (`marcarComoLeidos`)** — loop secuencial sobre la API de Gmail sin try/catch ni logging por mensaje; si el mensaje N falla, los anteriores ya quedaron marcados como leídos sin registro de cuáles.

### Pilar 5 — Trazabilidad

1. **H9 (`createEventoLog`) se llama desde solo 4 archivos**: `movimientos/[id]/route.ts` (parcial), `cerrar-semana/route.ts`, `clasificar/route.ts`, `admin/reset-mes/route.ts`.

2. **`app/api/mes/[mes]/movimientos/[id]/route.ts:195`** — la allowlist de logging omite 2 de los 8 `tipo` válidos que el mismo route maneja: `"actualizar_monto"` (línea 107) y `"no_aplica"` (línea 189) mutan H2 sin dejar rastro en H9.

3. **`app/api/mes/[mes]/iniciar/route.ts`** — crea todos los movimientos H2 de un mes (`crearMovimientosMes`, origen de prácticamente toda fila H2 del sistema) sin ninguna llamada a H9.

4. **`app/api/mes/[mes]/cerrar-m1/route.ts:38-54`** — segundo camino de cierre de semana (S1) que, a diferencia de `cerrar-semana`, nunca llama `createEventoLog` — un cierre S1 es invisible en H9.

5. **`app/api/consumos/[id]/route.ts` PATCH y `app/api/consumos/[id]/imprevisto/route.ts` PATCH** — permiten editar `monto`, `bolsilloId`, `clasificado`, `sobreTecho`, `semana`, `imprevisto` de un consumo existente sin ninguna llamada a H9 — cambios post-creación sin auditoría.

6. **`app/api/conceptos/*`, `ingresos/angie/[mes]/route.ts`, `ingresos/camilo/[mes]/route.ts`** — escrituras a H1 e ingresos H4A/H4B sin ninguna llamada a H9.

### Pilar 6 — Eficiencia/Desempeño

1. **`lib/data/sheets.ts:303-336` (`updateMovimiento`)** — confirmado aún sin corregir: sigue leyendo `H2!A:Y` completo antes de escribir una sola fila.

2. **`app/api/mes/[mes]/cerrar-semana/route.ts:131-144`** — `Promise.all` sobre N bolsillos, cada uno disparando internamente una relectura completa de `H2!A:Y` — confirma el patrón "lectura completa × N" señalado en la corrida anterior, alcanzable desde una acción normal de usuario (Cerrar Semana).

3. **`app/api/mes/[mes]/movimientos/[id]/route.ts:52`** — un solo PATCH ya llama `getMovimientos(mes)` (lectura completa de H2) para ubicar el movimiento, y luego `updateMovimiento` hace una **segunda** lectura completa independiente. Un solo click de usuario cuesta 2 lecturas completas de columna + 1 escritura.

4. **`app/api/mes/[mes]/iniciar/route.ts:56-60`** — `Promise.all` de 2 lecturas completas de H2 (mes actual + mes previo) más lectura completa de H1, más una lectura adicional de `H2!A:A` dentro de `crearMovimientosMes` — 3+ lecturas completas por un solo "iniciar mes".

5. **`lib/data/sheets.ts:1097-1137` (`limpiarEventosLogAntiguos`)** — lee H9 completo, lo limpia completo, y reescribe cada fila sobreviviente en un solo `values.update` — costo que escala con el tamaño total del log, no con las filas realmente purgadas.

### Pilar 7 — Mantenibilidad

1. **`app/api/admin/reset-mes/route.ts:104`** — llama `deleteRowsByMes(..., "H4!X:AE", ..., "H4D")`, contradiciendo directamente I-05 ("H4D es legacy, nunca se lee ni se escribe"). Un reset puede tocar en silencio datos que CLAUDE.md documenta como fuera de límites.

2. **`lib/data/sheets.ts`** — rangos literales duplicados en vez de derivarse de las constantes de headers: `"H1!A:L"` (líneas 82,104,114), `"H2!A:Y"` (236,258,308), `"H3!A:Q"` (670,760,777,793), `"H4!A:G"`/`"H4!I:N"`/`"H4!P:V"` (múltiples). Agregar una columna a `H2_HEADERS` requiere encontrar y actualizar 3 strings hardcodeados a mano; olvidar uno trunca lecturas/escrituras sin error.

### Pilar 8 — Degradación de UI/Usabilidad

1. **`components/VistaSemanal.tsx:1091-1127` (`navegar`)** — si `semRes.ok`/`conRes.ok` es false, no se lanza error ni se marca estado de error, pero `setSemanaVisible(s)` corre igual (línea 1115). La UI cambia de pestaña de semana visualmente mientras sigue mostrando datos obsoletos de la semana anterior, sin ningún aviso.

2. **`components/VistaSemanal.tsx:1198-1214` (`handleSheetSuccess`)** — catch vacío en el refresh posterior a un registro exitoso; si `consumosRes`/`movRes` fallan, el nuevo gasto nunca aparece en la vista semanal y no hay ningún mensaje que sugiera recargar — se ve como si el registro hubiera desaparecido.

3. **`components/VistaSemanal.tsx:156-174` (`toggleImprevisto`)** — el catch solo revierte el toggle optimista, sin `setError`, a diferencia de `guardar()`/`revertir()` en el mismo componente que sí muestran error visible.

### Pilar 9 — Costos/FinOps

1. **`app/api/registro/interpretar/route.ts` y `app/api/consumos/[id]/clasificar/route.ts`** — sin autenticación (ver Pilar 1, hallazgo 2) y sin ningún rate limit — confirmado por grep repo-wide: no hay dependencia de rate-limiting (`ratelimit`/`upstash`) ni constante de límite cerca de ninguna de las dos rutas. Un loop de requests scriptado consume presupuesto de Sonnet/Haiku de la cuenta de Camilo sin techo técnico.

2. **`app/api/registro/interpretar/route.ts:76-103` + `components/m4/InputRegistro.tsx:39-50`** — la imagen se acepta tal cual la devuelve el picker/cámara (`accept="image/*"`, sin chequeo de tamaño/dimensión), se convierte a base64 sin resize, y se envía completa a `claude-sonnet-4-6`. Una foto de celular a resolución completa (varios MB) se factura a costo de tokens de imagen completo en cada escaneo de recibo.

3. **Sin cap de requests por día/usuario ni estimado de costo documentado en ningún lugar del repo** — confirmado por grep de dependencias y comentarios.

---
