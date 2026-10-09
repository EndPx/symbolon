$ErrorActionPreference = 'Stop'
$openRepoRoot = Split-Path $PSScriptRoot -Parent
$openCoreDar = Join-Path $openRepoRoot 'daml/.daml/dist/symbolon-v2-0.2.0.dar'
$openCoreId = '1d40e972b56e42c279140639d33dc362b432f2c0f608c77ec36410f0395f3e19'
if (-not (Test-Path -LiteralPath $openCoreDar)) { throw 'Build the pinned core DAR first: ./scripts/demo.ps1 build' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$openCoreZip = [IO.Compression.ZipFile]::OpenRead($openCoreDar)
try {
    $openMainDalf = "symbolon-v2-0.2.0-$openCoreId/symbolon-v2-0.2.0-$openCoreId.dalf"
    if (-not $openCoreZip.GetEntry($openMainDalf)) { throw "Open RFQ requires pinned Symbolon core package $openCoreId." }
} finally { $openCoreZip.Dispose() }
$openCacheRoot = if ($env:SYMBOLON_BUILD_HOME) { $env:SYMBOLON_BUILD_HOME } else { Join-Path ([IO.Path]::GetPathRoot($openRepoRoot)) 'symbolon-build' }
if ($openCacheRoot -match '\s') { throw 'SYMBOLON_BUILD_HOME must use a space-free path.' }
$openBuildRoot = Join-Path $openCacheRoot ('open-rfq-' + [Guid]::NewGuid().ToString('N').Substring(0, 10))
$openCoreTarget = Join-Path $openBuildRoot 'daml/.daml/dist'
New-Item -ItemType Directory -Path $openCoreTarget -Force | Out-Null
Copy-Item -LiteralPath $openCoreDar -Destination $openCoreTarget
foreach ($openPackage in @('daml-open-rfq', 'daml-open-rfq-test')) {
    $openSource = Join-Path $openRepoRoot $openPackage
    $openTarget = Join-Path $openBuildRoot $openPackage
    New-Item -ItemType Directory -Path $openTarget -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $openSource 'daml.yaml') -Destination $openTarget
    Copy-Item -LiteralPath (Join-Path $openSource 'Symbolon') -Destination $openTarget -Recurse
    Push-Location -LiteralPath $openTarget
    try {
        & dpm build
        if ($LASTEXITCODE -ne 0) { throw "$openPackage build failed ($LASTEXITCODE)." }
        if ($openPackage -eq 'daml-open-rfq-test') {
            & dpm test
            if ($LASTEXITCODE -ne 0) { throw "Open RFQ authorization/privacy/lifecycle tests failed ($LASTEXITCODE)." }
        }
    } finally { Pop-Location }
    $openOutput = Join-Path $openSource '.daml/dist'
    New-Item -ItemType Directory -Path $openOutput -Force | Out-Null
    $openDarName = if ($openPackage -eq 'daml-open-rfq') { 'symbolon-open-rfq-0.1.0.dar' } else { 'symbolon-open-rfq-test-0.1.0.dar' }
    Copy-Item -LiteralPath (Join-Path $openTarget ".daml/dist/$openDarName") -Destination $openOutput
}
Write-Host "Open RFQ builds and local Daml Script tests passed. Retained staging: $openBuildRoot"
