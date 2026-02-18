# ADR-001: OTA Release Registry (DynamoDB)

**Date:** 2026-02-18
**Status:** Accepted
**Deciders:** Project maintainers

## Context

The original OTA implementation stored the latest firmware version as Lambda environment variables (`OTA_LATEST_VERSION`, `OTA_LATEST_CHANNEL`, `OTA_LATEST_BOARD`). This approach:
- Supported only a single "latest" version globally
- Required a full Lambda redeploy to publish a new firmware
- Had no publication lifecycle (draft → published)
- Could not support multiple channels or boards simultaneously from a registry
- Had no audit trail of past releases

## Decision

Implement a DynamoDB-backed release registry with:
- **Table**: `ota_releases` with composite key `board#channel` (PK) + `version` (SK)
- **Admin API**: `POST /ota/releases` (create draft), `POST /ota/releases/{version}/publish` (publish), `GET /ota/releases` (list)
- **S3 storage**: Presigned URLs for upload (PUT) and download (GET) with configurable TTL
- **Backward compatibility**: Env vars remain as fallback when DB has no releases

## Consequences

### Positive
- Multi-version, multi-channel, multi-board support
- No redeploy needed to publish firmware
- `publish_ota_release.py` pipeline: build → create → upload → publish in one command
- Audit through DynamoDB item history (published_at, created_at)

### Negative
- Additional DynamoDB table cost (minimal with PAY_PER_REQUEST)
- S3 bucket management (lifecycle policies needed for old artifacts)
- Admin token management as additional secret

### Risks
- Presigned URL TTL must be balanced: too short → download failures; too long → security exposure

---

# ADR-002: Stripe Lookup via GSI (not Scan)

**Date:** 2026-02-18
**Status:** Accepted

## Context

Stripe webhook handlers need to find user records by `stripeCustomerId` or `stripeSubscriptionId`. The original implementation used `ScanCommand` on the entire users table, which:
- Has O(n) cost and latency
- Becomes a bottleneck at scale (>1000 users)
- Consumes excessive read capacity

## Decision

Add two Global Secondary Indexes (GSI) on the UsersTable:
- `stripe-customer-index`: PK = `stripe_customer_id`, KEYS_ONLY projection
- `stripe-subscription-index`: PK = `stripe_subscription_id`, KEYS_ONLY projection

Promote `stripe_customer_id` and `stripe_subscription_id` as top-level attributes on user records (alongside the nested `subscription.stripeCustomerId` path).

Route lookups through GSI Query (O(1)), keep Scan as ultimate fallback.

## Consequences

### Positive
- O(1) lookup instead of full table scan
- Webhook processing latency reduced from O(n) to O(1)
- No additional DynamoDB table needed
- Backward compatible: scan fallback handles old records without top-level attributes

### Negative
- Two additional GSIs cost: minimal with KEYS_ONLY projection
- Data duplication: Stripe IDs stored both in `subscription` map and top-level
- All write paths must maintain top-level attribute consistency

---

# ADR-003: Device Ownership Lifecycle

**Date:** 2026-02-18
**Status:** Accepted

## Context

The provisioning system supported `provision` (factory) and `claim` (user), but lacked:
- Unclaim (user releases device)
- Revoke (admin disables device)
- Reactivate (admin re-enables revoked device)
- Audit trail for ownership transitions

These are required for RMA processes, device transfers, and support operations.

## Decision

Extend the provisioning system with:
- **State machine**: `factory_only` → `active` (provision) → `active+claimed` (claim) → `active` (unclaim) → `revoked` (revoke) → `active` (reactivate)
- **Endpoints**: `POST /unclaimDevice` (user auth), `POST /revokeDevice` (factory token), `POST /reactivateDevice` (factory token), `GET /deviceAudit` (factory token)
- **Audit trail**: `audit_trail` array on provisioning record, each entry: `{ action, actor_uid, timestamp, reason }`
- **DynamoDB operations**: Atomic updates with condition expressions to enforce state machine

## Consequences

### Positive
- Full device lifecycle management
- Audit trail for support and compliance
- User can self-service unclaim
- Admin can revoke compromised devices

### Negative
- Audit trail stored as list attribute (max 400KB per DynamoDB item)
- For high-transition devices, may need separate audit table in future
- Factory token auth for admin ops (not role-based)

---

# ADR-004: Optimistic Locking on User Documents

**Date:** 2026-02-18
**Status:** Accepted

## Context

The `mergeUser()` pattern (`get → deepMerge → put`) is vulnerable to lost updates when two concurrent requests modify different fields of the same user document. Scenarios include:
- Subscription webhook + user state save happening simultaneously
- Profile update + device claim racing

## Decision

Add `doc_version` field to user records with:
- Increment on every write
- `ConditionExpression: doc_version = :expected OR attribute_not_exists(doc_version)` on Put
- Up to 3 retries with exponential backoff on `ConditionalCheckFailedException`
- Return HTTP 409 if all retries exhausted

Backward compatible: `attribute_not_exists(doc_version)` clause handles records without the field.

## Consequences

### Positive
- Prevents silent data loss from concurrent writes
- Automatic retry handles most conflicts transparently
- No change needed in callers of `mergeUser()`

### Negative
- Extra read on retry (re-fetch document)
- Theoretical HTTP 409 exposure to clients (rare under normal load)
- All user writes now go through optimistic lock even when not strictly needed
