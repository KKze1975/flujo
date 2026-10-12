---
ticket_id: SEMANAS-VIERNES-01
orden: 49
estado: activo
tier: A
agente_ejecucion: claude-code
dependencias: BALANCE-UNIFICADO-01
actualizado_en: 2026-10-01
---
necesita_aprobacion: alta
halt_criterio: 3
---

# SEMANAS-VIERNES-01 — Las semanas del mes se definen por el mes de su viernes

## Goal completo

Decisión de Camilo (1 oct 2026): semana lunes-domingo; **el mes de una semana es el mes en que cae su
VIERNES**; S1, S2, S3... = primer, segundo, tercer viernes del mes. La cantidad de semanas de un mes =
cantidad de viernes del mes (4 o 5). Ejemplo: lun 28 sep - dom 4 oct tiene su viernes el 2 oct, es la
**S1 de octubre 2026**.

Alcance FINAL (decisión de Camilo, 1 oct 2026): SOLO la regla del viernes.
1. Regla nueva en la función única (`lib/utils/fecha.ts`, I-21). **No se reclasifica el historial
   anterior**: la regla nueva rige desde el mes `2026-09` (corte `MES_CORTE_VIERNES = "2026-09"`);
   meses <= `2026-08` conservan la regla vieja (agosto sigue con S5 = 31 ago, y sus filas).
2. Unificar las copias divergentes del cálculo semana/fecha (ver inventario) sobre `fecha.ts`, incluidos
   los fixes de `startsWith(mes)` en `semanaFromFecha` y `fix-semana-vacia-h2.mjs`.
3. **MIGRACIÓN DESCARTADA** por decisión de Camilo (1 oct 2026): no hay script de migración ni
   conciliación. Camilo ingresa a mano en octubre S1 los movimientos del 28-30 sep. Los archivos
   `migrar-semana-transicion-viernes.mjs`, `lib/conciliacion-viernes.mjs` y `simular-conciliacion-viernes.ts`
   se eliminaron con un commit nuevo (la historia previa los conserva).

**RIESGO EXPLÍCITO:** al regir la regla nueva, las filas de 2026-09 S5 (8 H2, 1 H3, 1 H4B, 1 H5B) quedan
fuera de las semanas de septiembre (mes != suma de semanas) hasta que Camilo las reingrese o retire a mano
en octubre S1. Por eso el DEPLOY a PROD debe ir DESPUÉS de que Camilo confirme que terminó la carga manual.

NO cubre: reescribir cierres H5A (ninguno existe para 2026-09 S5 ni 2026-10 S1; el último es
2026-09 S4), reclasificar meses <= 2026-08, el prompt de IA de `/api/registro/interpretar`
(`DT-INTERPRETAR-IA-SEMANA-01`), ni `DT-CICLO-OPERATIVO-UNIFICADO-01` fuera de `mesDeFecha`/uber-parser.

## Inventario de superficies (grep exhaustivo, 1 oct 2026)

- Núcleo `lib/utils/fecha.ts`: `cicloOperativo` (+ parche puntual 31-ago + cola de mes anterior),
  `semanasDeMes`, `semanaDeFechaEnMes`, `mesDeFecha`, `semanaActual`, `mesActual`, `semanaActivaDeMes`,
  `mesTieneSemana5`, `duracionSemana5`, `semanaSiguienteDe`, `obtenerLunesDelMes`, `stubAbsorbidoPorMesAnterior`.
- Servidor que llama a `fecha.ts` (14): `app/page.tsx`, `app/meses/page.tsx`, `app/mes/[mes]/semana/page.tsx`,
  api `cron/uber-parser`, `consumos/[id]/clasificar`, `registro/sin-concepto`, `mes/[mes]/cerrar-semana`,
  `mes/[mes]/consumos/[semana]`, `mes/[mes]/iniciar`, `mes/[mes]/movimientos/[id]`, `mes/[mes]/semana/[semana]`,
  `meses`, `ingresos/angie/[mes]`, `ingresos/adicionales/[mes]`.
- Cliente que llama a `fecha.ts` (9): `MesM1`, `MesM1Desktop`, `MesM1Mobile`, `VistaSemanal`, `ModalAporteAngie`,
  `ModalCerrarSemana`, `m1/VistaPlanificacion`, `m1/ConceptoBoard`, `m4/RegistroRapido`.
- Copias divergentes (violan I-21, usan días fijos 1-7/8-14/15-21/22-28/29+): `semanaDates` x4 (`MesM1`,
  `MesM1Desktop`, `MesM1Mobile`, `ConceptoBoard`), `SEMANA_FECHAS` (`ModalAporteAngie`), `getActiveSemana` x3
  (`MesM1Desktop`, `MesM1Mobile`, `ConceptoBoard`), `diasParaCerrar` (`MesM1Mobile`), `diasRestantes`
  (`HomeHub`), `fechaDefaultSemana` x2 (api `ingresos/angie`, `ingresos/adicionales`).
- Scripts: `scripts/verificar-ciclo-semanas.ts` (prueba de la regla, a reescribir), `fix-semana-vacia-h2.mjs`,
  `verificar-balance-cuadre.ts` (usan `semanasDeMes`/`semanaDeFechaEnMes`).
- Datos que dependen de la regla: H2 (`mes`,`semana`), H3 (`mes`,`semana`), H4B (`mes`,`semana`,`fecha`),
  H5A/H5B (`mes`,`semana`), H11 (`mes`,`semana`,`fecha`). H4A/H4C no llevan semana.

## Definition of Done
- [ ] `fecha.ts` implementa la regla del viernes desde 2026-09; meses <= 2026-08 con regla vieja. Prueba
      `verificar-ciclo-semanas.ts` cubre: 28 sep-4 oct = 2026-10 S1; sep 2026 = 4 semanas; oct 2026 = 5;
      nov 2026 = 4 (30 nov -> dic S1); dic 2026 = 4 (28 dic-3 ene -> 2027-01 S1); ago 2026 = 5 (legacy).
- [ ] Ninguna copia divergente queda: `grep` de `29–`, `d <= 7`, `endDay`, `fechaDefaultSemana` local = 0.
- [ ] `tsc --noEmit` limpio; `verificar-balance-cuadre.ts` sigue verde.
- [ ] Sin referencias a los scripts de migración eliminados (fuera de la historia en ESTADO.md).
- [ ] (HALT, Camilo) Camilo confirma que terminó la carga manual de octubre S1 ANTES del deploy a PROD.
- [ ] (HALT, Camilo/Angie) QA de Angie (I-17) y merge por PR dev -> main (I-11); deploy después de la carga manual.

## Contexto / diagnóstico previo
Diagnóstico PROD solo lectura, 1 oct 2026 (ver ESTADO.md): 11 filas en 2026-09 S5 (H2 8, H3 1, H4B 1, H5B 1)
que Camilo gestiona a mano (migración descartada).

## Commit de cierre
(vacío hasta completar)

## Notas de ejecución
1 oct 2026: la migración pasó de 'cambiar celdas mes/semana' a CONCILIACION (decision de Camilo: sep S5 reemplaza, no duplica, a oct S1; H5B de sep S5 se retira). Commits 3a5f2e5, 78b0296, 739e21b, 7b59240. Coder Sonnet 145.364 + 173.416; Tester Sonnet 143.443 + re-Tester. HALT: aprobacion de la tabla fila a fila y decisiones H4B (oct|sep), filas S2 330/335 (revertir|retirar), pago unico de mesadas, consumo H3 posible duplicado. Detalle en ESTADO.md.

1 oct 2026 (final): migración/conciliación DESCARTADA por decisión de Camilo (carga manual en oct S1). Eliminados los 3 archivos de migración (commit 60e10cd). La rama queda solo con la regla del viernes. Deploy a PROD después de la carga manual.
