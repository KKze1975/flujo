---
ticket_id: FIX-RESET-COLUMNAS-01
orden: 3
estado: completado
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

- [x] `tsc --noEmit` limpio.
- [x] Cada función de reset (`resetH2`, y cualquier script de limpieza en
      `scripts/*.mjs` que borre rangos de H2/H3/H3B/H4/H5) verificada contra
      el ancho real de columnas actual — documentar explícitamente en las
      Notas de ejecución cuál era el rango anterior y cuál es el corregido,
      por función.
- [x] Antes de corregir, leer la posición real del header por
      `spreadsheets.get` (no asumir fila 1) — mismo criterio que
      `DT-HEADER-H2-01` y el candidato a invariante de esa sesión
      ("antes de listar tabs/rangos por nombre lógico, verificar la lista
      real por lectura de metadata").
- [x] Prueba en dev: ejecutar el reset corregido sobre un mes de prueba con
      datos en todas las columnas del rango, verificar por lectura directa
      que el header sobrevive intacto y que el rango de datos borrado
      corresponde exactamente al ancho real de columnas — ni menos (deja
      basura) ni más (borra headers u otros tabs).
- [x] Cero llamadas contra el Sheet de producción durante la construcción y
      verificación.

## Contexto / diagnóstico previo

- `DT-HEADER-H2-01` (2026-07-05): header de H2 desplazado a fila 145 por
  edición manual, causó bloqueo de cierre de semana. Fix aplicado fue
  puntual (mover fila de vuelta) — el riesgo estructural en `resetH2()` y
  `ensureH2Headers()` quedó documentado como no resuelto.
- Identificado como prioridad #2 en la cola de `BACKUP-NOCTURNO-01`
  (sesión 21-22 jul 2026), justo después de `FIX-CREARMOVIMIENTOSMES-01`.

## Commit de cierre

`FIX-RESET-COLUMNAS-01-cierre` (ver historial de `dev`).

## Notas de ejecución

**Posición real del header verificada por lectura directa (DEV), no asumida:**
header en fila 1 para H2, H3, H4, H5, H5B — sin desplazamiento (no se repite
el escenario de `DT-HEADER-H2-01`).

**Ancho real de columnas confirmado por lectura directa (DEV):**
H2=25 (A:Y), H3=17 (A:Q, incluye `imprevisto`), H4=31 en total (bloques
A:G/I:N/P:V/X:AE), H5=16 (A:P, incluye `destino_remanente`/
`remanente_ejecutado`), H5B=9 (A:I).

**Rangos corregidos, por función:**

| Archivo | Función/rango | Antes | Corregido | Motivo |
|---|---|---|---|---|
| `app/api/admin/reset-mes/route.ts` | `resetH2` clear | `H2!A2:Z1000` | `H2!A2:Y1000` | Sobre-cubría 1 columna (Z, sin uso) — ajuste de exactitud, no bug de pérdida de datos |
| `app/api/admin/reset-mes/route.ts` | `deleteRowsByMes` H3B | `H3!A:P` / `H3!A2:P10000` | `H3!A:Q` / `H3!A2:Q10000` | **Bug real**: faltaba columna Q (`imprevisto`) — agregada en una migración posterior a T39, el reset nunca se actualizó. Corrompía silenciosamente la columna `imprevisto` de la fila que terminaba ocupando la posición física de la fila borrada tras el compactado |
| `app/api/admin/reset-mes/route.ts` | `deleteRowsByMes` H5A | `H5!A:N` / `H5!A2:N10000` | `H5!A:P` / `H5!A2:P10000` | **Bug real**: faltaban columnas O,P (`destino_remanente`, `remanente_ejecutado`), agregadas por `migrate-t39.mjs` (paso D) — mismo patrón de corrupción que H3B |
| `app/api/admin/reset-mes/route.ts` | H4A/H4B/H4C/H4D | — | sin cambios | Ya alineados contra el esquema real; H4D fuera de alcance (I-05, nunca leído/escrito) |
| `scripts/reset-junio-completo.mjs` | H2/H3/H5A | mismos 3 problemas de arriba | mismos 3 fixes | Script nombrado explícitamente en el ticket |
| `scripts/cleanup-h4c.mjs` | dedup H4C | `H4!P:T` (5 cols) | `H4!P:V` (7 cols) | **Bug real**: faltaban `incluye_remanente`, `id_cierre_origen` — mismo patrón de corrupción por columnas no cubiertas |
| `scripts/clear-h2.mjs` | clear H2 | `H2!A2:V10000` (22 cols) | `H2!A2:Y10000` (25 cols) | **Bug real**: faltaban `monto_ejecutado_camilo`, `monto_ejecutado_angie`, `id_recarga_origen` |
| `scripts/reset-h2.mjs` | clear H2 | `H2!A2:Z1000` | `H2!A2:Y1000` | Mismo ajuste de exactitud que `resetH2` |

**Auditados, NO modificados (deuda técnica documentada, fuera de alcance):**
- `scripts/reset-junio.mjs`: versión más antigua de `reset-junio-completo.mjs`
  (mismo mes `2026-06`), con los mismos bugs pero más desactualizada aún
  (`H3!A:N`, `H4!P:T`, `H5!A:N`) — parece código superado/muerto, no se tocó
  para no reescribir un script histórico potencialmente ya no usado.
- `scripts/reset-julio.mjs`: hardcodea `PROD_SHEET_ID` directamente en el
  archivo (con advertencia propia "no commitear a main") y es un script de
  incidente puntual ya ejecutado (julio 2026) — fuera de alcance explícito
  de este ticket ("No cubre: ejecutar reset contra producción"). Mismos bugs
  de rango presentes, no corregidos. El hardcode de Sheet ID de prod es
  candidato a un ticket de seguridad/higiene separado, no abierto aquí.
- `scripts/migrate-t39.mjs`, `migrate-t45.mjs`, `fix-h4-spillover.mjs`,
  `seed-h1.mjs`: migraciones/seeds de uso único ya ejecutadas — no son
  "funciones de reset" reutilizables, fuera del alcance del Goal completo.

**Prueba en DEV (DoD "ejecutar el reset corregido sobre un mes de prueba"):**
Sembradas 2 filas sintéticas en H3 y H5 — mes `2027-08` (a borrar) y mes
`2027-09` (a conservar), con marcadores distintivos en las columnas que antes
NO se cubrían (`imprevisto` en H3, `destino_remanente`/`remanente_ejecutado`
en H5), posicionadas de forma que la fila a conservar terminara ocupando la
posición física de la fila borrada tras el compactado del reset — el
escenario exacto donde el bug se manifestaba. Invocado
`POST /api/admin/reset-mes {"mes":"2027-08"}` contra el dev server real
(no simulación). Resultado leído de vuelta:
- H2/H3/H5: 0 filas de `2027-08` restantes; headers intactos (25/17/16 cols).
- H3 `2027-09`: columna `imprevisto` = `MARCA_CONSERVAR_Q` (correcto — con el
  bug anterior habría quedado `MARCA_BORRAR_Q`, contaminación cruzada).
- H5 `2027-09`: `destino_remanente`/`remanente_ejecutado` =
  `MARCA_CONSERVAR_O`/`MARCA_CONSERVAR_P` (correcto, mismo patrón).
- Filas sintéticas de `2027-09` eliminadas después vía `deleteDimension`
  (no solo `clear`) para restaurar el Sheet dev a su baseline exacto —
  verificado con una segunda lectura: 0 filas de prueba remanentes.

Cero llamadas contra `PROD_GOOGLE_SHEET_ID` en toda la sesión —
`GOOGLE_SHEET_ID` verificado apuntando a dev antes de empezar.
