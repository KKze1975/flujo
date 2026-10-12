# APORTES-SEMANALES-01 — Aportes del emprendimiento planeados por semana

**Fase:** 2 (Especificación), HG SDD. **Tipo de sesión que lo produjo:** DISEÑO.
**Autor:** Spec Writer de Flujo (subagente), 29 sept 2026. **Estado:** APROBADO — Camilo, 29 sept 2026: "aprobado para construir" (revisión 3).
**Revisión 2 (29 sept 2026):** incorpora las respuestas de Camilo a las preguntas abiertas P1–P5
(transcripción de voz, recibidas vía sesión Chief of Staff). Ver "Registro de respuestas" al final.
**Revisión 3 (29 sept 2026):** Camilo confirma H = Angie, pide el aporte del emprendimiento en la
vista semanal en un lugar propio separado del de Angie, y elige la opción (b) para NU Camilo.
Sigue sin "aprobado para construir".
**Entrada:** `ESTADO.md`, sección "Sesión DISEÑO — Fase -1/0: ingresos adicionales semanales
(29 sept 2026…)" — Fase 0 y Fase 1 cerradas y validadas por Camilo ("sí, así es que quiero que
funcione").
**Ubicación:** `scratch/` porque el repo no tiene carpeta `specs/` ni convención equivalente
(verificado con `ls` y búsqueda de "Resumen para decisión" en `*.md`).

---

## Sección 1 — Resumen para decisión

**Qué problema se resuelve.** Desde octubre entra plata del emprendimiento (contratos de
software, unos $5M al mes, en pedazos repartidos entre semanas). Hoy la planeación del mes
solo muestra tu ingreso de principio de mes y los aportes de Angie; la plata del emprendimiento
no aparece en ningún lado hasta que llega, y cuando llega se anota suelta. Resultado, en tus
palabras: sin trazabilidad "se termina gastando en cualquier cosa".

**Qué cambia para ti.**
1. El día 1, en la pantalla de planeación (M1), además de tu ingreso y los aportes de Angie,
   anotas un monto por semana para el emprendimiento, en la semana en que lo esperas. Si llegan
   dos pedazos la misma semana, los sumas tú.
2. Se ve y se edita **igual que hoy el aporte semanal de Angie**: un bloque "Aportes
   emprendimiento" con una casilla por semana y su botón de guardar en planeación, una línea más
   en "Balance mes", el monto de cada semana dentro de "Por semana" (planeación y ejecución), y un
   botón para editarlo desde ejecución, igual al de "Aporte Angie". En el celular y en la pantalla
   de inicio se suma a los ingresos del mes, igual que Angie.
   *(Confirmado: "H" era Angie.)*
3. El campo aparece todos los meses; en los meses sin emprendimiento queda en cero.
4. Semana a semana registras lo que pagaste, igual que hoy. No hay paso de "confirmar que llegó"
   (igual que con Angie).
5. Si un aporte no llega en su semana, corres los pagos que dependían de él a la semana siguiente
   o al mes siguiente, con el botón de posponer que ya existe, pago por pago. Cuando lo corres al
   mes siguiente, **tú eliges la semana** de ese mes en ese momento.
6. Deja de existir anotar el ingreso del emprendimiento suelto por el botón de registro rápido.

**Qué gana el negocio.** Lo que pediste como retorno: la plata del emprendimiento queda
registrada y puedes planear desde el principio del mes cómo se va a usar.

**Qué ya existe y se reutiliza (no se construye de nuevo).**
- El aporte semanal de Angie: el del emprendimiento copia su forma de guardarse, mostrarse y
  editarse.
- El botón de posponer (a otra semana del mes o al mes siguiente) cubre el paso "correr los
  pagos". No sabe cuáles pagos dependían del aporte (porque tú no amarras destino de antemano);
  tú eliges cuáles correr, uno por uno.

**Qué queda fuera de alcance.**
- Amarrar cada aporte a pagos específicos (dijiste que no quieres planear el destino desde antes).
- Confirmar que el aporte llegó, o anotar cuánto llegó de verdad.
- Una línea por contrato con nombre (elegiste un solo monto por semana).
- Correr varios pagos de un solo golpe cuando un aporte no llega.
- Mover automáticamente un aporte que no llegó a otra semana.
- Arreglar o reclasificar el ingreso que ya se anotó suelto en septiembre.
- Cambiar tu aporte de principio de mes o el de Angie.

**Vista semanal (donde se ejecutan los pagos).** Pediste "mostrar una división entre lo que
semanalmente pone Angie y lo que yo comprometo para cumplir". Lo que entendí (interpretación
formulada por la sesión, no palabras tuyas): el aporte del emprendimiento **sí aparece** en la
vista semanal, pero en un lugar propio, separado del recuadro de Angie. El "Disponible semana" de
Angie y lo que se guarda al cerrar su semana no cambian. Qué muestra exactamente ese lugar propio
queda para decidir contigo en el diseño (ver pregunta abierta abajo).

**Tu cuenta NU.** Elegiste la opción (b): el disponible de NU Camilo en la pantalla de ejecución
suma los aportes del emprendimiento de las semanas que ya empezaron (la semana actual la calcula
el sistema), sin confirmar que llegó. Si un aporte no llega, ese disponible lo muestra de más hasta
que corras los pagos. Esto se aparta de cómo se trata hoy a Angie, a propósito.

**Pregunta abierta (para el diseño, contigo).** En el lugar propio de la vista semanal, ¿qué ves?
Por ejemplo: solo "Aporte emprendimiento planeado Sx"; o eso más lo que ya pagaste esa semana con
esa plata y lo que queda. La segunda opción implicaría saber qué pagos se hicieron "con" el
emprendimiento, y eso no existe (no amarras pagos a aportes). Por eso la dejo abierta en vez de
deducirla.

**Riesgos que debes conocer antes de aprobar.**
- **Hoy los balances se calculan en varios lugares por separado.** Ya hubo dos veces en que el
  balance del mes y la suma de las semanas no cuadraron (la última, el 28 sept con el CDT). Meter
  un ingreso nuevo toca todos esos lugares; si se olvida uno, vuelve a descuadrar sin avisar. El
  spec exige que el ingreso total del mes y de cada semana salga de un solo cálculo y que se
  pruebe que cuadran.
- **Posponer al mes siguiente desde la vista semanal hoy deja el pago sin semana en el mes
  nuevo.** Un pago sin semana cuenta en el total del mes pero en ninguna semana (pendiente ya
  registrado el 28 sept). Con tu respuesta (tú eliges la semana) el spec exige que siempre quede
  con semana, en todos los botones que corren un pago al mes siguiente.
- **Cambio en la hoja de Google.** Se necesita un lugar nuevo en la hoja para guardar estos
  aportes, y hay que crearlo igual en la hoja real antes de pasar a producción.
- **Diseño visual.** El bloque de planeación copia uno que ya existe (el de Angie), así que casi
  no necesita diseño nuevo. Sí falta diseño para dos cosas de la vista semanal: el lugar propio del
  emprendimiento y el selector de semana al correr un pago al mes siguiente. Eso va al Diseñador
  antes de construir (ya se revirtió un ticket, T21, por construir sin diseño).

**APROBADO PARA CONSTRUIR** — Camilo, 29 sept 2026, sobre la revisión 3.

---

## Sección 2 — Spec técnico completo

### 2.1 Hallazgos del código que condicionan el spec (verificados por lectura)

| # | Hallazgo | Dónde | Implicación |
|---|---|---|---|
| H1 | Aporte de Angie ya es por semana: H4B (`IngresoAngie`, `mes`,`semana`,`monto`), PUT upsert por semana, semanas según `semanasDeMes(mes)` (S1–S4/S5). | `app/api/ingresos/angie/[mes]/route.ts`, `components/m1/ModalAporteAngie.tsx`, `MesM1Desktop.tsx` (estado `aportes`) | Molde exacto para el aporte del emprendimiento (P1: un monto por semana). No se toca. |
| H1b | **Superficies donde hoy aparece el aporte de Angie** (define "igual que Angie", P1/P2): (1) `MesM1Desktop` planificación, sidebar "Aportes Angie": input por semana + "Guardar aportes" (l.756-777); (2) "Balance mes", fila "Aportes Angie" (l.779-785); (3) "Por semana" planificación, chip `A:` por semana (l.798-814); (4) "Por semana" ejecución, chip `A:` con `✓`/`(plan)` (l.875-903); (5) ejecución, botón "Aporte Angie" → `ModalAporteAngie` (l.996, 1124); (6) `MesM1Mobile`, solo dentro de "Ingresos del mes" (l.153-155, 276); (7) `app/page.tsx` → `HomeHub` `AporteCard` (aporteCamilo/aporteAngie) y `disponibleSemana` (ingreso Angie semana − pendientes); (8) `app/api/meses` → `PantallaMeses` (`ingresoAngie`, `totalIngresos`); (9) `VistaSemanal`, solo en el recuadro `actor === "angie"` (l.1600-1625), acoplado a `disponibleSemana` de Angie y al `remanenteAngie` de H5A. | idem | (1)–(8) se replican para el emprendimiento como consecuencia de la regla. (9) no se replica dentro del recuadro de Angie (contaminaría su remanente, H9); por pedido de Camilo (rev. 3) el emprendimiento va en un bloque propio de la vista semanal, separado. |
| H2 | Ingreso de Camilo: H4A, **uno por mes** (upsert), sin semana, con `estado pendiente/confirmado`; entra como `ingresoInicial` del encadenado y habilita "ejecutar" (`ejecutarBloqueado`). | `app/api/ingresos/camilo/[mes]/route.ts`, `MesM1Desktop.tsx` | No se reutiliza H4A. No se toca. |
| H3 | El encadenado semanal tiene un helper único `remanenteEncadenadoPorSemana(semanas, ingresoInicial, aportePorSemana, calcularPaso)`, pero cada consumidor pasa su propio lambda de aporte (hoy solo Angie). | `lib/utils/balanceSemanal.ts`; `balancePlanificacion` y `balanceSemanas` en `MesM1Desktop.tsx` | El aporte por semana debe salir de **una** función compartida. |
| H4 | "Ingreso total del mes" se calcula por separado en ≥4 lugares activos: `MesM1Desktop.tsx`, `MesM1Mobile.tsx`, `app/page.tsx`, `app/api/meses/route.ts`. | idem | Todos deben incluir el aporte del emprendimiento vía la misma función. |
| H5 | `components/MesM1.tsx` + `components/m1/VistaPlanificacion.tsx` tienen una tercera copia del encadenado, pero `MesM1` no se importa desde `app/` (path activo: `MesM1ClientWrapper` → `MesM1Desktop`/`MesM1Mobile`). | grep de imports | I-12: fuera del path activo, fuera de alcance. |
| H6 | Posponer existe por movimiento: `PATCH …/movimientos/[id]` `tipo: posponer` (otra semana del mes; bloquea semana cerrada) y `tipo: mover_mes_siguiente` (crea fila H2 en el mes siguiente con `semana: body.semana ?? null`; exige semana solo si `semanaDefault === "variable"`). | `app/api/mes/[mes]/movimientos/[id]/route.ts` l.80-160 | Cubre "correr los pagos". Sin vínculo aporte→pago ni lote. |
| H7 | `VistaSemanal.tsx` l.511 y `VistaPlanificacion.tsx` l.325 llaman `mover_mes_siguiente` **sin** `semana` → fila del mes siguiente con `semana = null` para conceptos no variables. `ConceptoBoard.tsx` (M1) ya ofrece elegir semana y la envía siempre. | idem | P4 (Camilo elige la semana) → toda llamada activa a `mover_mes_siguiente` envía semana elegida; el servidor la exige. `VistaPlanificacion` está fuera del path activo (H5), pero la exigencia server-side la cubre igual. |
| H8 | El FAB no tiene tipo "ingreso"; cómo se anotó el ingreso suelto de septiembre no es observable en código. | grep | "Desaparece el registro suelto" se cumple por existir el lugar en planeación. La fila de septiembre queda como está. |
| H9 | Remanente de Angie (`cerrar-semana` → H5A `remanenteAngie`, H5B `aporteAngiePlaneado`; `VistaSemanal` `disponibleSemana = aportePlaneado − gastadoSemanaAngie`) es específico de Angie. | `app/api/mes/[mes]/cerrar-semana/route.ts`, `VistaSemanal.tsx` l.1067-1069 | El aporte del emprendimiento no se mezcla en remanente de Angie ni en H5A/H5B. |
| H10 | Cuentas H4C: `nu_camilo`, `nu_angie`, `arq`, `en_mano`. `disponiblePorCuenta(cuenta) = saldoInicial bruto − ejecutado H2 con esa fuente − gasto H3`. No suma ningún ingreso intra-mes, tampoco aportes de Angie a `nu_angie`. Existe en `MesM1Desktop` (l.392, usado en l.832-862) y en `MesM1Mobile` (l.204). | idem | Base de la opción (b) de NU Camilo (Sección 1). Sin cambio de esquema. |

### 2.2 Buy / Build / Copy

- **Buy:** no aplica.
- **Copy (recomendado):** replicar H4B/`IngresoAngie` como entidad `AporteAdicional` (mes, semana,
  monto, fecha default de la semana, notas), **un monto por semana, upsert por semana** (P1), con
  su propio rango en el Sheet, `GET/PUT /api/ingresos/adicionales/[mes]` (copia del de Angie) y las
  superficies (1)–(8) de H1b copiadas de las de Angie.
  **Brecha concreta:** (a) tipo y métodos nuevos en `IDataProvider` + `SheetsDataProvider`;
  (b) rango nuevo en el Sheet (I-10); (c) función compartida `ingresosPlaneados(mes)` →
  `{ inicialCamilo, porSemana: Record<Semana, {angie, adicional, total}>, totalMes }` consumida por
  todos los puntos de H4; (d) opción (b) de NU Camilo (aprobada, rev. 3): término adicional en
  `disponiblePorCuenta("nu_camilo")` (escritorio y móvil) = Σ aportes adicionales de semanas ≤
  semana activa, con la semana activa calculada server-side (I-01) y pasada como prop, no
  calculada en el cliente; (e) `app/mes/[mes]/semana/page.tsx` carga los aportes adicionales del
  mes y `VistaSemanal` los recibe como prop nueva para el bloque propio (Build: el bloque no tiene
  molde que copiar).
- **Alternativas descartadas:** reusar H4B con columna `fuente` (contamina remanente de Angie, H9);
  agregar `semana` a H4A (rompe su cardinalidad y el gate de ejecución, H2); aporte como
  `Movimiento` negativo en H2 (mezcla signos en todos los totales).
- **Posponer:** Copy total del mecanismo existente. Brecha: H7 (semana destino obligatoria al
  pasar al mes siguiente, elegida por Camilo, P4). Sin vínculo aporte→pago ni lote.

INV-002: se agota la alternativa simple (copiar H4B, reusar posponer) antes de cualquier mecanismo
nuevo; el único mecanismo nuevo es la función compartida de ingresos, que reduce deuda existente.

### 2.3 Definition of Done (acciones con evidencia)

Todo en rama `dev`, Sheet **DEV**; nada en PROD hasta F7.

**F1 — Persistencia del aporte adicional (un monto por semana)**
- [ ] `PUT /api/ingresos/adicionales/2026-10` con montos en S2 y S4 responde 200; `GET` del mismo
      mes devuelve exactamente esas filas (respuesta HTTP pegada).
- [ ] Un segundo PUT sobre S2 actualiza la misma fila, sin crear otra (GET pegado: una fila por semana).
- [ ] `/admin/trazabilidad` muestra diff solo en el rango nuevo; cero cambios en H4A, H4B, H2, H5A,
      H5B (diff pegado).
- [ ] PUT con semana fuera de `semanasDeMes(mes)` o monto negativo → 400 (respuesta pegada). Semana
      validada server-side (I-01/I-02).
- [ ] PUT con monto 0 en una semana existente la deja en 0 o la elimina, según el patrón de Angie.

**F2 — Una sola fuente del ingreso planeado**
- [ ] Existe una única función compartida de ingresos planeados; `grep` muestra que `MesM1Desktop`
      (planificación y ejecución), `MesM1Mobile`, `app/page.tsx` y `app/api/meses/route.ts` la
      consumen y no suman ingresos por su cuenta (output de grep pegado).
- [ ] Octubre en DEV con aportes adicionales: **Σ `diferencia` por semana == `ingresoTotal −
      totalComprometido`** en planificación de escritorio (diferencia 0, valores pegados).
- [ ] El aporte adicional de S2 suma en el disponible de S2 (no S1, no S3) en "Por semana" de
      planificación y de ejecución (valores pegados).
- [ ] `remanenteAngie` (H5A) y `aporteAngiePlaneado` (H5B) al cerrar una semana en DEV no cambian
      respecto a un cierre sin aportes adicionales (filas leídas de vuelta).

**F3 — "Igual que Angie" en M1 y resúmenes (superficies H1b 1–8)**
- [ ] Planificación de escritorio: bloque "Aportes emprendimiento" con un input por semana de
      `semanasDeMes(mes)` y botón de guardar; guarda y persiste al recargar (captura antes/después +
      GET pegado).
- [ ] "Balance mes" muestra la fila de aportes del emprendimiento y "Total disponible" = Camilo +
      Σ Angie + Σ emprendimiento (valores pegados).
- [ ] "Por semana" (planificación y ejecución) muestra el monto del emprendimiento de cada semana
      junto al de Angie (captura pegada).
- [ ] Ejecución: botón de aporte del emprendimiento abre la edición por semana (análogo a "Aporte
      Angie") y guarda (GET pegado).
- [ ] `MesM1Mobile` "Ingresos del mes" = mismo total que escritorio (dos valores pegados).
- [ ] Home (`AporteCard` y `disponibleSemana`) y `/meses` (`totalIngresos`) incluyen el aporte del
      emprendimiento (respuesta de `/api/meses` y captura de Home pegadas).
- [ ] P5: en un mes sin aportes del emprendimiento (p. ej. DEV 2026-09) el bloque aparece con todas
      las semanas en 0 (captura pegada).
- [ ] `VistaSemanal`, recuadro de Angie: sin cambios en "Aporte planeado", "Gastado esta semana" y
      "Disponible semana" (captura antes/después, valores idénticos).
- [ ] `VistaSemanal`, bloque propio del emprendimiento: en `/mes/2026-10/semana?semana=S2` aparece
      separado del recuadro de Angie y muestra el aporte planeado de S2 = valor guardado en F1
      (captura + GET pegados). Contenido adicional del bloque: según el diseño aprobado (pregunta
      abierta §2.5); cada dato adicional aprobado suma su propio check con valor pegado.
- [ ] En una semana sin aporte del emprendimiento el bloque muestra 0 (coherente con P5; captura).

**F4 — Sin paso de confirmación**
- [ ] Ejecutar un pago en S2 no pide confirmar el aporte adicional ni cambia su fila (GET antes y
      después idéntico). La entidad no tiene estado `pendiente/confirmado`.

**F5 — Correr pagos cuando un aporte no llega (reutiliza posponer)**
- [ ] Posponer un pago de S2 a S3 desde la vista semanal: fila H2 con `semana: S3`, estado
      `pospuesto`, visible en pendientes de S3 (diff pegado).
- [ ] Correr un pago de concepto **no variable** al mes siguiente desde la vista semanal pide a
      Camilo elegir la semana del mes siguiente; la fila creada tiene esa `semana` (diff de
      `/admin/trazabilidad` pegado).
- [ ] `PATCH … { tipo: "mover_mes_siguiente" }` sin `semana`, para cualquier concepto, → 400
      (respuesta pegada). Cierra H7 en todos los llamadores.
- [ ] Tras correrlo, en el mes siguiente Σ semanas == total del mes (réplica pegada).

**F6 — Disponible NU Camilo (opción (b), aprobada por Camilo en rev. 3)**
- [ ] Con saldo inicial NU Camilo X, aporte adicional S1 = A y S3 = B, estando en S2 (semana
      activa server-side): disponible NU Camilo = X + A − pagos NU Camilo − gasto H3 (no incluye B),
      en escritorio y móvil (valores pegados).
- [ ] El total "disponible cuentas" (MesM1Desktop l.862) sube en A (valor pegado).
- [ ] `nu_angie`, `arq`, `en_mano` sin cambio (valores antes/después).
- [ ] Si la vista semanal muestra "Saldo NU Angie" hoy, sigue igual; ningún saldo de cuenta en
      `VistaSemanal` cambia salvo que el diseño aprobado agregue NU Camilo al bloque propio.

**F7 — Cierre técnico**
- [ ] `npx tsc --noEmit` limpio; `npm run lint` sin errores nuevos (output pegado).
- [ ] I-10: mismo rango nuevo creado en el Sheet PROD **antes** del merge, por Camilo o con su
      aprobación explícita (HALT 3); encabezados leídos de vuelta de PROD.
- [ ] Sheet ID de PROD no aparece en archivos commiteados (pre-commit hook; I-04/I-08).
- [ ] PR `dev` → `main`; merge solo con aprobación explícita de Angie (candidato I-17).
- [ ] `graphify update .` tras el cambio de código.

### 2.4 Invariantes aplicables

| Invariante | Cómo aplica |
|---|---|
| I-01 / I-02 | Semana/mes del aporte validados server-side con `semanasDeMes(mes)`; en F6 la semana activa viene del servidor. |
| I-04 / I-08 | Rango nuevo por nombre; Sheet ID solo desde `GOOGLE_SHEET_ID`. |
| I-05 | No se toca H4D. |
| I-07 | `tsc --noEmit` limpio antes de cada commit. |
| I-09 | Un solo ticket (o tickets en serie; la corrección H7 puede ir primero). Nunca en paralelo. |
| I-10 | Rango nuevo → migración a PROD antes del merge (F7). F6 no cambia esquema. |
| I-11 | Todo por PR desde `dev`. |
| I-12 | `MesM1.tsx`/`VistaPlanificacion.tsx` fuera del path activo (H5). |
| I-16 | Sin estados por ausencia de valor; `semana` nunca `null` como sentinel en filas nuevas. |
| I-19 | Este spec no ejecuta cambios. |
| I-20 | Antes del Coder: `node scripts/check-ticket.mjs APORTES-SEMANALES-01`. |
| Candidato "única fuente de verdad mes/semana" | F2 exige una sola función de ingresos planeados; F5 cierra el camino activo que genera `semana = null` al pasar al mes siguiente. **Relación con el pendiente del 28 sept:** no resuelve filas `semana = null` ya existentes ni unifica comprometido mes vs. semana (sigue en backlog "Balance mes vs. semana — unificar la fórmula y cubrir `semana = null`"). Garantiza no agregar caminos nuevos a `semana = null` ni cálculos de ingreso duplicados. |
| Candidato `values.append` sin `INSERT_ROWS` | Escrituras nuevas vía `batchUpdate`/`update` o `append` con `INSERT_ROWS`. |
| Candidato completitud de esquema en `ensureHeaders` | Si el rango nuevo usa `ensureHeaders`, verificar todas las columnas. |

### 2.5 Diseño visual

- **Existe (por copia):** bloque "Aportes emprendimiento" en planificación, fila en "Balance mes",
  monto en "Por semana" y botón en ejecución: son réplicas directas de las superficies de Angie ya
  construidas en el sistema `fl-*` (H1b 1–5). Aun así, el Diseñador/Integrador debe **confirmar
  explícitamente** etiqueta, orden y distintivo visual (Angie usa `fl-person a` / chip `A:`; falta
  definir el distintivo del emprendimiento). No se infiere en construcción.
- **Falta:** selector de semana del mes siguiente al correr un pago desde la vista semanal (F5). El
  de `ConceptoBoard` (M1) existe y es candidato a copiar, pero la adaptación a la vista semanal
  necesita diseño aprobado.
- **Falta:** bloque propio del emprendimiento en la vista semanal, separado del recuadro de Angie
  (pedido de Camilo rev. 3: "una división entre lo que semanalmente pone Angie y lo que yo
  comprometo para cumplir"; la lectura "bloque propio separado" la formuló la sesión). **Pregunta
  abierta para Diseñador/Camilo:** qué muestra ese bloque. Mínimo deducible: el aporte planeado del
  emprendimiento de la semana. No deducible: cualquier "pagado con el emprendimiento / restante",
  porque no existe vínculo pago→aporte (fuera de alcance); si el diseño lo pide, vuelve a Spec.
- Siguiente paso tras aprobación: Diseñador/Integrador para los puntos de arriba; luego Arquitecto.

### 2.6 Criterios de HALT evaluados

- HALT 1: no bloqueante. Queda una pregunta abierta (contenido del bloque propio en la vista
  semanal) que se resuelve en diseño; el DoD fija el mínimo verificable y deja lo demás al diseño.
- HALT 3: creación del rango en PROD (F7) es gate humano.
- HALT 4: ninguno; el spec reduce exposición al candidato "única fuente de verdad".
- HALT 8: ningún ID ni credencial escrito.

### Registro de respuestas de Camilo (29 sept 2026, transcripción de voz vía Chief of Staff)

| # | Pregunta | Respuesta | Efecto en el spec |
|---|---|---|---|
| P1 | ¿Monto por semana o línea por pago? | Un solo monto por semana, en M1 planeación, "igual que como está hoy el ingreso semanal de H" (H = Angie, **interpretación sin confirmar**). | F1 upsert por semana; F3 replica superficies H1b 1–8. |
| P2 | ¿En la vista semanal? | Cubierta por "igual que Angie". | Por H1b(9)/H9 se deja fuera; a confirmar. |
| P3 | ¿A qué cuenta? | "la plata llega a mi cuenta de NU". | Opción (a)/(b) presentada; recomendación (b); F6 condicional. |
| P4 | ¿Semana al correr al mes siguiente? | Camilo la elige en ese momento. | F5: selector + 400 sin semana. |
| P5 | ¿Meses sin emprendimiento? | El campo sigue apareciendo, en cero. | F3 check P5. |
| R3-1 | ¿H = Angie? | "sí, supongo que H es Angie". | Confirmado. |
| R3-2 | Vista semanal | "deberíamos mostrar una división entre lo que semanalmente pone Angie y lo que yo comprometo para cumplir". Lectura de la sesión: bloque propio separado. | F3: bloque propio + recuadro de Angie intacto; §2.5 falta diseño; contenido abierto. |
| R3-3 | NU Camilo | Opción (b). | F6 en alcance, sin condicional. |
