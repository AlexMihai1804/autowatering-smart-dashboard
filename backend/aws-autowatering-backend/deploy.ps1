<#
.SYNOPSIS
    One-click deploy for AutoWatering backend.
    Run without parameters - everything is hardcoded for the dev stack.

.EXAMPLE
    .\deploy.ps1
#>

$ErrorActionPreference = "Stop"

# -- Configuration (edit here if needed) -------------------------------
$StackName      = "autowatering-backend-dev"
$Region         = "eu-central-1"
$AppEnvironment = "dev"

$BackendRoot    = $PSScriptRoot
$ScriptsDir     = [IO.Path]::GetFullPath((Join-Path $BackendRoot "..\..\scripts"))
$Sam            = "C:\Program Files\Amazon\AWSSAMCLI\bin\sam.cmd"
# ----------------------------------------------------------------------

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

function Write-Step {
    param([string]$Label)
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host "  $Label" -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor Cyan
}

function Invoke-Step {
    param(
        [Parameter(Mandatory)] [string]$Label,
        [Parameter(Mandatory)] [scriptblock]$Action
    )
    Write-Step $Label
    & $Action
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
        throw "FAILED: $Label (exit code $LASTEXITCODE)"
    }
}

# -- 0. Pre-flight checks ---------------------------------------------
Write-Step "Pre-flight checks"

if (-not (Test-Path $Sam)) {
    throw "SAM CLI not found at $Sam -- install it or update the path."
}

$awsExe = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"
if (-not (Test-Path $awsExe)) {
    throw "AWS CLI not found at $awsExe -- install it or update the path."
}

# Verify AWS credentials work
& $awsExe sts get-caller-identity --region $Region | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "AWS credentials are not configured. Run 'aws configure' first."
}
Write-Host "AWS credentials OK" -ForegroundColor Green
Write-Host "SAM CLI OK" -ForegroundColor Green

# -- 1. Bootstrap secrets ----------------------------------------------
$bootstrapScript = Join-Path $ScriptsDir "bootstrap_backend_secrets.ps1"
if (Test-Path $bootstrapScript) {
    Invoke-Step "Bootstrap secrets (Secrets Manager)" {
        powershell -NoProfile -ExecutionPolicy Bypass -File $bootstrapScript `
            -StackName $StackName `
            -Region $Region `
            -AppEnvironment $AppEnvironment
    }
} else {
    Write-Host "SKIP: bootstrap_backend_secrets.ps1 not found at $bootstrapScript" -ForegroundColor Yellow
    Write-Host "      (OK for first-ever deploy -- secrets must already exist in Secrets Manager)" -ForegroundColor Yellow
}

# -- 2. npm install ----------------------------------------------------
Push-Location $PSScriptRoot
try {

    Invoke-Step "npm install" {
        npm install --no-fund --no-audit
    }

    # -- 3. TypeScript build -------------------------------------------
    Invoke-Step "TypeScript build (npm run build)" {
        npm run build
    }

    # -- 4. SAM build --------------------------------------------------
    Invoke-Step "SAM build" {
        & $Sam build
    }

    # -- 5. SAM deploy -------------------------------------------------
    Invoke-Step "SAM deploy" {
        & $Sam deploy
    }

} finally {
    Pop-Location
}

# -- Done --------------------------------------------------------------
$stopwatch.Stop()
$elapsed = $stopwatch.Elapsed

Write-Host ""
Write-Host ("=" * 60) -ForegroundColor Green
Write-Host "  DEPLOY COMPLETE" -ForegroundColor Green
Write-Host "  Stack : $StackName" -ForegroundColor Green
Write-Host "  Region: $Region" -ForegroundColor Green
Write-Host "  Time  : $($elapsed.Minutes)m $($elapsed.Seconds)s" -ForegroundColor Green
Write-Host ("=" * 60) -ForegroundColor Green

# Print the API URL
try {
    $apiUrl = & $awsExe cloudformation describe-stacks `
        --region $Region `
        --stack-name $StackName `
        --query "Stacks[0].Outputs[?OutputKey=='ApiBaseUrl'].OutputValue" `
        --output text 2>$null
    if ($apiUrl) {
        Write-Host ""
        Write-Host "  API URL: $apiUrl" -ForegroundColor Yellow
        Write-Host ""
    }
} catch {
    # non-fatal
}
