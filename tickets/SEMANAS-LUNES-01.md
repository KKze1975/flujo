---
ticket_id: SEMANAS-LUNES-01
orden: 18
estado: completado
tier: A
dependencias: ninguna
---

# SEMANAS-LUNES-01 — Modelo de Semanas Lunes a Domingo y Soporte S1-S5

## Goal completo

Refactorizar el modelo de cálculo y delimitación de semanas de la aplicación (`lib/utils/fecha.ts`) para que las semanas sigan un ciclo de Lunes a Domingo:

1. **Unidad operativa:** Cada semana comprende 7 días continuos de Lunes a Domingo.
2. **Asignación por Lunes de Inicio:** Toda la semana de 7 días (Lunes a Domingo) pertenece al mes calendario (`YYYY-MM`) donde cae su Lunes de inicio.
3. **Estructura de Semanas ($S1 \dots S5$):**
   - $S1$: Del día 1 del mes al primer Domingo del mes.
   - $S2 \dots S4$: Bloques de Lunes a Domingo (2º, 3º y 4º Lunes).
   - $S5$: Bloque a partir del 5º Lunes del mes (si el mes calendario tiene 5º Lunes).
4. **Verificación de Fecha Actual (27 de Julio de 2026):** Al ser Lunes 27 de Julio de 2026 (el 4º Lunes del mes de Julio), la semana activa se evalúa automáticamente como **`S5`** (`Julio S5`).
5. **Determinismo Server-Side (`I-01`/`I-02`):** El cálculo se realiza server-side utilizando hora Colombia (`America/Bogota`).

## Definition of Done

- [x] `semanaActual()` y `semanaDeFechaEnMes()` evalúan `2026-07-27` como `"S5"`.
- [x] `semanasDeMes("2026-07")` retorna `["S1", "S2", "S3", "S4", "S5"]`.
- [x] `GET /api/mes/2026-07/semana/S5` responde correctamente con datos de semana válida.
- [x] Script de prueba en `scratch/verify-fecha.ts` valida las fechas de Julio 2026 con resultado limpio.
- [x] `tsc --noEmit` pasa sin errores.
- [x] Cambios preparados en rama `dev` para PR contra `main` — sin mergear.

## Contexto / diagnóstico previo

Acordado en sesión de diseño (27 jul 2026): la unidad operativa real del hogar para Angie es la semana de Lunes a Domingo. El modelo de días fijos (`1-7`, `8-14`, `15-21`, `22-28`) dejaba la 5ta semana desalineada con los días reales de recarga y los cierres dominicales.

## Commit de cierre

Pendiente de git commit en rama `dev`.

## Notas de ejecución

1. Refactorizado `lib/utils/fecha.ts`: implementada función `obtenerLunesDelMes(year, month)` para calcular dinámicamente los cortes de semanas de Lunes a Domingo.
2. `semanaDeFechaEnMes` y `semanaActual` actualizadas para usar el nuevo cálculo.
3. `app/api/mes/[mes]/semana/[semana]/route.ts` y `components/MesM1Desktop.tsx` migrados para consumir la función centralizada en `fecha.ts`.
4. Ejecutada verificación con `scratch/verify-fecha.ts` confirmando que el 27 de julio de 2026 evalúa como `S5`.
5. Ejecutado `tsc --noEmit` con resultado limpio de compilación (0 errores de TypeScript).
