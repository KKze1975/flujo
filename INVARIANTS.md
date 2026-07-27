---
# INVARIANTS.md — Flujo

Reglas que nunca deben romperse. Una violación produce error silencioso,
dato corrupto, o comportamiento incorrecto que el sistema no detecta
automáticamente.

## Criterio de admisión
Un invariante entra si su violación produce un error silencioso, un dato
corrupto, o un comportamiento incorrecto que el sistema no detecta
automáticamente. Preferencias de estilo, decisiones de UX reversibles y
convenciones de nomenclatura NO entran.

## Cómo se actualiza
Al cierre de cada sesión, la retrospectiva incluye una cuarta pregunta:
"¿Qué aprendizaje de esta sesión merece convertirse en un invariante?"
Si la respuesta es sí, se agrega aquí en el mismo commit de cierre,
antes de mergear a main.

---

## I-01 — Datos operativos: semana
La semana activa se calcula server-side en el momento del POST.
Nunca la infiere el cliente ni un modelo de IA.

## I-02 — Datos operativos: mes
El mes activo se calcula server-side. Nunca se pasa como parámetro
desde el cliente sin validación.

## I-03 — clasificado + bolsilloId
`clasificado` en H3B solo puede ser TRUE si `bolsilloId` está presente.
Nunca TRUE con bolsilloId null.

## I-04 — Sheet ID en código
El Sheet ID de producción nunca aparece hardcodeado en el código.
Solo se lee desde variables de entorno.

## I-05 — H4D legacy
H4D no se escribe ni se lee. Es tab legacy. Cualquier referencia a H4D
en código nuevo es un error.

## I-06 — id_recarga_origen deprecado
`id_recarga_origen` nunca se popula. Permanece en tipos como
`string | null` por compatibilidad, nunca se asigna.

## I-07 — tsc limpio antes de commit
`tsc --noEmit` debe pasar limpio antes de cada commit.
Verificado automáticamente por pre-commit hook.

## I-08 — Sheet ID prod no hardcodeado
El Sheet ID de producción no aparece en ningún archivo commiteado.
Verificado automáticamente por pre-commit hook.

## I-09 — Un ticket a la vez
No se abre construcción del siguiente ticket hasta que el DoD del
anterior esté verificado en preview URL.

## I-10 — Cambios de esquema requieren migración manual
Cambios de esquema en Sheet (rangos, columnas nuevas) requieren paso
explícito en el DoD: aplicar mismo cambio al Sheet de prod antes del merge.

## I-11 — main protegido
`git push origin main` directo está bloqueado. Todo cambio a prod
va por PR desde dev.

## I-12 — Confirmar path activo antes de causa raíz
Un componente puede contener el patrón exacto del bug y no estar en el
path de import activo (entrypoint → producción). Antes de declarar causa
raíz, trazar el import hasta `app/`. Grep localiza candidatos, no confirma
ejecución.

## I-15 — Preguntas con respuesta observable no se escalan al usuario
Antes de escalar una pregunta a Camilo, verificar si la respuesta es
observable en el repo o el Sheet mediante una acción de lectura.
Si lo es, ejecutar la lectura e incorporar el dato al loop.
Solo se escala cuando la respuesta requiere una decisión de diseño
con trade-offs que no tienen respuesta en el código o los datos.

## I-16 — Estados derivados por ausencia de valor
Estados derivados de una acción de traslado o reasignación no deben
inferirse por ausencia de valor (`null` como sentinel) en más de un
punto de consumo sin una fuente única que los declare explícitamente.
Segunda ocurrencia detectada: activa evaluación de migración a estado
## I-19 — Freno Informativo ante Preguntas
Ante una pregunta o consulta del usuario, la respuesta del agente debe limitarse exclusivamente a informar, explicar, diagnosticar o proponer opciones. Queda prohibido ejecutar modificaciones en el código, commits, escrituras en base de datos o acciones reactivas sin una instrucción u orden explícita del usuario, a menos que se esté ejecutando un Loop autónomo autorizante (`/goal`). (Origen: Aprobado por Camilo en sesión del 27 jul 2026).

---

## Candidatos (pendientes de aprobación — no vinculantes)

Registrados aquí para que no se pierdan, siguiendo la regla de que las
ideas nuevas se registran como candidatos y nunca se promueven directo
a método. Ver `BLOQUEANTE-0-DELTA.md` (11 julio 2026) y `INVARIANTS-GAP-01`
para el contexto completo.

### Candidato (originalmente I-13) — Completitud de esquema en `ensureHeaders`
`ensureHeaders` debe verificar completitud del esquema (longitud de columnas),
no solo existencia del primer header (A1). (Origen: `BL-10`/`T39`/`T40`).
Pendiente de aprobación explícita de Camilo.

### Candidato (I-14) — Obsoleto / Cubierto por I-01
La regla "mes y semana activa se derivan del servidor (`new Date()`)" está
formalizada bajo **I-01** e **I-02**. La nomenclatura "I-14" fue corregida en
`ESTADO.md` (26 jun 2026) y no existe como invariante separado.

### Candidato — Escrituras nuevas a Sheets vía `batchUpdate`, nunca `values.append` sin `INSERT_ROWS`
El patrón `values.append` sin `insertDataOption: "INSERT_ROWS"` puede
desalinear la detección de rango de la API de Sheets y sobrescribir
filas existentes en vez de agregar al final — causó pérdida real de 67
filas en septiembre (`crearMovimientosMes`). Cumple el criterio de admisión.
Pendiente de aprobación explícita de Camilo antes de convertirse en invariante real.

### Candidato — Pipe-tests para hooks/reglas de paquetes externos
Un hook o regla de seguridad copiado de un paquete externo debe probarse
con pipe-tests contra el caso de uso real antes de darlo por instalado.
(Origen: `claude-improvements`, 11 julio 2026). Pendiente de aprobación explícita.

### Candidato — Declaración explícita de ampliación de scope de credenciales
Cualquier ticket que amplíe el scope de una credencial ya existente debe
declararlo como punto explícito del Goal o del DoD antes de aprobarse.
(Origen: `BACKUP-NOCTURNO-01`, 21 julio 2026). Pendiente de aprobación explícita.

### Candidato — Verificación de tabs físicos por metadata (`spreadsheets.get`)
Antes de listar tabs/rangos de un Sheet por nombre lógico documentado,
verificar la lista real de tabs físicos por lectura de metadata (`spreadsheets.get`).
(Origen: `BACKUP-NOCTURNO-01`, 21 julio 2026). Pendiente de aprobación explícita.

### Candidato — Verificación de ancho real de esquema al limpiar/borrar rangos
Toda función que borra/limpia un rango fijo de columnas debe re-verificarse
contra el ancho real del esquema en cada migración de H1-H6.
(Origen: `FIX-RESET-COLUMNAS-01`, 22 julio 2026). Pendiente de aprobación explícita.

### Candidato (I-17) — Sign-off humano de Angie antes de merge a main
Un PR con protección de rama satisfecha técnicamente (I-11, GH006) no
implica autorización para mergear. Ningún merge a `main` procede sin
aprobación explícita de Angie como QA approver — este es un gate humano
adicional, independiente del gate técnico de GitHub. Un agente de
ejecución (Claude Code, Antigravity, Aider) que detecte un PR listo para
mergear debe escalar a Camilo/Angie, nunca mergear de forma autónoma.
(Origen: Memory de Project claude.ai, formalizado 27 jul 2026).
Pendiente de aprobación explícita de Camilo antes de convertirse en invariante real.

### Candidato (I-18) — Verificación de tickets ejecutados de forma autónoma
Todo ticket lanzado autónomamente por un agente de ejecución debe
verificarse en la siguiente sesión antes de iniciar trabajo nuevo. Un
ticket que desaparece de `tickets/INDICE.md` (o cambia de estado) sin un
hash de commit de éxito documentado, o sin una nota explícita de fracaso,
se considera no construido — no se asume completitud por ausencia de
evidencia en contrario.
(Origen: Memory de Project claude.ai, formalizado 27 jul 2026).
Pendiente de aprobación explícita de Camilo antes de convertirse en invariante real.