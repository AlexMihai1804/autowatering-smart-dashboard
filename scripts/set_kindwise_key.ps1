param(
    [Parameter(Mandatory = $true)]
    [string]$Key,

    [string]$StackName = "autowatering-backend-dev",
    [string]$Region = "eu-central-1",
    [string]$AppEnvironment = "dev"
)

$ErrorActionPreference = 'Stop'

$aws = 'C:\Program Files\Amazon\AWSCLIV2\aws.exe'

$functionName = (& $aws cloudformation describe-stack-resources `
    --region $Region `
    --stack-name $StackName `
    --logical-resource-id BackendFunction `
    --query 'StackResources[0].PhysicalResourceId' `
    --output text).Trim()

if ([string]::IsNullOrWhiteSpace($functionName)) {
    throw "Cannot resolve BackendFunction from stack $StackName"
}

# Keep Secrets Manager in sync so SAM/CFN redeploys can't wipe the value.
$secretId = "autowatering/$AppEnvironment/kindwise_api_key"
$exists = $false
& $aws secretsmanager describe-secret --region $Region --secret-id $secretId *> $null
if ($LASTEXITCODE -eq 0) { $exists = $true }

if ($exists) {
    & $aws secretsmanager put-secret-value --region $Region --secret-id $secretId --secret-string $Key | Out-Null
} else {
    & $aws secretsmanager create-secret --region $Region --name $secretId --secret-string $Key | Out-Null
}
if ($LASTEXITCODE -ne 0) {
    throw "Failed to set Secrets Manager secret $secretId"
}

$varsJson = & $aws lambda get-function-configuration `
    --region $Region `
    --function-name $functionName `
    --query 'Environment.Variables' `
    --output json

$vars = $varsJson | ConvertFrom-Json
if ($null -eq $vars) {
    $vars = @{}
}

$vars.KINDWISE_API_KEY = $Key

$tmp = Join-Path $env:TEMP ("lambda-env-" + [guid]::NewGuid().ToString() + ".json")
$payload = @{
    Variables = $vars
} | ConvertTo-Json -Depth 10

[System.IO.File]::WriteAllText($tmp, $payload, [System.Text.UTF8Encoding]::new($false))

try {
    & $aws lambda update-function-configuration `
        --region $Region `
        --function-name $functionName `
        --environment ("file://" + $tmp) | Out-Null

    & $aws lambda wait function-updated --region $Region --function-name $functionName

    & $aws lambda get-function-configuration `
        --region $Region `
        --function-name $functionName `
        --query '{Function:FunctionName,KindwiseLen:length(Environment.Variables.KINDWISE_API_KEY)}' `
        --output table
} finally {
    if (Test-Path $tmp) {
        Remove-Item $tmp -Force
    }
}
