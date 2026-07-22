---
ticket_id: BUG-LABEL-MESM1-01
orden: 8
estado: propuesto
tier: A
dependencias: ninguna
---

# BUG-LABEL-MESM1-01 — Botón "Mes siguiente" invoca la función incorrecta

## Goal completo

Un botón etiquetado "Mes siguiente" en MesM1 llama a una función distinta de
la que su etiqueta indica (bug de label reportado, sin diagnóstico de código
confirmado en esta sesión — pendiente de reproducir).

**Este ticket entra a `tickets/` con estado `propuesto`, no `aprobado`** —
a diferencia de los demás, no tiene diagnóstico de causa raíz confirmado
contra código real todavía. La próxima sesión que lo tome debe empezar por
reproducir el síntoma exacto (qué acción dispara, qué función se ejecuta
realmente) antes de escribir ningún fix — mismo criterio que DEBUGGING
exige en este proyecto: log/reproducción exacta antes de proponer cambio.

**No cubre:**
- Nada más se puede acotar sin el diagnóstico — el "no cubre" se completa
  en la fase de diagnóstico.

## Definition of Done

- [ ] Reproducir el síntoma exacto contra el código real: identificar el
      botón, su handler actual, y la función que efectivamente invoca vs.
      la que su label sugiere.
- [ ] Una vez confirmada la causa raíz, actualizar este ticket (Goal, DoD
      específico) antes de construir — no proceder con un fix sobre una
      hipótesis no verificada.
- [ ] `tsc --noEmit` limpio tras el fix.
- [ ] Verificado en dev que el botón "Mes siguiente" ejecuta exactamente la
      acción que su label indica, sin regresión en las demás acciones del
      mismo componente.

## Contexto / diagnóstico previo

- Identificado en la cola de horizonte de `ESTADO.md` sin sesión de
  diagnóstico dedicada todavía — es el ticket con menos evidencia
  documentada de todo este lote de migración. Tratarlo como
  candidato a sesión DEBUGGING antes que CONSTRUCCIÓN directa.

## Commit de cierre

(vacío hasta completar)

## Notas de ejecución

(vacío — lo llena Claude Code al cerrar: decisiones tomadas, deuda técnica
encontrada, criterios de parada activados)
