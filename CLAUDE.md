# TEC Insure — Claude Code Instructions

> ⚡ **SESSION START:** اقرأ `knowledge-base/C-02___CURRENT_STATE_.md` + **app charter
> `knowledge-base/C-129___INSURE_RISK_PROTECTION_RUNTIME.md`** من `yasira82/tec-knowledge-base` (branch: `main`).

## What This App Is

**The Risk Protection Runtime** of the Pi economy (C-129) — the **System of
Protection**. Insure answers one question:

```
"How do I protect myself, my assets, and my activities?"
```

Insure sits between verification and execution: **Zone verifies what can be
trusted; Insure protects what has been trusted.** It provides risk scoring,
escrow, dispute resolution, a recovery center, and beneficiary management —
so every economic interaction has a defined protection layer.

Built from `tec-template-base` (Next.js 15 frontend).

**Current Phase: Insure V0/V1 — Risk Protection preview (read-only).** Identity /
domain / slug / legal + a themed home (**risk score** + the protection surfaces:
escrow · dispute · recovery · beneficiary, each naming its **owning system**) +
a `/protection/[id]` detail page + **Insure Pro** (the Pi Portal "Process a
Transaction" gate). **Real escrow / capital movement is NOT built** — it is
hard-gated (below). Deployed (Mainnet) · Pi App ID registered · env set · payment live · referral growth loop wired (C-133).

---

## Pi App Identity

| Field | Value |
|-------|-------|
| **App** | TEC Insure |
| **Domain** | `https://insure.tecosystem.app` |
| **Pi App ID** | ✅ Registered (Mainnet) · Vercel `NEXT_PUBLIC_PI_APP_ID` |
| **APP_SOURCE slug** | `insure` (payment-service resolves `PI_API_KEY_INSURE`) |
| **PI_SANDBOX** | `false` (Mainnet) |

---

## Insure-Specific Rules (C-129) — READ BEFORE ANY ESCROW CODE

### 🔴 Custody Hard-Gate — escrow holds user funds (P0, like FundX / C-113)
Escrow = custody of user Pi. Under the Kernel Spec, **payment-service is the only
Pi custodian** (Invariant #8) — **insure-service NEVER holds Pi**. No
escrow-contribution / hold / release code ships until **ALL THREE** P0 gates are
documented-done:
1. **Legal review FIRST** — holding third-party funds in Pi (money-transmission / e-money) for the target jurisdiction.
2. **payment-service custody** — every escrowed π is held/moved/released BY `tec-payment-service` (DECIMAL(20,8), outbox, ADR-004). insure-service records STATE + issues intents, never balances.
3. **SYSTEM governance (C-110)** — escrow types + release/dispute rules approved as governed workflows; full ActorContext + audit trail.

Until all three exist, Insure ships **risk scoring + recovery planning + beneficiary
records ONLY** (read/plan surfaces) — **NO π custody, NO escrow release.**

### The ownership boundary
Insure **OWNS**: risk-score *presentation*, protection *records* (beneficiary/recovery
plans), the escrow *UI/state*. Insure does **NOT OWN**:
- **Pi custody** → `tec-payment-service` (escrow π held there, never here).
- **Risk computation** → Analytics (C-105). Insure presents; never re-derives.
- **Verification** → Zone (C-120) / tec-kyc-service. **Alert routing** → Alert (C-111).
- **Investment decisions** → FundX (C-113). **Governance** → SYSTEM (C-110).

### Legal boundary (C-129)
Insure is a **risk platform, NOT an insurance company** (V1–V2). No underwriting, no
policy issuance, no claims payment from reserves. Insurance Marketplace = V3+ (licensed
partners; legal structure required first).

### Isolation (P6)
Risk profiles are private; a counterparty sees an aggregate risk band only. Identity
from the `tec_user` session cookie server-side — **never** a query param or body. No
session → fail closed.

**Reference of record:** `yasira82/tec-knowledge-base` —
`C-129___INSURE_RISK_PROTECTION_RUNTIME.md` (charter) + `C-12_Dual_Mode_Payment.md`
(payment anti-regression) + `C-123` (session/cookies) + `C-71` (financial integrity).

---

## Stack

- Next.js 15 App Router + TypeScript strict · React 18
- `@yasser172/tec-ui` (design system) · `@yasser172/tec-auth` · `@yasser172/tec-sdk`
- Vitest (unit) + Playwright (e2e) · Deployment: Vercel

---

## Architecture Rules (non-negotiable)

### CSRF — middleware ONLY (P2 single source of truth)
CSRF is enforced in **`middleware.ts`** and **nowhere else**: a request is trusted
if the double-submit token matches **OR** it is first-party (Origin host === Host /
`*.tecosystem.app`).
- ❌ **NEVER** add a CSRF check inside a route handler (`csrfCookie !== csrfHeader`
  → 403). It 403's legit Mode-2 payments in Pi Browser (drops `sameSite=None`
  cookies). The CI `payment-policy` job fails the build if you do. (KB C-12 §11)
- ✅ A route may *forward* `x-csrf-token` to a downstream call; it must never *validate* it.

### ADR-007 — Dual-mode payment (Pi foreign session)
Every buy handler MUST guard before touching `window.Pi`:
```typescript
const isHubNavigation = () =>
  document.referrer.toLowerCase().includes('hub.tecosystem.app');
if (isHubNavigation() || !(window as any).Pi || !piReady) {
  redirectToHubPayment(...);   // Mode 1: Hub modal → /hub?pay=1&...
  return;
}
// Mode 2: standalone — createPaymentRecord() then createU2APayment() (src/lib/pi-payment.ts)
```
> Insure Pro (subscription) is the only buy flow. Approve under `PI_API_KEY_INSURE`
> (never the default Hub key — the Analytics approve→502 lesson, C-12 §11).

### ADR-009 — Unified payment contract
`amount` is a **number**; gateway path is **`/api/payment/*`** (singular); the only
inter-service header is **`x-internal-key`** + `INTERNAL_SECRET`. Don't re-declare
payment Zod locally — shapes live in `@yasser172/tec-sdk`.

### Two-SDK boundary
```
Client components → src/lib-client/*  (browser state, Pi hooks)
API routes (BFF)  → @yasser172/tec-sdk via /api/bff/*  (server-only)
```

### Auth / cookies (LOCKED)
SSO via Hub cookies `tec_access_token`, `tec_csrf`, `tec_user`. Never localStorage.
Identity is derived from the `tec_user` cookie server-side — **never from the request body**.

---

## Setup status + Roadmap (C-129 §Build Protocol)

```
Insure V0/V1 — Risk Protection preview (customized from template):
  ✅ package.json name = tec-insure · APP_SOURCE = 'insure'
  ✅ sso-callback ALLOWED_AUDIENCES → insure.tecosystem.app + tec-insure.vercel.app
  ✅ privacy + terms → TEC Insure / insure.tecosystem.app
  ✅ NEW-A: no NEXT_PUBLIC_API_GATEWAY_URL / Railway host in the client bundle
  ✅ /app themed: risk score + protection surfaces (read-only) + Insure Pro (real Pi U2A)
  ✅ /protection/[id] detail + BFF /api/bff/insure/protection (sample, read-only)

Live on Mainnet — all complete (SSoT: architecture/app-fleet.yaml):
  ✅ Register Pi App ID (Pi Developer Portal) → Vercel NEXT_PUBLIC_PI_APP_ID +
    API_GATEWAY_URL · INTERNAL_SECRET · SSO_SECRET · PI_SANDBOX=false.
  ✅ payment-service: set PI_API_KEY_INSURE on Railway (approve→502 otherwise, C-12 §11).
  ✅ Hub SSO: add insure.tecosystem.app + tec-insure.vercel.app to Hub /api/auth/sso
    ALLOWED_TARGETS + Hub domain registry.
  ✅ Deploy (Vercel) + runtime-verify login (C-123) + a real Insure Pro payment
    Mode 1 (Hub) AND Mode 2 (standalone).

Insure V1+ (POST hard-gates — legal + payment-service custody + SYSTEM, C-129 P0):
  risk score → escrow (TRANSACTION) → dispute resolution → recovery → beneficiary.
  NONE of the escrow/capital flows ship until the three P0 gates are documented-done.
```

---

## What NOT To Do

- Do NOT build escrow hold/release/custody before the 3 P0 gates (legal + payment-service + SYSTEM) — C-129
- Do NOT hold Pi in Insure or compute risk client-side — payment-service custodies, Analytics computes
- Do NOT present Insure as an insurance company or issue policies (V1–V2 legal boundary)
- Do NOT validate CSRF in a route handler — middleware only (CI blocks it)
- Do NOT send `amount` as a string, or use `/payments` / `x-service-secret`
- Do NOT skip the ADR-007 `isHubNavigation()` guard before `window.Pi`
- Do NOT store tokens in localStorage; do NOT derive identity from the body
- Do NOT add `NEXT_PUBLIC_*` for internal service URLs or `INTERNAL_SECRET`

---

## Commit Convention

```
feat(insure):  new protection feature   fix(payment): payment flow fix (test carefully)
fix(insure):   bug fix                   chore(scope):  build/config
```

---

## Skills

Available via plugin — invoke automatically when the situation matches:

| Situation | Skill |
|-----------|-------|
| Writing new feature or fixing a bug → use TDD | `/tdd` |
| Bug, regression, or unexpected behavior | `/diagnose` |
| Writing or modifying tests | `/test-guard` |
| Writing or modifying BFF routes, payment handlers, or API contracts | `/clean-code-guard` |
| Updating docs, CLAUDE.md, or knowledge-base entries | `/docs-guard` |
| Planning a new feature or architectural decision | `/grill-with-docs` |
| Breaking down a roadmap item into GitHub Issues | `/to-issues` |
| Session is getting long or context is filling up | `/handoff` |
| Adding pre-commit hooks to this repo | `/setup-pre-commit` |
