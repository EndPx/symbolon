param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('build', 'start', 'seed', 'verify', 'status', 'stop')]
  [string]$Action
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$localDir = Join-Path $projectRoot '.omc/demo'
New-Item -ItemType Directory -Path $localDir -Force | Out-Null
$stateFile = Join-Path $localDir 'state.json'
$demoState = if (Test-Path -LiteralPath $stateFile) {
  Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json -AsHashtable
} else { @{} }
function Save-State { $demoState | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $stateFile }
function Invoke-Dpm([string[]]$Arguments, [string]$Directory) {
  Push-Location -LiteralPath $Directory
  try {
    & dpm @Arguments
    if ($LASTEXITCODE -ne 0) { throw "dpm $($Arguments -join ' ') failed ($LASTEXITCODE)" }
  } finally { Pop-Location }
}
function Require-Build {
  if (!$demoState.buildRoot -or !(Test-Path -LiteralPath $demoState.buildRoot)) {
    throw 'Run ./scripts/demo.ps1 build first.'
  }
}
function Ledger-End {
  (Invoke-RestMethod 'http://127.0.0.1:6864/v2/state/ledger-end' -TimeoutSec 3).offset
}
function Run-Script([string]$Name, [string]$OutputName) {
  Require-Build
  $null = Ledger-End
  $dar = Join-Path $demoState.buildRoot 'daml-live/.daml/dist/symbolon-live-0.2.0.dar'
  $scriptArgs = @('script', '--dar', $dar, '--script-name', $Name,
    '--ledger-host', '127.0.0.1', '--ledger-port', '6865', '--wall-clock-time')
  if ($OutputName) { $scriptArgs += @('--output-file', (Join-Path $localDir $OutputName)) }
  Invoke-Dpm $scriptArgs $demoState.buildRoot
}

switch ($Action) {
  'build' {
    # damlc's Windows data-dependency resolver mishandles spaces in paths.
    # Each build gets a clean, space-free source stage; never deletes user files.
    # Avoid redirected AppData too: packaged Windows apps and dpm can resolve
    # it to different physical paths, breaking package discovery.
    $cacheRoot = if ($env:SYMBOLON_BUILD_HOME) { $env:SYMBOLON_BUILD_HOME }
      else { Join-Path ([IO.Path]::GetPathRoot($projectRoot)) 'symbolon-build' }
    if ($cacheRoot -match '\s') { throw 'Set SYMBOLON_BUILD_HOME to a writable path without spaces.' }
    $buildRoot = Join-Path $cacheRoot ('build-' + [Guid]::NewGuid().ToString('N').Substring(0, 10))
    foreach ($package in @('daml', 'daml-test', 'daml-live')) {
      $source = Join-Path $projectRoot $package
      $target = Join-Path $buildRoot $package
      New-Item -ItemType Directory -Path $target -Force | Out-Null
      Get-ChildItem -LiteralPath $source -Recurse -File |
        Where-Object { $_.Extension -in '.daml', '.yaml' -and $_.FullName -notmatch '[\\/]\.daml[\\/]' } |
        ForEach-Object {
          $relative = $_.FullName.Substring($source.Length + 1)
          $destination = Join-Path $target $relative
          New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
          Copy-Item -LiteralPath $_.FullName -Destination $destination
        }
      Invoke-Dpm @('build') $target
      # Keep the expected DAR location available for DevNet upload and Unix users.
      $output = Join-Path $source '.daml/dist'
      New-Item -ItemType Directory -Path $output -Force | Out-Null
      Get-ChildItem -LiteralPath (Join-Path $target '.daml/dist') -Filter '*.dar' |
        ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $output }
    }
    Invoke-Dpm @('test') (Join-Path $buildRoot 'daml-test')
    $demoState.buildRoot = $buildRoot
    $demoState.builtAt = (Get-Date).ToUniversalTime().ToString('o')
    Save-State
    Write-Host "Build and Daml tests passed. DARs: $buildRoot"
  }
  'start' {
    if (Get-NetTCPConnection -LocalPort 6864,6865 -State Listen -ErrorAction SilentlyContinue) {
      throw 'Ports 6864/6865 are already in use. Run status; do not start a second ledger.'
    }
    $runRoot = Join-Path $env:LOCALAPPDATA ('Symbolon/run-' + [Guid]::NewGuid().ToString('N').Substring(0, 10))
    New-Item -ItemType Directory -Path $runRoot -Force | Out-Null
    $dpmPath = (Get-Command dpm -ErrorAction Stop).Source
    $process = Start-Process -FilePath $dpmPath -ArgumentList @('sandbox', '--no-tty',
      '--ledger-api-port', '6865', '--json-api-port', '6864',
      '-C', 'canton.participants.sandbox.ledger-api.address=127.0.0.1,canton.participants.sandbox.http-ledger-api.address=127.0.0.1',
      '--log-file-name', (Join-Path $runRoot 'canton.log')) -WorkingDirectory $runRoot -WindowStyle Hidden -PassThru `
      -RedirectStandardOutput (Join-Path $runRoot 'stdout.log') -RedirectStandardError (Join-Path $runRoot 'stderr.log')
    $demoState.processId = $process.Id
    $demoState.processStarted = $process.StartTime.ToUniversalTime().ToString('o')
    $demoState.runRoot = $runRoot
    Save-State
    $ready = $false
    for ($attempt = 0; $attempt -lt 90; $attempt++) {
      try { $null = Ledger-End; $ready = $true; break } catch { }
      if ($process.HasExited) { throw "Canton exited. Inspect $runRoot/stderr.log and stdout.log" }
      Start-Sleep -Seconds 2
    }
    if (!$ready) { throw "Canton is not ready yet. Inspect $runRoot/canton.log" }
    Write-Host 'Canton ready: JSON http://127.0.0.1:6864, gRPC 127.0.0.1:6865. Local unauthenticated demo only.'
  }
  'seed' {
    Require-Build
    $dar = Join-Path $demoState.buildRoot 'daml-live/.daml/dist/symbolon-live-0.2.0.dar'
    # The HTTP API can answer ledger-end before the participant joins its local
    # synchronizer. Retry only that startup race; surface every other error.
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
    Run-Script 'Symbolon.Live:setupDesk' 'parties.json'
    $demoState.seededAt = (Get-Date).ToUniversalTime().ToString('o')
    Save-State
    Write-Host "Six demo parties and simulated assets seeded. Party IDs: $localDir/parties.json"
  }
  'verify' {
    $before = Ledger-End
    Run-Script 'Symbolon.Live:liveHappyPath' ''
    Run-Script 'Symbolon.Live:liveLifecycle' ''
    $after = Ledger-End
    @{ network = 'local Canton'; ledgerOffsetBefore = $before; ledgerOffsetAfter = $after;
      checkedAt = (Get-Date).ToUniversalTime().ToString('o'); result = 'passed';
      scripts = @('Symbolon.Live:liveHappyPath', 'Symbolon.Live:liveLifecycle')
    } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $localDir 'verification.json')
    Write-Host "Both real-ledger flows passed. Ledger offset $before -> $after"
  }
  'status' {
    $demoState | ConvertTo-Json
    Write-Host "Ledger offset: $(Ledger-End)"
  }
  'stop' {
    if (!$demoState.processId) { throw 'No ledger process was started by this script.' }
    $process = Get-Process -Id $demoState.processId -ErrorAction SilentlyContinue
    if (!$process) { Write-Host 'Recorded process has already stopped.'; break }
    # ConvertFrom-Json parses ISO timestamps into DateTime objects. Compare the
    # UTC instant rather than a formatted DateTime to avoid locale-dependent text.
    $actualStart = ([DateTimeOffset]$process.StartTime).ToUniversalTime()
    $recordedStart = ([DateTimeOffset]$demoState.processStarted).ToUniversalTime()
    if ($actualStart.Ticks -ne $recordedStart.Ticks) {
      throw 'Process ID was reused. Refusing to stop an unrelated process.'
    }
    # Only stop this recorded process and its descendants, never every Java process.
    $all = @(Get-CimInstance Win32_Process)
    function Stop-Children([int]$Parent) {
      foreach ($child in $all | Where-Object ParentProcessId -eq $Parent) {
        Stop-Children $child.ProcessId
        Stop-Process -Id $child.ProcessId -ErrorAction SilentlyContinue
      }
    }
    Stop-Children $process.Id
    Stop-Process -Id $process.Id -ErrorAction SilentlyContinue
    $demoState.Remove('processId')
    Save-State
    Write-Host 'Local ledger stopped. Its in-memory state is discarded; seed again after starting.'
  }
}
