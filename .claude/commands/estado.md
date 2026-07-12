---
description: Lee el documento de estado y propone el siguiente paso
---
Lee ESTADO.md (y SESSION_LOG.md si existe como bitácora separada) del proyecto.
Verifica anchor-guard: confirma que el último ancla registrado coincide con el estado real 
del repo (último commit, último deploy). Si no coincide, HALT y reporta el mismatch — no 
continúes ni sobrescribas.
Si coincide, resume: estado actual, qué funciona, qué está roto, y propone un único 
siguiente paso con criterio de verificación explícito (acción, no estado).