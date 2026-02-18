# AutoWatering AWS Backend

AWS replacement for the old Firebase Functions backend.

## Stack
- AWS Lambda (Node.js 20)
- API Gateway HTTP API
- DynamoDB (`users`, `rateLimits`)
- Cognito User Pool JWT auth
- Stripe for subscriptions
- Kindwise proxy for AI Doctor / Plant ID

## Endpoints (same contract as before)
- `POST /aiDoctor`
- `GET /aiDoctorHealth`
- `POST /plantId`
- `GET /plantIdHealth`
- `GET /subscriptionStatus`
- `POST /createSubscriptionCheckout`
- `POST /createBillingPortalSession`
- `POST /stripeWebhook`
- `GET /getProfile`
- `POST /updateProfile`
- `GET /getUserState`
- `POST /saveUserState`
- `POST /deleteMyAccount`
- `POST /provision` (factory provisioning, protected by `x-factory-token`)
- `POST /claimDevice` (authenticated user claims a provisioned serial)
- `GET /myDevices` (authenticated user device list)
- `GET /ota/latest` (release lookup by `channel`, `board`, `current_version`)
- `GET /ota/releases/{version}/download-url` (resolve direct OTA binary URL)

## Prerequisites
- AWS CLI configured
- SAM CLI installed
- Existing Cognito User Pool + App Client
- Stripe price + webhook secret
- Kindwise API key

## Secrets (anti-footgun)
This stack reads secrets from AWS Secrets Manager (so `sam deploy` can't wipe them with empty defaults).

Expected secret names (per environment):
- `autowatering/<env>/kindwise_api_key`
- `autowatering/<env>/stripe_secret_key`
- `autowatering/<env>/stripe_webhook_secret`
- `autowatering/<env>/rate_limit_salt`

Bootstrap them from the currently deployed Lambda env (dev stack by default):
```powershell
# from repo root:
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\bootstrap_backend_secrets.ps1

# OR from backend\\aws-autowatering-backend:
powershell -NoProfile -ExecutionPolicy Bypass -File ..\\..\\scripts\\bootstrap_backend_secrets.ps1
```

## Build
```powershell
cd backend\aws-autowatering-backend
npm install
npm run build
```

## Deploy
```powershell
sam build
sam deploy
```

Required parameter values during deploy (non-secret):
- `CognitoUserPoolId`
- `CognitoAppClientId`
- `CognitoUserPoolArn`
- `StripeMonthlyPriceId`
- `FactoryProvisionToken`

Optional parameters:
- `AllowedOrigins`
- `AppBaseUrl`
- `ReturnUrlAllowedSchemes`
- `ReturnUrlAllowedOrigins`
- `RequirePremiumForAi`
- `RequirePremiumForPlantId`
- `EnableConversation`
- `OtaLatestVersion`
- `OtaLatestChannel`
- `OtaLatestBoard`
- `OtaLatestMandatory`
- `OtaLatestNotes`
- `OtaLatestArtifactName`
- `OtaLatestArtifactSizeBytes`
- `OtaLatestArtifactSha256`
- `OtaLatestDownloadUrl`

## Provisioning endpoint (factory)

`POST /provision`

Headers:
- `Content-Type: application/json`
- `x-factory-token: <FactoryProvisionToken>`

Body:
```json
{
	"hw_id": "A1B2C3D4E5F60708",
	"metadata": {
		"batch": "2026-02",
		"line": "L1"
	}
}
```

Response (`201` new or `200` existing):
```json
{
	"ok": true,
	"created": true,
	"hw_id": "A1B2C3D4E5F60708",
	"serial": "000001",
	"serial_seq": 1,
	"status": "active",
	"created_at": "2026-02-16T10:00:00.000Z",
	"updated_at": "2026-02-16T10:00:00.000Z"
}
```

Notes:
- Endpoint-ul este idempotent pe `hw_id` (același `hw_id` primește același `serial`).
- `serial_seq` este monoton crescător pentru raportare business; `serial` este formatat din el (`000001`, `000002`, ...).
- În caz de curse concurente pot apărea goluri în secvență, dar fără duplicate.

Identity model:
- `serial`: identificator uman (6 digits), unic în fleet.
- `thing_name`: identificator cloud-stable (`autowatering-<serial>`) pentru integrare viitoare AWS IoT.
- ownership: `claimed_by_uid` + `claimed_at` (un device aparține unui singur cont).

## Claim endpoint (account assignment)

`POST /claimDevice`

Headers:
- `Content-Type: application/json`
- `Authorization: Bearer <Cognito JWT>`

Body:
```json
{
	"serial": "000123"
}
```

Response (`200`):
```json
{
	"ok": true,
	"claimed": true,
	"serial": "000123",
	"hw_id": "A1B2C3D4E5F60708",
	"thing_name": "autowatering-000123",
	"owner_uid": "<cognito-sub>",
	"claimed_at": "2026-02-16T12:00:00.000Z",
	"already_owned": false
}
```

## List my devices

`GET /myDevices`

Headers:
- `Authorization: Bearer <Cognito JWT>`

Response (`200`):
```json
{
	"ok": true,
	"owner_uid": "<cognito-sub>",
	"count": 1,
	"devices": [
		{
			"serial": "000123",
			"hw_id": "A1B2C3D4E5F60708",
			"thing_name": "autowatering-000123",
			"status": "active",
			"claimed_at": "2026-02-16T12:00:00.000Z"
		}
	]
}
```

## Stripe webhook
After deploy, configure Stripe webhook endpoint:
- `https://<api-id>.execute-api.<region>.amazonaws.com/stripeWebhook`

Subscribe to:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
