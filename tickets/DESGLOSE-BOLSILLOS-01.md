---
ticket_id: DESGLOSE-BOLSILLOS-01
orden: 20
estado: completado
tier: A
dependencias: ninguna
---

# DESGLOSE-BOLSILLOS-01 — Desglose de Consumos por Bolsillo en Vistas Pendiente y Ejecutado

## Goal completo

Habilitar el modal de desglose de consumos (`desgloseModal`) para todos los bolsillos (`pago_fraccionado`: Mercado semanal, Entretenimiento, Frutas y verduras, Víveres y otros, Imprevistos, Mercado mensual, Fondo de transporte, Frida), tanto en estado `pendiente` como `ejecutado`:

1. **UX/UI Reutilizado:** Reutilizar el componente de modal de desglose existente (`desgloseModal` en [VistaSemanal.tsx](file:///home/camilovillamil/flujo/components/VistaSemanal.tsx#L2109)) que ya incluye título, lista con descripción, fecha, monto y total acumulado.
2. **Disparo de Modal:** Permitir abrir el modal al hacer clic en cualquier tarjeta de bolsillo o en su botón/trigger correspondiente, sin importar si el bolsillo está `pendiente` o `ejecutado`.
3. **Visibilidad de Consumos:** Mostrar la lista de consumos asociados en H3B (registrados vía FAB de texto/imagen o por ingesta automática de Uber) con su fecha, descripción, monto y ejecutador.

## Definition of Done

- [x] Clic en tarjeta de bolsillo `pendiente` abre el modal `desgloseModal`.
- [x] Clic en tarjeta de bolsillo `ejecutado` mantiene la apertura de `desgloseModal`.
- [x] Cada ítem en el modal muestra descripción, fecha (`c.fecha`), monto (`COP(c.monto)`) y total acumulado.
- [x] `tsc --noEmit` sin errores.
- [x] Cambios commiteados en rama `dev` (commit `4da7382`) y verificados en Vercel preview.

## Contexto / diagnóstico previo

Hallazgo de sesión de etnografía (27 jul 2026): Durante la semana, los consumos clasificados por IA (FAB/Haiku) o ingesta de correos (Uber) se acumulan en H3B, pero la única forma de saber dónde se clasificaron era consultar la sección "Ejecutados". El modal `desgloseModal` ya existía en el código para ejecutados; este ticket lo extiende para tarjetas pendientes.

## Commit de cierre

`4da7382` (rama `dev`).

## Notas de ejecución

1. Modificado [components/VistaSemanal.tsx](file:///home/camilovillamil/flujo/components/VistaSemanal.tsx): eliminado el condicional `ejecutado ?` en el handler `onClick` y el estilo `cursor: pointer` de las tarjetas de bolsillo `fl-concepto`.
2. Actualizada la renderización de ítems dentro de `desgloseModal` para incluir `c.fecha` y `c.ejecutor`.
3. Verificada la compilación limpia con `tsc --noEmit`.
