---
ticket_id: UBER-02
orden: 13
estado: diagnostico_listo
tier: B
dependencias: UBER-01
---

# UBER-02 — Decisión de esquema H3B para monto "trabajo"

## Goal completo

Definir dónde vive en H3B el monto de un viaje Uber clasificado como
"trabajo" — no pertenece a ningún bolsillo familiar existente (I-03 no
aplica directamente). Opciones a evaluar: bolsillo especial no-familiar vs.
campo separado fuera del modelo de bolsillos.

**Tier B**: requiere decisión de diseño antes de construir — no es un fix
mecánico. Bloqueado por `UBER-01`: sin confirmar que el correo distingue
`[Business]`/`[Personal]`, no hay base real para diseñar el esquema.

**Actualización tras cierre de `UBER-01` (verificación real en Gmail,
completada):** el supuesto base de este ticket **no se sostiene**.
`UBER-01` buscó exhaustivamente (`in:anywhere`, todo el historial desde
2020) y **no encontró ningún correo con prefijo `[Business]`** — todos los
recibos de Uber de esta cuenta traen `[Personal]`. No hay señal de asunto
que distinga un viaje de trabajo de uno personal. Antes de que `/goal-b`
pueda diagnosticar este ticket como está planteado, la pregunta de fondo
cambia de "¿dónde vive en H3B el monto de un viaje clasificado como
trabajo?" a "¿cómo se clasifica un viaje como trabajo, si no es por el
asunto del correo?" — candidatos no evaluados aún: clasificación manual
por Camilo al momento de registrar, o alguna otra señal dentro del cuerpo
del correo (no confirmada). Este ticket necesita reformularse, no solo
desbloquearse, antes de aprobar su fase de diagnóstico.

**Decisión explícita de Camilo (sesión de chat, tras revisar la evidencia
de `UBER-01`):** clasificación **manual** — Camilo confirma que hace mucho
que no pide un viaje bajo el perfil "negocio", pero al ver que la búsqueda
cubrió *todo* el historial de esa cuenta (enero 2026 en adelante revisado
explícitamente, y 2020-2026 completo) sin un solo `[Business]`, opta por
volver al plan de clasificación manual en vez de depender del prefijo de
asunto. **Esto no es todavía la fase de diagnóstico formal de `/goal-b`**
— es la decisión de rumbo que la habilita. Falta, cuando se apruebe correr
`/goal-b UBER-02`: definir el mecanismo concreto de "clasificación manual"
(¿un campo en el modal de registro? ¿un botón en `VistaSemanal`?) y, con
eso resuelto, la pregunta original del ticket (dónde vive en H3B el monto
de un viaje "trabajo") sigue siendo la que falta decidir.

## Definition of Done

**Fase diagnóstico/diseño (tier B — HALT obligatorio antes de aprobar):**
- [ ] Decisión documentada con alternativas descartadas y razón.
- [ ] Esquema de H3B actualizado en la especificación (no en el Sheet
      todavía).
- [ ] "Aprobado para construir" explícito de Camilo sobre esta decisión
      puntual.

## Contexto / diagnóstico previo

Depende de la evidencia recogida en `UBER-01`. Alimenta directamente el
esquema de escritura que usará `UBER-04`.

## Diagnóstico (Tier B — pendiente de aprobación del plan)

### Hecho clave que cambia el análisis de las 2 opciones originales

Verificado contra código real: **ningún cálculo de totales/balance familiar
excluye nada hoy** — todo lo que está en H3B se suma sin filtro:
- `components/m1/VistaPlanificacion.tsx:993` — `totalEjecutadoH3 =
  consumos.reduce((s, c) => s + c.monto, 0)`, sin filtro de categoría/flag.
- `components/VistaSemanal.tsx:987-994` — mismo patrón, `totalEjecutado =
  totalEjecutadoH2 + totalEjecutadoH3`.
- El flag `imprevisto` existente (`app/api/consumos/[id]/imprevisto`,
  `VistaSemanal.tsx:143-153`) es puramente informativo/visual (badge
  naranja) — **no excluye el monto de ningún total**. No es precedente de
  un mecanismo de exclusión, contra lo que podría asumirse.

Esto significa que **cualquier opción que escriba el monto de un viaje de
trabajo en H3B con un `bolsilloId` real inflará el balance familiar**, a
menos que se agregue lógica de exclusión nueva en cada uno de esos cálculos
(riesgo de "whack-a-mole": fácil olvidar un lugar donde se suma).

### 3 opciones (las 2 originales del ticket + una encontrada al investigar)

- **Opción 1 — Bolsillo especial no-familiar** (concepto ficticio nuevo en
  H1, ej. "Uber Trabajo"). Reutiliza 100% el flujo de bolsillos existente,
  cero tablas nuevas. **Pero** requiere modificar todos los cálculos de
  totales de arriba para excluir ese `id_concepto` específicamente — mismo
  riesgo de "whack-a-mole" que motivó parte de este diagnóstico.

- **Opción 2 — Campo separado en H3B** (columna nueva booleana, ej.
  `es_trabajo`, mismo patrón que `imprevisto`). Mismo problema que Opción 1:
  los cálculos de totales tendrían que empezar a filtrar por este flag en
  cada lugar. Además, ambigüedad sin resolver: I-03 exige `bolsilloId` =
  `id_concepto` real de H1 para `clasificado: true` — un consumo de trabajo
  necesitaría igual un concepto "ancla" en H1, circular con la Opción 1.

- **Opción 3 — Tab completamente separado, fuera de H3B** (no estaba en el
  ticket original — surge de la investigación). Los registros de viajes de
  trabajo NUNCA entran a H3B, así que ningún cálculo existente los ve —
  cero riesgo de tocar código de totales familiares. I-03 no aplica (no es
  H3B). Encaja con la nota ya existente en `UBER-04` ("reporte a Zoho
  Expense fuera de alcance — no construir"): sugiere que el registro de
  trabajo puede ser deliberadamente simple y aislado, no integrado a la UI
  de bolsillos. Costo: nuevo tab + esquema mínimo, sin UI reutilizable
  (probablemente alcance con una vista de solo lectura o ninguna).

**Sin recomendación vinculante** — la Opción 3 es la que menos riesgo trae
a código ya funcionando, pero es la que más se aleja del planteamiento
original del ticket. Decisión tuya.

### Mecanismo de clasificación manual — hallazgo relevante para UBER-04

La nota de la sesión anterior dejó abierto "¿cómo se clasifica manualmente
un viaje de trabajo?". Encontré una opción concreta que no requiere UI
nueva en Flujo: los mensajes de Gmail ya traen `labelIds` (confirmado en
la búsqueda de `UBER-01`, ej. `["UNREAD","INBOX"]`) — Camilo podría aplicar
una **etiqueta de Gmail** (ej. "Uber Trabajo") a los correos de viajes de
trabajo, y el parser de `UBER-04` la leería en vez de un prefijo de asunto.
Reutiliza la misma arquitectura basada en Gmail que `UBER-04` ya asume, sin
tocar la UI de Flujo. No implementado ni decidido — solo lo señalo porque
resuelve directamente la pregunta abierta, y no estaba entre los candidatos
que había listado antes ("campo en modal" / "botón en VistaSemanal").

## Commit de cierre

`UBER-02-diagnostico: diagnostico_listo` (ver historial de `dev`).

## Notas de ejecución

Fase de diagnóstico cerrada — HALT obligatorio por diseño de Tier B. No se
escribió código de fix ni se tocó ningún dato en Sheet. Falta: que Camilo
elija Opción 1/2/3 (o el mecanismo de etiqueta Gmail, o proponga otra) y
cambie `estado` a `aprobado_para_fix` para que `/goal-a UBER-02` ejecute
el fix ya diagnosticado.
