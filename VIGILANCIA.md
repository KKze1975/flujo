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
