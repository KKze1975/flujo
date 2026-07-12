---
description: Verifica el DoD del ticket activo con evidencia, no afirmación
---
Identifica el ticket activo (WIP=1). Lee su DoD tal como está escrito en la spec.
Para cada criterio del DoD: verifica ejecutándolo (endpoint real, comando real, diff real) — 
nunca declares cumplido sin evidencia pegada.
Si algún criterio del DoD está escrito como estado ("el sistema muestra X") y no como acción 
verificable ("GET /x devuelve Y"), señálalo como spec falsa antes de intentar verificarlo — 
no lo reinterpretes silenciosamente como acción.
Si el DoD depende de un recurso vivo (Sheet, API externa), lee el recurso de vuelta después 
de escribir — nunca reportes escritura exitosa sin lectura de confirmación.