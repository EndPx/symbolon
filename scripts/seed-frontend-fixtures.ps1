param([switch]$LocalOnly)
$ErrorActionPreference = 'Stop'
if (-not $LocalOnly) { throw 'This historical UI fixture is restricted to the disposable local ledger. Pass -LocalOnly.' }
$fixtureProjectRoot = Split-Path $PSScriptRoot -Parent
$fixtureStateRoot = Join-Path $fixtureProjectRoot '.omc/frontend-e2e-oct7'
$fixtureActors = Get-Content -LiteralPath (Join-Path $fixtureProjectRoot '.omc/demo/parties.json') -Raw | ConvertFrom-Json
$fixtureBuildRoot = Join-Path ([IO.Path]::GetPathRoot($fixtureProjectRoot)) ('symbolon-build/ui-fixtures-' + [Guid]::NewGuid().ToString('N').Substring(0,10))
$fixtureCoreRoot = Join-Path $fixtureBuildRoot 'daml/.daml/dist'
$fixtureStage = Join-Path $fixtureBuildRoot 'daml-ui-fixtures'
New-Item -ItemType Directory -Path $fixtureCoreRoot,$fixtureStage,$fixtureStateRoot -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $fixtureProjectRoot 'daml/.daml/dist/symbolon-v2-0.2.0.dar') -Destination $fixtureCoreRoot
Copy-Item -LiteralPath (Join-Path $fixtureProjectRoot 'daml-ui-fixtures/daml.yaml') -Destination $fixtureStage
Copy-Item -LiteralPath (Join-Path $fixtureProjectRoot 'daml-ui-fixtures/Symbolon') -Destination $fixtureStage -Recurse
@{borrower=$fixtureActors.borrower;dealer=$fixtureActors.dealerA;issuer=$fixtureActors.issuer;oracle=$fixtureActors.oracle} |
  ConvertTo-Json | Set-Content -LiteralPath (Join-Path $fixtureStage 'actors.json')
Push-Location -LiteralPath $fixtureStage
try {
  & dpm build
  if ($LASTEXITCODE -ne 0) { throw 'UI fixture build failed.' }
  $fixtureDar = Join-Path $fixtureStage '.daml/dist/symbolon-ui-fixtures-0.1.0.dar'
  Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:6864/v2/packages' -InFile $fixtureDar -ContentType 'application/octet-stream' | Out-Null
  & dpm script --dar $fixtureDar --script-name 'Symbolon.UiFixtures:expiredPosition' --input-file 'actors.json' `
    --ledger-host 127.0.0.1 --ledger-port 6865 --wall-clock-time --output-file (Join-Path $fixtureStateRoot 'matured-fixture.json')
  if ($LASTEXITCODE -ne 0) { throw 'Historical local fixture could not be seeded.' }
} finally { Pop-Location }
Write-Host 'Historically matured LOCAL fixture seeded. Test UI closeout; do not claim its opening as UI execution.'
