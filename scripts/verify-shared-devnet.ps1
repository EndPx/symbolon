param(
    [switch]$Execute,
    [string]$UserName
)

$ErrorActionPreference = 'Stop'

# The participant's documented password grant. Credentials and tokens stay in
# this process; the access token goes to the child through stdin, never args/files.
$proofRoot = Split-Path -Parent $PSScriptRoot
$proofLoader = Join-Path $proofRoot 'web/node_modules/tsx/dist/cli.mjs'
$proofRunner = Join-Path $proofRoot 'scripts/shared-devnet.mjs'
if (-not (Test-Path -LiteralPath $proofLoader -PathType Leaf) -or
    -not (Test-Path -LiteralPath $proofRunner -PathType Leaf)) {
    throw 'Shared DevNet runner/dependencies missing. Install the web dependencies before authenticating.'
}
$proofStart = [System.Diagnostics.ProcessStartInfo]::new()
$proofStart.FileName = (Get-Command node -ErrorAction Stop).Source
$proofStart.WorkingDirectory = $proofRoot
$proofStart.UseShellExecute = $false
$proofStart.CreateNoWindow = $true
$proofStart.RedirectStandardInput = $true
$proofStart.RedirectStandardOutput = $true
$proofStart.RedirectStandardError = $true
# .NET Framework / Windows PowerShell 5.1 has no ArgumentList. These are fixed
# Windows file paths and flags; quote the paths and launch node directly, no shell.
$proofStart.Arguments = '"{0}" "{1}" --auth-stdin' -f $proofLoader, $proofRunner
if ($Execute) { $proofStart.Arguments += ' --execute' }

$proofCredential = if ($UserName) {
    Get-Credential -UserName $UserName -Message 'Authenticate Symbolon shared DevNet proof locally. Do not paste credentials into chat.'
} else {
    Get-Credential -Message 'Authenticate Symbolon shared DevNet proof locally. Do not paste credentials into chat.'
}
if (-not $proofCredential) { throw 'DevNet authentication cancelled.' }
$proofTokens = $null
$proofAccessToken = $null
try {
    try {
        $proofTokens = Invoke-RestMethod -Method Post `
            -Uri 'https://keycloak.naas.noders.services/realms/noders-appsfactory/protocol/openid-connect/token' `
            -ContentType 'application/x-www-form-urlencoded' -Body @{
                grant_type = 'password'
                client_id = 'web-app-ui-hackcanton-01-devnet'
                username = $proofCredential.UserName
                password = $proofCredential.GetNetworkCredential().Password
                scope = 'openid daml_ledger_api'
            } -ErrorAction Stop
    } catch {
        throw 'Authfactory rejected CLI authentication. No password/token response is logged. Confirm the documented client and account credentials with NODERS.'
    } finally {
        $proofCredential.Password.Dispose()
        $proofCredential = $null
    }
    if (-not $proofTokens.access_token) { throw 'No access token returned.' }
    $proofProcess = [System.Diagnostics.Process]::Start($proofStart)
    try {
        $proofAccessToken = $proofTokens.access_token
        # Drain both pipes concurrently so a verbose child cannot block on one.
        $proofOutputTask = $proofProcess.StandardOutput.ReadToEndAsync()
        $proofErrorTask = $proofProcess.StandardError.ReadToEndAsync()
        $proofProcess.StandardInput.WriteLine($proofAccessToken)
        $proofProcess.StandardInput.Close()
        $proofTokens = $null
        $proofProcess.WaitForExit()
        foreach ($proofText in @($proofOutputTask.GetAwaiter().GetResult(), $proofErrorTask.GetAwaiter().GetResult())) {
            if ($proofText) {
                $proofSafeText = $proofText.Replace($proofAccessToken, '[redacted]')
                $proofSafeText = $proofSafeText -replace '(?i)Bearer\s+[^\s"'']+', 'Bearer [redacted]'
                $proofSafeText = $proofSafeText -replace 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+', '[redacted JWT]'
                Write-Host $proofSafeText.TrimEnd()
            }
        }
        $proofAccessToken = $null
        if ($proofProcess.ExitCode -ne 0) { throw "Shared DevNet check incomplete (exit $($proofProcess.ExitCode)). Inspect the redacted evidence before retrying." }
    } finally {
        $proofProcess.Dispose()
    }
} finally {
    $proofTokens = $null
    $proofAccessToken = $null
    $proofCredential = $null
}
