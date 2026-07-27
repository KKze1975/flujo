---
ticket_id: UBER-05
orden: 21
estado: completado
tier: A
dependencias: UBER-04
---

# UBER-05 — Asignación de Fecha Real en Ingesta de Correos Uber (H3)

## Goal completo

Corregir la asignación de fecha en el worker de ingesta de correos de Uber (`app/api/cron/uber-parser/route.ts`):

1. **Causa Raíz:** La columna `fecha` en H3 se escribía hardcodeada a `const hoy = new Date().toISOString().split("T")[0]`, asignando la fecha de ejecución del cron (ej. `2026-07-27`) a todos los viajes procesados en esa corrida, en lugar de la fecha real en que se realizó el viaje / envió el correo (`fechaCorreo`).
2. **Corrección en Parser/Cron:** Utilizar la fecha real del correo (`fechaCorreo.toISOString().split("T")[0]`) para llenar la columna `fecha` de cada consumo de Uber escrito en H3.
3. **Corrección de Datos:** Actualizadas las 18 filas de Uber en H3 de Dev Sheet con sus fechas reales de recibo de Gmail (`2026-07-26`, `2026-07-20`, `2026-07-19`, etc.).

## Definition of Done

- [x] `app/api/cron/uber-parser/route.ts` asigna `fechaCorreo` (formato YYYY-MM-DD) a la columna `fecha` de H3.
- [x] Script `scratch/fix-uber-dates.ts` actualizó las 18 filas existentes en H3 de Dev Sheet a sus fechas reales.
- [x] En la UI de la app (`VistaSemanal.tsx`), al abrir el popover del bolsillo **Fondo de transporte**, los viajes muestran sus fechas reales correspondientes.
- [x] `npx tsc --noEmit` sin errores.
- [x] Commiteado y desplegado en rama `dev`.

## Contexto / diagnóstico previo

Hallazgo de sesión (27 jul 2026): Al abrir el desglose de consumos del bolsillo **Fondo de transporte**, todos los viajes importados por el parser de Uber figuraban con la fecha `2026-07-27`. El diagnóstico del código reveló que la línea 122 de `app/api/cron/uber-parser/route.ts` asignaba `new Date().toISOString().split("T")[0]` (fecha de ejecución del servidor) en lugar de `fechaCorreo`.

## Commit de cierre

`19e34fb` (rama `dev`).

## Notas de ejecución

1. Modificado [app/api/cron/uber-parser/route.ts](file:///home/camilovillamil/flujo/app/api/cron/uber-parser/route.ts): reemplazado `const hoy` por `const fechaConsumo = fechaCorreo.toISOString().split("T")[0]`.
2. Ejecutado `scratch/fix-uber-dates.ts` actualizando 18 filas en H3 de Dev Sheet.
3. Verificada la compilación limpia con `tsc --noEmit`.
