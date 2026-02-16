param(
    [Parameter(Mandatory = $true)]
    [string]$GoogleClientId,

    [Parameter(Mandatory = $true)]
    [string]$GoogleClientSecret,

    [string]$Region = "eu-central-1",
    [string]$UserPoolId = "eu-central-1_fTWEJu6dg",
    [string]$AppClientId = "3che81vspk4side0du155to6pt",

    # If empty, uses the existing domain on the pool.
    [string]$UserPoolDomainPrefix = "",

    [string[]]$CallbackUrls = @(
        "http://localhost:5173/auth",
        "http://localhost:4173/auth",
        "autowatering://auth"
    ),
    [string[]]$LogoutUrls = @(
        "http://localhost:5173/auth",
        "http://localhost:4173/auth",
        "autowatering://auth"
    ),

    [switch]$UpdateEnvFiles
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

function Get-UserPoolDomainPrefix {
    $domain = (Invoke-Aws -Args @(
        "cognito-idp", "describe-user-pool",
        "--region", $Region,
        "--user-pool-id", $UserPoolId,
        "--query", "UserPool.Domain",
        "--output", "text"
    )).Trim()

    if ($domain -and $domain -ne "None") {
        return $domain
    }
    return ""
}

$existingDomainPrefix = Get-UserPoolDomainPrefix

if ([string]::IsNullOrWhiteSpace($existingDomainPrefix)) {
    if ([string]::IsNullOrWhiteSpace($UserPoolDomainPrefix)) {
        throw "User Pool has no Hosted UI domain. Provide -UserPoolDomainPrefix to create one."
    }

    Invoke-Aws -Args @(
        "cognito-idp", "create-user-pool-domain",
        "--region", $Region,
        "--user-pool-id", $UserPoolId,
        "--domain", $UserPoolDomainPrefix
    ) | Out-Null

    $existingDomainPrefix = Get-UserPoolDomainPrefix
}

if ([string]::IsNullOrWhiteSpace($existingDomainPrefix)) {
    throw "Failed to resolve/create user pool domain prefix."
}

$hostedUiDomain = "$existingDomainPrefix.auth.$Region.amazoncognito.com"
$googleRedirectUri = "https://$hostedUiDomain/oauth2/idpresponse"

Write-Host ("Cognito Hosted UI domain: " + $hostedUiDomain)
Write-Host ("Google redirect URI (set this in Google OAuth client): " + $googleRedirectUri)

$providerDetailsJson = (@{
    client_id = $GoogleClientId
    client_secret = $GoogleClientSecret
    authorize_scopes = "openid email profile"
} | ConvertTo-Json -Compress)

$attributeMappingJson = (@{
    email = "email"
    given_name = "given_name"
    family_name = "family_name"
    name = "name"
    picture = "picture"
} | ConvertTo-Json -Compress)

$providerExists = $false
try {
    Invoke-Aws -Args @(
        "cognito-idp", "describe-identity-provider",
        "--region", $Region,
        "--user-pool-id", $UserPoolId,
        "--provider-name", "Google"
    ) | Out-Null
    $providerExists = $true
} catch {
    $providerExists = $false
}

if ($providerExists) {
    Invoke-Aws -Args @(
        "cognito-idp", "update-identity-provider",
        "--region", $Region,
        "--user-pool-id", $UserPoolId,
        "--provider-name", "Google",
        "--provider-details", $providerDetailsJson,
        "--attribute-mapping", $attributeMappingJson
    ) | Out-Null
    Write-Host "Updated Cognito Google identity provider."
} else {
    Invoke-Aws -Args @(
        "cognito-idp", "create-identity-provider",
        "--region", $Region,
        "--user-pool-id", $UserPoolId,
        "--provider-name", "Google",
        "--provider-type", "Google",
        "--provider-details", $providerDetailsJson,
        "--attribute-mapping", $attributeMappingJson
    ) | Out-Null
    Write-Host "Created Cognito Google identity provider."
}

$updateClientArgs = @(
    "cognito-idp", "update-user-pool-client",
    "--region", $Region,
    "--user-pool-id", $UserPoolId,
    "--client-id", $AppClientId,
    "--supported-identity-providers", "COGNITO", "Google",
    "--allowed-o-auth-flows-user-pool-client",
    "--allowed-o-auth-flows", "code",
    "--allowed-o-auth-scopes", "openid", "email", "profile",
    "--callback-urls"
) + $CallbackUrls + @(
    "--logout-urls"
) + $LogoutUrls

Invoke-Aws -Args $updateClientArgs | Out-Null

Write-Host "Updated app client supported identity providers + callback/logout URLs."

if ($UpdateEnvFiles) {
    $root = Split-Path -Parent $PSScriptRoot
    $envFiles = @(
        (Join-Path $root ".env"),
        (Join-Path $root ".env.local")
    )

    foreach ($file in $envFiles) {
        if (!(Test-Path $file)) { continue }

        $text = Get-Content $file -Raw
        $lines = $text -split "`r?`n"
        $out = New-Object System.Collections.Generic.List[string]

        $set = @{
            "VITE_COGNITO_HOSTED_UI_DOMAIN" = $hostedUiDomain
            "VITE_COGNITO_REDIRECT_URI" = $CallbackUrls[0]
            "VITE_COGNITO_LOGOUT_URI" = $LogoutUrls[0]
            "VITE_COGNITO_GOOGLE_ENABLED" = "true"
        }

        $seen = @{}

        foreach ($line in $lines) {
            $m = [regex]::Match($line, "^(?<k>[A-Z0-9_]+)=")
            if ($m.Success) {
                $k = $m.Groups["k"].Value
                if ($set.ContainsKey($k)) {
                    $out.Add("$k=$($set[$k])")
                    $seen[$k] = $true
                    continue
                }
            }
            $out.Add($line)
        }

        foreach ($k in $set.Keys) {
            if (-not $seen.ContainsKey($k)) {
                $out.Add("$k=$($set[$k])")
            }
        }

        [System.IO.File]::WriteAllText($file, ($out -join "`r`n"), [System.Text.UTF8Encoding]::new($false))
        Write-Host ("Updated " + $file)
    }
}

Write-Host "Google sign-in is configured in Cognito."
