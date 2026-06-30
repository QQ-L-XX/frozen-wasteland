$ErrorActionPreference = "Stop"

$repo = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$project = Join-Path $repo "game\NewProject1"
$node = "C:\Users\QI CHU\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$tsc = "C:\ProgramData\cocos\editors\Creator\3.8.8\resources\resources\3d\engine\node_modules\typescript\bin\tsc"

Push-Location $project
try {
    & $node $tsc --noEmit --pretty false --skipLibCheck --lib ES2019,DOM
} finally {
    Pop-Location
}
