---
ticket_id: FIX-CREARMOVIMIENTOSMES-01
orden: 2
estado: completado
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

Este mismo commit — mensaje `FIX-CREARMOVIMIENTOSMES-01-cierre: DoD verificado`.

## Notas de ejecución

**Fix aplicado** (`lib/data/sheets.ts`, `crearMovimientosMes`): reemplaza
`spreadsheets.values.append` (sin `INSERT_ROWS`, comportamiento no
determinístico) por `values.get` sobre `H2!A:A` para calcular la próxima
fila libre (`existing.data.values.length + 1`) seguido de `values.update`
con rango explícito `H2!A{nextRow}` — mismo patrón ya usado por
`ensureH2Headers` (cell top-left, la API expande según el shape del
array de valores).

**Verificación previa (anchor-guard, antes de escribir):**
- `GOOGLE_SHEET_ID` de `.env.local` confirmado apuntando a dev
  (`1p5hvKINy...`), nunca a producción, en toda la sesión.
- Esquema real de H2 dev leído antes de tocar código: 262 filas totales
  (1 header + 261 datos), header de 25 columnas (`A:Y`) coincide
  exactamente con `H2_HEADERS` del código — sin drift de esquema.
- `git log --all -p -- lib/data/sheets.ts`: cero apariciones de
  `INSERT_ROWS` en todo el historial de todas las ramas (`dev`, `main`,
  `fix/dt-posponer-estado-01`) — confirma que el bug nunca se migró
  parcialmente en ningún intento anterior. El commit de descubrimiento
  original (`6f3dcb0`) es solo documentación de sesión, no código.

**Caso de prueba (reproduce el escenario original — dos invocaciones
consecutivas de `crearMovimientosMes`, vía el endpoint real
`POST /api/mes/[mes]/iniciar` contra dev, sin mocks):**

| Paso | Filas H2 antes | Filas H2 después | Δ | Verificado por |
|---|---:|---:|---:|---|
| Baseline | — | 262 | — | lectura directa `values.get H2!A:Y` |
| `iniciar 2027-01` (mes de prueba, sin datos previos) | 262 | 331 | +69 | lectura directa — fila 262 (última previa) byte-a-byte intacta; fila 263 primera fila nueva, `mes=2027-01` |
| `iniciar 2027-02` (segunda invocación inmediata) | 331 | 399 | +68 | lectura directa — fila 262 y fila 331 (frontera de la primera llamada) siguen intactas; 398 IDs únicos para 398 filas de datos, cero duplicados |

Ninguna fila previa se sobrescribió en ninguna de las dos invocaciones —
la asignación de fila es determinística (lectura fresca del conteo real
antes de cada escritura), a diferencia de `append` que decidía la
posición internamente.

**Limpieza post-prueba:** las 137 filas sintéticas de `2027-01`/`2027-02`
se borraron con `batchUpdate`/`deleteDimension` (mismo mecanismo ya
usado y verificado en `BACKUP-NOCTURNO-01` para limpiar tabs de prueba).
H2 dev quedó restaurado a 262 filas, última fila verificada
byte-a-byte idéntica a la baseline original.

**Cero llamadas contra producción** en toda la sesión — confirmado por
uso exclusivo de `GOOGLE_SHEET_ID` (dev) en el servidor de desarrollo y
en los scripts de verificación puntual (borrados al terminar, no
commiteados).

**Deuda técnica NO tocada, documentada como fuera de alcance (ya
declarada en el Goal):** `createConcepto`, `createIngresoCamilo/Angie`,
`createCierreSemana`, `createPlanSemana` siguen usando `values.append`
sin `INSERT_ROWS` (Hallazgo 9, `audit-adversarial-01`) — mismo riesgo
estructural, ticket separado si se decide abordarlo.

**Candidato a invariante I-16** (`INVARIANTS.md`, ya registrado como
candidato): este fix es evidencia adicional a favor de promoverlo —
tema del ticket `INVARIANTS-GAP-01`, no de este.
