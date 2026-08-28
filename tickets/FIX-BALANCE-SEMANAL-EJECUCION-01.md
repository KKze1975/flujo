---
ticket_id: FIX-BALANCE-SEMANAL-EJECUCION-01
orden: 35
estado: completado
tier: B
agente_ejecucion: cualquiera
dependencias: ninguna
rol_activo: tester
paso_actual: "Verificación de Tester completa — veredicto CUMPLE, pendiente de que el Manager cierre el ticket"
actualizado_en: 2026-08-28T16:07:30-05:00
necesita_aprobacion: no
---

# FIX-BALANCE-SEMANAL-EJECUCION-01 — Unificar remanente semanal y corregir fórmula de la tab Ejecución

## Goal completo

Unificar el cálculo de "remanente encadenado por semana" en una única
función compartida — hoy duplicado en `components/MesM1Desktop.tsx:430-450`
(`balanceSemanas`, tab Ejecución) y `components/MesM1Desktop.tsx:480-504`
(`balancePlanificacion`, tab Planificación) — y cambiar la fórmula de la
tab Ejecución para que cada semana reste `comprometido_restante +
ejecutado_real` en vez de solo `ejecutado`, donde:

- `ejecutado_real` = lo mismo que hoy usa `balanceSemanas` línea 445
  (`ejecutadoH2 + gastoH3PorSemana[s]`).
- `comprometido_restante` = la porción de `comprometido` de esa semana que
  todavía **no** está marcada/contabilizada como ejecutada.

Con esto, el número converge al comprometido total cuando el gasto real
coincide con lo presupuestado, pero refleja correctamente una desviación
(gastar más o menos de lo planificado) — decisión de producto de Camilo,
resuelve el HALT del diagnóstico previo.

La tab **Planificación** (`balancePlanificacion`, líneas 480-504) **no
cambia de comportamiento** — sigue restando `comprometido` completo por
semana, cero regresión, mismo output que hoy.

**Explícitamente fuera de alcance** (candidatos a ticket aparte, no
construir aquí):
- El gate de saldos asimétrico entre desktop y mobile: `MesM1Desktop.tsx:542-548`
  exige `saldosOk` antes de pasar a la tab Ejecución (abre
  `ModalConfirmarSaldos` si falta); `MesM1Mobile.tsx:243` no tiene ningún
  gate equivalente. Hallazgo secundario del diagnóstico, no la causa del
  bug de este ticket.
- El código muerto en `components/MesM1.tsx` y
  `components/m1/VistaPlanificacion.tsx` — nadie los importa fuera de sí
  mismos, contienen una tercera copia divergente de la misma lógica de
  remanente, pero no forman parte del path activo (`/mes/[mes]` →
  `MesM1ClientWrapper.tsx` → `MesM1Desktop.tsx`/`MesM1Mobile.tsx`).
- `disponiblePorCuenta()` (`MesM1Desktop.tsx:391-401`, el bloque de
  `SaldoCuenta`/H4C) — ya está correcto, no tiene el bug, no tocar.

## Definition of Done

- [ ] Existe una única función compartida (nueva, en `lib/` o donde el
      Coder decida que encaje mejor con el patrón ya establecido del
      proyecto) que calcula el remanente encadenado por semana,
      parametrizada por qué restar en cada iteración; ambas tabs de
      `MesM1Desktop.tsx` la consumen en vez de reimplementar el loop cada
      una por su lado.
- [ ] Tab Planificación: mismo output numérico que antes del cambio,
      verificado con el mismo mes/dataset antes y después del refactor.
- [ ] Tab Ejecución: para una semana con ejecución parcial, el remanente
      resta `comprometido_restante + ejecutado_real` — verificado con un
      caso real o sintético donde el gasto ejecutado difiere del
      comprometido, mostrando que el resultado ya no es "casi todo el
      ingreso sin tocar" (el defecto original reportado por Camilo: +20M
      de superávit acumulado en Ejecución frente a -11M de déficit real en
      Planificación semana 2, con casi nada ejecutado en el momento del
      reporte).
- [ ] `tsc --noEmit` limpio.
- [ ] No se modificó `disponiblePorCuenta()` (`MesM1Desktop.tsx:391-401`)
      — ese bloque ya está correcto, prueba de regresión explícita de que
      el saldo de cuenta mostrado no cambia.

## Contexto / diagnóstico previo

Diagnóstico Tier B ya cerrado (rol Diagnóstico, sesión previa, evidencia
directa de código, no hipótesis). HALT de producto ya resuelto por Camilo
(ver Goal completo) — este ticket entra directo `aprobado`, no
`propuesto` ni `diagnostico_listo`.

**Path activo confirmado (I-12):** `/mes/[mes]` → `MesM1ClientWrapper.tsx`
→ `MesM1Desktop.tsx` o `MesM1Mobile.tsx` según ancho de pantalla. El
toggle "Planificación/Ejecución" que muestra el bug es interno a
`components/MesM1Desktop.tsx` (`useState<"planificacion"|"ejecucion">`,
línea 337, botones en líneas 920-932).

**Causa raíz:** dos implementaciones independientes del mismo cálculo
("remanente encadenado por semana"), ambas arrancando de
`ingresoCamiloLocal.montoCop` (`lib/data/types.ts:146-154`), pero restando
cosas distintas:

- Tab **Planificación** — `balancePlanificacion`,
  `MesM1Desktop.tsx:480-504`. Cada semana resta `comprometido` (línea
  499): el presupuesto completo de la semana, se haya ejecutado o no.
- Tab **Ejecución** — `balanceSemanas`, `MesM1Desktop.tsx:430-450`. Cada
  semana resta `ejecutado` (línea 445): solo `ejecutadoH2 +
  gastoH3PorSemana[s]`, lo que ya está marcado como ejecutado en H2/H3B
  para esa semana.

Como el remanente se encadena semana a semana (`remanente = diferencia`,
líneas 449 y 503) y casi nada estaba ejecutado en el momento del reporte
de Camilo, la tab Ejecución mostraba un "superávit" acumulado (+20M) muy
alejado del déficit real de Planificación (-11M en semana 2) — no es que
uno esté numéricamente mal, es que ambas tabs miden cosas conceptualmente
distintas bajo el mismo nombre/layout visual ("Por semana", líneas 778 y
855).

**Dato aparte, no la causa:** ninguna de las dos tabs usa `SaldoCuenta`
(H4C). El saldo de cuenta (10.4M→9.4M que Camilo confirmó) se calcula
correctamente en `disponiblePorCuenta()` (`MesM1Desktop.tsx:391-401`) —
ese bloque no tiene bug, no tocar (ver DoD).

**Candidato de invariante ya existente** — este es el tercer caso del
mismo patrón ya registrado como candidato en `INVARIANTS.md` bajo
"Cálculo de mes/semana operativos desde una única fuente de verdad"
(líneas ~159-171 de ese archivo, origen `FIX-SEMANA-STUB-01`): cálculos
derivados duplicados sin fuente única de verdad — antes con fecha/semana
operativa vía `cicloOperativo()` (`cc51db9`, `FIX-SEMANA-STUB-01`), ahora
con balance semanal (este ticket). No crear un candidato de invariante
nuevo — este ticket es evidencia adicional a favor de promover el
existente, referenciarlo tal cual.

## Commit de cierre
`ee02ba1` — "Unifica remanente semanal encadenado y corrige fórmula de Ejecución".
Tester verificó CUMPLE en el primer intento (0 reintentos); Manager cerró
el ticket con el bloque `metricas_agente` completo.

## Notas de ejecución

**Construcción terminada, pendiente de Tester.**

Función compartida nueva: `remanenteEncadenadoPorSemana` en
`lib/utils/balanceSemanal.ts` (nuevo archivo, mismo patrón que
`lib/utils/fecha.ts`). Recibe `semanas`, `ingresoInicial`, un callback
`aportePorSemana(semana)` y un callback `calcularPaso(semana,
remanenteEntrante, disponible) → { restar, extra }`; hace el loop de
encadenamiento (`disponible = remanente + aporteAngie`, `diferencia =
disponible - restar`, `remanente = diferencia` para la siguiente
iteración) una sola vez. Genérica en `Extra` para que cada tab adjunte
sus propios campos (`comprometido`, `ejecutado`, `pendiente`,
`isConfirmado`, etc.) sin que la función central los conozca.

`components/MesM1Desktop.tsx`:
- `balancePlanificacion` (antes líneas ~480-504) ahora arma su callback
  `calcularPaso` con exactamente el mismo cálculo de `comprometido` que
  tenía antes (copiado literal, sin tocar la fórmula) y lo pasa como
  `restar`. El objeto de salida por semana mapea uno a uno los mismos
  campos que consumía el render (`semana, remanente, aporteAngie,
  disponible, comprometido, diferencia`) — mismo nombre, misma semántica
  (`remanente` = remanente entrante, antes de sumar el aporte de esa
  semana), cero cambio de comportamiento.
- `balanceSemanas` (antes líneas ~430-450, tab Ejecución) ahora calcula
  en su callback: `ejecutadoReal` = igual que antes
  (`ejecutadoH2 + gastoH3PorSemana[s]`), y `comprometidoRestante` =
  `comprometido - comprometidoEjecutado`, donde `comprometidoEjecutado`
  es la suma de `montoPresupuestado` de los movimientos de esa semana ya
  marcados `estado === "ejecutado"` (mismo subconjunto `items` que ya
  usaba `comprometido`, para no introducir una asimetría nueva de
  filtrado semana/fecha). `restar = comprometidoRestante + ejecutadoReal`.
  El mapeo de salida preserva el nombre de campo `remanente` con la
  MISMA semántica que tenía el código viejo en este tab específicamente
  (`remanente: disponible`, es decir el remanente ya con el aporte de
  Angie sumado) — noté que las dos funciones viejas nombraban `remanente`
  con semántica distinta entre sí (una pre-aporte, otra post-aporte); en
  vez de unificar ese nombre (que habría exigido tocar el render/JSX,
  fuera de alcance), preservé la semántica de salida de cada tab tal
  cual estaba, y until unifiqué el loop interno de encadenamiento.

**Cómo verifiqué el DoD (verificación propia, no la final — eso lo hace
el Tester):**
1. Función compartida existe y ambas tabs la consumen: confirmado por
   lectura del diff — ninguna de las dos reimplementa el loop
   `remanente → disponible → diferencia → remanente` por su cuenta.
2. Planificación sin cambio de output: la expresión que calcula
   `comprometido` es copia literal de la versión anterior, sin tocar un
   carácter de la fórmula; el loop de encadenamiento es aritméticamente
   idéntico (mismo orden de operaciones). No hay corrida contra
   dataset real de Sheet en esta sesión (no hay test runner configurado,
   ver `CLAUDE.md`) — verificación por lectura de la fórmula, más un
   script aislado (`/tmp/.../scratchpad/verify_balance.mjs`, fuera del
   repo) que replica el mismo algoritmo con datos sintéticos y confirma
   que Planificación da el mismo resultado antes/después.
3. Ejecución con la fórmula nueva: mismo script sintético — semana con
   ejecución exacta al comprometido converge idéntico a Planificación
   (diferencia igual); semana con ejecución parcial (comprometido 10M,
   solo 2M gastado vía H3 sin marcar el movimiento ejecutado) ya no
   queda "casi todo el ingreso sin tocar": pasa de un remanente
   encadenado de 18M (fórmula vieja, solo resta `ejecutado`) a 8M
   (fórmula nueva), reflejando la desviación real en vez de esconderla
   — mismo patrón cualitativo que el caso real reportado por Camilo
   (+20M superávit falso vs. -11M déficit real). Falta que el Tester lo
   corra contra un mes real del Sheet vía `/admin/trazabilidad` o el
   preview URL — esta verificación fue algebraica/sintética, no contra
   datos vivos.
4. `tsc --noEmit`: corrido, 0 errores. `npx eslint` sobre los dos
   archivos tocados: 0 errores, 16 warnings — todos preexistentes
   (unused vars/hooks-deps ya presentes antes de este cambio, incluido
   el mismo patrón de "missing dependency: SEMANAS" que ya tenían otros
   `useMemo` del archivo sin tocar).
5. `disponiblePorCuenta()` (líneas 391-401 antes del cambio): no
   modificado — confirmado leyendo el bloque después del commit, texto
   idéntico al original.

**Deuda técnica / desviación de alcance:** ninguna. No se tocó el gate
de saldos asimétrico desktop/mobile ni el código muerto de `MesM1.tsx`/
`VistaPlanificacion.tsx` — quedan fuera de alcance como indica el
ticket. No se creó un candidato de invariante nuevo — este ticket queda
como tercera evidencia a favor del candidato ya existente en
`INVARIANTS.md` ("Cálculo de mes/semana operativos desde una única
fuente de verdad"), tal como pedía el ticket.

**HALT:** ninguno. Sin ambigüedad de alcance — el diagnóstico previo ya
resolvía el HALT de producto (fórmula exacta a usar) antes de que este
ticket entrara `aprobado`.

**Commit local:** `ee02ba1` — "Unifica remanente semanal encadenado y
corrige fórmula de Ejecución". Sobre rama `dev`, sin push (pendiente de
Tester, según protocolo).

```yaml
metricas_agente:
  coder: { agente: claude-sonnet, tokens: 101443, reintentos: 0 }
  tester: { agente: claude-sonnet, tokens: 66824, veredicto: CUMPLE }
  manager: { reportó: si, resumen_4_puntos: si }
  halt: { disparado: no, criterio: "" }
```
