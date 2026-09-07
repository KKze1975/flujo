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

## Auditoría — 2026-08-24

**Resumen:** Corrida sobre `vigilancia-auto` sincronizada con `dev` (mergeado `0d49cf5`, previamente ~3 semanas desactualizada), incorporando por primera vez el panel de administración nuevo (`app/admin/panel`, PIN-gated: reset-mes, backup, retirar-concepto, log de eventos H9). 27 hallazgos: 4 críticos, 10 altos, 9 medios, 4 menores/contexto. Crítico principal: `reset-mes` borra H2 de **todos** los meses (no solo el elegido) mientras su propio modal de confirmación le promete al operador que solo afecta un mes; y la práctica totalidad de la superficie de escritura no-admin (PATCH/DELETE de consumos, movimientos, ingresos, conceptos) sigue sin ningún control de acceso. `npm audit` confirma 4 CVEs altos en `next@16.2.6` (incluye disclosure no autenticado y SSRF). La mayoría de hallazgos de la corrida del 17-ago siguen presentes sin corregir; el único fix real es la instrumentación H9 (4 rutas ahora auditables), pero con huecos de cobertura nuevos (retirar-concepto, backup-sheet).

### Pilar 1 — Seguridad

**Controles positivos confirmados (no hallazgo, contexto):** `lib/admin-auth.ts:8-42` usa `crypto.timingSafeEqual` para PIN y firma de sesión, falla cerrado si `ADMIN_PANEL_PIN`/`ADMIN_SESSION_SECRET` no están seteadas; cookie de sesión `httpOnly`+`secure`+`sameSite:strict`, TTL 12h. Ningún path de escritura en `lib/data/sheets.ts` usa `valueInputOption: "USER_ENTERED"` (100% `"RAW"`) — descarta inyección de fórmulas Sheets (OWASP A03) como vector.

1. **CRÍTICO — `app/api/admin/reset-mes/route.ts:61-80` (`resetH2`).** Cuenta filas de H2 del `mes` solicitado en `antes` (línea 72) pero el borrado real es `values.clear({range: "H2!A2:Y1000"})` (línea 78) — el tab **completo**, sin filtrar por mes y sin reescribir `otherRows` como sí hace `deleteRowsByMes` (usado para H3/H4/H5). Un `POST /api/admin/reset-mes {mes:"2026-06"}` borra los `Movimiento` de todos los meses, no solo junio. El JSON de respuesta y el log H9 (`detalle: JSON.stringify(resetData)`) reportan solo el conteo de junio — subestiman el daño real. Agravante: `components/admin/PanelHome.tsx:176,243` y el `ModalConfirmacionDestructiva` prometen textualmente al operador "elimina... de un mes específico" antes de que confirme — la UI de doble confirmación le da al humano una garantía de alcance que el backend no cumple. El DoD del propio ticket (`PANEL-RESET-MES-01.md`) solo se probó contra un mes sin filas reales (`2099-01`), por lo que nunca se detectó. OWASP A04/integridad de datos.

2. **CRÍTICO — superficie de escritura no-admin prácticamente sin autenticación.** `grep -rn "isAdminRequestAuthorized" app/api` solo aparece en 4 rutas (`admin/backup-status`, `admin/eventos-log`, `admin/reset-mes`, `conceptos/[id]/retirar`). No existe `middleware.ts`. Todo el resto de rutas mutadoras están abiertas: `app/api/consumos/[id]/route.ts` (PATCH/DELETE, confirmado sin ningún chequeo de auth), `app/api/mes/[mes]/movimientos/[id]/route.ts` (PATCH, incluye `ejecutar`/`mover_mes_siguiente`/etc.), `consumos/[id]/clasificar`, `mes/[mes]/iniciar`, `mes/[mes]/cerrar-semana`, `registro/interpretar`, `registro/sin-concepto`, `ingresos/camilo/[mes]`, `ingresos/angie/[mes]`, `conceptos/route.ts`, `conceptos/[id]/route.ts`. Un `curl -X DELETE /api/consumos/{id}` sin credenciales borra un gasto; un `PATCH /api/mes/{mes}/movimientos/{id} {tipo:"ejecutar"}` fabrica la ejecución de una línea de presupuesto. El PIN del panel solo protege 4 rutas — el resto de la superficie de escritura de la app es tan abierta como antes de que el panel existiera. OWASP A01.

3. **CRÍTICO (re-confirmado, hallazgo #3 de la corrida 17-ago) — `app/api/admin/backup-sheet/route.ts:155-162` y `app/api/cron/uber-parser/route.ts:78-84`.** Mismo patrón fail-open: si `CRON_SECRET` no está seteado en el entorno, el bloque de validación se salta completo y la ruta queda sin ningún auth — ninguna de las dos llama `isAdminRequestAuthorized`. Ambas están registradas como crons de Vercel alcanzables por `GET` sin autenticar. `backup-sheet` expone el Sheet ID del contenedor de backup en la respuesta JSON.

4. **ALTO — `app/api/admin/reset-mes/route.ts:104` viola I-05 explícitamente.** `deleteRowsByMes(sheets, spreadsheetId, mes, "H4!X:AE", ..., "H4D")` lee y escribe el rango H4D. CLAUDE.md: *"H4D is legacy — never read or write it (I-05)"*. Es el único sitio del repo que toca ese rango. El panel nuevo expone este resultado directamente en la UI (`PanelHome.tsx:105`, campo `H4D:`), haciendo visible en cada reset una violación de invariante documentada.

5. **ALTO (re-confirmado, #5 corrida anterior, ahora más preciso) — `app/api/consumos/[id]/clasificar/route.ts:53-61` + `lib/data/sheets.ts:790-819`.** Cuando la llamada a Haiku falla (catch vacío) o no encuentra match, el código escribe `clasificado: true` sin `bolsilloId` — no es un edge case, es el fallback diseñado. `updateConsumoH3` hace un merge ciego sin verificar I-03 en ningún punto. `app/api/consumos/[id]/route.ts` PATCH acepta `clasificado`/`bolsilloId` como campos independientes del cliente, mismo problema.

6. **ALTO (re-confirmado, #2) — `app/api/admin/auth/route.ts:9-26`.** Sin rate limit, contador de intentos ni bloqueo sobre el PIN. `PinGate.tsx` usa `inputMode="numeric"` (PIN corto). Grep repo-wide de `ratelimit|upstash` sin resultados — brute-forceable por script.

7. **ALTO (re-confirmado, #3) — `scripts/auditoria-julio.mjs:25`.** Sheet ID de producción hardcodeado y commiteado (I-04/I-08), repetido en texto plano en `ESTADO.md`/`PROMPT_AGENTE.md`/`SESSION_LOG.md`/`AUDITORIA_JULIO.md`. `.git/hooks/pre-commit` sigue sin instalarse (solo existe `.sample`) — la afirmación de CLAUDE.md de que el pre-commit hook verifica esto no se sostiene: ningún hook corre automáticamente en este entorno.

8. **ALTO — confirmado con evidencia (era "sin confirmar" el 17-ago) — `package.json:14` (`next@16.2.6`).** `npm audit --omit=dev` reporta 4 advisories altos: `GHSA-955p-x3mx-jcvp` (disclosure no autenticado de endpoints internos de Server Functions), `GHSA-p9j2-gv94-2wf4` (SSRF vía rewrites con hostname controlado por atacante), `GHSA-6gpp-xcg3-4w24` (bypass de middleware/proxy en Turbopack), `GHSA-m99w-x7hq-7vfj` (DoS de Server Actions), más highs transitivos en `postcss`/`sharp`/`nanoid`. Fix requiere `next@16.3.2`, fuera del rango declarado. OWASP A06.

9. **MEDIO (re-confirmado, #4) — `app/api/registro/sin-concepto/route.ts:82,68`.** `mes` del cliente sin regex (viola I-01/I-02); `monto` solo con chequeo de truthy, no de tipo.

10. **MEDIO (re-confirmado, #6, agravado por hallazgo 2) — `app/api/registro/interpretar/route.ts:46-125`.** Sin auth, sin límite de tamaño en imagen base64 ni texto libre antes de enviar a `claude-sonnet-4-6`.

11. **MEDIO — nuevo.** No existe `middleware.ts` ni `headers()` en `next.config.ts` — cero cabeceras de seguridad (CSP, `X-Frame-Options`, HSTS) en toda la app. OWASP A05.

12. **MEDIO — nuevo, patrón transversal.** Múltiples rutas (`backup-status/route.ts:79-84`, `eventos-log/route.ts:27-30,43-45`, `consumos/[id]/route.ts:62-64`, `sin-concepto/route.ts:113-115`) devuelven `error.message` crudo al cliente en el catch — puede filtrar detalle interno de errores de la API de Sheets (rangos, cuota). OWASP A05.

### Pilar 2 — Resiliencia

1. **CRÍTICO (re-confirmado, #1, ver también Pilar 1 hallazgo 1) — `app/api/admin/reset-mes/route.ts:61-80`.** Ver detalle completo en Pilar 1 — se repite aquí porque además de ser un hueco de acceso es el bug de resiliencia más grave del repo: un reset de un mes borra Movimientos de todos los meses sin ningún mecanismo de reversión.

2. **CONFIRMADO — `app/api/admin/reset-mes/route.ts:98-107`.** 8 operaciones de reset en un solo `Promise.all` sin try/catch envolvente; el log H9 nuevo (líneas 111-124) corre después y solo registra el resultado agregado — no ayuda a diagnosticar qué tab falló si el `Promise.all` rechaza a mitad de camino.

3. **CONFIRMADO — `app/api/mes/[mes]/movimientos/[id]/route.ts:135-144` (`mover_mes_siguiente`).** El guard anti-duplicado sigue sin aplicar a conceptos `frecuencia: "semanal"`.

4. **CONFIRMADO — `lib/data/sheets.ts:273-291` (`crearMovimientosMes`).** Lectura de `H2!A:A` para `nextRow` seguida de `values.update`, sin atomicidad — llamadas concurrentes pueden sobrescribirse.

5. **CONFIRMADO — 7 sitios de `values.append` sin `insertDataOption: "INSERT_ROWS"`, ahora 8: se suma `createEventoLog` (H9) en `lib/data/sheets.ts:1049`,** que hereda el mismo patrón que causó la pérdida real de 67 filas.

6. **CONFIRMADO, con matiz — sin ruta de restore.** `grep -rn "restore" app/ scripts/` sigue vacío. El nombre del ticket `PANEL-REVERTIR-CIERRE-01` sugiere que esto se resolvió — **no es así**: el ticket está en `estado: propuesto`, bloqueado por `DT-CIERRE-01` (también propuesto). No existe ningún endpoint `revertir-cierre`; solo existen `revertir_mes_siguiente`/`revertir_ejecucion` para movimientos individuales, no para un cierre de semana completo (H5). RTO/RPO indefinidos.

7. **CONFIRMADO — `app/api/mes/[mes]/cerrar-semana/route.ts:83-158`.** H5A → H5B → `Promise.all` de bolsillos siguen siendo fases sin rollback; el log H9 añadido al final documenta el resultado pero no previene ni repara el estado inconsistente ante un fallo a mitad de camino.

### Pilar 3 — Datos y modelo

1. **CONFIRMADO — `app/api/registro/sin-concepto/route.ts` y `app/api/cron/uber-parser/route.ts`** siguen instanciando su propio cliente `google.sheets` y escribiendo directo a H3 sin pasar por `getProvider()` (`IDataProvider` sigue sin `createConsumoH3`).

2. **CONFIRMADO — triplicación del array de 17 headers de H3B** en `lib/data/sheets.ts:710-714`, `registro/sin-concepto/route.ts:5-9`, `cron/uber-parser/route.ts:10-15`.

3. **CONFIRMADO — `app/api/cron/uber-parser/route.ts:106-107`** sigue llamando `mesDeFecha()`/`semanaDeFechaEnMes()` crudas en vez de `mesActual(fecha)`/`semanaActual(fecha)` (que sí aplican la excepción de cola de mes en fin de semana vía `cicloOperativo()`, no exportada directamente). Fix sería trivial pero no se hizo. Candidato `DT-CICLO-OPERATIVO-UNIFICADO-01` de INVARIANTS.md sigue abierto.

4. **CONFIRMADO, con mitigación parcial nueva — `ConsumoH3` (`lib/data/types.ts:79-97`)** sigue sin campo de procedencia IA. `consumos/[id]/clasificar/route.ts:70-77` ahora sí escribe modelo/confianza al log H9, pero H9 tiene retención de 14 días — pasado ese plazo la trazabilidad de esa clasificación se pierde aunque el `ConsumoH3` en H3B siga vivo indefinidamente.

5. **ALTO — `app/api/admin/reset-mes/route.ts:104` viola I-05** (ver Pilar 1, hallazgo 4, y Pilar 7 hallazgo 1 — mismo hecho, tres ángulos: acceso, modelo de datos, mantenibilidad).

6. **NUEVO — rutas admin bypasean `IDataProvider` por completo, creando una tercera fuente de rangos hardcodeados.** `app/api/admin/reset-mes/route.ts:6-16` y `app/api/admin/backup-sheet/route.ts:26-35` instancian su propio `google.auth.JWT`/`google.sheets(...)` en vez de usar `getProvider()`, contradiciendo la regla explícita de CLAUDE.md ("Every API route calls `getProvider()` — never instantiate `SheetsDataProvider` directly"). `reset-mes` re-hardcodea los mismos rangos H2/H3/H4/H5/H5B que ya existen en `lib/data/sheets.ts` con formato distinto — un cambio de esquema ahora requiere tocar 3 lugares.

### Pilar 4 — Observabilidad/Logs

1. **CONFIRMADO — cero `console.*` en `lib/`.**

2. **CONFIRMADO, forma cambiada — 4 `console.error` en `app/api`, todos del mismo patrón "fallo silencioso al registrar H9".** `movimientos/[id]/route.ts:216`, `consumos/[id]/clasificar/route.ts:75`, `cerrar-semana/route.ts:158`, `admin/reset-mes/route.ts:123` — todos con catch que traga el error y responde 200 igual; el fallo del log de auditoría es invisible fuera de los logs de Vercel.

3. **NUEVO — `app/api/admin/backup-sheet/route.ts` (199 líneas, la pieza central de la historia de DR) tiene cero `console.*`.** Si `crearTabsFaltantes`/`escribirValores`/`limpiarBackupsAntiguos` fallan a mitad de camino, no queda rastro server-side salvo la respuesta HTTP al cron, que nadie lee en vivo.

4. **CONFIRMADO — `app/api/mes/[mes]/iniciar/route.ts` y `app/api/cron/uber-parser/route.ts`** siguen sin try/catch alrededor del handler completo.

5. **CONFIRMADO — `lib/uber/gmail.ts:112-116` (`marcarComoLeidos`)** sigue sin try/catch ni logging por mensaje en el loop secuencial.

### Pilar 5 — Trazabilidad

1. **PARCIALMENTE CORREGIDO — H9 ahora se llama desde 4 archivos** (`movimientos/[id]/route.ts:206`, `consumos/[id]/clasificar/route.ts:71`, `cerrar-semana/route.ts:147`, `admin/reset-mes/route.ts:115`), con endpoints de lectura/purga (`GET`/`DELETE /api/admin/eventos-log`). Fix real para ese subconjunto, no cosmético.

2. **CONFIRMADO — `movimientos/[id]/route.ts:195`** sigue omitiendo `"actualizar_monto"` y `"no_aplica"` de la allowlist de logging, aunque ambos mutan H2 incondicionalmente (línea 192).

3. **CONFIRMADO — `mes/[mes]/iniciar/route.ts`** sigue sin ninguna llamada a `createEventoLog` pese a crear todos los `Movimiento` de un mes.

4. **CONFIRMADO — `mes/[mes]/cerrar-m1/route.ts:6-61`,** segundo camino de cierre de semana, sigue sin llamar `createEventoLog` — invisible en el log aunque `cerrar-semana` (la otra vía) ya sí audita.

5. **CONFIRMADO — `consumos/[id]/route.ts` PATCH y `consumos/[id]/imprevisto/route.ts` PATCH** siguen sin ninguna llamada a `createEventoLog`.

6. **CONFIRMADO + NUEVO — `conceptos/*`, `ingresos/*` sin H9, y específicamente `app/api/conceptos/[id]/retirar/route.ts` (acción irreversible del panel, gateada por PIN) tampoco llama `createEventoLog`,** ni `lib/data/sheets.ts:135-138` (`retirarConcepto`). El propio ticket `PANEL-LOG-EVENTOS-01.md` no incluye `retirar_concepto` entre los tipos aprobados de log — hueco de alcance, no bug de implementación: una acción irreversible (no existe "reactivar", declarado fuera de alcance en `PANEL-RETIRAR-CONCEPTO-01.md`) queda sin ningún rastro de auditoría. Nota menor: `retirarConcepto` (línea 136) calcula `fechaRetiro` con `new Date().toISOString().split("T")[0]` (UTC), no con `mesActual()`/hora Bogotá como el resto del proyecto — mismo patrón de bug ya corregido una vez en H9 durante `PANEL-LOG-EVENTOS-01`.

7. **NUEVO — `admin/backup-sheet` y `admin/backup-status` no generan ningún evento H9.** Ni el backup nocturno ni la verificación de integridad quedan correlacionables con el resto de actividad del sistema en H9.

### Pilar 6 — Eficiencia/Desempeño

1. **CONFIRMADO — `lib/data/sheets.ts:303-336` (`updateMovimiento`)** sigue leyendo `H2!A:Y` completo antes de escribir una fila.

2. **CONFIRMADO — `cerrar-semana/route.ts:130-144`,** `Promise.all` sobre N bolsillos con full-read × N, ahora suma además `createEventoLog` (ver hallazgo 6 abajo).

3. **CONFIRMADO, agravado — `movimientos/[id]/route.ts:52`.** Para `tipo: "mover_mes_siguiente"` (líneas 108-173) son ahora ~4 lecturas grandes (`getConceptos`, `getMovimientos(mes)`, `getMovimientos(nextMes)`, `H2!A:A` dentro de `crearMovimientosMes`) + 2 escrituras por un solo clic, antes de contar H9.

4. **CONFIRMADO — `mes/[mes]/iniciar/route.ts:56-60`.** 2 full reads de H2 + 1 full read de H1 + `H2!A:A` read adicional dentro de `crearMovimientosMes`.

5. **CONFIRMADO — `lib/data/sheets.ts:1097-1137` (`limpiarEventosLogAntiguos`).** Costo sigue escalando con el tamaño total del log, no con las filas purgadas; condición de carrera documentada por el propio Tester del ticket (`createEventoLog` concurrente durante la ventana de limpieza se pierde).

6. **NUEVO — `ensureH9()` (`lib/data/sheets.ts:1024-1041`) hace `spreadsheets.get` (metadata completa) en CADA operación de H9,** no solo cuando el tab no existe — a diferencia de `ensureH2Headers` (línea 213-229), que sí evita esto leyendo solo `H2!A1`. Es invocado por `createEventoLog`/`getEventosLog`/`limpiarEventosLogAntiguos`, es decir en cada acción de usuario ya instrumentada (movimientos, cierre-semana, clasificar, reset-mes) — suma sistemáticamente 2 llamadas extra a Sheets API por clic.

7. **NUEVO — la retención de 14 días de H9 es 100% manual, sin cron.** `vercel.json` solo tiene crons para `backup-sheet` y `uber-parser`. La purga solo ocurre si alguien abre el panel y hace clic en "Limpiar >14 días" (`VistaLogEventos.tsx:144-151`) — si nadie lo hace, H9 crece sin límite y el costo del hallazgo 5 se agrava con el tiempo.

### Pilar 7 — Mantenibilidad

1. **CONFIRMADO — `app/api/admin/reset-mes/route.ts:104`** contradice I-05 (ver Pilar 1 hallazgo 4, Pilar 3 hallazgo 5) — el resultado se expone incluso en `PanelHome.tsx:105` (campo `H4D:`).

2. **CONFIRMADO — rangos hardcodeados duplicados en `lib/data/sheets.ts`** ("H1!A:L", "H2!A:Y", "H3!A:Q", "H4!A:G", etc.).

3. **NUEVO — CLAUDE.md documenta tabs (H3B, H4A/B/C, H5A, H6) que no son tabs físicos reales.** Comentario del propio autor en `app/api/admin/backup-sheet/route.ts:9-12`: *"Tabs físicos reales del Sheet de producción... NO los nombres lógicos de CLAUDE.md/sheet-safety (H3B, H4A/B/C, H5A, H6 son tipos de dato o rangos de columnas dentro de estos tabs físicos, no tabs independientes)"*. Los tabs físicos reales son solo `H1, H2, H3, H4, H5, H5B` — cualquier agente que confíe en la tabla de CLAUDE.md sin leer el código real calculará rangos equivocados.

4. **Ver Pilar 3 hallazgo 6** — rutas admin bypasean `IDataProvider`, tercera fuente de rangos hardcodeados.

### Pilar 8 — Degradación de UI/Usabilidad

1. **CONFIRMADO — `components/VistaSemanal.tsx:1091-1127` (`navegar`).** Sin `semRes.ok`, no hay error seteado pero `setSemanaVisible(s)` (línea 1115) corre igual — UI muestra datos obsoletos bajo una pestaña nueva sin aviso.

2. **CONFIRMADO — `components/VistaSemanal.tsx:1198-1214` (`handleSheetSuccess`).** Catch vacío (línea 1213) — un gasto recién registrado puede no aparecer sin ningún error visible.

3. **CONFIRMADO — `components/VistaSemanal.tsx:156-174` (`toggleImprevisto`).** Catch solo revierte el toggle optimista sin `setError`, a diferencia de `guardar()`/`revertir()` en el mismo archivo.

4. **NUEVO — `components/admin/VistaLogEventos.tsx` usa 4 variables CSS custom no definidas en ningún `.css` del repo:** `var(--bg-card)` (líneas 94,126,191), `var(--fg)` (95,179), `var(--bg-subtle)` (171), `var(--border)` (96,128). El resto del proyecto (incluido el resto de `components/admin/*`) usa consistentemente `var(--surface)`, `var(--surface-2)`, `var(--ink)`, `var(--ink-soft)`, `var(--line)`. Con custom properties inexistentes el navegador descarta la declaración — fondo/borde probablemente no se renderizan y el color hereda del padre, especialmente notorio en dark mode. No verificado visualmente (auditoría read-only, sin dev server), pero el defecto en el código fuente es determinístico.

5. **NUEVO — `lib/admin-auth.ts:8-12` (`sign()`) lanza excepción no capturada si `ADMIN_SESSION_SECRET` falta,** llamado sin try/catch desde `createSessionCookie` (`app/api/admin/auth/route.ts:18`) — 500 genérico sin mensaje útil en vez de un error controlado. No es vulnerabilidad (falla cerrado), pero el propio `PANEL-ADMIN-01.md` (líneas 127-131) documenta que en preview de Vercel esas env vars no estaban configuradas — deuda de despliegue ya anticipada por el equipo, sin resolver.

### Pilar 9 — Costos/FinOps

1. **CONFIRMADO — `registro/interpretar` y `consumos/[id]/clasificar`** siguen sin auth y sin rate limit (grep repo-wide de `ratelimit|upstash` sin resultados). Las rutas admin nuevas no tocan estos dos endpoints.

2. **CONFIRMADO — `registro/interpretar/route.ts:106-111` + `components/m4/InputRegistro.tsx`.** `accept="image/*"` sin resize/compresión (grep confirma cero ocurrencias de `resize|canvas|toBlob|compress`) antes de enviar a `claude-sonnet-4-6`.

3. **CONFIRMADO — sin cap diario/por-usuario ni estimado de costo documentado.**

4. **Verificado, sin hallazgo — el panel admin en sí no agrega presión de costo relevante de LLM.** `backup-status` solo hace `spreadsheets.get` (metadata, sin polling); `eventos-log` solo se consulta al expandir manualmente. Ninguno invoca la API de Claude. El único costo nuevo real es de cuota de Sheets API (Pilar 6, hallazgo 6), no de LLM.

---

## Auditoría — 2026-08-31 (UTC)

**Resumen:** Corrida sobre `vigilancia-auto` sincronizada con `dev` (mergeados los 6 commits nuevos desde la corrida anterior, HEAD real `053dd6d`). El código de superficie de seguridad (`app/api/**`, `lib/admin-auth.ts`, dependencias) es **byte-idéntico** al ya auditado el 24-ago — se re-verificó por lectura directa que los 3 hallazgos críticos/altos de esa corrida (borrado de H2 de todos los meses en `reset-mes`, superficie de escritura no-admin sin ningún control de acceso, `next@16.2.6` con 4 CVEs altos vía `npm audit`) siguen presentes sin mitigar; se omiten aquí por instrucción explícita de esta rutina ("omite los pilares sin hallazgo nuevo"), no repetir no implica que estén resueltos. 2 hallazgos nuevos concretos: (1) el PIN real de administrador (`.env.local`) quedó commiteado en texto plano en `ESTADO.md`, filtrado durante troubleshooting de despliegue; (2) el ticket que unificó el cálculo de remanente semanal (`FIX-BALANCE-SEMANAL-EJECUCION-01`, cerrado con veredicto Tester CUMPLE) introdujo una regresión de cálculo: la tab Ejecución ahora resta presupuesto de movimientos marcados `no_aplica`/`pospuesto_mes_siguiente`, que no deberían seguir contando como gasto comprometido.

### Pilar 1 — Seguridad

1. **ALTO — nuevo. `ESTADO.md:6745`.** La entrada de cierre de sesión sobre debugging de acceso al panel admin en Vercel registra en texto plano el valor real del PIN local de administrador: *"Probé `POST /api/admin/auth` contra el preview con el PIN local (`760906`)"*. `ESTADO.md` es un archivo commiteado y versionado en `dev`. El PIN gatea acciones destructivas del panel (`reset-mes`, `retirar-concepto`) y ya está señalado en corridas previas (hallazgo Pilar 1 #6, 24-ago) como brute-forceable por no tener rate limiting — con el valor real expuesto en el historial de git, cualquiera con acceso de lectura al repo ya no necesita ni fuerza bruta. La misma entrada documenta confusión activa sobre si `ADMIN_SESSION_KEY`/`ADMIN_PANEL_PIN` de Preview coinciden con los de Production, lo que no permite descartar que el valor filtrado sea reutilizado en otro ambiente. OWASP A02:2021 (Cryptographic Failures / exposición de credenciales) — mismo patrón de fondo que I-04/I-08 (Sheet ID hardcodeado), ahora sobre una credencial de autenticación en vez de un identificador.

### Pilar 3 — Datos y modelo

1. **MEDIO/ALTO — nuevo, regresión introducida por `FIX-BALANCE-SEMANAL-EJECUCION-01` (commit `ee02ba1`). `components/MesM1Desktop.tsx:438,450-457`.** `comprometido` (línea 438) suma `montoPresupuestado` de **todos** los movimientos de la semana sin filtrar por `estado`; `comprometidoEjecutado` (450-452) solo resta los que están `estado === "ejecutado"`; `comprometidoRestante = comprometido - comprometidoEjecutado` (453) por lo tanto sigue incluyendo el presupuesto completo de movimientos en `estado: "no_aplica"` y `"pospuesto_mes_siguiente"` (`lib/data/types.ts:11`, enum `EstadoMovimiento`) — estados que por definición ya no representan un gasto pendiente del mes. La nueva fórmula (línea 457, `restar: comprometidoRestante + ejecutadoReal`) resta ese presupuesto igual, subestimando el remanente disponible en la tab Ejecución. Es una regresión nueva, no preexistente: antes del fix esta tab solo restaba `ejecutado` (nunca tocaba `comprometido`), así que movimientos `no_aplica`/`pospuesto_mes_siguiente` no afectaban el remanente encadenado; ahora sí, incorrectamente. El ticket de cierre (`tickets/FIX-BALANCE-SEMANAL-EJECUCION-01.md`) solo verificó el caso "ejecución parcial vs. comprometido", no el caso de un movimiento marcado `no_aplica`/movido de mes — el DoD no cubrió este escenario y el Tester lo marcó CUMPLE sin probarlo.

---

## Auditoría — 2026-09-07 (UTC)

**Resumen:** Corrida sobre `vigilancia-auto` sincronizada con `dev` (1 commit nuevo desde la corrida anterior, `4564d05`, HEAD real tras merge). Ese commit es el único cambio de código en la ventana — se auditó en detalle. Los hallazgos críticos/altos de corridas previas (borrado de H2 de todos los meses en `reset-mes` — `app/api/admin/reset-mes/route.ts:78`, superficie de escritura no-admin sin control de acceso, `next@16.2.6` con CVEs altos vía `npm audit`, PIN real `760906` expuesto en texto plano en `ESTADO.md:6745`) se re-verificaron por lectura directa y **siguen presentes sin mitigar, byte-idénticos**; se omiten como pilares aparte por no tener hallazgo nuevo, no repetir no implica que estén resueltos. 1 hallazgo nuevo, concreto y de fecha calculable: el parche puntual del 31-ago-2026 en `cicloOperativo()` fija un caso por fecha literal en vez de una regla general, y la siguiente fecha con la misma condición estructural (verificada por cálculo, no supuesta) cae en **9 semanas**, el 2026-11-30 — sin cobertura del parche ni del test agregado en el mismo commit.

### Pilar 3 — Datos y modelo

1. **ALTO — nuevo. `lib/utils/fecha.ts:32-34` (commit `4564d05`, "Parche puntual: 31-ago-2026 clasifica como septiembre S1, no agosto S5").** El fix agregado a `cicloOperativo()` es un guard por igualdad literal de fecha (`if (year === 2026 && month === 8 && day === 31) return { mes: "2026-09", semana: "S1" }`), no una corrección de la regla general que produce el bug. La condición estructural real —un mes cuyo último lunes es también su último día calendario, con 5 lunes en total— no es exclusiva de agosto 2026. Verificado por cálculo directo (recorrido de 2026-2036): la próxima fecha que cumple exactamente esa condición es **2026-11-30** (lunes, mes de 30 días, lunes en 2,9,16,23,30). Trazando `cicloOperativo(30-nov-2026)` contra el código actual sin el guard puntual: `mondays[0]=2`, `stubAbsorbidoPorMesAnterior` es `true` (2≤3) → cae en la rama `else` de `semanaDeFechaEnMes` (línea 161-168) → `day=30` no es `< mondays[4]=30` → devuelve `"S5"` con `mes: "2026-11"`. El viernes de pago de esa semana operativa (lunes 30-nov a domingo 6-dic) cae el 4-dic-2026, en diciembre — exactamente el mismo bug que motivó el parche del 31-ago (semana partida entre dos meses), reproducido sin aviso porque el guard solo compara contra `2026-08-31` literal. `scripts/verificar-ciclo-semanas.ts:128-136` (el test agregado en el mismo commit) tampoco lo cubre: solo asserta `mesActual`/`semanaActual` para `31-ago-2026`, ninguna aserción para `30-nov-2026` ni para la condición general. Consistente con el propio comentario del código (línea 26, "Cubre solo esta fecha puntual, no una regla general") y con el candidato ya registrado en `INVARIANTS.md` ("Cálculo de mes/semana operativos desde una única fuente de verdad") — el fix de fondo (anclar al viernes de la semana ISO) sigue pendiente y este parche no lo sustituye ni lo adelanta. Impacto funcional si no se corrige antes del 2026-11-30: movimientos/cierres de esa semana quedarán registrados como `2026-11 S5` (1 día) en vez de repartirse correctamente entre noviembre y diciembre, mismo síntoma que originó el parche actual.

---
