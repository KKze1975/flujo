# PreToolUse hook (Bash|PowerShell): bloquea comandos git destructivos.
# Exit 2 = bloquear la llamada; el mensaje en stderr vuelve a Claude.
$payload = [Console]::In.ReadToEnd() | ConvertFrom-Json
$cmd = $payload.tool_input.command
if (-not $cmd) { exit 0 }

if ($cmd -match 'git\s+(-C\s+\S+\s+)?reset\s+--hard' -or
    $cmd -match 'git\s+(-C\s+\S+\s+)?push\b.*(-f\b|--force)' -or
    $cmd -match 'git\s+(-C\s+\S+\s+)?clean\s+-\S*f') {
    [Console]::Error.WriteLine("BLOQUEADO por hook guard-git: comando git destructivo. Propon una alternativa segura (revert, stash, branch) o pide al usuario que lo ejecute manualmente si de verdad lo quiere.")
    exit 2
}

if ($cmd -match 'git\s+(-C\s+\S+\s+)?commit\b.*--no-verify') {
    [Console]::Error.WriteLine("BLOQUEADO por hook guard-git: --no-verify solo esta permitido para commits que tocan unicamente documentacion y con tsc ya verificado. Corre 'npx tsc --noEmit' primero, confirma con el usuario, y si el aprueba pidele que ejecute el commit manualmente.")
    exit 2
}

exit 0
