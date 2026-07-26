---
ticket_id: SEMANA5-01
orden: 17
estado: activo
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

- [ ] Julio 2026: S5 (29-31 jul, 3 días) se genera correctamente con montos
      completos de conceptos `variable`, verificado en preview URL (dev).
- [ ] Simulación o prueba directa confirma que un mes de 30 días genera S5
      de 2 días, y que febrero 2026 (28 días, no bisiesto) **no genera S5**
      — caso de prueba obligatorio: es el escenario donde un off-by-one en
      el cálculo de días del mes produciría una S5 fantasma silenciosa.
- [ ] Cierre de S5 (`CIERRE_`) se genera en H5 con la misma estructura que
      S1-S4, verificado por lectura directa post-escritura (no solo código
      de respuesta).
- [ ] `DISPONIBLE MES` / `POR EJECUTAR` incluyen S5 correctamente cuando
      existe, sin duplicar montos ya contados en S1-S4.
- [ ] `tsc --noEmit` limpio.
- [ ] PR creado contra `main` — sin mergear.

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

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda técnica
encontrada, criterios de parada activados)
