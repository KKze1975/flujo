# SESSION_LOG — BL-11b · 15 junio 2026

## Objetivo
4 ajustes post-QA a VistaSemanal: cierre en header, selector visual, gate modal.

## Decisiones tomadas

- Cierre en header: condición `semanaVisible === semanaActivaMes && !cierreSemanaState`
  (solo la semana activa puede cerrarse desde la UI). Texto "cerrada" para cualquier
  semana que tenga cierreSemanaState.
- Selector de semanas: sin fetch adicional. Estado se infiere de cierreSemanaState
  (semana actual) + posición relativa (idxVisible vs semanaActivaMes). Para semanas
  adyacentes no visitadas, el estado de cierre se desconoce hasta que se navegue a ellas.
  Decisión: diferenciar solo activa / cerrada (cuando es la visible) / otra. Futura
  queda cubierta implícitamente (arrows disabled por BL-10).
- hideFab en BottomNav: opacity:0 + pointerEvents:none preserva el layout flex.
- Gate modal: aparece después del fetch (cierreSemanaState ya actualizado).
  Se usa `semanaActivaMes` capturado en navegar() para evaluar si la semana es futura.
- ModoSemana: "activa" | "lectura" | "edicion". Al volver a semana activa → "activa".
  Al navegar a no-activa → gate decide el modo.

## Piezas completadas

- P1: Cambios 1+2 — cierre al header morado, eliminar bloque body — commit [pendiente]
- P2: Cambio 3 — selector semanas tri-estado — commit [pendiente]
- P3: Cambio 4 — gate modal + modoSemana + BottomNav hideFab — commit [pendiente]

## DoD verificado

- [ ] 1. Línea informativa eliminada del bloque cierre.
- [ ] 2. Botón cierre en header morado, debajo del porcentaje.
- [ ] 3. Selector diferencia activa / cerrada / futura.
- [ ] 4. Gate modal al navegar a semana no activa.
- [ ] 5. Gate variante correcta: Cerrada / Aún no iniciada.
- [ ] 6. Modo lectura: FAB oculto, botones de acción ocultos.
- [ ] 7. Modo editar/planear: acciones visibles, sin re-cierre.
- [ ] 8. Semana activa: sin gate.
- [ ] 9. tsc limpio después de cada pieza.
- [ ] 10. Verificado en preview URL.

## Criterios de parada activados

- Ninguno.

---

# SESSION LOG — Loop Maestro OBS-1/2/3/4
Fecha: 2026-06-20 | Rama: dev

---

## TICKET BL-01 — Fix ModalCorreccionM5 ID bolsillo corrupto

### P1: Diagnóstico

**Bug**: `id_bolsillo` en H3B se escribe con un valor incorrecto al guardar el scenario `clasif` en `ModalCorreccion`.

**Archivo**: `components/VistaSemanal.tsx` — función `guardar()` dentro de `ModalCorreccion`, línea 169.

**Código afectado (antes del fix)**:
```typescript
if (scenario === "clasif") {
  const selectedId = bolsilloId ?? consumo.bolsilloId;   // ← BUG: fallback perpetúa valores corruptos
  const h2 = bolsillos.find((m) => m.conceptoId === selectedId);
  const gastado = consumos.filter(c => c.bolsilloId === selectedId).reduce((sum, c) => sum + c.monto, 0);
  const techo = h2?.montoPresupuestado ?? 0;
  patch = { bolsilloId: selectedId, clasificado: true, sobreTecho: techo > 0 && gastado >= techo };
}
```

**Causa raíz**: El fallback `bolsilloId ?? consumo.bolsilloId` escribe `consumo.bolsilloId` al Sheet cuando el usuario no hace clic en ningún bolsillo en el modal. Si `consumo.bolsilloId` contiene un valor corrupto (ej. `MOV_xxx` o ID corto legacy), el valor corrupto se reescribe sin corrección.

**Origen histórico**: Commit `0dc8ef0` (T45) migró la lista de bolsillos de un array hardcodeado (`BOLSILLOS_ACTIVOS` con IDs cortos tipo `"frida"`) a movimientos H2 dinámicos. El UI se actualizó a `setBolsilloId(b.conceptoId)` (correcto), pero `guardar()` nunca fue robustecido contra valores pre-T45 en `consumo.bolsilloId`. Registros H3B creados antes de T45 tenían `id_bolsillo` = IDs cortos legacy. Al abrir el modal sin seleccionar, el fallback los perpetuaba. `MOV_xxx` puede aparecer si en un período intermedio de T45 se escribió `b.id` (H2) en lugar de `b.conceptoId` (H1).

**Invariante violada**: I-03 — `clasificado = true` en H3B requiere `bolsilloId` = id de H1 (`CATEGORIA_xxx`). Nunca debe ser `MOV_xxx`.

---

### P2: Fix implementado

Archivo: `components/VistaSemanal.tsx` líneas 168-174.

```typescript
// Antes:
const selectedId = bolsilloId ?? consumo.bolsilloId;
const h2 = bolsillos.find((m) => m.conceptoId === selectedId);

// Después:
const selectedBolsillo = bolsilloId
  ? bolsillos.find((b) => b.conceptoId === bolsilloId)
  : bolsillos.find((b) => b.id === consumo.bolsilloId || b.conceptoId === consumo.bolsilloId);
const selectedId = selectedBolsillo?.conceptoId ?? consumo.bolsilloId;
```

**Comportamientos post-fix**:
- Usuario hace clic en bolsillo → `bolsilloId = b.conceptoId` → busca por `conceptoId` → escribe H1 id ✓
- `consumo.bolsilloId = "MOV_xxx"` (corrupto) → encuentra bolsillo por `b.id` → escribe `b.conceptoId` (auto-sana) ✓
- `consumo.bolsilloId = "CATEGORIA_xxx"` (correcto) → encuentra por `b.conceptoId` → reescribe mismo valor ✓
- No hay match → `selectedId = consumo.bolsilloId` como último recurso ✓

Commit: `BL-01: fix clasif scenario escribe conceptoId H1 no id movimiento H2`

---

### P3: Verificación

Pendiente: verificar en `/admin/trazabilidad` que un consumo clasificado desde M4 Ejecutados escriba `id_bolsillo = CATEGORIA_xxx` en H3B.

---

## TICKET OBS-1 — Barra morada incluye consumos pago_fraccionado

**Estado: COMPLETADO** | Commit: `7436902`

**Cambios:**

1. `components/VistaSemanal.tsx` — `totalEjecutadoH2` excluye `pago_fraccionado` para evitar doble conteo cuando cerrar-semana escribe H2. `totalEjecutadoH3` (suma H3B) siempre captura el gasto de bolsillos en tiempo real.

2. `app/api/mes/[mes]/cerrar-semana/route.ts` — Tras crear H5A, consolida cada H2 `pago_fraccionado` de la semana: escribe `estado=ejecutado`, `montoEjecutado=sumH3B`, `desviacion`, `fechaEjecucion`.

PR: pendiente crear

---

## TICKET OBS-2 — Bolsillos pago_fraccionado en lista Pendientes

**Estado: COMPLETADO** | Commit: `b2ca808`

**Cambios:**
- `components/VistaSemanal.tsx`:
  - Eliminado carousel de bolsillos.
  - `bolsillosPendientes / bolsillosEjecutados` derivados del state existente.
  - `lista` fusiona bolsillos + conceptos según tab activo.
  - Tab count actualizado para incluir bolsillos en ambas pestañas.
  - `lista.map()` renderiza ficha de bolsillo si `tipoSnapshot === "pago_fraccionado"`:
    - Pendientes: Ring pct + nombre + avance + botón "Cerrar bolsillo" (PATCH ejecutar H2).
    - Ejecutados: monto clickeable → popover desglose H3B (mismo mecanismo que carousel).

PR: acumulado en #6

---

## TICKET OBS-3 — Crear bolsillo Imprevistos

**Estado: COMPLETADO** | Commit: `391184b`

**Cambios:**
- `scripts/seed-imprevistos.mjs`: script uno-disparo para insertar H1 concepto "Imprevistos" (`pago_fraccionado`, $250K, semana=variable) + H2 movimiento junio 2026. Aborta si ya existe. Ejecutar: `node scripts/seed-imprevistos.mjs` (dev Sheet).
- `app/api/consumos/[id]/clasificar/route.ts`:
  - `activos.filter(c => c.nombre !== "Imprevistos")` excluye Imprevistos del listado enviado a Haiku.
  - System prompt actualizado: "IMPORTANTE: Nunca sugieras 'Imprevistos' — esa categoría requiere selección explícita del usuario."
- Ficha Imprevistos aparece automáticamente en lista Pendientes (OBS-2 ya lo maneja).

**Pendiente operativo**: correr `node scripts/seed-imprevistos.mjs` contra dev Sheet. Agregar manualmente a Sheet de producción antes del merge a main.

PR: acumulado en #6

---

## TICKET OBS-4 — Posponer/No aplica en modal lápiz VistaSemanal

**Estado: COMPLETADO** | Commit: `0a4bfcd`

**Cambios:**
- `components/VistaSemanal.tsx`:
  - Nueva prop `semanasCerradas?: Semana[]` (default `[]`).
  - Estado `posponiendo: Movimiento | null`.
  - Botón lápiz en pendientes ahora llama `setPosponiendo(mov)` (antes: `toggleEditar`).
  - `ModalAccionesPendiente` renderizado cuando `posponiendo !== null`.
  - `ModalAccionesPendiente`: scenarios Posponer (S1–S4 con gates de semana cerrada + "Mes sig.") y No aplica. PATCH a `/api/mes/[mes]/movimientos/[id]`.
- `app/mes/[mes]/semana/page.tsx`: `semanasCerradas` derivado de cierres y pasado como prop.
- `app/api/mes/[mes]/movimientos/[id]/route.ts`:
  - `tipo=posponer`: verifica que `nuevaSemana` no tenga H5A existente.
  - `tipo=mover_mes_siguiente`: crea H2 en mes siguiente con mismo concepto/monto.
  - `tipo=no_aplica`: escribe `estado=no_aplica`.

PR: acumulado en #6
