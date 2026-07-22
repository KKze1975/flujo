---
ticket_id: FIX-CREARMOVIMIENTOSMES-01
orden: 2
estado: aprobado
tier: A
dependencias: ninguna
---

# FIX-CREARMOVIMIENTOSMES-01 — Migrar `crearMovimientosMes` de `values.append` a escritura determinística

## Goal completo

`crearMovimientosMes` (`lib/data/sheets.ts:270-283`) usa
`spreadsheets.values.append` con `valueInputOption: "RAW"`, **sin**
`insertDataOption: "INSERT_ROWS"`. Este patrón ya sobrescribió 67 filas
reales de septiembre en el Sheet de dev (descubierto durante
`TICKET-B-GUARDIA-01`, commit `6f3dcb0`) en vez de agregarlas al final.
La misma función corre también en producción (rutas `iniciar` y
`mover_mes_siguiente`) — el riesgo de pérdida/corrupción silenciosa de
filas históricas de `H2` está confirmado en dev y no descartado en prod.

Migrar la función a un patrón determinístico: calcular la próxima fila
libre por lectura (`values.get`) y escribir con `values.update` /
`batchUpdate` sobre un rango explícito, en vez de depender del
comportamiento de `append` (que decide él solo dónde insertar y ya
demostró no ser confiable en este código base).

**No cubre:**
- Los otros métodos con el mismo patrón estructural (`createConcepto`,
  `createIngresoCamilo/Angie`, `createCierreSemana`, `createPlanSemana`
  — Hallazgo 9 de `audit-adversarial-01`). Mismo riesgo, alcance
  separado — no tocar en este ticket para no mezclar blast radius.
- Cualquier escritura o prueba contra el Sheet de **producción**. Toda
  verificación de este ticket ocurre exclusivamente contra el Sheet de
  dev (`GOOGLE_SHEET_ID` de `.env.local` apuntando a dev).
- Merge a `main` sin aprobación explícita de Camilo (I-11: `main`
  protegido, todo cambio vía PR revisado).

## Definition of Done

- [ ] `tsc --noEmit` limpio.
- [ ] `crearMovimientosMes` ya no llama `spreadsheets.values.append` —
      usa `values.get` (para determinar la próxima fila libre de `H2`) +
      `values.update` (rango explícito `H2!A{fila}:Y{fila+n}`) o
      `batchUpdate` equivalente.
- [ ] Caso de prueba que reproduce el escenario original del bug:
      invocar `crearMovimientosMes` con datos que antes gatillaban
      sobrescritura (filas ya existentes en el rango objetivo) y
      verificar **por lectura directa** del Sheet dev que las filas
      previas siguen intactas y las nuevas se agregaron al final — no
      solo confiar en el código de respuesta HTTP (Verification
      Honesty, `CLAUDE.md`).
- [ ] Conteo de filas de `H2` en dev, antes y después de la prueba,
      documentado explícitamente (nunca debe bajar, solo puede subir en
      exactamente el número de movimientos creados).
- [ ] Cero llamadas contra el Sheet de producción durante toda la
      construcción y verificación de este ticket — verificable por
      lectura del código y por confirmar qué `spreadsheetId` usó cada
      llamada en la sesión.
- [ ] `git log --all -p -- lib/data/sheets.ts` revisado una vez más
      antes de cerrar, para confirmar que ningún intento previo dejó
      código a medio migrar en alguna rama (el intento "away" anterior
      se verificó como nunca construido — `NUNCA CONSTRUIDO`,
      confirmado 9 jul 2026 — pero es barato reconfirmar antes de
      empezar).

## Contexto / diagnóstico previo

- Descubierto: `TICKET-B-GUARDIA-01`, sobrescritura real de 67 filas de
  septiembre en Sheet dev (no producto de la guardia — bug
  preexistente).
- Aprobado para construir y lanzado en modo "away" en sesión previa —
  **verificado el 9 jul 2026 que nunca se construyó de verdad**: único
  rastro es el commit que lo descubre, sin rama ni PR de fix desde
  entonces. Código en `lib/data/sheets.ts:270-283` confirma el patrón
  defectuoso sigue vigente.
- Reclasificado como ticket de construcción prioritario en
  `BLOQUEANTE-0` (11 jul 2026), por delante de `FIX-RESET-COLUMNAS-01`
  — tiene incidente histórico confirmado y ausencia de seguimiento
  documentada dos veces.
- Candidato a invariante `INVARIANTS.md` (I-16, no promovido todavía):
  prohibir `values.append` sin `INSERT_ROWS` como patrón de escritura en
  todo el código base.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda
técnica encontrada, criterios de parada activados)
