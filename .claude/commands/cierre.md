---
description: Cierra la sesión actual con contrato de síntesis
---
Sintetiza el delta de esta sesión sin preguntar: qué cambió, qué decisión se tomó (con 
razón), qué queda pendiente, deuda técnica nueva si la hay.
Aplica anchor-guard antes de escribir: verifica el ancla contra el estado real; halt en 
mismatch, no sobrescribas.
Responde las 4 preguntas de retrospectiva (Fase 4 HG SDD): qué funcionó, qué no funcionó, 
qué cambia en la próxima sesión, qué aprendizaje merece volverse invariante (filtro: solo si 
su ausencia produce error silencioso, dato corrupto o comportamiento no detectable).
Presenta el delta como borrador — Camilo corrige antes de aplicar. No marques la sesión como 
cerrada hasta confirmación.