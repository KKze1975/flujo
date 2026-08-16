---
ticket_id: PANEL-LOG-EVENTOS-01
orden: 33
estado: completado
tier: B
agente_ejecucion: antigravity
dependencias: PANEL-ADMIN-01
rol_activo: manager
paso_actual: "Cerrado — I-10 ejecutado y verificado contra PROD, 3 rondas de Tester, veredicto final CUMPLE."
actualizado_en: 2026-08-16T09:26:12-05:00
necesita_aprobacion: no
---

# PANEL-LOG-EVENTOS-01 — Log de eventos del sistema en el panel

## Goal completo

Mostrar en el panel un log cronológico de acciones relevantes: movimientos
ejecutados/pospuestos/trasladados, decisiones de clasificación automática de
Haiku sobre gastos registrados vía FAB, y cualquier otra escritura relevante.

**Esto es un epic, no un ticket simple — confirmado por diagnóstico de código
de esta sesión:** no existe ninguna tabla ni mecanismo de auditoría hoy (sin
tab H7/H8, sin ninguna referencia a "evento"/"audit" en `types.ts`/`sheets.ts`).
En particular, `app/api/consumos/[id]/clasificar/route.ts` (el endpoint que
invoca `claude-haiku-4-5-20251001`) **escribe solo el resultado final** en H3B
(`bolsilloId` o `imprevisto: true`) — nunca persiste qué modelo se usó, qué
texto vio, ni si hubo error/fallback silencioso. No se puede reconstruir esa
decisión retroactivamente: hay que capturarla en el momento en que ocurre.

**Tier B con HALT ya resuelto (aprobado por Camilo, 15 ago 2026)** — se deja
el tier en B porque el patrón de este proyecto es no reclasificar tickets
que ya pasaron por diagnóstico, aunque la decisión esté tomada (ver
`PANEL-ADMIN-01`/`DT-M1M4-NULL-01` como precedente).

**Decisión aprobada — las 4 preguntas de HALT:**
- [x] **Dónde vive el log:** tab nueva en el Sheet, `H9` — `EventosLog`. No
      un servicio externo — el volumen real es bajo (familia de 2 usuarios,
      un puñado de eventos/día) y el proyecto ya evita sumar credenciales
      nuevas sin autorizar (mismo criterio que excluyó métricas de Vercel/
      Sheets del alcance). Cambio de esquema — aplica I-10 (migración manual
      a prod antes de merge). Columnas mínimas: `timestamp` (ISO real,
      server-side), `tipo_evento`, `entidad_id` (movimiento/concepto),
      `mes` (para poder limpiar por ventana igual que el resto de H1-H6),
      `detalle` (texto o JSON compacto).
- [x] **Qué eventos:** lista cerrada — movimiento ejecutado, pospuesto,
      movido a mes siguiente (y sus reversiones: `revertir_mes_siguiente`,
      `revertir_ejecucion`), reasignación de semana, decisión de
      clasificación de Haiku (incluye cuándo falla o cae a "imprevistos"),
      cierre de semana, reversión de cierre (cuando exista `DT-CIERRE-01`),
      reset de mes. Cualquier evento nuevo fuera de esta lista es su propio
      sub-ticket, no se agrega ad-hoc.
- [x] **Rutas del set inicial:**
      `PATCH /api/mes/[mes]/movimientos/[id]` (todos los `tipo`
      discriminados: `ejecutar`, `posponer`, `mover_mes_siguiente`,
      `revertir_mes_siguiente`, `revertir_ejecucion`, `reasignar_semana`),
      `POST /api/consumos/[id]/clasificar` (decisión de Haiku),
      `POST /api/mes/[mes]/cerrar-semana`, el futuro `revertir-cierre`
      (`DT-CIERRE-01`), y `reset-mes`.
- [x] **Retención:** 14 días, mismo patrón de limpieza por ventana que ya
      usa `BACKUP-NOCTURNO-01` — cubre con margen el mínimo declarado por
      Camilo ("al menos una semana completa" de trazabilidad retrospectiva).

**No cubre (fuera de alcance v1, decisión de Camilo 11 ago 2026):**
- Métricas de consumo de recursos de Vercel — requiere credencial nueva
  (token de API de Vercel), no autorizada todavía.
- Métricas de cuota/consumo de Google Sheets API — requiere integración
  distinta (Google Cloud Monitoring API), no la API de Sheets que ya usa la
  app. Tratar como iniciativa separada si se decide más adelante.

## Definition of Done

**Fase diagnóstico (Tier B):**
- [x] Las 4 preguntas de HALT, con recomendación concreta por cada una —
      aprobadas por Camilo 15 ago 2026 (ver "Decisión aprobada" arriba).
      Ninguna pregunta abierta restante — este ticket ya puede tomarse para
      construcción directamente (`/goal-a PANEL-LOG-EVENTOS-01` o
      equivalente vía Antigravity).

**Fase construcción (tras aprobación):**
- [x] `tsc --noEmit` limpio.
- [x] Tab `H9` (`EventosLog`) creada dinámicamente en SheetsDataProvider, columnas `timestamp`,
      `tipo_evento`, `entidad_id`, `mes`, `detalle`, `id` — requiere migración manual en prod antes de merge (I-10).
- [x] Las 5 rutas del set aprobado escriben un evento con timestamp real
      (server-side, nunca del cliente):
      `movimientos/[id]` (todos los `tipo`), `consumos/[id]/clasificar`,
      `cerrar-semana`, y `reset-mes`.
- [x] Vista `VistaLogEventos` construida e integrada en el panel `/admin/panel`, con filtro por
      tipo de evento y mes.
- [x] Limpieza por ventana de 14 días con endpoint `DELETE /api/admin/eventos-log` e interfaz manual en la vista.
- [x] Cero llamadas contra producción durante la construcción.
- [x] **I-10 explícito:** migración del esquema `H9` ejecutada y verificada
      por lectura contra el Sheet de **PROD** (no solo dev), antes de mergear
      — no basta con que `ensureH9()` la autoprovisione implícitamente en el
      primer request real. Agregado por hallazgo del Tester, ronda 1
      (16 ago 2026): el item de arriba (`H9` creada dinámicamente) describe
      el mecanismo, no la verificación explícita que I-10 exige.
      **Ejecutado 16 ago 2026** vía `scripts/setup-h9-prod.mjs` contra
      `PROD_GOOGLE_SHEET_ID` — tab `H9` creada, headers escritos, verificado
      por lectura de vuelta: `["timestamp","tipo_evento","entidad_id","mes","detalle","id"]`.

## Contexto / diagnóstico previo

- Pedido explícito de Camilo (11 ago 2026), incluyendo el ejemplo específico
  de "decisiones que Haiku toma para la clasificación de conceptos registrados
  vía el FAB".
- Confirmado por lectura directa de `app/api/consumos/[id]/clasificar/route.ts`:
  el razonamiento del modelo no se persiste en ningún lado hoy.

## Hallazgos del Tester — ronda 1 (16 ago 2026)

Verificación independiente hecha por agente Tester aparte (aislamiento de
contexto: solo vio el diff final + este DoD, no el razonamiento del Coder).
`tsc --noEmit` limpio, auth server-side de `/api/admin/eventos-log`
confirmada en vivo (401 sin sesión, 200 con PIN), ciclo completo
escribir→leer→purgar probado en vivo contra el Sheet de **DEV** (nunca
prod). Veredicto: **CUMPLE-PARCIAL** — un hallazgo bloqueante, corregir
antes de mergear.

**BLOQUEANTE — corregir:** `app/api/consumos/[id]/clasificar/route.ts:67`
```ts
mes: body.mes ?? new Date().toISOString().substring(0, 7),
```
Hoy es código muerto (el único call site, `components/m4/RegistroRapido.tsx:39`,
siempre manda `mes`), pero el fallback en sí es un bug latente: usa
`new Date().toISOString()` (UTC) en vez de la fuente canónica del proyecto
(`mesActual()`/`cicloOperativo()` en `lib/utils/fecha.ts`, huso Bogotá con
regla de cola de mes anterior). Es la misma clase de bug que ya causó 2
incidentes reales en este proyecto por duplicar el cálculo de mes/semana
fuera de la fuente única (ver candidato de invariante en `INVARIANTS.md`,
"Cálculo de mes/semana operativos desde una única fuente de verdad").
**Fix pedido:** no confiar en `body.mes`; calcular `mesActual()` server-side
siempre, importado de `lib/utils/fecha.ts`, igual que el resto del proyecto.

**Menores — corregir si es rápido, no bloquean merge:**
- `lib/data/sheets.ts` (~líneas 1075-1090), `limpiarEventosLogAntiguos()`:
  hace `values.clear` y después `values.update` con filas leídas *antes*
  del clear — un `createEventoLog` concurrente en esa ventana se perdería
  silenciosamente. Precedente real de pérdida de filas en este proyecto
  (`crearMovimientosMes`, 67 filas). Riesgo bajo (app de 2 usuarios, purga
  manual), documentar si no se corrige ahora.
- `lib/data/sheets.ts` (~líneas 1024-1041), `ensureH9()`: solo escribe
  headers si el tab es nuevo, a diferencia de `ensureH5()` (mismo archivo),
  que los reaplica siempre. Si el header row de `H9` se corrompe a mano,
  `ensureH9()` no lo repara. Mismo patrón que el candidato de invariante ya
  pendiente ("Completitud de esquema en `ensureHeaders`") — no es
  regresión nueva, perpetúa deuda ya conocida.

**Agente de corrección — decisión de Camilo (16 ago 2026):** misma ronda
con `agente_ejecucion: antigravity` (no se introduce un rol "bug fixer"
separado) — coincide con el propio diseño del Tester
(`.claude/agents/tester.md`: "ciclo de corrección agotado... tras 2
intentos de corrección **del Coder**"), y partir el diff entre dos agentes
distintos rompería el aislamiento maker-checker que el Tester necesita
(un único diff coherente que verificar, no dos manos superpuestas).

## Hallazgos del Tester — ronda 2 (16 ago 2026)

Verificación acotada al fix de ronda 1 (no repite el reporte completo de
ronda 1, arriba). Veredicto: **NO CUMPLE** — el hallazgo bloqueante sigue
sin resolverse, segundo intento de corrección necesario.

**Qué corrigió el fix de ronda 1:** la fórmula del fallback — ahora usa
`mesActual()` (huso Bogotá) en vez de `new Date().toISOString()` (UTC).
Correcto, mantenerlo.

**Qué NO corrigió — el problema real:**
```ts
mes: body.mes ?? mesActual(),
```
Sigue confiando primero en `body.mes` del cliente. Verificado contra el
call site (`components/m4/RegistroRapido.tsx:19`): ese valor es el
resultado de invocar `mesActual()` **en el navegador**, con el reloj/
timezone del dispositivo del usuario — no del servidor. El servidor sigue
delegando en un cálculo client-side, exactamente lo que I-01/I-02 y la
sección "Protocolo HG SDD" de `CLAUDE.md` prohíben ("el cliente/prompt no
opina, no infiere"; I-02 exige no pasar sin validación). Que hoy coincida
en la práctica no es el criterio — el patrón de invariante que esto viola
se admite justamente porque produce error silencioso sin que el sistema lo
detecte (pestaña abierta cruzando medianoche, reloj de dispositivo mal
configurado → evento H9 mal etiquetado, sin ningún error visible).

**Fix pedido (ronda 2, trivial — una línea, no toca el call site del
cliente):**
```ts
mes: mesActual(),
```
Sin `??`, sin `body.mes`. Servidor siempre autoritativo, igual que las
otras 3 rutas instrumentadas (`movimientos/[id]`, `cerrar-semana`,
`reset-mes`), que ya calculan `mes` server-side sin ningún fallback de
cliente.

`tsc --noEmit` limpio confirmado en vivo. `I-10` sigue `[ ]` sin marcar —
esperado, no es responsabilidad de esta ronda. Los 2 hallazgos menores de
ronda 1 no fueron tocados — esperado, se documentaron como no bloqueantes.

**Umbral de corrección bajado — decisión de Camilo (16 ago 2026):** si la
verificación de este fix (ronda 2 de Coder, sobre `mes: mesActual()` sin
`??`) no llega a CUMPLE, **HALT directo — no se agenda ronda 3 de
corrección automática.** Escala a Camilo con el historial completo de los
2 intentos, no se le devuelve una tercera vez a Antigravity sin su
aprobación explícita.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

Construcción completada exitosamente. Se implementaron los tipos `EventoLog` y `TipoEventoLog` en `types.ts`, los métodos de persistencia/lectura/purga en `IDataProvider` y `SheetsDataProvider` para la pestaña `H9` (`EventosLog`), y se instrumentaron los endpoints de API aprobados (`movimientos/[id]`, `consumos/[id]/clasificar`, `cerrar-semana`, `reset-mes`). También se construyó el endpoint de administración `GET/DELETE /api/admin/eventos-log` (con verificación server-side `isAdminRequestAuthorized`) y la vista React `VistaLogEventos` dentro de `/admin/panel`. `tsc --noEmit` verificado limpio.

**Ronda 1 Fix (16 ago 2026):** Se corrigió el hallazgo bloqueante reportado por el Tester en `app/api/consumos/[id]/clasificar/route.ts`: se reemplazó el fallback `new Date().toISOString().substring(0, 7)` por la fuente canónica de fecha del proyecto `mesActual()` de `@/lib/utils/fecha`.

**Ronda 2 Fix (16 ago 2026):** Se eliminó por completo la dependencia en `body.mes` del cliente en `app/api/consumos/[id]/clasificar/route.ts`. El valor del mes es ahora 100% autoritativo server-side utilizando `mesActual()`, alineándose con las reglas I-01/I-02 y con las demás rutas instrumentadas del sistema.

**I-10 (16 ago 2026):** migración ejecutada contra PROD vía `scripts/setup-h9-prod.mjs` — tab `H9` creada, headers escritos y verificados por lectura de vuelta (ver DoD arriba).

**Cierre (Manager, 16 ago 2026):** ticket cerrado tras 3 rondas de Tester (CUMPLE-PARCIAL → NO CUMPLE → CUMPLE) e I-10 verificado. Los 2 hallazgos menores de ronda 1 (race condition en `limpiarEventosLogAntiguos`, `ensureH9` sin reparación de headers) quedan como deuda técnica conocida, no bloquean cierre — ya documentados arriba y en `INVARIANTS.md` como candidatos pendientes de aprobación.

```yaml
metricas_agente:
  coder: { agente: antigravity, tokens: no_medido, reintentos: 2 }
  tester: { agente: claude-sonnet, tokens: 228894, veredicto: CUMPLE }
  manager: { reportó: si, resumen_4_puntos: si }
  halt: { disparado: no, criterio: "umbral bajado a 2 rondas (decisión de Camilo), no llegó a dispararse — ronda 2 alcanzó CUMPLE" }
```


