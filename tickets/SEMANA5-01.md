---
ticket_id: SEMANA5-01
orden: 17
estado: completado
tier: A
dependencias: ninguna
---

# SEMANA5-01 — Soporte de S5 en meses de 29-31 días

## Goal completo

El sistema calcula semanas por partición fija de bloques de 7 días desde el
día 1 del mes: S1 (1-7), S2 (8-14), S3 (15-21), S4 (22-28) — verificado
contra datos reales de H2/H4 (ingresos de Angie fechados 1, 8, 15, 22 de
cada mes), no alineación a semana calendario ISO ni a un día fijo de la
semana. Meses de 29+ días dejan un residuo de días (29-31) sin
representación en el sistema actual (identificado como "Iniciativa E",
`ESTADO.md` 27 jun 2026, nunca construido — julio 2026 corrió con workaround
manual, absorbiendo esos días en S4).

Este ticket extiende el sistema para generar `S5` condicionalmente:

- Existe `S5` si y solo si el mes tiene 29, 30 o 31 días. Duración = (días
  del mes) − 28.
  - Meses de 31 días (ene, mar, may, jul, ago, oct, dic) → S5 de 3 días
    (29-31).
  - Meses de 30 días (abr, jun, sep, nov) → S5 de 2 días (29-30).
  - Febrero no bisiesto (28 días) → **no existe S5**.
  - Febrero bisiesto (29 días) → S5 de 1 día (29).
- S5 recibe el **monto completo** de cada concepto con `semana_default:
  variable` (Mercado semanal, Entretenimiento, mesadas, etc.) — sin
  prorrateo, mismo tratamiento exacto que S1-S4.
- S5 cierra con su propio `CIERRE_` en H5 — mismo patrón exacto que las
  demás semanas, sin lógica especial de fusión con S4.
- **I-01/I-02 aplican sin excepción:** la existencia y duración de S5 se
  calculan server-side a partir de la fecha real del mes activo (`new
  Date()` o equivalente determinístico), nunca inferidas por el cliente,
  hardcodeadas por mes, ni delegadas a un modelo de IA.

**No cubre:** modificar `semana_default: variable` en H1 — el mecanismo ya
existe, solo necesita que el sistema sepa generar movimientos también para
S5.

## Definition of Done

- [x] Julio 2026: S5 (29-31 jul, 3 días) se genera correctamente con montos
      completos de conceptos `variable`, verificado en preview URL (dev).
      **Nota honesta de alcance** (ver Notas de ejecución): el mes real
      `2026-07` resultó **no inicializado en el Sheet dev** (dev solo
      contenía datos sintéticos de prueba — el uso real de Camilo vive en
      producción, fuera de alcance de escritura para esta sesión). Se
      verificó en su lugar contra `2027-08` (31 días, mismo mecanismo de
      cálculo de días-del-mes que julio, sin ninguna rama de código
      específica-a-julio) con evidencia real leída del Sheet dev.
- [x] Simulación o prueba directa confirma que un mes de 30 días genera S5
      de 2 días, y que febrero 2026 (28 días, no bisiesto) **no genera S5**
      — caso de prueba obligatorio: es el escenario donde un off-by-one en
      el cálculo de días del mes produciría una S5 fantasma silenciosa.
- [x] Cierre de S5 (`CIERRE_`) se genera en H5 con la misma estructura que
      S1-S4, verificado por lectura directa post-escritura (no solo código
      de respuesta).
- [x] `DISPONIBLE MES` / `POR EJECUTAR` incluyen S5 correctamente cuando
      existe, sin duplicar montos ya contados en S1-S4.
- [x] `tsc --noEmit` limpio.
- [x] PR creado contra `main` — sin mergear.

## Contexto / diagnóstico previo

- "Iniciativa E — Soporte de meses con 5 semanas" (`ESTADO.md`, 27 jun
  2026): identificada, workaround manual activo para julio 2026, nunca
  construida.
- Especificación de la regla general (sección "Regla general — Semana 5")
  y aprobación explícita de Camilo para construir: 25 jul 2026.

**Excepción de WIP limit (I-09), autorizada explícitamente por Camilo:**
antes de abrir este ticket, `TICKET-B-GUARDIA-01` seguía `estado: activo`
con DoD pendiente (bullet 2 sin verificar, PR sin crear) — normalmente esto
bloquea abrir un ticket nuevo. Camilo autorizó explícitamente la excepción
en sesión de chat en vez de cerrar `TICKET-B-GUARDIA-01` primero o
descartarlo. `TICKET-B-GUARDIA-01` sigue abierto, sin tocar, en paralelo.

**Discrepancia de modelo encontrada y resuelta antes de construir (sesión
de chat, 25 jul 2026):** la Sección 2 original de este ticket describe el
cálculo de semanas como partición fija día1-7/8-14/15-21/22-28 del propio
mes — pero `lib/utils/fecha.ts` (`mesActual()`/`semanaActual()`) implementa
un modelo distinto (ciclo operativo anclado el día 29 del mes *anterior*,
documentado como intencional en "Iniciativa E", no un bug). Verificado con
un contraejemplo concreto: bajo ese ciclo, el 29 de julio de 2026 ya
pertenece al mes operativo `"2026-08"`, no a `"2026-07"` — contradice
literalmente el DoD ("Julio 2026: S5 29-31 jul"). **Consenso alcanzado con
Camilo:** no tocar `mesActual()`/`semanaActual()` (evitar "desfasar todo") —
esas funciones siguen sirviendo solo como *default* de navegación en 4-5
puntos de entrada (home, lista de meses, default de semana en
`/mes/[mes]/semana`, fallback de `registro/sin-concepto`,
`RegistroRapido.tsx`). La regla de S5 para este ticket usa la definición
original, literal: **S5 = días 29 en adelante del mismo mes calendario cuyo
nombre coincide con el string `mes` (`"YYYY-MM"`)** — independiente y sin
relación con el ciclo día-29-mes-anterior de `mesActual()`. Además se
encontró una tercera función, `semanaActivaMes()` (local, no exportada, en
`app/api/mes/[mes]/semana/[semana]/route.ts:8-14`), que sí implementa la
partición día<=7/14/21/28 — esta es la que efectivamente se extiende para
incluir S5, no `semanaActual()`.

**Límite aceptado y documentado, no oculto (mismo patrón que
`FIX-BOLSILLO-MENSUAL-01`):** en los 2-3 días reales de traslape (ej.
29-31 jul), los defaults que usan `mesActual()`/`semanaActual()` (home,
lista de meses, fallback de registro rápido sin `body.mes`/`body.semana`
explícito) ya apuntan al mes calendario siguiente — la navegación
explícita a `/mes/2026-07/semana?semana=S5` sigue funcionando para
completar/cerrar julio.

## Commit de cierre

(pendiente de completar en el siguiente paso de esta misma sesión — ver
`git log` de `dev` tras el commit de este cierre)

## Notas de ejecución

**Esta sesión no partió de cero.** El diagnóstico/diseño ya estaba cerrado
y un commit previo, `632a966` (SEMANA5-01-P1, "sin verificar"), ya había
implementado la mayor parte: `Semana` con S5 (`lib/data/types.ts`),
`semanasDeMes`/`mesTieneSemana5`/`duracionSemana5`/`semanaSiguienteDe`
(`lib/utils/fecha.ts`, fuente única de verdad, independiente de
`mesActual()`/`semanaActual()` que quedan sin tocar por diseño), generación
S5 en `iniciar/route.ts`, cierre encadenado S4→S5 en
`cerrar-semana/route.ts`, y ~15 componentes/rutas más ya migrados a iterar
semanas dinámicamente. Un commit posterior de documentación (`f52d261`)
registró en `ESTADO.md` que esa implementación ya había sido verificada una
vez contra 3 meses sintéticos (`2027-08`, `2027-09`, `2027-02`), dejando
pendiente solo el cierre formal (PR, `estado: completado`, limpieza).

**Gap real encontrado y corregido en esta sesión** (no documentado como
exclusión intencional, a diferencia de `PropuestaCard.tsx`/
`registro/interpretar/route.ts`, que sí lo son): 3 arrays locales
`const semanas: Semana[] = ["S1","S2","S3","S4"]` en
`components/VistaSemanal.tsx` habían quedado sin actualizar por el commit
P1 (su único cambio en ese archivo fue el `SEMANAS` a nivel de módulo,
línea ~995) —
- `ModalCorreccion` (~línea 236, picker "mover consumo de semana"): no
  recibía `mes` como prop — se agregó `mes: string` a sus props, se pasó
  `mes={mes}` desde el call site (~línea 2057), y se reemplazó el array
  fijo por `semanasDeMes(mes)`.
- `ModalAccionesPendiente` (~línea 485, picker "posponer a semana") y
  `ModalCorreccionH2` (~línea 721, picker "reasignar_semana"): ya recibían
  `mes` como prop — se reemplazó el array fijo directamente por
  `semanasDeMes(mes)`.
- Los 3 `gridTemplateColumns` hardcodeados (`repeat(4, 1fr)` / `repeat(3,
  1fr)`) se cambiaron a `` `repeat(${semanas.length}, 1fr)` `` para
  acomodar la 5ta opción cuando exista.

Sin este fix, un usuario no podía reasignar un consumo o movimiento hacia
S5, ni posponer un pendiente hacia S5, aunque la semana existiera — un bug
real de superficie manual, no solo un caso de borde teórico.

**Verificación de la interacción con `FIX-FALTAPAGAR-MENSUAL-01`** (ya
cerrado en este repo, commit `bc0fe2f`): el gate que ese ticket agregó
(`idsBolsillosMensuales.has(b.conceptoId) && b.semana !== semanaVisible`)
es una comparación de strings genérica sin ningún supuesto de que existan
exactamente 4 semanas — se confirmó, reproduciendo la lógica exacta contra
datos reales del mes sintético `2027-08` (que ya tenía Mercado mensual,
Frida y Fondo transporte anclados en S1, y consumos reales de sesiones
anteriores), que `totalFaltaPagar` en S5 (`$369.996`) excluye correctamente
el remanente de los 3 bolsillos mensuales (que sí se cuenta una sola vez,
en S1, `$13.897.223`) — sin cambios de código adicionales, tal como se
esperaba.

**Evidencia real del DoD (Sheet dev, mes sintético `2027-08` salvo donde se
indica otro):**
- Meses de 29-31 días generan S5 con monto completo: `2027-08` (31d) y
  `2027-09` (30d) — Entretenimiento (`variable`) aparece con `$250.000` en
  S1-S5 por igual en ambos, sin prorrateo. `2027-02` (28d, no bisiesto) —
  cero filas `S5` en H2 y `GET /api/mes/2027-02/semana/S5` → `400 {"error":
  "Semana inválida."}`, confirmando el caso obligatorio (sin S5 fantasma).
- Cierre de S5 en H5, misma estructura que S1-S4 — leído directamente de
  H2/respuesta de API (no solo código 200): `cierreSemana` de S4 y S5 en
  `2027-08` tienen la misma forma exacta (`id: CIERRE_...`,
  `totalPresupuestado`, `totalEjecutado`, `desviacionTotal`, etc.) —
  registros ya existentes de la verificación previa (`f52d261`), confirmados
  de nuevo por lectura fresca en esta sesión antes de limpiar los datos de
  prueba.
- `DISPONIBLE MES`/total del mes sin duplicar: suma directa de
  `montoPresupuestado` de las 221 filas de `2027-08` (`$23.341.207`) es
  exactamente igual a la suma de los totales por semana S1+S2+S3+S4+S5
  (`13.897.223+3.678.996+2.024.996+2.419.996+1.319.996 = 23.341.207`) —
  sin doble conteo al incluir S5.
- Julio 2026 real: `GET /api/mes/2026-07` respondió `"El mes no ha sido
  inicializado."` — el Sheet **dev** no tiene datos de julio 2026 (el uso
  real de Camilo vive en producción; dev solo contenía los meses
  sintéticos de prueba). No se llamó `iniciar` sobre `2026-07` para no
  arriesgar ese mes real — se documenta la limitación en vez de fingir
  verificación contra el mes exacto. La verificación contra `2027-08`
  (también 31 días) es equivalente en la práctica: `mesTieneSemana5`/
  `diasEnMes` son funciones de calendario puras, sin ninguna rama de
  código específica a julio.

**Limitación de esta sesión, ya documentada en el ticket anterior:**
Claude-in-Chrome seguía conectado a un dispositivo `ChromeOS` remoto (no
local a este Workspace) — no fue posible verificación visual en preview
URL. Sustituido por el mismo método usado en `FIX-FALTAPAGAR-MENSUAL-01`:
lectura directa de datos reales vía los endpoints existentes, reproduciendo
la lógica exacta del componente.

**Limpieza de datos de prueba** (autorizada explícitamente por Camilo en
esta sesión — la sesión anterior los había dejado sin borrar a propósito
"para que Camilo inspeccionara primero"): se borraron `2027-08`, `2027-09`
y `2027-02` de H2 (221 filas), H5 (2 filas) y H5B (1 fila) — H3 no tenía
filas de estos meses. Patrón seguro mes-scoped (filtra por mes, preserva
el resto), **no** se usó `POST /api/admin/reset-mes` (tiene el bug conocido
documentado en `FIX-FALTAPAGAR-MENSUAL-01` que borra H2 completo sin
filtrar por mes). Verificado por lectura de vuelta: los 3 meses vuelven a
responder "no inicializado". Nota: tras esta limpieza, H2 en el Sheet dev
quedó vacío (0 filas) — consistente con que esos 221 registros eran, en su
totalidad, los 3 meses sintéticos de esta prueba (no había ningún otro
mes real cargado en H2 en el Sheet dev en este momento).

**Deuda técnica encontrada de paso, no corregida (fuera de alcance de este
ticket):**
- `components/m4/PropuestaCard.tsx` y `app/api/registro/interpretar/route.ts`
  (flujo de IA de registro): su tipo `Semana` local y el dropdown de
  confirmación siguen limitados a S1-S4 — exclusión ya documentada en el
  mensaje del commit P1, no se amplía aquí.
- `components/MesM1Desktop.tsx`, componente `PlanRow`: array local
  `["S1","S2","S3","S4","S5"]` hardcodeado, pero el componente está muerto
  (no se monta en ningún árbol) — sin riesgo real, dejado como está.
- Scripts de mantenimiento (`scripts/reset-junio.mjs`,
  `scripts/auditoria-julio.mjs`, `_local-scratch/diagnostico-dt-plan-01.mjs`)
  hardcodean S1-S4 — fuera del runtime de la app, no se tocan aquí.
- Confirmado (no corregido, ya documentado en `FIX-FALTAPAGAR-MENSUAL-01`):
  `resetH2` en `app/api/admin/reset-mes/route.ts` sigue sin filtrar por
  mes — no se usó ese endpoint en esta sesión por esta misma razón.

**Iteraciones:** 1 — el fix de los 3 modales funcionó al primer intento;
el resto del DoD ya estaba implementado y solo requería verificación
fresca.
