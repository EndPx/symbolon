$ErrorActionPreference = 'Stop'
$publicProjectRoot = Split-Path $PSScriptRoot -Parent
$publicCoreDar = Join-Path $publicProjectRoot 'daml/.daml/dist/symbolon-v2-0.2.0.dar'
if (-not (Test-Path -LiteralPath $publicCoreDar)) { throw 'Build the core DAR first: ./scripts/demo.ps1 build' }
$publicCacheRoot = if ($env:SYMBOLON_BUILD_HOME) { $env:SYMBOLON_BUILD_HOME } else { Join-Path ([IO.Path]::GetPathRoot($publicProjectRoot)) 'symbolon-build' }
if ($publicCacheRoot -match '\s') { throw 'SYMBOLON_BUILD_HOME must use a space-free path.' }
$publicBuildRoot = Join-Path $publicCacheRoot ('public-' + [Guid]::NewGuid().ToString('N').Substring(0, 10))
$publicCoreTarget = Join-Path $publicBuildRoot 'daml/.daml/dist'
New-Item -ItemType Directory -Path $publicCoreTarget -Force | Out-Null
Copy-Item -LiteralPath $publicCoreDar -Destination $publicCoreTarget
foreach ($publicPackage in @('daml-public','daml-public-test')) {
    $publicSource = Join-Path $publicProjectRoot $publicPackage
    $publicTarget = Join-Path $publicBuildRoot $publicPackage
    New-Item -ItemType Directory -Path $publicTarget -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $publicSource 'daml.yaml') -Destination $publicTarget
    Copy-Item -LiteralPath (Join-Path $publicSource 'Symbolon') -Destination $publicTarget -Recurse
    Push-Location -LiteralPath $publicTarget
    try {
        & dpm build
        if ($LASTEXITCODE -ne 0) { throw "$publicPackage build failed ($LASTEXITCODE)." }
        if ($publicPackage -eq 'daml-public-test') {
            & dpm test
            if ($LASTEXITCODE -ne 0) { throw "Public desk authorization/lifecycle tests failed ($LASTEXITCODE)." }
        }
    } finally { Pop-Location }
    $publicOutput = Join-Path $publicProjectRoot "$publicPackage/.daml/dist"
    New-Item -ItemType Directory -Path $publicOutput -Force | Out-Null
    $publicDarName = if ($publicPackage -eq 'daml-public') { 'symbolon-public-0.1.0.dar' } else { 'symbolon-public-test-0.1.0.dar' }
    Copy-Item -LiteralPath (Join-Path $publicTarget ".daml/dist/$publicDarName") -Destination $publicOutput
}
Write-Host 'Public DevNet entry contract and delegated-authorization tests passed.'
