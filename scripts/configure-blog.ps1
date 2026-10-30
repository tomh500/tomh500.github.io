# Compatible with Windows PowerShell 5.1 and PowerShell 7.
[CmdletBinding()]
param(
    [ValidateSet('GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_PUBLISH_TOKEN')]
    [string]$SecretName,
    [string]$ProxyUrl,
    [switch]$Check
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$wranglerPath = Join-Path $projectRoot 'node_modules/wrangler/bin/wrangler.js'
$configPath = Join-Path $projectRoot 'backend/wrangler.jsonc'
if (-not (Test-Path -LiteralPath $wranglerPath)) { throw 'Please run npm ci first.' }
if ($ProxyUrl) {
    $proxyUri = [Uri]$ProxyUrl
    if ($proxyUri.Scheme -notin @('http', 'https') -or -not $proxyUri.Host) { throw 'ProxyUrl must be an HTTP or HTTPS proxy address.' }
}
function New-WranglerProcessInfo {
    param([string]$Arguments)
    $info = New-Object Diagnostics.ProcessStartInfo
    $info.FileName = (Get-Command node).Source
    $info.WorkingDirectory = $projectRoot
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardInput = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    # ArgumentList is unavailable in Windows PowerShell 5.1. These arguments
    # contain only fixed names and Windows file paths, never secret values.
    $info.Arguments = $Arguments
    if ($ProxyUrl) {
        $info.EnvironmentVariables['HTTP_PROXY'] = $ProxyUrl
        $info.EnvironmentVariables['HTTPS_PROXY'] = $ProxyUrl
    }
    return $info
}
# Always verify the child process can authenticate before asking for any secret.
& {
    $probe = New-Object Diagnostics.Process
    $probe.StartInfo = New-WranglerProcessInfo ('"{0}" secret list --config "{1}"' -f $wranglerPath, $configPath)
    $null = $probe.Start()
    $outTask = $probe.StandardOutput.ReadToEndAsync()
    $errTask = $probe.StandardError.ReadToEndAsync()
    $probe.StandardInput.Close()
    $probe.WaitForExit()
    $checkOutput = $outTask.GetAwaiter().GetResult() + $errTask.GetAwaiter().GetResult()
    if ($probe.ExitCode -ne 0) { throw ('Cloudflare login check failed (no secrets read): ' + $checkOutput) }
    $probe.Dispose()
    Write-Host 'Cloudflare login and proxy check passed. No secret values read or uploaded.'
}
if ($Check) { return }
Write-Host 'Create a GitHub OAuth App at https://github.com/settings/applications/new'
Write-Host 'Homepage: https://luotiany1.top'
Write-Host 'Callback: https://blog-api.luotiany1.top/auth/callback'
Write-Host ''
Write-Host 'Create a fine-grained token at https://github.com/settings/personal-access-tokens/new'
Write-Host 'Only select tomh500/tomh500.github.io, with Contents: Read and write.'
Write-Host 'The token grants write access to that repository. Never paste it into chat or commit it.'
Write-Host ''
if ($SecretName) { $targets = @($SecretName) } else { $targets = @('GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_PUBLISH_TOKEN') }
foreach ($targetSecret in $targets) {
    $secureValue = Read-Host "Paste $targetSecret (hidden input)" -AsSecureString
    if ($secureValue.Length -eq 0) { throw "$targetSecret cannot be empty" }
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
    try {
        if ($targetSecret -eq 'GITHUB_CLIENT_ID' -and [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer).StartsWith('github_pat_')) {
            throw 'This is a publish token, not a Client ID. Run this script with -SecretName GITHUB_PUBLISH_TOKEN instead.'
        }
        $processInfo = New-WranglerProcessInfo ('"{0}" secret put {1} --config "{2}"' -f $wranglerPath, $targetSecret, $configPath)
        $process = New-Object Diagnostics.Process
        $process.StartInfo = $processInfo
        $null = $process.Start()
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        $process.StandardInput.WriteLine([Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer))
        $process.StandardInput.Close()
        $process.WaitForExit()
        # Wrangler does not echo the secret value. Avoid dumping subprocess output here.
        $commandOutput = $stdout.GetAwaiter().GetResult() + $stderr.GetAwaiter().GetResult()
        if ($process.ExitCode -ne 0) {
            $safeOutput = $commandOutput.Replace([Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer), '[redacted]')
            $safeOutput = $safeOutput -replace 'github_pat_[A-Za-z0-9_]+', '[redacted]' -replace 'gh[pousr]_[A-Za-z0-9_]+', '[redacted]'
            $errorLines = ($safeOutput -split "`r?`n" | Where-Object { $_ -match 'ERROR|Error:|error code|not authenticated|non-interactive|Authentication|Could not|Failed' }) -join "`n"
            throw "Failed to save $targetSecret.`n$errorLines"
        }
        $process.Dispose()
        Write-Host "$targetSecret saved to Cloudflare."
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        $secureValue.Dispose()
    }
}
Write-Host 'Configuration saved. Return to the chat to continue end-to-end verification.'
