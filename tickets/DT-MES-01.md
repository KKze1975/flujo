---
ticket_id: DT-MES-01
orden: 6
estado: aprobado
tier: A
dependencias: ninguna
---

# DT-MES-01 — Endpoint H3B debe respetar body.mes en lugar de ignorarlo

## Goal completo

`POST /api/h3b/...` declara `mes?: string` como campo opcional en el body
pero nunca lo lee — llama `mesActual()` directamente sin importar qué mes
esté activo en la UI del cliente. Si el usuario está viendo un mes futuro
activado manualmente (como ocurrió con julio 2026), cualquier gasto libre
registrado se escribe en H3B con el mes del servidor, no el mes de la UI —
dato corrupto silencioso, sin error visible.

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
- Ningún otro endpoint — alcance limitado a `POST /api/h3b/...`.

## Definition of Done

- [ ] `tsc --noEmit` limpio.
- [ ] `body.mes` se usa cuando viene presente; `mesActual()` (de
      `lib/utils/fecha.ts`) solo como fallback.
- [ ] Prueba en dev: simular un POST con `body.mes` distinto al mes real del
      servidor, verificar por lectura directa del Sheet dev que el consumo
      se escribió con el mes del body, no el del servidor.
- [ ] Prueba complementaria: POST sin `body.mes`, verificar que sigue usando
      `mesActual()` correctamente (sin regresión).
- [ ] Cero llamadas contra producción.

## Contexto / diagnóstico previo

- Descubierto en sesión TK-PLAN-JULIO, 27 jun 2026, durante auditoría
  pre-ejecución de julio. Fix propuesto y verificado como seguro en esa
  misma sesión, nunca construido — quedó documentado pendiente de agrupar
  con `DT-FECHA-01`, que ya cerró sin incluir este punto específico.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda técnica
encontrada, criterios de parada activados)
