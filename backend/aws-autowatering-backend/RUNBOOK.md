# Deploy & Operations Runbook

> Single source of truth for deploying, monitoring, and troubleshooting the AutoWatering backend.

Last updated: 2026-02-18

---

## 1. Prerequisites

| Tool | Min Version | Install |
|------|-------------|---------|
| AWS CLI | v2 | [install](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) |
| SAM CLI | ≥1.100 | [install](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) |
| Node.js | ≥20 | [download](https://nodejs.org/) |
| Python | ≥3.10 | For OTA publish + smoke tests |

```bash
# Verify credentials
aws sts get-caller-identity --region eu-central-1
```

## 2. Configuration

### Stack parameters (`samconfig.toml`)
| Parameter | Source | Notes |
|-----------|--------|-------|
| `CognitoUserPoolId` | AWS Console → Cognito | `eu-central-1_xxxxx` |
| `CognitoAppClientId` | AWS Console → Cognito → App integration | |
| `CognitoUserPoolArn` | AWS Console → Cognito → General settings | |
| `StripeMonthlyPriceId` | Stripe Dashboard → Products → Price ID | `price_xxxx` |
| `OtaLatestVersion` | Legacy env fallback | `0.0.2` |
| `OtaLatestChannel` | Legacy env fallback | `stable` |
| `OtaLatestBoard` | Legacy env fallback | `arduino_nano_33_ble` |

### Secrets (Secrets Manager)
Stored under `autowatering-backend-dev/secrets`:

| Secret Key | Description |
|------------|-------------|
| `STRIPE_SECRET_KEY` | Stripe API secret key (`sk_live_` or `sk_test_`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook endpoint signing secret (`whsec_...`) |
| `KINDWISE_API_KEY` | Kindwise (Plant.id) API key |
| `FACTORY_PROVISION_TOKEN` | Factory provisioning auth token |
| `OTA_ADMIN_TOKEN` | OTA admin API auth token |
| `RATE_LIMIT_SALT` | HMAC salt for rate limit key derivation |

Bootstrap secrets:
```powershell
.\scripts\bootstrap_backend_secrets.ps1 -StackName autowatering-backend-dev -Region eu-central-1 -AppEnvironment dev
```

## 3. Deploy Procedures

### 3.1 Standard deploy (backend only)
```powershell
# PowerShell (recommended)
cd backend\aws-autowatering-backend
.\deploy.ps1

# Or Python
python deploy.py

# Or manual steps
npm install --no-fund --no-audit
npm run build
sam build
sam deploy
```

### 3.2 Full OTA pipeline (backend + firmware)
```powershell
# Full pipeline: deploy backend then publish firmware OTA
.\ota_deploy.ps1

# Backend only
.\ota_deploy.ps1 -SkipOtaPublish

# OTA publish only (backend already deployed)
.\ota_deploy.ps1 -SkipBackendDeploy

# Dry run
.\ota_deploy.ps1 -DryRun
```

### 3.3 OTA firmware publish only
```bash
python tools/publish_ota_release.py \
  --api-base-url https://<api-id>.execute-api.eu-central-1.amazonaws.com \
  --admin-token <token> \
  --channel stable \
  --board arduino_nano_33_ble \
  --sysbuild --pristine
```

### 3.4 Quick compile check (no deploy)
```bash
cd backend/aws-autowatering-backend
npm run check   # tsc --noEmit
```

## 4. Post-Deploy Verification

### 4.1 Smoke tests
```bash
python smoke_test.py --api-base-url https://<api-id>.execute-api.eu-central-1.amazonaws.com
```

### 4.2 Manual health checks
```bash
# Liveness
curl https://<api>/health

# Deep readiness
curl https://<api>/health/deep

# Subsystem checks
curl https://<api>/health/ota
curl https://<api>/health/stripe
curl https://<api>/health/provision
```

## 5. Monitoring & Observability

### 5.1 Structured logs
All logs are JSON-structured with fields:
- `level`, `timestamp`, `requestId`, `route`, `uid`, `statusCode`, `latencyMs`, `errorCode`

**CloudWatch Logs Insights queries:**
```
# Errors in last hour
fields @timestamp, route, statusCode, errorMessage
| filter level = "ERROR"
| sort @timestamp desc
| limit 50

# Latency p95 by route
stats percentile(latencyMs, 95) as p95 by route
| sort p95 desc

# Request count by route
stats count(*) as cnt by route
| sort cnt desc
```

### 5.2 Key metrics to watch
- Lambda invocation errors (CloudWatch → Lambda → Errors)
- API Gateway 5xx rate (CloudWatch → API Gateway)
- DynamoDB throttling (CloudWatch → DynamoDB → ThrottledRequests)
- Lambda duration (p95 should be < 5s)

## 6. Rollback

### 6.1 Code rollback
```bash
# Deploy previous version
git checkout <previous-commit>
cd backend/aws-autowatering-backend
.\deploy.ps1
```

### 6.2 CloudFormation rollback
```bash
aws cloudformation rollback-stack \
  --stack-name autowatering-backend-dev \
  --region eu-central-1
```

### 6.3 OTA rollback
Publish previous firmware version:
```bash
python tools/publish_ota_release.py \
  --api-base-url <url> --admin-token <token> \
  --artifact-path <path-to-previous-binary> \
  --channel stable --board arduino_nano_33_ble
```

## 7. Troubleshooting

| Symptom | Check | Fix |
|---------|-------|-----|
| 500 on all routes | `/health/deep` | Check DynamoDB tables exist, env vars set |
| 401 on auth routes | CloudWatch logs | Verify Cognito pool/client ID matches |
| Stripe webhook fails | `/health/stripe` + logs | Verify webhook secret, check Stripe Dashboard events |
| OTA upload fails | `/health/ota` | Check S3 bucket exists, admin token correct |
| Slow responses | CW Logs `latencyMs` | Check DynamoDB capacity, cold starts |
| `optimistic_lock_failed` | App logs (409) | Normal under high concurrency — client should retry |

## 8. Architecture Quick Reference

```
Client App (React/Capacitor)
  │
  ├─ HTTPS ──→ API Gateway (HttpApi)
  │               │
  │               └─→ Lambda (handler.ts)
  │                     ├─ auth.ts (Cognito JWT verify)
  │                     ├─ account.ts (profile/state)
  │                     ├─ subscriptions.ts (Stripe)
  │                     ├─ aiDoctor.ts / plantId.ts (Kindwise proxy)
  │                     ├─ provisioning.ts (device fleet)
  │                     ├─ ota.ts (firmware releases)
  │                     └─ health.ts (readiness)
  │
  ├─ BLE ──→ Device (nRF52, Zephyr)
  │
  └─ mcumgr ──→ Device OTA update
```

**DynamoDB Tables:**
- `autowatering-users-{env}` — user records (with optimistic locking via `doc_version`)
- `autowatering-rate-limits-{env}` — rate limit counters (TTL)
- `autowatering-provisioning-{env}` — device registry + serial counter
- `autowatering-ota-releases-{env}` — OTA firmware release registry

**S3 Buckets:**
- `autowatering-ota-{stack}-{env}` — OTA firmware binaries
