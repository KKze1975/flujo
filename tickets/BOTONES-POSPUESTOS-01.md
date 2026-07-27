---
ticket_id: BOTONES-POSPUESTOS-01
orden: 23
estado: completado
tier: A
dependencias: POSPONER-S5-01
---

# BOTONES-POSPUESTOS-01 — Habilitación de Botones OK y Edición en Conceptos Pospuestos

## Goal completo

Habilitar la barra de acciones (botón de ejecución **OK** con checkmark y botón de edición **Lápiz**) para los conceptos que están en estado `pospuesto` dentro de la pestaña de `pendientes` en [components/VistaSemanal.tsx](file:///home/camilovillamil/flujo/components/VistaSemanal.tsx#L1787):

1. **Causa Raíz:** La línea 1787 de `VistaSemanal.tsx` condicionaba la renderización de los botones de acción únicamente a `mov.estado === "pendiente"`. Al tener un concepto con `mov.estado === "pospuesto"`, la barra de botones quedaba excluida.
2. **Solución:** Ajustar la condición en `VistaSemanal.tsx` a `(mov.estado === "pendiente" || mov.estado === "pospuesto")` para que despliegue los botones **OK** y **Lápiz** permitiendo ejecutarlo o editarlo.

## Definition of Done

- [x] `VistaSemanal.tsx` condiciona la barra de acciones a `(mov.estado === "pendiente" || mov.estado === "pospuesto")`.
- [x] Al visualizar **PS Plus** o **Uber One** en la pestaña de `pendientes` de S5, aparecen los botones **OK** y **Lápiz**.
- [x] Al tocar el botón **OK**, se despliega el panel de selección de pagador (Camilo/Angie) y permite ejecutar el concepto pospuesto normalmente.
- [x] `npx tsc --noEmit` sin errores.
- [x] Commiteado y desplegado en rama `dev`.

## Contexto / diagnóstico previo

Etnografía (27 jul 2026): Al visualizar los conceptos pospuestos (PS Plus y Uber One) en S5, no aparecían los botones de ejecución (OK) ni el lápiz de edición. El diagnóstico en `VistaSemanal.tsx` reveló que la línea 1787 exigía strictly `mov.estado === "pendiente"`.

## Commit de cierre

`9c00b91` (rama `dev`).

## Notas de ejecución

1. Modificado [components/VistaSemanal.tsx](file:///home/camilovillamil/flujo/components/VistaSemanal.tsx): cambiado `mov.estado === "pendiente"` a `(mov.estado === "pendiente" || mov.estado === "pospuesto")`.
2. Verificada la compilación limpia con `tsc --noEmit`.
