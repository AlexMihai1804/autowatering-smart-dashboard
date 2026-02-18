# Route Policy Matrix

> **Source of truth for endpoint auth, rate limits, and CORS policy.**
> Update this document whenever routes are added or modified.

Last updated: 2026-02-18

## Legend

| Auth Mode | Description |
|-----------|-------------|
| `cognito-jwt` | Requires valid Cognito ID or Access token in `Authorization` header |
| `factory-token` | Requires `x-factory-token` header (timing-safe compare) |
| `admin-token` | Requires `x-admin-token` header |
| `stripe-sig` | Stripe webhook signature verification (`stripe-signature` header) |
| `public` | No authentication required |

## Route Matrix

| Method | Path | Auth Mode | Premium | Rate Limit | CORS | Notes |
|--------|------|-----------|---------|------------|------|-------|
| **Health** | | | | | | |
| GET | `/health` | public | — | — | ✅ | Shallow liveness |
| GET | `/health/deep` | public | — | — | ✅ | Deep readiness check |
| GET | `/health/ota` | public | — | — | ✅ | OTA subsystem |
| GET | `/health/stripe` | public | — | — | ✅ | Stripe config |
| GET | `/health/provision` | public | — | — | ✅ | Provisioning config |
| **AI / Plant-ID** | | | | | | |
| POST | `/aiDoctor` | cognito-jwt | yes (configurable) | per-user daily+monthly | ✅ | Kindwise proxy |
| GET | `/aiDoctorHealth` | public | — | — | ✅ | |
| POST | `/plantId` | cognito-jwt | yes (configurable) | per-user daily+monthly | ✅ | Kindwise proxy |
| GET | `/plantIdHealth` | public | — | — | ✅ | |
| **Subscription** | | | | | | |
| GET | `/subscriptionStatus` | cognito-jwt | — | — | ✅ | |
| POST | `/createSubscriptionCheckout` | cognito-jwt | — | — | ✅ | Creates Stripe checkout session |
| POST | `/createBillingPortalSession` | cognito-jwt | — | — | ✅ | |
| POST | `/stripeWebhook` | stripe-sig | — | — | ❌ | Raw body required, no CORS |
| GET | `/appReturn` | public | — | — | ✅ | Redirect after Stripe flow |
| **Account** | | | | | | |
| GET | `/getProfile` | cognito-jwt | — | — | ✅ | |
| POST | `/updateProfile` | cognito-jwt | — | — | ✅ | |
| GET | `/getUserState` | cognito-jwt | — | — | ✅ | |
| POST | `/saveUserState` | cognito-jwt | — | — | ✅ | |
| POST | `/deleteMyAccount` | cognito-jwt | — | — | ✅ | Destructive |
| **Provisioning / Fleet** | | | | | | |
| POST | `/provision` | factory-token | — | — | ✅ | Factory only |
| POST | `/claimDevice` | cognito-jwt | — | — | ✅ | |
| POST | `/unclaimDevice` | cognito-jwt | — | — | ✅ | Owner only |
| POST | `/revokeDevice` | factory-token | — | — | ✅ | Admin only |
| POST | `/reactivateDevice` | factory-token | — | — | ✅ | Admin only |
| GET | `/deviceAudit` | factory-token | — | — | ✅ | Admin only |
| GET | `/myDevices` | cognito-jwt | — | — | ✅ | |
| **OTA** | | | | | | |
| GET | `/ota/latest` | cognito-jwt | — | — | ✅ | DB registry + env fallback |
| GET | `/ota/releases/{version}/download-url` | cognito-jwt | — | — | ✅ | Presigned S3 URL |
| POST | `/ota/releases` | admin-token | — | — | ✅ | Create draft release |
| POST | `/ota/releases/{version}/publish` | admin-token | — | — | ✅ | Publish release |
| GET | `/ota/releases` | admin-token | — | — | ✅ | List all releases |
| **Catch-all** | | | | | | |
| OPTIONS | `/{proxy+}` | public | — | — | ✅ | CORS preflight |

## CORS Configuration

- **Allowed origins**: Configured via `ALLOWED_ORIGINS` env var (default: `*`)
- **Allowed methods**: `GET, POST, OPTIONS`
- **Allowed headers**: `Content-Type, Authorization, x-factory-token, x-admin-token, stripe-signature`
- **Max age**: 86400s

## Rate Limiting

- Rate limiting is implemented per-feature (`aiDoctor`, `plantId`) using DynamoDB atomic counters.
- Windows: per-day + per-month limits.
- Key derivation: HMAC(salt, uid + feature + window).

## API Gateway Authorizer Strategy

Currently all auth is validated at the Lambda level (inside handler.ts). This provides:
- Flexibility: different auth modes per route
- Simplicity: single Lambda function
- Stripe webhook compatibility: raw body access for signature verification

**Future consideration**: API Gateway JWT authorizer for `cognito-jwt` routes to reject unauthorized requests before Lambda invocation. This would:
- Reduce Lambda invocations (and cost) for unauthorized requests
- Add defense-in-depth
- Require separate Lambda/route for webhook (no JWT)

### Migration plan (when needed):
1. Add JWT authorizer to HttpApi for Cognito User Pool
2. Tag protected routes with `Auth: { Authorizer: CognitoAuth }`
3. Keep `/stripeWebhook`, `/provision`, `/health/*`, OTA admin, fleet admin routes as `Auth: { Authorizer: NONE }`
4. Lambda-level auth remains as secondary check
