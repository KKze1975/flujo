---
description: Auditoría adversarial con reparto en subagentes
---
Tipo de sesión: DEBUGGING/CONSTRUCCIÓN — diagnóstico, no diseño ni fix en la misma sesión.
Reparte el trabajo en subagentes paralelos por dominio (ej. modelo de datos, endpoints de 
escritura, hooks/scripts existentes, dependencias) — cada uno con su propio contexto, para 
no agotar el contexto de la sesión principal.
Consolida hallazgos en AUDIT.md (o el nombre de delta correspondiente, ej. 
BLOQUEANTE-N-DELTA.md), con formato: qué dice la documentación vs. qué es cierto en el 
código, con evidencia (ruta de archivo, línea, commit) por cada hallazgo — no afirmaciones 
sin soporte.
Si el diagnóstico consume más de media sesión, escribe el reporte a disco y detente — no 
sigas a fix en la misma sesión. Fix es sesión nueva, tipo CONSTRUCCIÓN.