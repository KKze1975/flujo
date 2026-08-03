---
ticket_id: DT-CICLO-OPERATIVO-UNIFICADO-01
orden: 26
estado: propuesto
tier: B
dependencias: FIX-SEMANA-STUB-01
---

# DT-CICLO-OPERATIVO-UNIFICADO-01 — mesDeFecha()/semanaDeFechaEnMes() no aplican la regla de cierre de fin de semana

## Goal completo

`cicloOperativo()` (usado solo por `mesActual()`/`semanaActual()`, es decir solo para "hoy") es
la única función que aplica la regla de `cc51db9`: un sábado/domingo antes del primer lunes del
mes pertenece al cierre del mes anterior. Cualquier código que necesite el mes/semana de una
**fecha arbitraria** (no "hoy") sigue usando `mesDeFecha()` + `semanaDeFechaEnMes()` por
separado, que NO aplican esa regla — dos caminos de código paralelos y desincronizados para el
mismo cálculo, exactamente el patrón que causó `FIX-SEMANA-STUB-01`.

Caso real conocido: `app/api/cron/uber-parser/route.ts:107` usa `semanaDeFechaEnMes(fechaCorreo)`
directo. Un viaje Uber en la fecha (real, no "hoy") de un sábado/domingo previo al primer lunes de
un mes que empieza así quedaría con `mes` = mes nuevo (sin redirigir a cierre del mes anterior) y
`semana` mal numerada — mismo bug de `FIX-SEMANA-STUB-01`, pero para fechas de correos, no de "hoy".

También usado por `app/api/registro/interpretar/route.ts` indirectamente si en el futuro deja de
depender de que la IA infiera `semana` (ver `DT-INTERPRETAR-IA-SEMANA-01`) y pase a derivarla
server-side de una fecha real — debe usar el cálculo unificado, no una copia suelta.

Este es un ticket de **diagnóstico**, tier B: requiere decidir con Camilo si conviene:
- **Opción 1:** exportar `cicloOperativo()` (o un alias) como la única función pública para
  mes+semana de cualquier fecha, y hacer que `uber-parser` la use en vez de las dos funciones
  sueltas.
- **Opción 2:** dejarlo como está, documentando que la regla de cierre de fin de semana es
  deliberadamente "solo para hoy" y que fechas históricas de Uber no la necesitan (evaluar
  cuántos correos reales caen en esa ventana de 1-2 días por mes, probablemente muy pocos).

No tocar código hasta que Camilo elija opción — UBER-04/UBER-05 están `completado` y cualquier
cambio a su bucketing de mes/semana es una modificación a una feature ya verificada en producción.

## Definition of Done

- [ ] Diagnóstico: listar todos los call sites de `mesDeFecha()` y `semanaDeFechaEnMes()` fuera
      de `cicloOperativo()` mismo.
- [ ] Estimar impacto real: ¿cuántos correos Uber históricos (o proyectados) caen en la ventana de
      1-2 días de cierre de fin de semana por mes? (Solo meses que empiezan sábado/domingo.)
- [ ] Documentar las 2 opciones con archivos exactos a tocar en cada una.
- [ ] HALT — esperar que Camilo elija opción antes de construir.

## Contexto / diagnóstico previo

Encontrado como hallazgo derivado durante la implementación de `FIX-SEMANA-STUB-01`
(sesión de debugging, 3-ago-2026) — no estaba en el reporte original del usuario.

## Commit de cierre
(vacío)

## Notas de ejecución
(vacío)
