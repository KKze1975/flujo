---
ticket_id: DT-SOBRE-TECHO-01
orden: 7
estado: propuesto
tier: B
dependencias: ninguna
---

# DT-SOBRE-TECHO-01 — sobre_techo no persiste como columna real en H2

## Goal completo

El diseño de bolsillos asume `sobre_techo = TRUE` como mecanismo de
trazabilidad de sobregiro para conceptos `pago_fraccionado` (documentado en
las reglas de negocio del modelo, esquema H3B). La lectura directa de
producción (sesión DEBUGGING 26 jun 2026) confirmó que **la columna no
existe en H2** — el mecanismo no está persistiendo para movimientos H2,
solo se implementó parcialmente en H3B (`ModalCorreccion`, badge "sobre
techo", ver BL-QA-01/T45).

**Tier B**: antes de escribir código, confirmar el alcance real — ¿el gap es
solo en H2 (movimientos con `tipo: pago_fraccionado` que nunca llegan a
H3B) o hay otro punto de consumo que ya asume la columna y falla
silenciosamente? Requiere auditoría de código, no solo el fix de esquema.

**No cubre:**
- El mecanismo ya construido en H3B (funciona correctamente, no se toca).
- Decisión de UI sobre cómo mostrar sobregiro en H2 si aplica — eso es
  DISEÑO, no parte de este ticket de diagnóstico/fix de esquema.

## Definition of Done

**Fase diagnóstico (tier B — HALT obligatorio):**
- [ ] Confirmar contra código real (`lib/data/sheets.ts`, `types.ts`) si
      `sobre_techo` está declarado en el tipo `Movimiento` (H2) y si algún
      endpoint lo escribe o lee.
- [ ] Determinar si el gap requiere expandir el rango de columnas de H2
      (migración de esquema, mismo patrón que T39/T40) o si es solo lógica
      de cálculo faltante sobre una columna ya reservada sin usar.
- [ ] Presentar hallazgo a Camilo. HALT antes de escribir cualquier fix.

**Fase construcción (tras aprobación):**
- [ ] `tsc --noEmit` limpio.
- [ ] `sobre_techo` persiste correctamente para movimientos H2
      `pago_fraccionado` según lo aprobado.
- [ ] Verificado en Sheet dev, cero llamadas a producción hasta checklist
      de promoción explícito (si el fix requiere cambio de esquema, aplica
      el mismo checklist de T39/T40: cambio en dev, luego réplica manual en
      prod antes del merge).

## Contexto / diagnóstico previo

- Hallazgo colateral de la sesión DEBUGGING · DT-PLAN-01 · 26 jun 2026.
  Registrado explícitamente como "no bloqueante hoy — requiere auditoría
  antes de activar flujo de bolsillos [en H2]".

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda técnica
encontrada, criterios de parada activados)
