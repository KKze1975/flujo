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