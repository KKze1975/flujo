---
ticket_id: DT-M1M4-NULL-01
orden: 5
estado: diagnostico_listo
tier: B
dependencias: ninguna
---

# DT-M1M4-NULL-01 — Unificar tratamiento de semana=null entre M1 y M4

## Goal completo

`semana === null` en H2 (usado para conceptos con `semana_default: variable`,
o para movimientos trasladados de mes vía `mover_mes_siguiente`, que siempre
escribe `semana: null`) se trata de forma **opuesta** en las dos vistas que lo
consumen: M1 lo filtra por igualdad exacta (`m.semana === s`), por lo que un
movimiento con `semana: null` es invisible en cualquier filtro de semana
específica; M4 (`getMovimientosByMesYSemana`) lo trata de forma inclusiva
(aparece en todas las semanas simultáneamente). Esta asimetría está
**confirmada por auditoría de código** en la sesión "Ticket B — 3 julio
2026" (`ESTADO.md` línea ~4850).

**Precisión importante, verificada 22 jul 2026 al migrar este ticket:** el
incidente original que motivó la investigación ("Uber One aparece en S1,
S2, S3, S4 simultáneamente", sesión 2 jul 2026) **no fue explicado por esta
hipótesis** — en ese caso puntual Uber One tenía `semana=S1`, no `null`
(hipótesis HB-1 descartada explícitamente con datos reales, `ESTADO.md`
línea ~4759). La causa real de aquel incidente resultó ser otra (conceptos
duplicados en H1, hallazgo de una sesión posterior, ya sin deuda técnica
abierta). La asimetría M1/M4 es un riesgo estructural real y confirmado por
código — capaz de producir el mismo síntoma visible bajo el escenario que sí
describe (concepto trasladado con `semana: null` real vía
`mover_mes_siguiente`) — pero no se debe cerrar este ticket asumiendo que
"la causa" del incidente de Uber One ya está probada; son dos hallazgos
relacionados pero distintos.

**Este es tier B**: requiere decisión de diseño antes de escribir código —
no es un fix mecánico. Opciones ya identificadas en la sesión de diagnóstico
(no cerradas):
- B1: bloquear el traslado hasta que el usuario asigne semana en M1.
- B2: auto-asignar semana activa del mes destino al trasladar.
- B3 (recomendada en la sesión previa): pedir semana destino explícita al
  usuario en el momento de mover el concepto al mes siguiente.

**No cubre:**
- Cambiar el comportamiento de `semana_default: variable` en general — solo
  el caso específico de movimientos trasladados vía `mover_mes_siguiente`.
- Migración de esquema (candidato a invariante I-16 ya registrado: "estados
  derivados de traslado no deben inferirse por ausencia de valor sin fuente
  única que los declare explícitamente") — evaluar si este ticket la activa
  o si se resuelve con guardia puntual, es parte de la decisión de diseño.

## Definition of Done

**Fase diagnóstico (tier B — HALT obligatorio antes de construir):**
- [ ] Confirmar contra código real (no memoria de sesiones previas) el
      comportamiento actual exacto de M1 y M4 frente a `semana: null`.
- [ ] Presentar las 3 opciones (B1/B2/B3) con trade-offs a Camilo. HALT.
      No proceder a la fase de construcción sin aprobación explícita de una
      opción.

**Fase construcción (una vez aprobada la opción, vía `/goal-a` posterior):**
- [ ] `tsc --noEmit` limpio.
- [ ] M1 y M4 tratan `semana: null` de forma consistente entre sí, según la
      opción aprobada.
- [ ] Caso de prueba: crear un concepto de prueba en dev, trasladarlo vía
      `mover_mes_siguiente` (queda con `semana: null` real), y confirmar que
      ya no aparece en las 4 semanas simultáneamente en M4 tras el fix —
      no es una reproducción del incidente histórico de Uber One (causa
      distinta, ya resuelta), sino del escenario estructural que sí describe
      esta asimetría.
- [ ] Verificado contra Sheet dev, cero llamadas a producción.

## Contexto / diagnóstico previo

- Sesión "Ticket B — 3 julio 2026 [DEBUGGING → DISEÑO → CONSTRUCCIÓN,
  pausada]". STOP activado explícitamente a la espera de esta decisión.
- Relacionado con `DT-MOVER-MES-01` (deuda técnica de la sesión del 2 jul,
  causa raíz compartida: `mover_mes_siguiente` siempre escribe
  `semana: null`).

## Diagnóstico (Tier B — pendiente de aprobación del plan)

**Aprobación:** Camilo autorizó explícitamente correr `/goal-b` sobre este
ticket en sesión de chat ("ejecutalo"), lo que movió `estado: propuesto` →
`aprobado` para esta fase de diagnóstico únicamente — no es aprobación del
fix, solo de investigar y proponer (según exige el propio ticket).

### Causa raíz — confirmada contra código real (hecho, no memoria de sesión)

1. **M1 trata `semana: null` como excluyente en cualquier filtro de semana
   específica** — verificado en 4 sitios, todos con el mismo patrón
   `m.semana === s` sin caso especial para `null`:
   - `components/MesM1.tsx:133` (`movsVisibles`, lista principal filtrada)
   - `components/MesM1.tsx:137` (`semanaStat`, estadísticas por semana)
   - `components/MesM1.tsx:166` (`pendientesS1`)
   - `components/m1/VistaPlanificacion.tsx:162` (balance por semana)

   Cuando `semanaFiltro` está activo (una semana específica seleccionada),
   un movimiento con `semana: null` no aparece en ninguna — solo es visible
   en la vista "todas las semanas" (`semanaFiltro === null`, `movs` sin
   filtrar).

2. **M4 trata `semana: null` como inclusivo en todas las semanas, mientras
   el movimiento no esté ejecutado** — `lib/data/sheets.ts:290-296`:
   ```ts
   async getMovimientosByMesYSemana(mes, semana) {
     const todos = await this.getMovimientos(mes);
     return todos.filter((m) =>
       m.semana === semana ||
       (m.semana === null && m.estado !== "ejecutado")
     );
   }
   ```
   Nota importante no capturada en la redacción original del ticket: ya
   existe un guard parcial (`m.estado !== "ejecutado"`) que probablemente
   viene de una sesión previa (posiblemente `TICKET-B-GUARDIA-01`) — una vez
   ejecutado en alguna semana, el movimiento deja de aparecer en las demás.
   El problema real es exclusivamente la **ventana mientras está pendiente**:
   aparece simultáneamente en S1, S2, S3 y S4 hasta que se ejecuta en una.

3. **`mover_mes_siguiente` siempre escribe `semana: null` sin excepción** —
   `app/api/mes/[mes]/movimientos/[id]/route.ts:130-157`, línea 138
   (`semana: null` hardcodeado en el nuevo `Movimiento` del mes destino),
   independientemente de si el concepto tiene `semanaDefault` fija (`S1`..`S4`)
   o `variable`. Es la única vía de escritura de `semana: null` — confirmado
   por `grep`, no hay otro sitio que escriba ese valor.

4. **Reproducibilidad con datos reales, verificado en dev:** actualmente
   `H2` en dev tiene **0 movimientos** con `semana` vacía — el bug existe en
   el código pero no está manifestándose ahora mismo con datos reales. Para
   reproducirlo hay que generar el escenario activamente (ver caso de falla
   abajo) — no se hizo en esta fase porque es trabajo de escritura, reservado
   a la fase de construcción según el propio DoD de este ticket.

**Distinción hecho/inferencia:** los 4 puntos anteriores son **hecho**
(código leído directamente, líneas citadas). Es **inferencia** —no
confirmada— que el guard `m.estado !== "ejecutado"` en M4 haya sido agregado
específicamente para este problema; no encontré un commit o comentario que
lo confirme explícitamente, solo coincide con el patrón de guards de
`TICKET-B-GUARDIA-01`.

### Plan de fix propuesto — 3 opciones, con archivos/funciones exactos

El único punto de entrada de escritura es el mismo para las 3 opciones:
`app/api/mes/[mes]/movimientos/[id]/route.ts:108-157` (bloque
`mover_mes_siguiente`). El único disparador de UI también es el mismo:
`components/m1/ConceptoBoard.tsx:202` (botón "Mover al mes siguiente",
sin selector de semana hoy) — ya existe en el mismo archivo, líneas 206-212,
un patrón de chips `SEMANAS.map` para selección inmediata de semana
(`mover_semana`) que las 3 opciones podrían reutilizar/adaptar.

- **B1 — Bloquear el traslado hasta que se asigne semana en M1.**
  Backend: en `route.ts:119` (donde ya se valida `concepto.frecuencia !==
  "semanal"`), agregar validación adicional que rechace la request si
  `concepto.semanaDefault === "variable"` y no viene una `semana` explícita
  en el body — mismo patrón de error 400 ya usado en líneas 122-127.
  Frontend: el botón de `ConceptoBoard.tsx:202` tendría que deshabilitarse o
  mostrar los chips de semana (206-212) obligatoriamente antes de permitir
  el clic. Trade-off: más fricción para Camilo (no puede posponer sin
  decidir semana en el momento), pero cero ambigüedad — nunca se escribe
  `null`.

- **B2 — Auto-asignar la semana activa del mes destino al trasladar.**
  Solo backend: `route.ts:138`, reemplazar `semana: null` por una semana
  calculada. **Ambigüedad de diseño real, sin resolver:** el ticket no
  define qué es "semana activa" para un mes futuro sin ejecución en curso —
  ¿siempre `S1`? ¿la semana `semanaDefault` original del concepto en el mes
  de origen? Esta pregunta es del mismo tipo que originó `DT-M1M4-NULL-01`
  y necesitaría resolverse como parte de aprobar esta opción, no queda
  implícita. Trade-off: cero fricción de UI, pero puede asignar una semana
  "incorrecta" silenciosamente si la heurística no coincide con lo que
  Camilo esperaba.

- **B3 — Pedir semana destino explícita en el momento del traslado
  (recomendada en la sesión de diagnóstico previa, 3 jul 2026).**
  Backend: igual que B1 (validar que venga `semana` en el body cuando
  aplica). Frontend: en vez de bloquear con error, `ConceptoBoard.tsx:202`
  abriría un pequeño picker (reutilizando el patrón de chips de
  206-212) antes de confirmar el traslado — UX positiva en vez de bloqueo.
  Trade-off: más trabajo de UI que B1/B2, pero es el único que no tiene
  ambigüedad de diseño (a diferencia de B2) ni fricción de bloqueo duro
  (a diferencia de B1).

**Sin recomendación vinculante de mi parte más allá de reportar que B3 ya
fue la preferida en la sesión previa** — la decisión es tuya.

### Caso de falla a inyectar en la prueba (construcción, no esta fase)

1. En dev, crear un concepto de prueba con `semanaDefault: "S3"` (no
   `variable`, para que el traslado sea posible bajo el guard de
   `TICKET-B-GUARDIA-01` P1) y un movimiento pendiente en un mes de prueba.
2. Invocar `PATCH .../movimientos/{id}` con `{tipo: "mover_mes_siguiente"}` —
   confirmar por lectura directa de H2 que el nuevo movimiento en el mes
   destino queda con `semana: null` (bug de origen, ya confirmado por
   código, pero no verificado con escritura real todavía).
3. Confirmar que ese movimiento aparece simultáneamente al llamar
   `GET /api/mes/{mesDestino}/semana/S1`, `S2`, `S3` y `S4` (las 4) mientras
   está pendiente — reproduce el síntoma de M4.
4. Confirmar que ese mismo movimiento **no aparece** en `MesM1` con
   `semanaFiltro` fijado en ninguna semana específica (solo en la vista sin
   filtro) — reproduce el síntoma de M1.
5. Aplicar la opción aprobada y repetir 2-4, confirmando comportamiento
   consistente entre M1 y M4 para el mismo movimiento.

## Commit de cierre

`DT-M1M4-NULL-01-diagnostico: diagnostico_listo` (ver historial de `dev`).

## Notas de ejecución

Fase de diagnóstico cerrada — HALT obligatorio por diseño de Tier B. No se
escribió código de fix ni se tocó ningún dato en Sheet (dev o prod). Falta:
que Camilo elija B1/B2/B3 (o proponga una alternativa) y cambie `estado` a
`aprobado_para_fix` para que `/goal-a DT-M1M4-NULL-01` ejecute el fix ya
diagnosticado.
