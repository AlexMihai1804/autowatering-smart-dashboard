param(
    [string]$StackName = "autowatering-backend-dev",
    [string]$Region = "eu-central-1",
    [string]$AppEnvironment = "dev",
    [string]$BackendDir = "backend/aws-autowatering-backend"
)

$ErrorActionPreference = "Stop"

$sam = "C:\Program Files\Amazon\AWSSAMCLI\bin\sam.cmd"

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Label,
        [Parameter(Mandatory = $true)]
        [scriptblock]$Action
    )

    Write-Host ("==> " + $Label)
    & $Action
    if ($LASTEXITCODE -ne 0) {
        throw ("Step failed: " + $Label)
    }
}

Invoke-Step -Label "Bootstrap backend secrets (Secrets Manager)" -Action {
    powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "bootstrap_backend_secrets.ps1") `
        -StackName $StackName `
        -Region $Region `
        -AppEnvironment $AppEnvironment
}

Push-Location $BackendDir
try {
    Invoke-Step -Label "Backend TypeScript build" -Action { npm run build }
    Invoke-Step -Label "SAM build" -Action { & $sam build }
    Invoke-Step -Label "SAM deploy" -Action { & $sam deploy }
} finally {
    Pop-Location
}

Write-Host "Deploy complete."

