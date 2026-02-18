<#
.SYNOPSIS
    Compile, deploy backend, and optionally publish an OTA firmware release.
    Combines:
      1) Backend TypeScript check + SAM deploy
      2) Firmware OTA publish via publish_ota_release.py

.PARAMETER SkipBackendDeploy
    Skip backend deploy (only publish firmware OTA)

.PARAMETER SkipOtaPublish
    Skip OTA firmware publish (only deploy backend)

.PARAMETER OtaChannel
    OTA channel (default: stable)

.PARAMETER OtaBoard
    Target board (default: arduino_nano_33_ble)

.PARAMETER AdminToken
    Admin token for OTA API. If not set, reads from $env:OTA_ADMIN_TOKEN or SSM.

.PARAMETER ApiBaseUrl
    API base URL. If not set, reads from deployed stack outputs.

.PARAMETER DryRun
    Run OTA publish in dry-run mode (no actual upload)

.PARAMETER SkipBuild
    Skip firmware build in OTA publish step

.PARAMETER ArtifactPath
    Use a specific artifact file instead of building

.PARAMETER Pristine
    Clean build for firmware

.PARAMETER Sysbuild
    Use sysbuild for firmware

.EXAMPLE
    # Full pipeline: deploy backend + publish OTA
    .\ota_deploy.ps1

    # Backend only
    .\ota_deploy.ps1 -SkipOtaPublish

    # OTA publish only (backend already deployed)
    .\ota_deploy.ps1 -SkipBackendDeploy

    # Dry run to verify everything
    .\ota_deploy.ps1 -DryRun
#>

param(
    [switch]$SkipBackendDeploy,
    [switch]$SkipOtaPublish,
    [string]$OtaChannel = "stable",
    [string]$OtaBoard = "arduino_nano_33_ble",
    [string]$AdminToken = "",
    [string]$ApiBaseUrl = "",
    [switch]$DryRun,
    [switch]$SkipBuild,
    [string]$ArtifactPath = "",
    [switch]$Pristine,
    [switch]$Sysbuild
)

$ErrorActionPreference = "Stop"

# -- Configuration -----------------------------------------------------
$StackName   = "autowatering-backend-dev"
$Region      = "eu-central-1"
$BackendRoot = $PSScriptRoot
$FirmwareRoot = [IO.Path]::GetFullPath((Join-Path $BackendRoot "..\..\..\..\Zephyr\AutoWatering"))
$Sam         = "C:\Program Files\Amazon\AWSSAMCLI\bin\sam.cmd"
$AwsCli      = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"
$Python      = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $Python) { $Python = (Get-Command python3 -ErrorAction SilentlyContinue).Source }
# ----------------------------------------------------------------------

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

function Write-Step {
    param([string]$Label)
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host "  $Label" -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor Cyan
}

function Write-OK { param([string]$Msg) Write-Host "  OK: $Msg" -ForegroundColor Green }
function Write-Skip { param([string]$Msg) Write-Host "  SKIP: $Msg" -ForegroundColor Yellow }

# =====================================================================
# PHASE 1: Backend compile check + deploy
# =====================================================================

if (-not $SkipBackendDeploy) {
    Write-Step "Phase 1: Backend compile + deploy"

    Push-Location $BackendRoot
    try {
        # 1a. npm install
        Write-Step "npm install"
        npm install --no-fund --no-audit
        if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
        Write-OK "npm install"

        # 1b. TypeScript check
        Write-Step "TypeScript compile check"
        npx tsc --noEmit
        if ($LASTEXITCODE -ne 0) { throw "TypeScript compilation failed" }
        Write-OK "TypeScript check passed"

        # 1c. TypeScript build
        Write-Step "TypeScript build"
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "TypeScript build failed" }
        Write-OK "TypeScript build"

        # 1d. SAM build
        Write-Step "SAM build"
        & $Sam build
        if ($LASTEXITCODE -ne 0) { throw "SAM build failed" }
        Write-OK "SAM build"

        # 1e. SAM deploy
        Write-Step "SAM deploy"
        & $Sam deploy
        if ($LASTEXITCODE -ne 0) { throw "SAM deploy failed" }
        Write-OK "SAM deploy"
    }
    finally {
        Pop-Location
    }

    Write-Step "Backend deploy complete"
} else {
    Write-Skip "Backend deploy (SkipBackendDeploy flag)"
}

# =====================================================================
# PHASE 2: OTA firmware publish
# =====================================================================

if (-not $SkipOtaPublish) {
    Write-Step "Phase 2: OTA firmware publish"

    $publishScript = Join-Path $FirmwareRoot "tools\publish_ota_release.py"
    if (-not (Test-Path $publishScript)) {
        throw "publish_ota_release.py not found at: $publishScript"
    }

    # Resolve API base URL from stack outputs if not provided
    if (-not $ApiBaseUrl) {
        Write-Host "  Resolving API URL from CloudFormation stack..." -ForegroundColor DarkGray
        $ApiBaseUrl = & $AwsCli cloudformation describe-stacks `
            --region $Region `
            --stack-name $StackName `
            --query "Stacks[0].Outputs[?OutputKey=='ApiBaseUrl'].OutputValue" `
            --output text 2>$null
        if (-not $ApiBaseUrl -or $ApiBaseUrl -eq "None") {
            throw "Could not resolve API URL from stack $StackName. Pass -ApiBaseUrl explicitly."
        }
        Write-OK "API URL: $ApiBaseUrl"
    }

    # Resolve admin token from parameter or env or SSM
    if (-not $AdminToken) {
        $AdminToken = $env:OTA_ADMIN_TOKEN
    }
    if (-not $AdminToken) {
        Write-Host "  Resolving admin token from SSM..." -ForegroundColor DarkGray
        $AdminToken = & $AwsCli ssm get-parameter `
            --region $Region `
            --name "/$StackName/ota-admin-token" `
            --with-decryption `
            --query "Parameter.Value" `
            --output text 2>$null
    }
    if (-not $AdminToken) {
        throw "OTA admin token not available. Set -AdminToken, `$env:OTA_ADMIN_TOKEN, or store in SSM."
    }
    Write-OK "Admin token resolved"

    # Build command
    $publishArgs = @(
        $publishScript,
        "--api-base-url", $ApiBaseUrl,
        "--admin-token", $AdminToken,
        "--channel", $OtaChannel,
        "--board", $OtaBoard
    )

    if ($DryRun)      { $publishArgs += "--dry-run" }
    if ($SkipBuild)   { $publishArgs += "--skip-build" }
    if ($Pristine)    { $publishArgs += "--pristine" }
    if ($Sysbuild)    { $publishArgs += "--sysbuild" }
    if ($ArtifactPath) { $publishArgs += @("--artifact-path", $ArtifactPath) }

    Write-Step "Publishing OTA release"
    & $Python $publishArgs
    if ($LASTEXITCODE -ne 0) { throw "OTA publish failed" }
    Write-OK "OTA publish complete"

} else {
    Write-Skip "OTA publish (SkipOtaPublish flag)"
}

# =====================================================================
# SUMMARY
# =====================================================================
$stopwatch.Stop()
$elapsed = $stopwatch.Elapsed

Write-Host ""
Write-Host ("=" * 60) -ForegroundColor Green
Write-Host "  OTA DEPLOY PIPELINE COMPLETE" -ForegroundColor Green
Write-Host "  Backend: $(if ($SkipBackendDeploy) { 'skipped' } else { 'deployed' })" -ForegroundColor Green
Write-Host "  OTA:     $(if ($SkipOtaPublish) { 'skipped' } else { if ($DryRun) { 'dry-run' } else { 'published' } })" -ForegroundColor Green
Write-Host "  Time:    $($elapsed.Minutes)m $($elapsed.Seconds)s" -ForegroundColor Green
Write-Host ("=" * 60) -ForegroundColor Green
