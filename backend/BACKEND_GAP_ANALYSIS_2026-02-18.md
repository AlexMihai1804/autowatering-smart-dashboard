# Analiză backend vs proiectul actual

Data: 2026-02-18

## Rezumat executiv

Backend-ul actual (`backend/aws-autowatering-backend`) acoperă bine MVP-ul curent al aplicației (auth/profile/state, subscription Stripe, AI Doctor, Plant ID, OTA lookup), dar are gap-uri importante pentru producție/scalare.

Verdict:
- **MVP readiness:** bun
- **Production readiness (la scară):** parțial

---

## 1) Ce este deja implementat și funcțional

### 1.1 API + rutare
- Contractul principal de endpoint-uri este implementat și rutat în:
  - `backend/aws-autowatering-backend/src/handler.ts`
- Include:
  - AI Doctor (`POST /aiDoctor`, `GET /aiDoctorHealth`)
  - Plant ID (`POST /plantId`, `GET /plantIdHealth`)
  - Subscription (`GET /subscriptionStatus`, `POST /createSubscriptionCheckout`, `POST /createBillingPortalSession`, `POST /stripeWebhook`, `GET /appReturn`)
  - Account/profile/state (`GET /getProfile`, `POST /updateProfile`, `GET /getUserState`, `POST /saveUserState`, `POST /deleteMyAccount`)
  - Provisioning/claiming (`POST /provision`, `POST /claimDevice`, `GET /myDevices`)
  - OTA (`GET /ota/latest`, `GET /ota/releases/{version}/download-url`)

### 1.2 Auth + profile + cloud state
- Cognito JWT verification (id/access token), user extraction și guard-uri:
  - `backend/aws-autowatering-backend/src/auth.ts`
- Profile/state/account endpoints sunt implementate:
  - `backend/aws-autowatering-backend/src/account.ts`
- Frontend-ul le consumă direct:
  - `src/auth/AuthProvider.tsx`

### 1.3 Stripe subscription flow
- Checkout + billing portal + webhook + status sync implementate:
  - `backend/aws-autowatering-backend/src/subscriptions.ts`
- Include mecanism de recovery după email și trial management.

### 1.4 AI Doctor + Plant ID prin backend proxy
- Kindwise API key rămâne server-side (corect din punct de vedere securitate API key).
- Enforced auth + premium + usage limits + rate limiting:
  - `backend/aws-autowatering-backend/src/aiDoctor.ts`
  - `backend/aws-autowatering-backend/src/plantId.ts`
  - `backend/aws-autowatering-backend/src/shared.ts`

### 1.5 OTA check/download (minim funcțional)
- Endpoint-uri de lookup implementate:
  - `backend/aws-autowatering-backend/src/ota.ts`
- Frontend-ul are client OTA compatibil:
  - `src/services/OtaBackendService.ts`

### 1.6 IaC + deploy
- AWS SAM template și stack deployabile:
  - `backend/aws-autowatering-backend/template.yaml`
- Scripturi de deploy prezente:
  - `backend/aws-autowatering-backend/deploy.py`
  - `backend/aws-autowatering-backend/deploy.ps1`

---

## 2) Ce lipsește (gap analysis)

## P0 – Critic (pentru producție reală)

### P0.1 OTA release management real (nu doar env vars) ✅ DONE
**Situație actuală:**
- OTA folosește o singură „versiune latest" din variabile de mediu (`OTA_LATEST_*`).
- Nu există release registry persistent/publication lifecycle.

**Rezolvat (2026-02-18):**
- ✅ `POST /ota/releases` — creează draft release + presigned upload URL
- ✅ `POST /ota/releases/{version}/publish` — publică release
- ✅ `GET /ota/releases` — listare releases (admin)
- ✅ DynamoDB `ota_releases` table (PK: `board#channel`, SK: `version`)
- ✅ Presigned S3 upload + download cu TTL configurabil
- ✅ Backward-compatible: env vars funcționează ca fallback
- Fișiere: `src/ota.ts` (rewrite), `src/otaDb.ts` (nou), `src/otaS3.ts` (nou)

**Referințe:**
- cerință documentată: `docs-embedded/ota-backend-api.md`

### P0.2 Scalabilitate Stripe mapping (lookup-uri ineficiente) ✅ DONE
**Situație actuală:**
- Căutările user după `stripeCustomerId`/`stripeSubscriptionId` folosesc scan pe tabela users (`ScanCommand`).

**Rezolvat (2026-02-18):**
- ✅ GSI `stripe-customer-index` (PK: `stripe_customer_id`, KEYS_ONLY) pe UsersTable
- ✅ GSI `stripe-subscription-index` (PK: `stripe_subscription_id`, KEYS_ONLY) pe UsersTable
- ✅ `findUserUidByStripeCustomerId()` / `findUserUidByStripeSubscriptionId()` — O(1) Query
- ✅ `findUserUidByPathValue()` rutează automat prin GSI, scan păstrat ca fallback
- ✅ `saveSubscriptionSnapshot()` scrie `stripe_customer_id` / `stripe_subscription_id` top-level
- ✅ `getOrCreateStripeCustomer()` + `handleStripeCheckoutSessionCompleted()` promovează ID-uri top-level
- Fișiere: `src/db.ts`, `src/shared.ts`, `src/subscriptions.ts`, `template.yaml`

**Referință:**
- `backend/aws-autowatering-backend/src/db.ts` (`findUserUidByPathValue`)

### P0.3 Control concurență la update (lost updates)
**Situație actuală:**
- pattern frecvent `get -> deep merge -> put` pe documentul user.

**Risc:**
- două request-uri simultane pot suprascrie câmpuri între ele

**Lipsește:**
- optimistic locking (`version`, `updatedAt` cu condition expression)
- update-uri atomice pe path-uri critice

**Referință:**
- `backend/aws-autowatering-backend/src/db.ts` (`mergeUser`)

---

## P1 – Important

### P1.1 Observability/operare insuficientă
**Situație actuală:**
- logging de bază, fără observabilitate production-grade.

**Lipsește:**
- structured logs coerente (requestId/userId/route)
- metrici custom (latency/error rate per endpoint)
- alarme CloudWatch (5xx spike, throttling, timeout)
- DLQ/strategie clară pentru evenimente eșuate (mai ales webhook/async)

### P1.2 Defense-in-depth pe auth la API Gateway
**Situație actuală:**
- auth se validează în cod Lambda.

**Lipsește (opțional dar recomandat):**
- JWT authorizer la API Gateway pentru endpoint-uri protejate
- separare public/private routes cu policy clar

### P1.3 Fallback provider Plant ID neimplementat
**Situație actuală:**
- documentația menționează fallback Pl@ntNet
- codul curent folosește Kindwise only

**Lipsește:**
- fallback orchestration + health-based failover

### P1.4 Device claim/provision flow incomplet integrat în app
**Situație actuală:**
- backend are `provision/claim/myDevices`
- în frontend utilizarea este minimă/inexistentă în fluxul principal

**Lipsește:**
- integrare UX completă (claim pe serial, listă device-uri cloud, reconciliere cu BLE)

### P1.5 Fleet lifecycle incomplet (după claim)
**Situație actuală:**
- există provisioning + claim + listare device-uri

**Lipsește:**
- endpoint-uri și reguli pentru `unclaim/reclaim/revoke/reactivate`
- management status device (ex. `active`, `revoked`, `factory_only`) expus operațional
- audit trail pentru ownership transitions

**Impact:**
- suport greu pentru transfer ownership, RMA și procese post-vânzare

**Referință:**
- `backend/aws-autowatering-backend/src/provisioning.ts`

### P1.6 Health checks operaționale pe domenii critice
**Situație actuală:**
- există health pentru AI/Plant (`/aiDoctorHealth`, `/plantIdHealth`)

**Lipsește:**
- health endpoint-uri dedicate pentru Stripe/webhook path, provisioning path și OTA path
- readiness checks pentru dependențe externe (Stripe, DynamoDB, config esențial)

**Impact:**
- triage mai lent la incidente și observabilitate redusă la nivel de capabilitate

---

## P2 – Hygiene / maintainability

### P2.1 Testare backend absentă
- Nu există teste automate (`spec`/`test`) în backend.

### P2.2 Drift de documentație
- Unele documente au pași/parametri vechi (ex. migrare cu secrete ca parametri, deși codul folosește Secrets Manager).

### P2.3 Config dev hardcoded
- `samconfig.toml` conține valori dev hardcoded (region/pool/client/price etc.)
- util pentru dezvoltare rapidă, dar slab pentru multi-env governance.

### P2.4 Drift documentație deploy/migrare
**Situație actuală:**
- unele instrucțiuni de migrare/deploy nu mai reflectă exact modelul curent cu Secrets Manager

**Lipsește:**
- un singur runbook „source of truth” pentru bootstrap secrete, parametri non-secreți, rollback
- validare automată a documentației în CI (checklist minim)

---

## 3) Aliniere backend vs frontend (status)

- **AI Doctor:** aliniat
- **Plant ID:** aliniat (fără fallback provider)
- **Auth/Profile/State:** aliniat
- **Premium/Stripe:** aliniat funcțional, dar cu gap de scalare
- **OTA app flow:** ✅ aliniat (registry DB, admin API, presigned URLs, env fallback)
- **Provision/claim devices:** backend pregătit, integrare app incompletă

---

## 4) Recomandare de prioritizare

### Sprint 1 (focus P0)
1. OTA release registry + publish endpoints
2. Stripe mapping fără scan (GSI/tabelă dedicată)
3. Concurrency-safe updates pe user records

### Sprint 2 (focus P1)
1. Observability + alarme + logging standardizat
2. API Gateway JWT authorizer (unde are sens)
3. Plant ID fallback provider
4. Integrare completă claim/myDevices în app

### Sprint 3 (P2 + hardening)
1. Test suite backend (unit + contract smoke)
2. Doc cleanup + runbook deployment/incident
3. Config multi-env (dev/staging/prod) fără hardcoded sensitive values

---

## 5) Concluzie finală

Backend-ul actual este **suficient pentru livrarea funcțiilor de bază din proiectul curent**, dar pentru utilizare stabilă în producție la scară trebuie adresate rapid gap-urile P0, în special:
- OTA release lifecycle real,
- eliminarea scan-urilor Stripe,
- protecție la update concurent pe datele user.

După aceste puncte, zona de observabilitate și hardening API devine următoarea prioritate naturală.

---

## 6) Task-uri de implementare grupate pe zone

### 6.1 OTA

#### OTA-1: Model release persistent ✅ DONE
- ✅ Tabel `ota_releases` (PK: `board#channel`, SK: `version`) + atribute complete.
- ✅ Validare semver la write, `normalizeVersion()`, `compareSemver()`.
- Fișiere: `src/otaDb.ts`, `template.yaml`

#### OTA-2: Admin API pentru lifecycle release ✅ DONE
- ✅ `POST /ota/releases` — create draft + presigned upload URL.
- ✅ `POST /ota/releases/{version}/publish` — state transition draft → published.
- Admin auth via `x-admin-token` header.
- Fișiere: `src/ota.ts`, `src/handler.ts`, `template.yaml`

#### OTA-3: Lookup API pe registry (nu env vars) ✅ DONE
- ✅ `GET /ota/latest` citește din registry DB (`published=true`, filtru `board/channel`).
- ✅ `GET /ota/releases/{version}/download-url` verifică existență/publicare în registry.
- ✅ Env vars funcționează ca fallback dacă DB-ul e gol.
- Fișiere: `src/ota.ts`, `src/otaDb.ts`

#### OTA-4: Download securizat ✅ DONE
- ✅ Presigned URL cu TTL configurabil (`OTA_DOWNLOAD_URL_TTL_SECONDS`).
- ✅ Returnează `expires_at`, compatibil cu app (`download.url`, `artifact.sha256`).
- Fișiere: `src/ota.ts`, `src/otaS3.ts`, `src/config.ts`

#### OTA-5: Rollout control
- Adaugă suport staged rollout (`rollout_pct`) și/sau allowlist per `serial/hw_id`.
- Extinde `latest` cu decizie deterministică de eligibilitate.

#### OTA-6: Pipeline publish ✅ DONE
- ✅ `tools/publish_ota_release.py` conectat la endpoint-urile noi (`create → upload → publish`).
- ✅ Versiune din `VERSION`, SHA256, upload presigned, publish automat.
- ✅ Suportă `--dry-run`, `--skip-build`, `--artifact-path`, `--sysbuild`, `--pristine`.

### 6.2 Stripe / Subscription

#### STRIPE-1: Eliminare scan pe user table ✅ DONE
- ✅ GSI `stripe-customer-index` + `stripe-subscription-index` pe UsersTable.
- ✅ `findUserUidByStripeCustomerId()` / `findUserUidByStripeSubscriptionId()` — Query O(1).
- ✅ `findUserUidByPathValue()` rutează automat prin GSI, scan ca fallback.
- Fișiere: `src/db.ts`, `template.yaml`

#### STRIPE-2: Consistență webhook
- La evenimente webhook, scrie mapping-ul înainte de sincronizarea snapshot-ului.
- Adaugă idempotency guard per `event.id` pentru procesare unică.

#### STRIPE-3: Hardening status sync
- Definește timeout/retry policy explicit pentru calls Stripe.
- Fallback predictibil la snapshot local când Stripe e degradat.

#### STRIPE-4: Operare
- Adaugă metrici: webhook success rate, latency, mapping misses.
- Adaugă alarmă pentru spike de 4xx/5xx pe `stripeWebhook`.

### 6.3 Provisioning / Fleet

#### FLEET-1: Lifecycle ownership ✅ DONE
- ✅ `POST /unclaimDevice` (user auth, owner only)
- ✅ `POST /revokeDevice` (factory token, admin)
- ✅ `POST /reactivateDevice` (factory token, admin)
- ✅ State machine: `factory_only → active → active+claimed → revoked`
- ✅ DynamoDB atomic updates cu condition expressions
- Fișiere: `src/provisioning.ts`, `src/db.ts`, `src/handler.ts`, `template.yaml`

#### FLEET-2: Audit trail ✅ DONE
- ✅ `audit_trail` array pe provisioning record cu `{ action, actor_uid, timestamp, reason }`
- ✅ `GET /deviceAudit?hw_id=...` (factory token auth)
- ✅ Audit entries adăugate automat la unclaim, revoke, reactivate
- Fișiere: `src/db.ts` (`AuditEntry`, `appendProvisioningAudit`, `getDeviceAuditTrail`)

#### FLEET-3: App integration contract
- Definește payload standard pentru reconciliere BLE <-> cloud device list.
- Documentează scenarii de conflict (`claimed_by_other`, serial necunoscut etc.).

### 6.4 Data layer & Concurrency

#### DATA-1: Optimistic locking pe user document ✅ DONE
- ✅ Câmp `doc_version` incrementat atomic pe fiecare write
- ✅ `ConditionExpression: doc_version = :expected OR attribute_not_exists(doc_version)`
- ✅ Retry automat (3 încercări, backoff 50ms/100ms/150ms)
- ✅ HTTP 409 dacă toate retry-urile eșuează
- ✅ Backward-compatible cu documente fără `doc_version`
- Fișier: `src/db.ts` (`mergeUser`)

#### DATA-2: Patch updates pe path-uri
- Înlocuiește pattern `get -> deep merge -> put` cu update expresii atomice unde posibil.
- Standardizează helper-ele DB pentru concurență.

### 6.5 Observability / Reliability

#### OBS-1: Structured logging standard ✅ DONE
- ✅ Log schema JSON: `requestId`, `route`, `uid`, `statusCode`, `latencyMs`, `errorCode`, `level`
- ✅ Factory pattern: `requestLogger(event)` + `createLogger()`
- ✅ Integrat în `handler.ts` pe toate path-urile (success, error, 404)
- ✅ Compatible cu CloudWatch Logs Insights
- Fișiere: `src/logger.ts` (nou), `src/handler.ts`

#### OBS-2: Metrici + alarme
- Publică metrici custom per endpoint (p50/p95, 4xx, 5xx, throttles).
- Configurează alarme pentru timeout/throttle/error burst.

#### OBS-3: Health/readiness pe capabilități ✅ DONE
- ✅ `GET /health` (liveness, always 200)
- ✅ `GET /health/deep` (DynamoDB tables + config checks)
- ✅ `GET /health/ota` (OTA subsystem: table, S3, token)
- ✅ `GET /health/stripe` (Stripe config checks)
- ✅ `GET /health/provision` (provisioning config + table)
- ✅ Response include `checks[]` array cu latency per component
- Fișiere: `src/health.ts` (nou), `src/handler.ts`, `template.yaml`

### 6.6 Security / API Governance

#### SEC-1: API Gateway JWT authorizer
- Mută auth pre-validare în API Gateway pentru endpoint-uri private.
- Păstrează endpoint-uri publice explicit marcate (`health`, webhook cu semnătură).

#### SEC-2: Route policy matrix ✅ DONE
- ✅ Matrice completă: endpoint → auth mode → rate limit → CORS policy
- ✅ Documentată în `ROUTE_POLICY_MATRIX.md`
- ✅ Include migration plan pentru API Gateway JWT authorizer

### 6.7 QA, Testare, Documentație

#### QA-1: Test suite backend
- Unit tests pentru `ota`, `subscriptions`, `provisioning`, `auth`, `shared`.
- Contract tests pentru endpoint-uri critice (`latest`, `download-url`, webhook, claim).

#### QA-2: Smoke tests post-deploy ✅ DONE
- ✅ `smoke_test.py` cu 11 verificări: health endpoints, auth guards, OTA, 404
- ✅ Exit code 0/1 pentru pipeline integration
- ✅ Suportă `--api-base-url` și `--admin-token`
- Fișier: `smoke_test.py`

#### DOC-1: Unificare runbook deploy/migrare ✅ DONE
- ✅ `RUNBOOK.md` complet: prerequisites, config, deploy, post-deploy, monitoring, rollback, troubleshooting
- ✅ Include CloudWatch Logs Insights queries
- ✅ Architecture quick reference diagram

#### DOC-2: ADR-uri scurte pe decizii cheie ✅ DONE
- ✅ ADR-001: OTA Release Registry (DynamoDB)
- ✅ ADR-002: Stripe Lookup via GSI
- ✅ ADR-003: Device Ownership Lifecycle
- ✅ ADR-004: Optimistic Locking pe User Documents
- Fișier: `ADR.md`
