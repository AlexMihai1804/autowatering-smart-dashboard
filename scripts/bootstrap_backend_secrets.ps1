param(
    [string]$StackName = "autowatering-backend-dev",
    [string]$Region = "eu-central-1",
    [string]$AppEnvironment = "dev"
)

$ErrorActionPreference = "Stop"

$aws = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"

function Invoke-Aws {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Args
    )

    $out = & $aws @Args
    if ($LASTEXITCODE -ne 0) {
        throw ("aws.exe failed: " + ($Args -join " "))
    }
    return $out
}

function Set-SecretFromEnv {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SecretId,
        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "Missing value for secret $SecretId (empty). Set it on the Lambda first, then rerun bootstrap."
    }

    # "describe-secret" failure is expected for first-time bootstrap; keep output quiet.
    $exists = $false
    try {
        & $aws secretsmanager describe-secret --region $Region --secret-id $SecretId 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $exists = $true }
    } catch {
        $exists = $false
    }

    if ($exists) {
        Invoke-Aws -Args @(
            "secretsmanager", "put-secret-value",
            "--region", $Region,
            "--secret-id", $SecretId,
            "--secret-string", $Value
        ) | Out-Null
    } else {
        Invoke-Aws -Args @(
            "secretsmanager", "create-secret",
            "--region", $Region,
            "--name", $SecretId,
            "--secret-string", $Value
        ) | Out-Null
    }

    Write-Host ("OK: " + $SecretId + " (len=" + $Value.Length + ")")
}

function New-RandomSalt {
    param(
        [int]$Bytes = 32
    )

    $buffer = New-Object byte[] $Bytes
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($buffer)
    } finally {
        if ($null -ne $rng) { $rng.Dispose() }
    }
    return [System.Convert]::ToBase64String($buffer)
}

$functionName = (Invoke-Aws -Args @(
    "cloudformation", "describe-stack-resources",
    "--region", $Region,
    "--stack-name", $StackName,
    "--logical-resource-id", "BackendFunction",
    "--query", "StackResources[0].PhysicalResourceId",
    "--output", "text"
)).Trim()

if ([string]::IsNullOrWhiteSpace($functionName)) {
    throw "Cannot resolve BackendFunction from stack $StackName"
}

$varsJson = Invoke-Aws -Args @(
    "lambda", "get-function-configuration",
    "--region", $Region,
    "--function-name", $functionName,
    "--query", "Environment.Variables",
    "--output", "json"
)

$vars = $varsJson | ConvertFrom-Json
if ($null -eq $vars) { $vars = @{} }

$prefix = "autowatering/$AppEnvironment"

Set-SecretFromEnv -SecretId "$prefix/kindwise_api_key" -Value ([string]$vars.KINDWISE_API_KEY)
Set-SecretFromEnv -SecretId "$prefix/stripe_secret_key" -Value ([string]$vars.STRIPE_SECRET_KEY)
Set-SecretFromEnv -SecretId "$prefix/stripe_webhook_secret" -Value ([string]$vars.STRIPE_WEBHOOK_SECRET)

$rateLimitSalt = ([string]$vars.RATE_LIMIT_SALT)
if ([string]::IsNullOrWhiteSpace($rateLimitSalt)) {
    $rateLimitSalt = New-RandomSalt
    Write-Host ("INFO: RATE_LIMIT_SALT was empty; generated a new salt (len=" + $rateLimitSalt.Length + ").")
}
Set-SecretFromEnv -SecretId "$prefix/rate_limit_salt" -Value $rateLimitSalt

Write-Host "Bootstrap complete."
