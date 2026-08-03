---
ticket_id: AUDIT-SEMANA-STUB-01
orden: 25
estado: completado
tier: C
dependencias: FIX-SEMANA-STUB-01
---

# AUDIT-SEMANA-STUB-01 — Auditar y corregir escrituras del 3-ago-2026 con semana incorrecta

## Goal completo

`semanaActual()` devolvió `"S2"` en vez de `"S1"` durante toda la ventana entre el deploy de
`cc51db9` (29-jul-2026) y el fix de `FIX-SEMANA-STUB-01`, para cualquier fecha real dentro del
1-7 de agosto de 2026 (mes que empieza en sábado). Dos rutas de escritura usan `semanaActual()`
directamente y pueden haber persistido `semana: "S2"` donde correspondía `"S1"`:

- `app/api/registro/sin-concepto/route.ts:83` (tab `H3`, registro rápido sin concepto).
- `app/api/cron/uber-parser/route.ts:107` (usa `semanaDeFechaEnMes()` directo — afectado también
  si corrió sobre un correo con fecha 1-2 ago, aunque por una ruta de código distinta, ver
  `DT-CICLO-OPERATIVO-UNIFICADO-01`).

Este ticket es de **escritura sobre Sheet de producción/dev en filas ya existentes** — por
`tickets/INDICE.md` eso es Tier C: manual, sin `/goal-a`, y solo hasta que exista backup de
prod verificado (`BACKUP-NOCTURNO-01` sigue `pendiente_confirmacion_humana`).

## Definition of Done

- [x] Lectura (no escritura) de H3 en el Sheet dev y prod correspondiente, filtrando filas con
      `fecha` entre 2026-08-01 y 2026-08-03. Skill `sheet-safety` invocada antes de leer; target
      declarado explícitamente en cada lectura (DEV y luego PROD).
  - [x] Evidencia pegada:
        - **DEV** (`1p5hvKINy512I-BOEA5ujjynUnJVdnvniAiqCQTYDJ-w`): 93 filas totales en H3,
          **0 filas** con `fecha` en la ventana 2026-08-01..03.
        - **PROD** (`1GOMhxYw_f7Zl-GTVNtxAs9218x4vKxzg3LGRyveyr7A`): 118 filas totales en H3,
          **3 filas** con `fecha=2026-08-02`, las tres ya correctamente etiquetadas
          `mes=2026-07, semana=S5` (la regla de cierre de fin de semana de `cc51db9` sí las
          capturó bien — `id_consumo`: `CONSUMO_1785680742224`, `CONSUMO_1785704808580`,
          `CONSUMO_1785704895063`). **Ninguna fila con `fecha=2026-08-03`** (hoy) todavía —
          la ventana exacta donde `semanaActual()` devolvía `"S2"` no tiene escrituras reales.
- [x] No se encontraron filas afectadas → cierra como `completado` sin cambios de datos.

**Nota de alcance para futuras auditorías similares**: esta búsqueda cubrió `H3` (registro
manual sin concepto + parser de Uber, ambos escriben ahí). No cubrió H2 (movimientos) porque
ningún endpoint que persiste en H2 usa `semanaActual()`/`semanaDeFechaEnMes()` sin pasar por un
valor explícito del usuario o de `cerrar-semana` — confirmado por grep de call sites en
`FIX-SEMANA-STUB-01`.

## Contexto / diagnóstico previo

Ver `FIX-SEMANA-STUB-01` para el diagnóstico de causa raíz. Este ticket es puramente sobre el
**impacto en datos ya escritos**, no sobre el código.

## Commit de cierre
`8fc72c5` (dev)

## Notas de ejecución
(vacío)
