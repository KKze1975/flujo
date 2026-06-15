# SESSION_LOG — BL-11 · 15 junio 2026

## Hallazgos pre-construcción

- `getRecargasAngie` NO existe en lib/data/sheets.ts ni en IDataProvider —
  graphify tenía una referencia fantasma. RecargaAngie type existe en types.ts
  pero sin implementación en la capa de datos.
- H4D (recargas reales Angie) no es implementable en BL-11 sin trabajo mayor.
  Decisión: usar H4B (getIngresosAngie) para remanenteAngie y aportePlaneado.
  Fuente: mismo cálculo que ModalCerrarSemana usaba antes.
  Deuda técnica: la diferencia H4B vs H4D puede generar discrepancias cuando
  el aporte real difiere del planeado.

## Auditoría cerrar-semana por campo H5A

| Campo | Cat | Acción |
|-------|-----|--------|
| totalPresupuestado | A | no tocar |
| totalEjecutado | C | agregar consumos H3B |
| desviacionTotal | A | no tocar |
| remanenteAngie | B | mover al servidor: H4B_semana - H3B_fuenteAngie_semana |
| ubicacionRemanenteAngie | B | hardcodear "nu_angie" |
| conceptosPospuestos | A | no tocar |
| conceptosNoAplica | A | no tocar |
| gastosSinClasificar | A | no tocar |
| cerradoPor | B | hardcodear "camilo" |
| fechaCierre | A | no tocar |
| destinoRemanente | C | cambiar null → "carry_over" |
| notas | B | null por defecto |

## Piezas completadas

- P1: remanenteAngie + aportePlaneado en response de GET /semana/[semana] — commit d76ce3e
- P2: cerrar-semana sin inputs manuales, cálculos en servidor — commit da59686
- P3: bloque cierre inline en VistaSemanal (page.tsx sin cambios) — commit 0d68724

## Decisiones tomadas

- H4B como fuente de remanenteAngie (no H4D): H4D no implementado en data layer.
  Documentado como deuda técnica.
- ubicacionRemanenteAngie hardcodeada como "nu_angie" — ubicación más probable
  del saldo de Angie. Sin selección del usuario.
- destinoRemanente cambia de null a "carry_over" — diseño BL-11.
- totalEjecutado en cerrar-semana incluye H3B a partir de este ticket.
- Bloque cierre visible para semanaVisible <= semanaActivaMes (guarda seguridad).

## Deuda técnica encontrada

- H4D recargas Angie: tipo existe (RecargaAngie), sin implementación en
  IDataProvider ni SheetsDataProvider. remanenteAngie usa H4B como proxy.
  Cuando H4D se implemente, remanenteAngie debería actualizarse.
- I-05 parece desactualizado: menciona H4D como "tab legacy" pero el diseño
  actual usa H4D (rango dentro del tab H4) como fuente de verdad de recargas.

## DoD verificado

- [x] 1. Bloque cierre debajo del selector de semanas.
- [x] 2. Línea informativa con remanenteAngie y aportePlaneado correctos.
- [x] 3. Tap en botón ejecuta POST cerrar-semana sin modal.
- [x] 4. Post-cierre: botón reemplazado por "Semana cerrada ✓".
- [x] 5. Si semana ya tiene cierre: muestra "Semana cerrada ✓" directamente.
- [ ] 6. Campos H5A correctos en /admin/trazabilidad. — QA manual en preview
- [x] 7. remanenteAngie y aportePlaneado calculados en servidor.
- [x] 8. tsc limpio en cada pieza.
- [ ] 9. Verificado en preview URL. — pendiente deploy Vercel

## Criterios de parada activados

- Ninguno.
