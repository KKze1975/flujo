---
ticket_id: IDEAS-SCHEMA-01
orden: 38
estado: aprobado
tier: A
agente_ejecucion: claude-code
dependencias: ninguna
---

# IDEAS-SCHEMA-01 — Esquema de datos para backlog de ideas de features

## Goal completo

Primer ticket de la línea "backlog de ideas de features con triage por IA" (spec
completo en `ESTADO.md`, entradas "Fase -1/0" y "Fase 1" del 18 sept 2026, y el spec de
Fase 2 aprobado por Camilo el mismo día — "aprobado para construir"). Este ticket NO
construye UI ni triage — solo el esquema de datos que todo lo demás va a usar.

Agregar una nueva tab **H10** al Google Sheet, siguiendo exactamente el mismo patrón que
`H9` (`EventosLog`, `lib/data/sheets.ts:1021-1131`): función `ensureH10()` que crea la
tab si no existe, constante `H10_HEADERS`, y las operaciones nuevas en `IDataProvider`
(`lib/data/index.ts`) implementadas en `SheetsDataProvider` (`lib/data/sheets.ts`).

**Esquema de H10** (aprobado en el spec de Fase 2):
```
id | timestamp | propuesta_por (camilo|angie) | descripcion | caso_de_uso |
motivo_importancia | triage_impacto | triage_esfuerzo | triage_alineacion |
estado | prioridad_score
```

Modelo de estados (aprobado): `nueva` → `en_triage` → `priorizada` →
`en_construccion` → `construida` | `descartada`. Este ticket solo necesita soportar
`nueva` como valor inicial — los demás estados los escriben tickets futuros
(`IDEAS-TRIAGE-01` en adelante).

**Fuera de alcance:**
- Cualquier endpoint HTTP nuevo (`/api/ideas`) — eso es `IDEAS-CAPTURA-01`.
- Cualquier UI.
- Lógica de triage o cálculo de `prioridad_score` — el campo existe en el esquema, pero
  este ticket no lo calcula ni lo llena.

## Definition of Done

- [ ] `H10_HEADERS` declarado en `lib/data/sheets.ts` con las 11 columnas listadas arriba.
- [ ] `ensureH10()` crea la tab `H10` con esos headers si no existe (mismo patrón que
      `ensureH9()`).
- [ ] `IDataProvider` (`lib/data/index.ts`) gana `createIdea`, `getIdeas(filtro?)`,
      `updateIdea` en la interfaz.
- [ ] `SheetsDataProvider` implementa las tres operaciones usando `getProvider()` /
      `values.append` / `values.update` — nunca instancia `SheetsDataProvider`
      directamente en otro lugar.
- [ ] `createIdea` acepta `propuesta_por`, `descripcion`, `caso_de_uso`,
      `motivo_importancia`; genera `id` (mismo formato `PREFIJO_{unix_timestamp}` que
      `Concepto`/`Movimiento`), `timestamp` server-side (I-01/I-02 — nunca inferido por
      cliente), y `estado: "nueva"` por default.
- [ ] `npx tsc --noEmit` limpio.
- [ ] Verificado con escritura real en el Sheet DEV: una llamada de prueba a
      `createIdea` produce una fila nueva en H10, leída de vuelta con `getIdeas()` para
      confirmar que los 11 campos quedaron correctos.
- [ ] I-10 (cambio de esquema): aplicar el mismo cambio (tab H10 con headers) al Sheet de
      PROD antes de que este ticket se dé por completado — paso manual explícito,
      documentado en "Notas de ejecución".

## Contexto / diagnóstico previo

Spec completo de Fase 2 en `ESTADO.md` (entrada "Fase 2 — Especificación" a agregar tras
este ticket). Patrón de referencia: `lib/data/sheets.ts:1021-1131` (H9/EventosLog).

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena el Coder al cerrar)
