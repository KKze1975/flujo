# PreToolUse hook (Bash|PowerShell): si el comando es un git commit, corre tsc --noEmit ANTES.
# Asi el error de tipos llega a Claude con output completo, en vez de un timeout del
# git pre-commit hook a mitad del commit.
$payload = [Console]::In.ReadToEnd() | ConvertFrom-Json
$cmd = $payload.tool_input.command
if (-not $cmd -or $cmd -notmatch 'git\s+(-C\s+\S+\s+)?commit\b') { exit 0 }

$repo = $env:CLAUDE_PROJECT_DIR
if (-not $repo) { $repo = "D:\Users\camilo\flujo" }

# Commits solo-docs no necesitan tsc
$staged = git -C $repo diff --cached --name-only 2>$null
if ($staged -and -not ($staged | Where-Object { $_ -match '\.(ts|tsx)$' })) { exit 0 }

Push-Location $repo
$out = npx tsc --noEmit 2>&1
$code = $LASTEXITCODE
Pop-Location

if ($code -ne 0) {
    $head = ($out | Select-Object -First 30) -join "`n"
    [Console]::Error.WriteLine("tsc --noEmit fallo (hook pre-commit-tsc). Corrige antes de commitear:`n$head")
    exit 2
}
exit 0
