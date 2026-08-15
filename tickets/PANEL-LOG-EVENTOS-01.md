---
ticket_id: PANEL-LOG-EVENTOS-01
orden: 33
estado: propuesto
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

**Tier B — HALT obligatorio antes de construir**, con estas preguntas abiertas:
- [ ] ¿Nueva tab en el Sheet (ej. `H9` — "EventosLog") o servicio de logging
      externo? Una tab nueva es cambio de esquema (I-10 aplica: migración
      manual a prod antes de merge). Recomendación a evaluar: tab nueva, mismo
      patrón que el resto del proyecto (todo vive en Sheets), pero declarar el
      volumen esperado de filas/mes antes de decidir — puede crecer rápido.
- [ ] ¿Qué eventos exactamente se loguean? (lista cerrada, no "todo" — cada
      evento nuevo que se agregue después es su propio sub-ticket).
- [ ] ¿Qué rutas hay que instrumentar para el set inicial? Al menos:
      `PATCH /api/mes/[mes]/movimientos/[id]` (todos los `tipo` discriminados),
      `POST /api/consumos/[id]/clasificar` (decisión de Haiku), `POST
      /api/mes/[mes]/cerrar-semana`, el futuro `revertir-cierre`
      (`DT-CIERRE-01`), y `reset-mes`.
- [ ] Retención: ¿el log crece indefinidamente o aplica el mismo patrón de
      limpieza >14 días que ya usa `BACKUP-NOCTURNO-01`?

**No cubre (fuera de alcance v1, decisión de Camilo 11 ago 2026):**
- Métricas de consumo de recursos de Vercel — requiere credencial nueva
  (token de API de Vercel), no autorizada todavía.
- Métricas de cuota/consumo de Google Sheets API — requiere integración
  distinta (Google Cloud Monitoring API), no la API de Sheets que ya usa la
  app. Tratar como iniciativa separada si se decide más adelante.

## Definition of Done

**Fase diagnóstico (Tier B):**
- [ ] Las 4 preguntas de HALT de arriba, con recomendación concreta por cada
      una. HALT — Camilo aprueba el alcance antes de construir.

**Fase construcción (tras aprobación):**
- [ ] `tsc --noEmit` limpio.
- [ ] Si aplica cambio de esquema: aplicado en dev, con el mismo cambio
      replicado manualmente en el Sheet de prod antes del merge (I-10).
- [ ] Cada ruta del set aprobado escribe un evento con timestamp real
      (server-side, nunca del cliente — mismo criterio que I-01/I-02).
- [ ] Vista `VistaLogEventos` en el panel (ver brief de diseño), filtro por
      tipo de evento y rango de fecha.
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
