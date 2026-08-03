---
ticket_id: FIX-SEMANA-STUB-01
orden: 24
estado: completado
tier: A
dependencias: ninguna
---

# FIX-SEMANA-STUB-01 — Corregir corrimiento de numeración S1-S5 en meses que empiezan sábado/domingo

## Goal completo

`cc51db9` (29-jul-2026) agregó la regla de "cierre de fin de semana" en `cicloOperativo()`
(`lib/utils/fecha.ts`): un sábado/domingo antes del primer lunes del mes se atribuye al
cierre del mes anterior. Pero no ajustó `semanaDeFechaEnMes()` ni `semanasDeMes()`, que
siguen asumiendo que esos días-previos-al-lunes ocupan la etiqueta "S1" del mes actual.

En meses cuyo día 1 cae en sábado o domingo (el stub previo al primer lunes es *enteramente*
fin de semana — ej. agosto 2026, día 1 = sábado), ese stub se desvía entero al mes anterior
y la etiqueta "S1" del mes actual queda huérfana: ningún día real mapea ahí, y toda la
numeración del mes se corre una posición (la semana real del 3-9 de agosto, que debería ser
S1, se calcula como S2).

Un segundo bug compuesto, encontrado durante la implementación de este fix (no estaba en el
diagnóstico original): `semanaActivaMes` — usado para decidir si el botón "Cerrar semana" se
muestra y si una semana es editable — se calcula en `app/mes/[mes]/semana/page.tsx:28` y en
`app/api/mes/[mes]/semana/[semana]/route.ts:49` como `semanaActual()` **sin importar el `mes`
que se está viendo**. Al navegar a un mes pasado (ej. julio, para cerrar su S5 pendiente), el
sistema sigue comparando contra "la semana real de hoy", bloqueando el botón de cierre en
cualquier semana de ese mes pasado que no coincida por casualidad con la etiqueta de hoy.

Alcance de este ticket:
1. Unificar en `lib/utils/fecha.ts` la condición de "stub absorbido por el mes anterior"
   (una sola función/constante) consumida por `semanaDeFechaEnMes()` y `semanasDeMes()`, para
   que no se puedan tocar por separado como pasó en `cc51db9`.
2. Nuevo helper `semanaActivaDeMes(mes, fecha?)`: si `mes === mesActual()`, es `semanaActual()`;
   si es cualquier otro mes, es la última semana de `semanasDeMes(mes)` (todas las semanas de
   un mes pasado deben quedar editables/cerrables, no solo la que coincide con la etiqueta de hoy).
   Reemplaza los dos usos sueltos de `semanaActual()` en `page.tsx` y `route.ts` arriba mencionados.
3. Script de regresión (matriz de los 7 días de la semana como día-1-de-mes + casos límite reales
   de `cc51db9`) para prevenir regresiones futuras del mismo patrón.

**NO cubre** (deuda documentada, ver tickets relacionados):
- `mesDeFecha()` + `semanaDeFechaEnMes()` se siguen llamando **por separado** (no a través de
  `cicloOperativo()`) en `app/api/cron/uber-parser/route.ts:107` — la regla de cierre de fin de
  semana NO se aplica ahí, así que un viaje Uber registrado el sábado/domingo previo al primer
  lunes de un mes que empieza así queda con `mes` del mes nuevo y `semana` mal numerada (mismo
  bug, ruta distinta). Ver `DT-CICLO-OPERATIVO-UNIFICADO-01`.
- El patrón de IA infiriendo `semana` con fallback en `app/api/registro/interpretar/route.ts`
  (I-01 lo prohíbe explícitamente). Ver `DT-INTERPRETAR-IA-SEMANA-01`.
- Corrección de datos ya escritos en el Sheet con la semana incorrecta. Ver `AUDIT-SEMANA-STUB-01`
  (tier C, manual).

## Definition of Done

- [x] `semanaDeFechaEnMes(new Date("2026-08-03"))` (lunes, hoy) devuelve `"S1"`, no `"S2"`.
      Verificado por `scripts/verificar-ciclo-semanas.ts`.
- [x] `semanasDeMes("2026-08")` sigue devolviendo `["S1","S2","S3","S4","S5"]` (verificado que el
      conteo de S5 no se rompió con el cambio de condición).
- [x] Script de regresión `scripts/verificar-ciclo-semanas.ts` (`node --experimental-strip-types
      scripts/verificar-ciclo-semanas.ts`) corre limpio: **272/272 aserciones ok**, cubriendo los
      7 casos de día-1-de-mes (2026-01/02/05/06/07/08/09) y los casos límite reales de `cc51db9`
      (27-31 jul, 1-4 ago, transición jun-jul).
- [x] `semanaActivaDeMes("2026-07", hoy=3-ago)` devuelve `"S5"` (última semana de julio), no la
      semana real de hoy. Cubierto por el mismo script.
- [x] Verificado contra el Sheet **dev** real (no solo preview estático) vía dev server local +
      `curl`:
      - `GET /api/mes/2026-08/semana/S1` → `{"semana":"S1","semanaActivaMes":"S1", ...}`.
      - `GET /api/mes/2026-07/semana/S5` → `{"semana":"S5","semanaActivaMes":"S5",
        "cierreSemana":null, ...}` con movimientos reales (PS Plus pospuesto) — confirma que S5
        de julio queda editable/cerrable y que sigue sin cerrar, tal como reportó Camilo.
- [x] `npx tsc --noEmit` limpio (requirió excluir `scripts/**/*.ts` de `tsconfig.json` — el script
      de regresión importa `lib/utils/fecha.ts` con extensión `.ts` explícita para poder correr
      con `node --experimental-strip-types` sin depender de un compilador; `moduleResolution:
      "bundler"` del proyecto no admite esa extensión en imports, así que el script queda fuera
      del type-check de la app, igual que los demás scripts en `scripts/`).
- [x] Commiteado en `dev` (sin mergear a `main` — I-11, requiere aprobación de Angie).
      Pendiente: preview de Vercel — no se abrió browser en esta sesión (verificación fue por API
      directa contra el mismo Sheet dev que usa el preview); si se quiere confirmar visualmente,
      pendiente para la próxima sesión con acceso a browser.

## Contexto / diagnóstico previo

Diagnóstico completo y validación por simulación pura (sin Sheet) en la sesión de debugging del
3-ago-2026: reproducido que `semanaDeFechaEnMes()` para el 3-ago-2026 devuelve `"S2"` en vez de
`"S1"`, y que `VistaSemanal.tsx` (`SEMANAS = semanasDeMes(mes)`, botón "←" en
`navegar(SEMANAS[idxVisible - 1])`) nunca cruza de mes — de ahí que retroceder desde el "S2"
incorrecto de hoy aterrice en el "S1" fantasma de agosto (sin datos reales, nunca habilitado) en
vez de en julio S5 (la semana real pendiente de cierre). Plan aprobado explícitamente por Camilo
en la misma sesión.

## Commit de cierre
(se llena al commitear — ver mensaje `fix(fecha): ...`)

## Notas de ejecución

**Causa raíz confirmada exactamente como en el diagnóstico**: `stubAbsorbidoPorMesAnterior()`
(nueva función en `lib/utils/fecha.ts`) encapsula en un solo lugar la condición
`mondays[0] > 1 && mondays[0] <= 3` (mes que empieza sábado o domingo, stub 100% fin de semana),
consumida tanto por `semanaDeFechaEnMes()` como por `semanasDeMes()` — antes cada una tenía su
propia copia implícita de esta lógica y solo una se sincronizó en `cc51db9`.

**Hallazgo no anticipado en el diagnóstico original**: `semanaActivaMes` (gating del botón
"Cerrar semana") se calculaba con `semanaActual()` sin importar el `mes` visible, en dos sitios
(`app/mes/[mes]/semana/page.tsx:28` y `app/api/mes/[mes]/semana/[semana]/route.ts:49`). Esto
habría bloqueado cerrar julio S5 incluso después de corregir la numeración, porque el sistema
seguía comparando contra "la semana real de hoy" en vez de contra el mes que se está viendo.
Se resolvió con un tercer helper, `semanaActivaDeMes(mes, fecha?)`, que ambos call sites ahora
usan — evita que quede una tercera copia suelta de la misma lógica.

**Riesgo evaluado a futuro** (pedido explícito de Camilo — "adelantarnos"): el patrón real de
`cc51db9` no fue "un bug en una función", fue "una función acoplada (`cicloOperativo`) que se
tocó, y funciones desacopladas (`semanaDeFechaEnMes`, `semanasDeMes`) que no". Ese mismo patrón
sigue vivo en dos sitios que este ticket **no tocó**, documentados como tickets separados:
- `mesDeFecha()` + `semanaDeFechaEnMes()` llamadas por separado (no vía `cicloOperativo`) en
  `app/api/cron/uber-parser/route.ts` — no aplican la regla de cierre de fin de semana. Ver
  `DT-CICLO-OPERATIVO-UNIFICADO-01`.
- IA infiriendo `semana` en `/api/registro/interpretar` — viola I-01 en espíritu. Ver
  `DT-INTERPRETAR-IA-SEMANA-01`.

Ambos quedan como tickets Tier B (HALT antes de construir) — no se autorizó tocarlos en esta
sesión, que estaba acotada al bug reportado.

**Deuda técnica encontrada, no corregida**: `semanaDeFechaEnMes()` tiene un caso de cola no
cubierto — un mes cuyo *último* día calendario es lunes (ej. un mes de 31 días que empieza en
sábado, como agosto 2026: día 31 = lunes) produce una "S5" de un solo día en vez de fusionarse con
la semana que arranca ese lunes hacia el mes siguiente. No es el bug reportado por Camilo y el
script de regresión lo excluye explícitamente de la aserción "sin semanas huérfanas" (ver
comentario `ultimoDiaEsLunes` en `scripts/verificar-ciclo-semanas.ts`). Referenciado en
`DT-CICLO-OPERATIVO-UNIFICADO-01` como contexto adicional, no como alcance propio.

**Auditoría de datos** (ver `AUDIT-SEMANA-STUB-01`): cero filas en H3 prod/dev con `semana`
incorrecta en la ventana afectada (1-3 ago 2026) — nada que corregir.
