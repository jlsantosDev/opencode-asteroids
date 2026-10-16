---
description: Crea un git worktree con nombre basado en el contexto
---

Analiza el siguiente argumento y el contexto de la conversación para generar un nombre descriptivo y conciso (en kebab-case, sin espacios) para un worktree:

$ARGUMENTS

Luego ejecuta EXACTAMENTE este comando y nada más:

!`git worktree add .worktrees/<nombre-generado>`

Reglas:
- El nombre debe ser corto, descriptivo y en kebab-case (ej: `fix-login-bug`, `feature-user-auth`)
- NO cambies de directorio
- NO ejecutes ningún comando adicional
- NO hagas nada más que crear el worktree
- Si el argumento es muy largo, simplifica el nombre a algo más significativo
