---
ticket_id: FIX-RESET-COLUMNAS-01
orden: 3
estado: aprobado
tier: A
dependencias: ninguna
---

# FIX-RESET-COLUMNAS-01 — Corregir rangos de columnas desalineados en funciones de reset

## Goal completo

Las funciones de reset del Sheet (`resetH2` en `app/api/admin/reset-mes/route.ts`,
y las rutinas equivalentes de limpieza usadas en scripts como
`reset-junio-completo.mjs`) asumen rangos de columna fijos que ya no
corresponden al esquema real tras las migraciones de esquema de T39/T40 y el
incidente `DT-HEADER-H2-01` (header de H2 desplazado a fila 145, resuelto
2026-07-05). El riesgo documentado: `resetH2()` borra el rango `2:1000` con el
supuesto de que el header vive en fila 1 de forma hardcodeada — si ese supuesto
falla (como ya ocurrió una vez por edición manual del Sheet), el reset puede
borrar el header en lugar de solo los datos, o dejar columnas fuera del rango
borrado.

Auditar cada función de reset contra el esquema real de columnas por tab
(H1, H2, H3, H3B, H4A/B/C, H5A/B) y corregir cualquier rango que no cubra el
ancho completo de columnas actuales, o que asuma una posición de header sin
verificarla dinámicamente.

**No cubre:**
- Ejecutar ningún reset contra el Sheet de producción — verificación exclusiva
  contra Sheet de dev.
- Rediseñar el mecanismo de reset (seguirá siendo destructivo por diseño,
  usado para limpiar meses de prueba) — solo corregir los rangos.
- El riesgo ya documentado de `ensureH2Headers()` sobrescribiendo el header si
  se invoca con el header en posición incorrecta — ese es alcance de un
  ticket separado (candidato: `FIX-ENSUREHEADERS-DINAMICO-01`, no creado aún).

## Definition of Done

- [ ] `tsc --noEmit` limpio.
- [ ] Cada función de reset (`resetH2`, y cualquier script de limpieza en
      `scripts/*.mjs` que borre rangos de H2/H3/H3B/H4/H5) verificada contra
      el ancho real de columnas actual — documentar explícitamente en las
      Notas de ejecución cuál era el rango anterior y cuál es el corregido,
      por función.
- [ ] Antes de corregir, leer la posición real del header por
      `spreadsheets.get` (no asumir fila 1) — mismo criterio que
      `DT-HEADER-H2-01` y el candidato a invariante de esa sesión
      ("antes de listar tabs/rangos por nombre lógico, verificar la lista
      real por lectura de metadata").
- [ ] Prueba en dev: ejecutar el reset corregido sobre un mes de prueba con
      datos en todas las columnas del rango, verificar por lectura directa
      que el header sobrevive intacto y que el rango de datos borrado
      corresponde exactamente al ancho real de columnas — ni menos (deja
      basura) ni más (borra headers u otros tabs).
- [ ] Cero llamadas contra el Sheet de producción durante la construcción y
      verificación.

## Contexto / diagnóstico previo

- `DT-HEADER-H2-01` (2026-07-05): header de H2 desplazado a fila 145 por
  edición manual, causó bloqueo de cierre de semana. Fix aplicado fue
  puntual (mover fila de vuelta) — el riesgo estructural en `resetH2()` y
  `ensureH2Headers()` quedó documentado como no resuelto.
- Identificado como prioridad #2 en la cola de `BACKUP-NOCTURNO-01`
  (sesión 21-22 jul 2026), justo después de `FIX-CREARMOVIMIENTOSMES-01`.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda técnica
encontrada, criterios de parada activados)
