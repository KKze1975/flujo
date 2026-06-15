# PROMPT_AGENTE — Flujo · Template de sesión autónoma para Claude Code

> Instrucción de uso: Copia este archivo completo. Rellena las secciones marcadas con `[COMPLETAR]`.
> El resto es contexto fijo — no lo modifiques salvo que el proyecto haya cambiado estructuralmente.

---

## 1. Contexto del proyecto

**Proyecto:** Flujo — App de finanzas familiares (familia Villamil)
**Stack:** Next.js + TypeScript + Tailwind CSS
**Backend:** Google Sheets (invisible para usuarios finales)
**Deploy:** Vercel (auto-deploy en push a `main`)
**Repo:** `github.com/KKze1975/flujo` (privado)
**Ruta local:** `D:\Users\camilo\flujo`
**Shell:** PowerShell exclusivamente

**Sheets:**
- Producción ID: `1GOMhxYw_f7Zl-GTVNtxAs9218x4vKxzg3LGRyveyr7A`
- Dev ID: copia en Sheet separado — usar variable de entorno `GOOGLE_SHEET_ID`
- Service account: `psibot@psibot-495119.iam.gserviceaccount.com`

**Ramas:**
- `dev` — rama de trabajo. Todo desarrollo va aquí.
- `main` — protegida. Solo recibe PRs. **Nunca push directo.**

**URLs de referencia:**
- Preview dev: Vercel genera URL automática en cada push a `dev`
- Producción Angie: `https://flujo-ldpq0a0ju-camilo-s-projects10.vercel.app/`

**Sheets relevantes:**
- H1: Presupuesto base
- H2: Mes activo (movimientos fijos)
- H3B: Consumos / pago fraccionado
- H4A/B/C/D: Ingresos y saldos
- H5: Cierres semanales
- H6: Histórico

**Herramientas disponibles:**
- `graphify query / path / explain` — navegación de código antes de leer archivos
- `node scripts/generate-kanban.mjs` — regenera `public/kanban.html`
- `tsc --noEmit` — validación de tipos (ejecutar después de cada pieza)
- `/admin/trazabilidad` — snapshot antes/después para QA

---

## 2. Invariantes activos (no negociables)

Lee `INVARIANTS.md` completo antes de escribir una sola línea de código.
Si alguna decisión de implementación roza un invariante, detente y reporta
antes de continuar.

Los invariantes del archivo son la fuente de verdad — no esta sección.

---

## 3. Ticket activo

**ID:** [COMPLETAR — ej: BL-02]
**Nombre:** [COMPLETAR]

**Descripción:**
[COMPLETAR]

**Definition of Done (DoD) — verificable en preview URL:**
- [ ] [COMPLETAR]
- [ ] [COMPLETAR]
- [ ] [COMPLETAR]

**Piezas de construcción:**
1. [COMPLETAR — P1: descripción]
2. [COMPLETAR — P2: descripción]

**Convención de commits:** `[ID]-P[N]: descripción` — ej: `BL-02-P1: descripción`

---

## 4. Restricciones de ejecución

1. **Rama:** Trabajar exclusivamente en `dev`. Ningún comando debe tocar `main`.
2. **Commits:** Un commit por pieza completada con `tsc --noEmit` limpio.
3. **Hook:** No usar `--no-verify` en commits que tocan código TypeScript. Excepción permitida: commits de documentación o assets sin TypeScript (ej: actualización de ESTADO.md, kanban.html, imágenes). Si el hook falla en un commit de código, ver criterios de parada.
4. **Scope:** No tocar archivos fuera del scope del ticket. Si encuentras algo que debería corregirse, documentarlo en SESSION_LOG.md como deuda técnica — no corregirlo inline.
5. **PR:** Crear el PR al finalizar pero **no mergearlo**. El merge es manual y requiere QA de Angie primero.
6. **Sheet IDs:** Usar siempre variables de entorno. Nunca hardcodear IDs en código fuente.

---

## 5. Criterios de parada

Si alguna de estas condiciones ocurre, **detente, documenta en SESSION_LOG.md y no continues:**

1. **`tsc --noEmit` con errores** — no uses `--no-verify` para saltarlo. Documenta el error exacto.
2. **Hook detecta Sheet ID hardcodeado** — no uses `--no-verify`. Documenta qué línea y por qué ocurrió.
3. **DoD no verificable en preview URL** — documenta qué punto del DoD no pasa y cuál es el comportamiento observado.
4. **Cambio necesario fuera del scope del ticket** — no lo ejecutes. Documenta como deuda técnica en SESSION_LOG.md.
5. **Conflicto de merge** — no lo resuelvas solo. Detente y documenta.

---

## 6. Cierre esperado

Al terminar el ticket, antes de cerrar la sesión:

1. `tsc --noEmit` limpio confirmado.
2. `node scripts/generate-kanban.mjs` ejecutado y `public/kanban.html` commiteado.
3. PR creado contra `main` — **sin mergear**.
4. `SESSION_LOG.md` actualizado con:
   - Piezas completadas y commits asociados
   - Decisiones tomadas durante la construcción
   - Deuda técnica encontrada (si aplica)
   - Puntos del DoD verificados
   - Cualquier criterio de parada que se activó (si aplica)

**Para cuando termines. No abras trabajo nuevo.**

---

## SESSION_LOG.md — Estructura esperada

```markdown
# SESSION_LOG — [ID Ticket] · [Fecha]

## Piezas completadas
- P1: [descripción] — commit [hash]
- P2: [descripción] — commit [hash]

## Decisiones tomadas
- [decisión y razón]

## Deuda técnica encontrada
- [descripción] — no corregida, documentada

## DoD verificado
- [x] Punto 1
- [x] Punto 2

## Criterios de parada activados
- Ninguno / [descripción si aplica]
```
