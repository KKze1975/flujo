---
ticket_id: APORTES-SEMANALES-01C
orden: 47
estado: propuesto
tier: A
agente_ejecucion: antigravity
dependencias: APORTES-SEMANALES-01A
actualizado_en: 2026-09-30
---

# APORTES-SEMANALES-01C — Vista semanal: recuadros de Angie y del emprendimiento para ambos actores

Ticket 3 de 4 de `specs/APORTES-SEMANALES-01.md`. Diseño aprobado por Camilo (29 sept 2026):
brief §3 (variante **A, solo el número**) y §7 puntos 1 y 3, mock sección 3. **Tipo: código
ejecutable.** Un solo componente (`components/VistaSemanal.tsx`) más su `page.tsx`; construcción
rutinaria, sin datos nuevos más allá de una prop (`antigravity`).

## Goal completo

1. `app/mes/[mes]/semana/page.tsx` carga `getAportesAdicionales(mes)` (de `-01A`) y `VistaSemanal`
   recibe el aporte de la semana visible (o el mapa por semana) como **prop ya calculada**; el
   componente no suma ni infiere nada (I-01, I-21).
2. **Recuadro de Angie para ambos actores (brief §7.1/§7.3):** hoy se pinta solo con
   `actor === "angie"` (~l.1618 de `VistaSemanal.tsx`, "Header M4 Angie"). Pasa a verse también
   cuando el actor es Camilo. **Su contenido no cambia** (Saldo NU Angie, Sin clasificar, Aporte
   planeado, Gastado esta semana, Disponible semana), sin distintivo "A" nuevo.
   **Verificar antes de construir** que `disponibleNuAngie`, `pendientesClasificar`,
   `gastadoSemanaAngie`, `aportePlaneado` y `disponibleSemana` se calculan igual con actor = camilo
   (no dependen del actor). Si alguno solo está definido para `actor === "angie"` o cambia de valor,
   **HALT** y reportar a Camilo; no decidir.
3. **Recuadro nuevo del emprendimiento**, hermano del de Angie y debajo de él (mock sección 3):
   título "Emprendimiento" con badge "E" (`.fl-badge.primary`-style), una sola línea
   "Aporte planeado Sx" con el monto de la semana visible (`--primary`, tabular). Semana sin
   aporte: muestra `$0` en tono suave (`--ink-faint`), nunca oculto. Mismo lenguaje visual que el de
   Angie (fondo `--surface-2`, radio 16, filas 12px). **No** muestra "pagado con el emprendimiento"
   ni "lo que queda" (fuera de alcance, no existe vínculo pago→aporte). No interactivo.
4. **No entra en** `disponibleSemana` de Angie, en `remanenteAngie` (H5A) ni en `aporteAngiePlaneado`
   (H5B) (spec H9): `cerrar-semana` no se toca.

**Fuera de alcance:** selector de semana al mover al mes siguiente (ya construido en
`BALANCE-UNIFICADO-01`, se re-verifica en `-01D`); variantes B y C del recuadro (descartadas por
Camilo); cualquier cambio en `cerrar-semana`, H5A o H5B.

## Definition of Done

Rama `dev`, Sheet **DEV**; datos sintéticos limpiados al cierre.

- [ ] Verificación previa pegada: los cinco valores del recuadro de Angie con actor = camilo son idénticos a los que muestra con actor = angie para la misma semana (valores lado a lado); si no, HALT.
- [ ] `/mes/2026-10/semana?semana=S2` (aporte de S2 guardado con `-01A`, GET pegado): con actor = camilo aparecen los dos recuadros, el de Angie encima y el del emprendimiento debajo, separados; el monto del emprendimiento = el valor guardado (captura + GET pegados). Ídem con actor = angie.
- [ ] Recuadro de Angie sin cambios de contenido: "Aporte planeado", "Gastado esta semana" y "Disponible semana" iguales antes/después con actor = angie (captura antes/después, valores idénticos).
- [ ] Semana sin aporte (S3): el recuadro del emprendimiento se muestra con `$0` (captura).
- [ ] El recuadro del emprendimiento no muestra "pagado" ni "queda" ni ningún saldo derivado (captura y revisión del JSX).
- [ ] Cierre de una semana en DEV con aportes adicionales: `remanenteAngie` (H5A) y `aporteAngiePlaneado` (H5B) iguales a un cierre sin aportes adicionales (filas leídas de vuelta, pegadas). Semana sintética limpiada después.
- [ ] Solo tokens y clases `fl-*` existentes (brief §1); ningún token ni clase nueva (`git diff` de `app/globals.css` vacío).
- [ ] `npx tsc --noEmit` limpio; `npm run lint` sin errores nuevos (salida pegada); `graphify update .`.
- [ ] Rama propia, PR contra `dev`, sin merge (I-11/I-17). Tester como subagente aparte.

## Contexto / diagnóstico previo

- Spec H1b(9) y H9: el recuadro de Angie está acoplado a `disponibleSemana` y al remanente de H5A;
  por eso el emprendimiento va en un recuadro propio y no dentro del de Angie.
- Nota de trazabilidad: el spec (F3) dice "recuadro de Angie sin cambios"; el brief §7 (decisión
  posterior de Camilo, 29 sept 2026) lo hace visible para ambos actores sin cambiar su contenido.
  Este ticket sigue §7.
- `VistaSemanal.tsx` es un componente grande y de alto consumo; ubicar por grep
  (`Header M4 Angie`), no por número de línea.

## Commit de cierre
(vacío hasta completar)

## Notas de ejecución
(vacío — lo llena el Coder al cerrar)
