# BLOQUEANTE-0 — Delta documentación vs. estado real del repo

**Fecha:** 2026-07-11
**Tipo de sesión:** CONSTRUCCIÓN/DEBUGGING (verificación) — sin cambios de código.
**Auditor:** Claude Code (Claude Fable 5), a petición de sesión mediada por claude.ai
(proyecto Agente HG SDD).
**Objetivo:** desbloquear Bloqueante 0 (migración de documentación al vault
obsidian-mind), confirmando si ESTADO.md/INVARIANTS.md reflejan el estado real
del código o si hay deriva sin registrar.

---

## 0. Resumen ejecutivo

La deriva más grave que doctrina temía (código construido a velocidad superior
a la documentación, con hallazgos críticos sin registrar) **no está presente**
en el hallazgo #1 de mayor severidad: ESTADO.md ya documenta correctamente,
en su entrada más reciente, que `crearMovimientosMes` sigue roto. El repo no
tiene un secreto oculto — tiene una **documentación correcta pero mal
estructurada**, y **decisiones de diseño pendientes que nunca se cerraron**.
Ese es el delta real.

No se encontró ningún hook nuevo, script en `.claude/`, ni decisión de
arquitectura en el código que no esté ya registrada en ESTADO.md o en los dos
audits previos (`audit-fable-01/`, `audit-adversarial-01/`).

---

## 1. Lo que dice la documentación (tal como existe hoy)

- **ESTADO.md** (5335 líneas): el encabezado (línea 1-2) dice *"Actualizado:
  26 junio 2026 | Fase: Go-live — S3 cerrado — T51 abierto"* — pero el
  contenido real del archivo llega hasta el 9 de julio (commit `087811b`,
  HEAD de `dev`), con tickets completamente distintos ya cerrados
  (`FEAT-BARRA-EJECUTADO-PERSONA-01`, `AUDIT-ADVERSARIAL-01`,
  `AUDIT-FABLE-01`). El encabezado nunca se actualiza; el archivo funciona
  como **log append-only**, no como resumen de estado.
- **INVARIANTS.md** (77 líneas): I-01 a I-12, salto a I-15. **No existen I-13
  ni I-14** — hueco de numeración sin explicación en el archivo. 15
  invariantes activos, todos con criterio de admisión claro.
- **No existen `SPEC.md` ni `BITACORA.md`** como archivos con esos nombres
  exactos en el repo. Sus funciones las cumplen otros archivos:
  - Contenido tipo spec (misión, flujos as-is/to-be, requisitos, esquema de
    datos aprobado) vive **dentro de ESTADO.md**, líneas 1-∼145.
  - Bitácora de sesiones vive en **SESSION_LOG.md** (2648 líneas) — mismo
    patrón: encabezado dice *"2026-06-20"*, contenido real llega más
    adelante.
  - Auditoría de negocio específica vive en **AUDITORIA_JULIO.md** (263
    líneas, cerrada sin bugs, commit `50c4c93`).

## 2. Lo que es cierto en el código real

- **`.git/hooks/pre-commit` existe** (952 bytes, ejecutable) y hace
  exactamente lo que CLAUDE.md/INVARIANTS.md (I-07, I-08) afirman: corre
  `tsc --noEmit` y bloquea el commit si el Sheet ID de dev o prod aparece
  hardcodeado en el código fuente. Verificado leyendo el archivo completo.
- **El hook no está versionado.** Vive solo en `.git/hooks/`, fuera del
  árbol de trabajo. No hay `.husky/`, ni script `"prepare"` en
  `package.json`, ni `core.hooksPath` configurado. Un clon nuevo, otra
  máquina, u otro colaborador **no tiene I-07/I-08 aplicados**. Esto ya
  estaba encontrado y registrado dos veces (Hallazgo 7 de
  `audit-adversarial-01`, H-21 de `audit-fable-01`) — no es hallazgo nuevo,
  pero sigue sin resolver.
- **No existe ningún hook ni verificación automática (pre-commit o de otro
  tipo) para el patrón `values.append` sin `INSERT_ROWS` vs. `batchUpdate`.**
  Esto es la pregunta específica que pedía la tarea, y la respuesta es
  **no** — el pre-commit solo cubre tsc y Sheet ID, nada relacionado con el
  patrón de escritura a Sheets.
- **`crearMovimientosMes` (`lib/data/sheets.ts:270-283`) sigue usando
  `values.append` con `valueInputOption: "RAW"`, sin `insertDataOption:
  "INSERT_ROWS"`.** Verificado leyendo el código en disco hoy. Coincide
  exactamente con lo que ESTADO.md ya documenta en su última entrada
  (`Verificación de gobernanza — FIX-CREARMOVIMIENTOSMES-01 · 9 julio 2026`,
  resultado **"(c) NUNCA CONSTRUIDO"**). `git log --all -- lib/data/sheets.ts`
  no muestra ningún commit posterior al bug original (`6f3dcb0`) que lo
  toque. **La documentación acierta; el código no se movió.**
- El mismo patrón (`values.append` sin `INSERT_ROWS`) está presente en 5
  métodos más (`createConcepto`, `createIngresoCamilo/Angie`,
  `createCierreSemana`, `createPlanSemana`) — ya registrado como Hallazgo 9
  en ESTADO.md, sin incidente confirmado en esos casos todavía.
- **Rama local `main` está 21 commits detrás de `origin/main`** y no se usa
  para nada activo — todo el trabajo vive en `dev`. No es un problema en sí,
  pero es una superficie de confusión si alguien asume que `main` local
  refleja producción.
- **`audit-adversarial-01/` no está trackeado en git** (aparece en
  `git status` como untracked) — vive en el filesystem pero no en el
  historial. Si se limpia el working directory sin cuidado, se pierde.
- **El leg de Gemini en `audit-adversarial-01` falló técnicamente.**
  `gemini-findings.md` tiene 22 líneas (esencialmente vacío);
  `gemini-stderr.log` muestra 503 repetidos y un crash final por memoria
  agotada del proceso Node. La "auditoría adversarial" documentada en
  ESTADO.md como cruce de dos modelos independientes fue en la práctica
  **Claude (rol adversarial) vs. Claude Fable (audit-fable-01, sesión
  ciega separada)** — segunda opinión real, pero no la diversidad de
  modelo que el nombre del directorio sugiere. Vale la pena que quede
  registrado así, no como diversidad Gemini+Claude.

## 3. Delta explícito: documentación vs. código

| Ítem | Documentación dice | Código real | Delta |
|---|---|---|---|
| `crearMovimientosMes` | ESTADO.md: "NUNCA CONSTRUIDO", prioridad #1 | `values.append` sin `INSERT_ROWS`, sin cambios desde `6f3dcb0` | **Ninguno — doc y código coinciden.** |
| Pre-commit hook I-07/I-08 | INVARIANTS.md: "verificado automáticamente" | Existe y funciona, pero no versionado | **Doc omite que el hook no sobrevive a un clon nuevo** (ya sabido, sin resolver) |
| Invariante para `values.append`/`batchUpdate` | No existe ningún I-xx que lo cubra | Es el riesgo confirmado de mayor severidad del repo (incidente real: 67 filas perdidas) | **Gap: cumple el criterio de admisión de INVARIANTS.md y no está promovido** |
| P-1 a P-8 (preguntas abiertas de `audit-fable-01`) | Sección "Decisiones tomadas en esta sesión" con placeholder `[Camilo completa...]` | Placeholder sigue sin llenar en el HEAD actual | **Ninguna de las 8 decisiones de diseño pendientes se cerró** |
| Ticket "próximo" en ESTADO.md | Prompt completo listo para `FIX-RESET-COLUMNAS-01` | Reclasificado por la propia ESTADO.md a *menor* prioridad que `FIX-CREARMOVIMIENTOSMES-01` | **No hay prompt de construcción escrito todavía para el ticket que la doc misma dice que es prioritario** |
| Encabezado ESTADO.md / SESSION_LOG.md | Fechas de junio | Contenido real hasta julio 9 | **Encabezados stale; el archivo es un log, no un resumen** — riesgo para cualquiera que lea solo las primeras líneas |
| `SPEC.md`, `BITACORA.md` | Se asumen como archivos existentes (nombrados así en el prompt de esta sesión) | No existen con esos nombres; sus funciones están repartidas en ESTADO.md/SESSION_LOG.md | **Desalineación de nomenclatura entre lo que la doctrina espera y lo que el repo tiene** |

## 4. Punto transversal (no específico de Flujo)

El propio Camilo señaló que Bloqueante 0 no debería quedar atado solo a
Flujo. Confirmado por esta auditoría: el patrón de falla no es "un bug
escondido" sino **estructura documental que se degrada silenciosamente**
(encabezados que no se actualizan, decisiones abiertas que nunca se cierran,
mecanismos —el hook— que existen pero no se versionan). Ninguno de estos
patrones es específico de la lógica de negocio de Flujo. El mecanismo de
auditoría usado aquí (comparar cabecera vs. cola del archivo de estado,
grep de hooks reales vs. documentados, verificar si los placeholders de
"decisiones tomadas" siguen vacíos) es reproducible en School Bot y
cualquier otro proyecto antes de declarar Bloqueante 0 cerrado a nivel
transversal — no se ejecutó aquí por estar fuera del alcance de esta sesión
(solo Flujo), pero queda como recomendación explícita para el reporte a
claude.ai.

## 5. Candidato a invariante (NO promovido — requiere aprobación humana)

Cumple el criterio de admisión de INVARIANTS.md (violación = dato corrupto
silencioso, incidente ya confirmado con 67 filas perdidas). Propuesta de
texto, pendiente de que Camilo la apruebe en sesión de diseño/retrospectiva
antes de entrar como I-16 real:

> **I-16 (candidato) — Escrituras nuevas a Sheets vía `batchUpdate`, nunca
> `values.append` sin `insertDataOption: "INSERT_ROWS"`.**
> El patrón `values.append` sin este flag puede desalinear la detección de
> rango de la API de Sheets y sobrescribir filas existentes en vez de
> agregar al final — causó pérdida real de 67 filas en septiembre. Todo
> método de creación en `lib/data/sheets.ts` debe usar `batchUpdate` o
> `values.append` con `insertDataOption: "INSERT_ROWS"` explícito.

No se agregó a INVARIANTS.md en esta sesión — solo queda registrado aquí
como candidato, siguiendo la regla de "ideas nuevas se registran como
candidatos, nunca se promueven directo a método".

## 6. Qué NO se hizo en esta sesión (por diseño)

- No se corrigió `crearMovimientosMes` ni ningún otro código.
- No se resolvieron las preguntas P-1 a P-8.
- No se agregó I-16 a INVARIANTS.md — solo se dejó como candidato (sección 5).
- No se tocó ningún archivo fuera de: lectura + este documento nuevo +
  entrada de cierre en ESTADO.md.

## 7. Veredicto sobre Bloqueante 0

**Desbloqueable.** La auditoría de estado real ya se hizo (dos veces, de
hecho, en `audit-fable-01` y `audit-adversarial-01`), y el hallazgo #1 que
motivó la duda ("¿la doc miente sobre el estado del código?") se confirma
**falso** — ESTADO.md acierta en su hallazgo más crítico. Lo que falta no es
más auditoría de código sino **tres decisiones administrativas**: (1) que
Camilo llene el placeholder de decisiones P-1 a P-8, (2) que se decida si
I-16 se promueve, y (3) que se acuerde si ESTADO.md/SESSION_LOG.md
continúan como logs append-only o se separan en un resumen vivo + archivo
histórico antes de migrar al vault (la migración probablemente se beneficia
de resolver esto antes, no después — un log de 5335 líneas con encabezado
de hace 6 semanas es exactamente el tipo de artefacto que un vault
mal-migrado congelaría en su peor estado).
