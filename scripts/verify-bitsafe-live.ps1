$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$dar = Join-Path $projectRoot 'daml-bitsafe-test/.daml/dist/symbolon-bitsafe-test-0.2.0.dar'
if (!(Test-Path -LiteralPath $dar)) { throw 'Run ./scripts/build-bitsafe.ps1 first.' }

function Ledger-End {
  (Invoke-RestMethod 'http://127.0.0.1:6864/v2/state/ledger-end' -TimeoutSec 3).offset
}
$before = Ledger-End
for ($attempt = 1; $attempt -le 30; $attempt++) {
  try {
    Invoke-RestMethod 'http://127.0.0.1:6864/v2/packages' -Method Post -InFile $dar -ContentType 'application/octet-stream' -TimeoutSec 120 | Out-Null
    break
  } catch {
    $detail = [string]$_.ErrorDetails.Message + ' ' + [string]$_.Exception.Message
    if ($detail -notmatch 'PACKAGE_SERVICE_CANNOT_AUTODETECT_SYNCHRONIZER' -or $attempt -eq 30) { throw }
    Start-Sleep -Seconds 2
  }
}
& dpm script --dar $dar `
  --script-name Symbolon.BitSafe.Test.PriceMark:thresholdControlsSymbolonMark `
  --ledger-host 127.0.0.1 --ledger-port 6865 --wall-clock-time
if ($LASTEXITCODE -ne 0) { throw "BitSafe live script failed ($LASTEXITCODE)." }
$after = Ledger-End
$evidenceDir = Join-Path $projectRoot '.omc/demo'
New-Item -ItemType Directory -Path $evidenceDir -Force | Out-Null
@{
  network = 'local single-participant Canton sandbox'
  checkedAt = (Get-Date).ToUniversalTime().ToString('o')
  ledgerOffsetBefore = $before
  ledgerOffsetAfter = $after
  script = 'Symbolon.BitSafe.Test.PriceMark:thresholdControlsSymbolonMark'
  result = 'passed; DecMan three-node LocalNet not yet verified'
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $evidenceDir 'bitsafe-live.json')
Write-Host "BitSafe threshold-to-margin flow passed on local Canton. Ledger offset $before -> $after"
