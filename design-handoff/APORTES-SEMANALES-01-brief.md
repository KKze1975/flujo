# Brief de diseño — Aportes del emprendimiento por semana (APORTES-SEMANALES-01)

Rol: Diseñador/Integrador (`.claude/agents/disenador-integrador.md`). Paso 1 de 2 — este
documento es el brief para Antigravity/Stitch. La integración (paso 2) ocurre cuando Camilo
trae de vuelta el HTML/diseño. Hoy no hay HTML: este brief es el insumo, no la aprobación.
Spec de origen (aprobado 29 sept 2026): `specs/APORTES-SEMANALES-01.md`, §2.5.

**Estado: variante A elegida por Camilo (29 sept 2026). Brief listo para Antigravity/Stitch.** Las
demás piezas están definidas. Ningún ticket de construcción abre contra la vista semanal hasta
que Camilo apruebe el diseño generado (regla T21).

## 0. Contexto en dos líneas

Desde octubre entra plata del emprendimiento (~$5M/mes, en pedazos por semana). Camilo anota un
monto por semana en la planeación del mes (M1), igual que hoy el aporte semanal de Angie, y
quiere ver "una división entre lo que semanalmente pone Angie y lo que yo comprometo para
cumplir". Camilo es el usuario; Angie también usa la app, por lo que nada de Angie cambia.

## 1. Sistema visual: reusar, no inventar

Todo hereda el tema activo (no fijar colores). Tokens ya definidos en `app/globals.css`:
`--surface`, `--surface-2`, `--ink`, `--ink-soft`, `--ink-faint`, `--line`, `--primary`,
`--primary-soft`, `--pos`, `--neg`, `--warn`/`--warn-soft`, `--persona-c`, `--persona-a`,
`--radius-inner`, `--radius-btn`. Clases ya construidas: `.fl-input`, `.fl-btn`
(`primary`/`ghost`/`sm`), `.fl-person` (`c`/`a`), `.fl-badge` (`pos`/`neg`/`warn`/`primary`),
`.fl-chip`, `.fl-tabs`/`.fl-tab`, `.dk-navlabel`, `.dk-fchip` (`on`), `.dk-seg2`,
`.dk-exp-lbl`, `.dk-opt`. **No se proponen tokens ni clases nuevas.** Si el diseño generado
trae valores distintos, se mapean al equivalente `fl-*` en la integración.

## 2. Piezas que se COPIAN del aporte de Angie (M1, escritorio) — solo confirmar etiqueta y distintivo

Molde actual del aporte de Angie (componente `components/MesM1Desktop.tsx`, no cambia):

| Superficie de Angie hoy | Réplica para el emprendimiento |
|---|---|
| Sidebar planificación: `.dk-navlabel` "Aportes Angie" + tarjeta `--surface-2`, `--radius` 14px, una fila por semana (S1..S4/S5: etiqueta 20px + `.fl-input` numérico alineado a la derecha) + botón `.fl-btn primary sm` "Guardar aportes" | Segundo bloque justo debajo del de Angie, etiqueta **"Aportes emprendimiento"**, mismas filas por semana, botón "Guardar aportes emprendimiento". En meses sin aportes: todas las semanas en 0 (placeholder "0"), el bloque siempre visible. |
| "Balance mes": fila "Aportes Angie" | Fila nueva **"Aportes emprendimiento"** justo debajo; "Total disponible" = Camilo + Angie + emprendimiento. |
| "Por semana" (planificación y ejecución): chip `A:$monto` | Chip **`E:$monto`** junto al `A:`, mismo tamaño/tipografía (10px, `--ink-faint`). En ejecución el chip lleva `✓`/`(plan)` como el de Angie solo si Angie lo lleva (no hay confirmación para el emprendimiento: nunca `✓`, solo el monto). |
| Ejecución, botón `.fl-btn ghost sm` con `.fl-person a` "A" + "Aporte Angie" → modal | Botón hermano `.fl-btn ghost sm` "Aporte emprendimiento" → mismo modal (por semana). |
| Móvil `MesM1Mobile`: solo se suma dentro de "Ingresos del mes" | Igual: solo suma al total, sin bloque propio. |

**Etiqueta propuesta (confirmar):** "Aportes emprendimiento" en plural para el bloque/fila,
"Aporte emprendimiento" para el botón, abreviatura de chip `E:`.

**Distintivo visual propuesto (confirmar; hay que elegir uno, sin token nuevo):**
- Recomendado: círculo `.fl-person` **no** se reutiliza (los colores `c`/`a` son personas y
  "C" se confundiría con el ingreso de Camilo). Usar en su lugar un `.fl-badge.primary`
  (`--primary` sobre `--primary-soft`) con la letra "E" (o ícono `bolt` de `Icon`), y el chip
  `E:` en `--primary` para distinguirlo del `A:` neutro.
- Alternativa: sin distintivo de color, solo texto `E:` (más sobrio, riesgo: se lee igual que
  `A:`).
Pedir al diseño una sola propuesta con la recomendada y dejar la alternativa como variante.

## 3. Bloque propio en la vista semanal (`VistaSemanal`) — variante A elegida

Hoy, en `/mes/[mes]/semana`, cuando el actor es Angie hay un recuadro (`--surface-2`,
radio 16, padding 14x16) con "Saldo NU Angie", "Sin clasificar", y bajo una línea: "Aporte
planeado Sx", "Gastado esta semana", "Disponible semana". **Ese recuadro no se toca** (ni su
contenido ni su posición).

Nuevo: un **recuadro separado**, hermano del de Angie, para el emprendimiento. Camilo lo pidió
para ver la división "entre lo que semanalmente pone Angie y lo que yo comprometo para
cumplir". Requisitos fijos, valgan las variantes que valgan:
- Mismo lenguaje visual del recuadro de Angie (fondo `--surface-2`, radio 16, filas
  etiqueta `--ink-soft` 12px + valor tabular), para que se lea como pareja, pero claramente
  separado (espacio propio entre los dos, título propio, distintivo de la sección 2).
- Se muestra para la semana visible; en semanas sin aporte muestra **$0** (nunca oculto ni
  vacío).
- **No puede mostrar** "pagado con el emprendimiento" ni "lo que queda": no existe manera de
  saber con qué plata se pagó cada pago (fuera de alcance). Ningún saldo que dependa de eso.
- Recibe el valor como dato ya calculado; no es interactivo salvo lo que diga la variante.

Variantes para que Camilo elija (en lenguaje cotidiano; cada una es compatible con el límite):

**Variante A — Solo el número.**
Un recuadro chiquito con el título "Emprendimiento" y una línea: "Aporte planeado S2: $1.500.000".
Si esa semana no espera nada, dice $0. Ves de un vistazo cuánto habías dicho que iba a llegar
esa semana, y nada más. Lo más simple y lo mínimo que pide el spec.

**Variante B — El número más el contexto del mes.**
El mismo recuadro, con la línea de la semana y debajo, en letra más suave, "Este mes: $5.000.000
planeados · S1 $1.500.000 · S2 $0 · S3 $2.000.000…" (los montos de todas las semanas, con la
semana visible resaltada). Sirve para responder "¿cuánto me falta por recibir de lo que
planeé?" sin salir de la vista semanal. Es solo lo planeado, no lo que llegó.

**Variante C — El número y una alerta cuando hay pagos que dependen de él.**
La línea de la semana, y si esa semana tiene un aporte planeado y hay pagos pendientes en la
semana, un texto suave: "Si este aporte no llega, puedes mover pagos con el botón Posponer".
El recuadro no calcula nada nuevo: es un recordatorio del paso que ya existe. Ayuda a conectar
"esto no llegó" con "corro pagos", sin amarrar pagos a aportes. (Trae el riesgo de ser ruido
cuando ya sabes qué hacer.)

**Pedir al diseño las tres variantes, etiquetadas A/B/C, en el mismo frame para comparar.** Las
combinaciones (p. ej. B + C) las decide Camilo; la elegida se marca aquí antes de construir:

> Variante elegida por Camilo: **A — solo el número** (29 sept 2026: "A. Solo el número"). B y C descartadas.

## 4. Selector de semana al correr un pago al mes siguiente

Regla del spec (P4): cada vez que un pago se corre al mes siguiente, Camilo elige la semana
de ese mes en ese momento; nunca queda sin semana. Hoy hay tres lugares que lo hacen distinto:

1. **Vista semanal, modal de posponer** (`VistaSemanal.tsx`, ~l.599): sección "Semana destino"
   con `.dk-seg2` (una celda por semana del mes actual, las cerradas deshabilitadas con "×") y
   una celda final "Mes sig.". Elegir "Mes sig." hoy manda el pago sin semana → **bug que este
   diseño corrige**.
2. **`MesM1Mobile`** (~l.403): chip `.fl-chip` "Mes siguiente" (fondo `--warn-soft`, texto
   `--warn`) que dispara directo el traslado sin semana. También debe pedir semana.
3. **`ConceptoBoard`** (M1, ya correcto): botón `.dk-opt` "Mover al mes siguiente" que despliega
   `.dk-exp-lbl` "¿A qué semana del mes siguiente?" + chips `.dk-fchip` "→ S1", "→ S2"…
   (patrón a copiar).

**Diseño pedido para la vista semanal (y el chip de móvil):**
- Al elegir "Mes sig." en el modal, la sección "Semana destino" muestra debajo, en el mismo
  modal, la pregunta `.dk-exp-lbl` **"¿A qué semana del mes siguiente?"** y una fila de
  `.dk-seg2`/`.dk-fchip` con S1..S4 (S5 solo si el mes siguiente la tiene), con la elegida en
  estado `on`.
- Sin semana elegida, el botón de confirmar del modal queda deshabilitado (mismo criterio que
  `faltaSemanaDestino` en `ConceptoBoard`) y un texto de ayuda corto lo explica ("Elige la
  semana del mes siguiente").
- Al elegir cualquier semana normal del mes actual, el selector de mes siguiente desaparece.
- Móvil: al tocar el chip "Mes siguiente" se despliega en el mismo bloque la fila de chips
  "→ S1 … → S4" (estilo `.fl-chip`), y el traslado se hace al tocar una semana. Sin semana,
  nunca se envía.
- Estados a diseñar: cerrado, mes siguiente seleccionado sin semana, con semana, error inline
  (fondo `--neg-soft`, texto `--neg`, radio 14; nunca `alert()`).

## 5. Qué NO se diseña

- Confirmación de que el aporte llegó, o monto real recibido.
- Una línea por contrato con nombre (es un monto por semana).
- Vincular pagos a aportes; "pagado/queda" del emprendimiento.
- Mover pagos en lote; mover automáticamente un aporte que no llegó.
- Cambios en el recuadro de Angie, su remanente, ni en el ingreso de principio de mes.
- `MesM1.tsx` / `VistaPlanificacion.tsx` (fuera del path activo, I-12); su llamada sin semana
  la cubre la validación del servidor, no un rediseño.

## 6. Entregable esperado de Antigravity/Stitch

Un frame por pieza, en escritorio y móvil donde aplique: (1) sidebar de planificación con ambos
bloques de aportes; (2) "Balance mes" y "Por semana" con `E:`; (3) barra de ejecución con ambos
botones; (4) `VistaSemanal` con recuadro de Angie intacto + bloque del emprendimiento en las
tres variantes A/B/C, con estado de semana en $0; (5) modal de posponer y chip móvil con el
selector de semana del mes siguiente en sus estados. Solo tokens/clases de la sección 1.
