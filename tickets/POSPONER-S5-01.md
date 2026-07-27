---
ticket_id: POSPONER-S5-01
orden: 22
estado: completado
tier: A
dependencias: ninguna
---

# POSPONER-S5-01 — Visibilidad de Conceptos Pospuestos en Semanas Destino (S5)

## Goal completo

Garantizar que los conceptos pospuestos a una semana destino dentro del mismo mes (ej. **PS Plus** y **Uber One** pospuestos a **S5**):

1. **Visibilidad en UI (`VistaSemanal.tsx`):** Aparezcan correctamente en la lista de `pendientes` de la semana destino ($S5$) para poder ser ejecutados/pagados normalmente.
2. **Lógica de Filtrado:** Modificado el filtro de `pendientes` en `components/VistaSemanal.tsx` para incluir movimientos con `estado === "pospuesto"` cuando su `semana` coincide con la semana activa visible, mostrando el badge `Pospuesto`.
3. **Sincronización de Datos en Dev Sheet:** Reasignados en H2 los registros de **PS Plus** y **Uber One** a `semana: "S5"` con `estado: "pospuesto"`.

## Definition of Done

- [x] `VistaSemanal.tsx` incluye movimientos con `estado === "pospuesto"` en la lista de `pendientes` de la semana activa y renderiza badge `Pospuesto`.
- [x] Registros de **PS Plus** y **Uber One** actualizados a `semana: "S5"` en H2 del Dev Sheet.
- [x] Al navegar a `/mes/2026-07/semana?semana=S5` en Dev Vercel Preview, **PS Plus** y **Uber One** se muestran en la sección de conceptos por pagar.
- [x] `npx tsc --noEmit` sin errores.
- [x] Commiteado y subido en rama `dev`.

## Contexto / diagnóstico previo

Etnografía (27 jul 2026): Camilo y Angie reportaron que los conceptos PS Plus y Uber One pospuestos a la semana 5 no aparecían en la vista de S5. La investigación reveló dos causas: 1) En H2 de Dev Sheet estaban anclados a `S1` por su `semana_default`. 2) La UI (`VistaSemanal.tsx`) filtraba `pendientes` exigiendo estrictamente `m.estado === "pendiente"`, ocultando cualquier registro con `estado === "pospuesto"`.

## Commit de cierre

`1d5b3c2` (rama `dev`).

## Notas de ejecución

1. Modificado [components/VistaSemanal.tsx](file:///home/camilovillamil/flujo/components/VistaSemanal.tsx): actualizado `pendientes` y `movimientosPresupuestados` para admitir `m.estado === "pospuesto"`.
2. Ejecutado `scratch/update-psplus-s5.ts` reasignando las filas H2 de PS Plus y Uber One a `semana: "S5"`, `estado: "pospuesto"`.
3. Verificada la compilación limpia con `tsc --noEmit`.
