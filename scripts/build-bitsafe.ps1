$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$coreDar = Join-Path $projectRoot 'daml/.daml/dist/symbolon-v2-0.2.0.dar'
$coreSource = Join-Path $projectRoot 'daml'
if (!(Test-Path -LiteralPath $coreDar)) { throw 'Build the core DAR first: ./scripts/demo.ps1 build' }
$latestSource = Get-ChildItem -LiteralPath $coreSource -Recurse -File -Filter '*.daml' |
  Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
if ((Get-Item -LiteralPath $coreDar).LastWriteTimeUtc -lt $latestSource.LastWriteTimeUtc) {
  throw 'The core DAR predates its Daml source. Run ./scripts/demo.ps1 build first.'
}

$dependencyDir = Join-Path $projectRoot '.omc/research/bitsafe'
New-Item -ItemType Directory -Path $dependencyDir -Force | Out-Null
$sourceCommit = '21ffdedf64366b1f2824301c434b427bf4726663'
function Get-PinnedDar([string]$Name, [string]$Hash) {
  $path = Join-Path $dependencyDir $Name
  if (!(Test-Path -LiteralPath $path)) {
    $download = Join-Path $dependencyDir ('download-' + [Guid]::NewGuid().ToString('N') + '.dar')
    try {
      $url = "https://raw.githubusercontent.com/DLC-link/decentralization-manager/$sourceCommit/releases/v1/$Name"
      Invoke-WebRequest -Uri $url -OutFile $download -UseBasicParsing
      if ((Get-FileHash -Algorithm SHA256 -LiteralPath $download).Hash -ne $Hash) {
        throw "BitSafe $Name checksum differs from the pinned release."
      }
      Move-Item -LiteralPath $download -Destination $path
    } finally {
      if (Test-Path -LiteralPath $download) { Remove-Item -LiteralPath $download }
    }
  }
  if ((Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash -ne $Hash) {
    throw "Cached BitSafe $Name checksum differs from the pinned release."
  }
  return $path
}
$actionHash = '4FC7912DF4A0AEEA3CFCC6BA07C880192A5FA88F7C75ED04B922602461B1E485'
$coreHash = 'B8D05903E63288D4114632F41386491CEA215E177183514EA032FE35D24A9544'
$governanceDar = Get-PinnedDar 'governance-action-v1-0.1.0.dar' $actionHash
$governanceCoreDar = Get-PinnedDar 'governance-core-v1-0.1.0.dar' $coreHash

# Daml's Windows resolver needs a space-free build path on this checkout.
$cacheRoot = if ($env:SYMBOLON_BUILD_HOME) { $env:SYMBOLON_BUILD_HOME }
  else { Join-Path ([IO.Path]::GetPathRoot($projectRoot)) 'symbolon-build' }
if ($cacheRoot -match '\s') { throw 'Set SYMBOLON_BUILD_HOME to a writable path without spaces.' }
$buildRoot = Join-Path $cacheRoot ('bitsafe-' + [Guid]::NewGuid().ToString('N').Substring(0, 10))
$targetPackage = Join-Path $buildRoot 'daml-bitsafe'
$targetCore = Join-Path $buildRoot 'daml/.daml/dist'
$targetGovernance = Join-Path $buildRoot '.omc/research/bitsafe'
New-Item -ItemType Directory -Path $targetPackage,$targetCore,$targetGovernance -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot 'daml-bitsafe/daml.yaml') -Destination $targetPackage
$targetModule = Join-Path $targetPackage 'Symbolon/BitSafe'
New-Item -ItemType Directory -Path $targetModule -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot 'daml-bitsafe/Symbolon/BitSafe/PriceMarkProposal.daml') -Destination $targetModule
Copy-Item -LiteralPath $coreDar -Destination $targetCore
Copy-Item -LiteralPath $governanceDar -Destination $targetGovernance
Copy-Item -LiteralPath $governanceCoreDar -Destination $targetGovernance

Push-Location -LiteralPath $targetPackage
try {
  & dpm build
  if ($LASTEXITCODE -ne 0) { throw "BitSafe proposal build failed ($LASTEXITCODE)." }
} finally { Pop-Location }

$darName = 'symbolon-bitsafe-0.2.0.dar'
$outputDir = Join-Path $projectRoot 'daml-bitsafe/.daml/dist'
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $targetPackage ".daml/dist/$darName") -Destination $outputDir
$testPackage = Join-Path $buildRoot 'daml-bitsafe-test'
$testModule = Join-Path $testPackage 'Symbolon/BitSafe/Test'
New-Item -ItemType Directory -Path $testModule -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot 'daml-bitsafe-test/daml.yaml') -Destination $testPackage
Copy-Item -LiteralPath (Join-Path $projectRoot 'daml-bitsafe-test/Symbolon/BitSafe/Test/PriceMark.daml') -Destination $testModule
Push-Location -LiteralPath $testPackage
try {
  & dpm build
  if ($LASTEXITCODE -ne 0) { throw "BitSafe proposal test build failed ($LASTEXITCODE)." }
  & dpm test
  if ($LASTEXITCODE -ne 0) { throw "BitSafe proposal tests failed ($LASTEXITCODE)." }
} finally { Pop-Location }
$testOutputDir = Join-Path $projectRoot 'daml-bitsafe-test/.daml/dist'
New-Item -ItemType Directory -Path $testOutputDir -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $testPackage '.daml/dist/symbolon-bitsafe-test-0.2.0.dar') -Destination $testOutputDir
$evidenceDir = Join-Path $projectRoot '.omc/demo'
New-Item -ItemType Directory -Path $evidenceDir -Force | Out-Null
@{
  builtAt = (Get-Date).ToUniversalTime().ToString('o')
  package = 'symbolon-bitsafe-0.2.0'
  sdk = '3.5.2'
  bitsafeSourceCommit = $sourceCommit
  governanceActionDarSha256 = $actionHash
  governanceCoreDarSha256 = $coreHash
  output = Join-Path $outputDir $darName
  result = 'built and threshold Script passed; DecMan LocalNet execution not yet verified'
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $evidenceDir 'bitsafe-build.json')
Write-Host "BitSafe proposal DAR built: $(Join-Path $outputDir $darName)"
