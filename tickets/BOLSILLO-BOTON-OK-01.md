---
ticket_id: BOLSILLO-BOTON-OK-01
orden: 37
estado: activo
tier: A
agente_ejecucion: claude-code
dependencias: ninguna
rol_activo: coder
paso_actual: construcción terminada, pendiente de Tester
actualizado_en: 2026-09-18T07:58:03-05:00
necesita_aprobacion: no
---

# BOLSILLO-BOTON-OK-01 — Botón verde de incentivo visual en bolsillos semanales

## Goal completo

Cambiar el color del botón "Cerrar bolsillo" (`components/VistaSemanal.tsx:1734-1754`)
de gris (`fl-btn ghost sm`) a verde (`fl-btn pos sm`) en los bolsillos semanales
`pago_fraccionado` (Frutas y verduras, Víveres y otros, Entretenimiento, Imprevistos —
cualquier bolsillo NO incluido en `idsBolsillosMensuales`), como incentivo visual a la
ejecución. Pedido real de Angie (usuaria/QA approver), relayado por Camilo, 18 sept 2026.

**Cambio puramente visual.** El botón conserva:
- Su texto actual ("Cerrar bolsillo").
- Su comportamiento actual: `onClick` llama `patchar(mov.id, { tipo: "ejecutar",
  montoEjecutado: gastado, ... })` directo, SIN abrir el panel de fuente de
  pago/ejecutor que sí pide el botón "OK" de conceptos regulares (línea 1797,
  `toggleOK` → panel → `confirmarOK`). Camilo confirmó explícitamente que esa
  información ya viene de los gastos individuales registrados vía FAB contra el
  concepto bolsillo — no hace falta pedirla de nuevo al cerrar.

**Fuera de alcance:**
- Los bolsillos mensuales (Mercado mensual, Frida, Fondo transporte) — quedan
  excluidos por diseño de `FIX-BOLSILLO-MENSUAL-01` (comentario línea 1725-1731 en
  el mismo archivo: "cerrarlo marca esa fila ejecutado de forma global... nunca debe
  poder cerrarse"). **No tocar el guard `!idsBolsillosMensuales.has(mov.conceptoId)`.**
- Cualquier cambio a `patchar`, al modelo de datos, o a la lógica de cálculo semanal
  (ver investigación previa en `ESTADO.md` del vault, sesión 17-18 sept 2026 — no hay
  bug de doble conteo, comportamiento verificado como correcto).
- El texto del botón. Solo el color/clase.

## Definition of Done

- [ ] En `components/VistaSemanal.tsx`, el botón de cierre de bolsillos semanales
      (línea ~1735) usa `className="fl-btn pos sm"` en vez de `"fl-btn ghost sm"`.
- [ ] El `onClick` y sus parámetros (`patchar(...)`) quedan exactamente iguales —
      sin diff más allá de la clase.
- [ ] El guard `!idsBolsillosMensuales.has(mov.conceptoId)` (línea 1732) permanece
      intacto — los bolsillos mensuales no muestran este botón.
- [ ] `npx tsc --noEmit` limpio.
- [ ] Verificado visualmente contra preview de Vercel (o dev local): el botón se ve
      verde en al menos un bolsillo semanal real (ej. Frutas y verduras) y sigue sin
      aparecer en un bolsillo mensual (ej. Mercado mensual).

## Contexto / diagnóstico previo

Investigación completa en la sesión de vault del 17-18 sept 2026 (`ESTADO.md` del
vault, no de este repo): confirmó que el botón "OK" verde de conceptos regulares usa
`fl-btn pos sm` (`app/globals.css:16,224`, token `--pos: oklch(0.55 0.13 158)`), que
los bolsillos semanales ya tienen una acción de cierre equivalente pero gris
(`fl-btn ghost sm`, sin panel de fuente/ejecutor), y que el total semanal
(`totalEjecutado`, línea 1040-1044) no duplica el monto de los bolsillos mensuales —
sin relación con este ticket, dejado como está por decisión explícita de Camilo.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

Confirmado el estado real del código antes de tocar nada: botón "Cerrar bolsillo" en
`components/VistaSemanal.tsx:1735`, `className="fl-btn ghost sm"`, guard
`!idsBolsillosMensuales.has(mov.conceptoId)` en línea 1732, `onClick`/`patchar(mov.id, {
tipo: "ejecutar", montoEjecutado: gastado, ... })` en 1739-1750 — todo tal como describe
el ticket.

Cambio aplicado: `className="fl-btn ghost sm"` → `className="fl-btn pos sm"` en ese único
botón (línea 1735). `git diff` confirma que el diff es exactamente esa línea — nada más
en el archivo. El guard de bolsillos mensuales, el `onClick` y los parámetros de
`patchar` quedan sin modificar. Se verificó con `grep -n 'fl-btn ghost sm'
components/VistaSemanal.tsx` que los demás botones `ghost` del archivo (líneas 263, 425,
429, 446, 555, 638, 803, 898, 902, 1805, 1875, 1929, 2056, 2181) siguen intactos.

`npx tsc --noEmit` corrió limpio, sin errores.

Sin ambigüedades ni criterios de HALT activados. No se tocó ningún otro archivo del
repo — los cambios sin relación presentes en el working tree (`dev.log`,
`tickets/INDICE.md`, `openraut.txt`, `scratch/`, `video2.txt`, `videolist*.txt`) no
forman parte de este ticket y no se incluyeron en el commit.

Verificación visual contra preview de Vercel/dev local (último ítem del DoD) queda
pendiente — fuera del alcance de este Coder, la hace el Tester.

Construcción terminada, pendiente de Tester.
