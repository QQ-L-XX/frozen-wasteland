$ErrorActionPreference = "Stop"

$repo = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$node = "C:\Users\QI CHU\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$tsc = "C:\ProgramData\cocos\editors\Creator\3.8.8\resources\resources\3d\engine\node_modules\typescript\bin\tsc"
$outDir = Join-Path $repo ".qa_tmp\p0-smoke"
$testFile = Join-Path $repo "tools\qa\p0-smoke.ts"
$compiled = Join-Path $outDir "tools\qa\p0-smoke.js"

if (Test-Path $outDir) {
    Remove-Item -LiteralPath $outDir -Recurse -Force
}

& $node $tsc --target ES2019 --module commonjs --skipLibCheck --lib ES2019,DOM --outDir $outDir $testFile
& $node $compiled
