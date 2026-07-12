---
description: Verifica rama antes de merge/deploy
---
Antes de proponer merge o deploy: ejecuta merge-base check contra la rama canónica (main/dev 
según corresponda). Si la rama actual no es fast-forward compatible o hay divergencia no 
reconciliada, HALT y repórtalo — no continúes con el deploy.
Si pasa, ejecuta el DoD del ticket activo (ver /dod) antes de autorizar el release.
Reporta con evidencia adjunta (no afirmación): output del merge-base check, respuesta del 
health endpoint post-deploy si aplica.