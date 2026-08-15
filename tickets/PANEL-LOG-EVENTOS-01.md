---
ticket_id: PANEL-LOG-EVENTOS-01
orden: 33
estado: aprobado
tier: B
agente_ejecucion: antigravity
dependencias: PANEL-ADMIN-01
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
- [ ] `tsc --noEmit` limpio.
- [ ] Tab `H9` (`EventosLog`) creada en Sheet de dev, columnas `timestamp`,
      `tipo_evento`, `entidad_id`, `mes`, `detalle` — mismo cambio
      replicado manualmente en el Sheet de prod antes del merge (I-10).
- [ ] Las 5 rutas del set aprobado escriben un evento con timestamp real
      (server-side, nunca del cliente — mismo criterio que I-01/I-02):
      `movimientos/[id]` (todos los `tipo`), `consumos/[id]/clasificar`,
      `cerrar-semana`, `revertir-cierre` (si `DT-CIERRE-01` ya existe),
      `reset-mes`.
- [ ] Vista `VistaLogEventos` en el panel (ver brief de diseño), filtro por
      tipo de evento y rango de fecha.
- [ ] Limpieza por ventana de 14 días — mismo mecanismo/cron que
      `BACKUP-NOCTURNO-01`, o extensión de ese mismo cron.
- [ ] Verificado en dev: al menos un evento de cada tipo del set aprobado,
      generado por una acción real (no insertado a mano), visible en el log
      con timestamp correcto.
- [ ] Cero llamadas contra producción durante la construcción.

## Contexto / diagnóstico previo

- Pedido explícito de Camilo (11 ago 2026), incluyendo el ejemplo específico
  de "decisiones que Haiku toma para la clasificación de conceptos registrados
  vía el FAB".
- Confirmado por lectura directa de `app/api/consumos/[id]/clasificar/route.ts`:
  el razonamiento del modelo no se persiste en ningún lado hoy.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda técnica
encontrada, criterios de parada activados)
