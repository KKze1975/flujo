# SESSION_LOG — BL-11b · 15 junio 2026

## Objetivo
4 ajustes post-QA a VistaSemanal: cierre en header, selector visual, gate modal.

## Decisiones tomadas

- Cierre en header: condición `semanaVisible === semanaActivaMes && !cierreSemanaState`
  (solo la semana activa puede cerrarse desde la UI). Texto "cerrada" para cualquier
  semana que tenga cierreSemanaState.
- Selector de semanas: sin fetch adicional. Estado se infiere de cierreSemanaState
  (semana actual) + posición relativa (idxVisible vs semanaActivaMes). Para semanas
  adyacentes no visitadas, el estado de cierre se desconoce hasta que se navegue a ellas.
  Decisión: diferenciar solo activa / cerrada (cuando es la visible) / otra. Futura
  queda cubierta implícitamente (arrows disabled por BL-10).
- hideFab en BottomNav: opacity:0 + pointerEvents:none preserva el layout flex.
- Gate modal: aparece después del fetch (cierreSemanaState ya actualizado).
  Se usa `semanaActivaMes` capturado en navegar() para evaluar si la semana es futura.
- ModoSemana: "activa" | "lectura" | "edicion". Al volver a semana activa → "activa".
  Al navegar a no-activa → gate decide el modo.

## Piezas completadas

- P1: Cambios 1+2 — cierre al header morado, eliminar bloque body — commit [pendiente]
- P2: Cambio 3 — selector semanas tri-estado — commit [pendiente]
- P3: Cambio 4 — gate modal + modoSemana + BottomNav hideFab — commit [pendiente]

## DoD verificado

- [ ] 1. Línea informativa eliminada del bloque cierre.
- [ ] 2. Botón cierre en header morado, debajo del porcentaje.
- [ ] 3. Selector diferencia activa / cerrada / futura.
- [ ] 4. Gate modal al navegar a semana no activa.
- [ ] 5. Gate variante correcta: Cerrada / Aún no iniciada.
- [ ] 6. Modo lectura: FAB oculto, botones de acción ocultos.
- [ ] 7. Modo editar/planear: acciones visibles, sin re-cierre.
- [ ] 8. Semana activa: sin gate.
- [ ] 9. tsc limpio después de cada pieza.
- [ ] 10. Verificado en preview URL.

## Criterios de parada activados

- Ninguno.
