---
ticket_id: DT-MES-01
orden: 6
estado: completado
tier: A
dependencias: ninguna
---

# DT-MES-01 — Endpoint H3B debe respetar body.mes en lugar de ignorarlo

## Goal completo

`POST /api/registro/sin-concepto` (`route.ts:82`, verificado contra código
real 22 jul 2026 — el ticket original de diagnóstico lo referenciaba como
"`/api/h3b/...`", path que no existe en el código) declara `mes?: string`
como campo opcional en el body (`type Body`, línea 52) pero nunca lo lee —
llama `mesActual()` directamente sin importar qué mes esté activo en la UI
del cliente. Si el usuario está viendo un mes futuro activado manualmente
(como ocurrió con julio 2026), cualquier gasto libre registrado se escribe
en H3B con el mes del servidor, no el mes de la UI — dato corrupto
silencioso, sin error visible.

Fix de una línea, ya especificado y verificado como seguro en la sesión de
diagnóstico original:

```typescript
// Antes
const mes = mesActual()

// Después
const mes = body.mes ?? mesActual()
```

**No cubre:**
- Consolidar `mesActual()`/`semanaActual()` duplicados en otros archivos —
  eso ya se resolvió en `DT-FECHA-01` (`lib/utils/fecha.ts`, PR #21,
  mergeado). Este ticket solo corrige el punto donde `body.mes` se ignora.
- Ningún otro endpoint — alcance limitado a `POST /api/registro/sin-concepto`.

## Definition of Done

- [x] `tsc --noEmit` limpio.
- [x] `body.mes` se usa cuando viene presente; `mesActual()` (de
      `lib/utils/fecha.ts`) solo como fallback.
- [x] Prueba en dev: simular un POST con `body.mes` distinto al mes real del
      servidor, verificar por lectura directa del Sheet dev que el consumo
      se escribió con el mes del body, no el del servidor.
- [x] Prueba complementaria: POST sin `body.mes`, verificar que sigue usando
      `mesActual()` correctamente (sin regresión).
- [x] Cero llamadas contra producción.

## Contexto / diagnóstico previo

- Descubierto en sesión TK-PLAN-JULIO, 27 jun 2026, durante auditoría
  pre-ejecución de julio. Fix propuesto y verificado como seguro en esa
  misma sesión, nunca construido — quedó documentado pendiente de agrupar
  con `DT-FECHA-01`, que ya cerró sin incluir este punto específico.

## Commit de cierre

`DT-MES-01-cierre: DoD verificado` (ver historial de `dev`).

## Notas de ejecución

Fix de una línea confirmado contra código real antes de tocar nada
(`app/api/registro/sin-concepto/route.ts:82`, no el path incorrecto
`/api/h3b/...` que tenía el ticket original — ya corregido en `PR #31`):

```ts
// Antes
const mes = mesActual();
// Después
const mes = body.mes ?? mesActual();
```

`tsc --noEmit` limpio. Probado contra el dev server real (`localhost:3000`,
proceso preexistente PID 9576, no levantado por esta sesión):
- `POST /api/registro/sin-concepto` con `{"mes":"2027-08", ...}` → leído de
  vuelta en H3 dev: fila con `mes=2027-08` (correcto, usó `body.mes`).
- `POST /api/registro/sin-concepto` sin `mes` en el body → leído de vuelta:
  fila con `mes=2026-07` (`mesActual()` real del servidor al momento de la
  prueba — sin regresión).
- Ambas filas de prueba (`TEST_DT-MES-01_con_mes`,
  `TEST_DT-MES-01_sin_mes`) eliminadas después vía `deleteDimension`
  (no solo `clear`), verificado con una segunda lectura que ya no existen.

Cero llamadas contra producción — `GOOGLE_SHEET_ID` verificado apuntando a
dev antes de empezar.
