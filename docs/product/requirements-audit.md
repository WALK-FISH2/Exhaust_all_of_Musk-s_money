# Requirements Audit — Spend_Musk_Money

> Status: Audit / Non-normative  
> Version: 1.1  
> Date: 2026-08-18

## 1. Purpose

This audit records where the baseline came from, which questions were resolved, what assumptions were added to make the specification implementable, and what remains intentionally deferred.

It does not override `requirements-baseline.md`.

## 2. User-confirmed choices

On 2026-08-17 the following choices were confirmed:

| Topic       | Confirmed choice | Baseline consequence                                                 |
| ----------- | ---------------- | -------------------------------------------------------------------- |
| Name        | A                | Use “花光马斯克的钱 / Spend Musk's Money” with unofficial disclaimer |
| Wealth      | A                | Fixed game value; no real-time wealth API                            |
| Currency    | A                | USD authoritative + CNY approximate display                          |
| Platforms   | B                | Web/PWA and WeChat Mini Program both in v1.0                         |
| Gameplay    | A                | Free + timed challenges + richer result page                         |
| Catalog     | A                | Original expanded catalog                                            |
| Persistence | A                | Local-only v1.0, no account/backend/ranking                          |
| UI          | A                | Modern flat + light humorous tone                                    |

## 3. Implementation assumptions added by this baseline

These were not separate user questions but are necessary to make the approved direction deterministic:

### A-001 — Fixed budget amount

The earlier recommended example value of **$400 billion** is adopted as the baseline fixed starting budget.

Reason: choice “fixed game value” needs an exact constant for tests and cross-platform parity.

### A-002 — Static CNY display rate

A default display-only rate of `7.20 CNY/USD` is used. It is deliberately not described as live FX.

Reason: v1.0 has no backend and the player chose fixed/offline behavior.

### A-003 — Exact-zero guarantee

At least one $1 catalog item is mandatory.

Reason: without a unit-price greatest common divisor of 1, some remaining balances could be mathematically impossible to clear.

### A-004 — Timer semantics

Timed challenges use explicit start plus wall-clock timestamps.

Reason: browser throttling and Mini Program background lifecycle otherwise allow inconsistent timing.

### A-005 — Sharing split

The result page is included in v1.0; native result-image generation/social sharing is deferred to v1.x.

Reason: the user accepted both the rich result concept and the earlier recommendation that v1.0 remain local-only.

### A-006 — Per-product quantity caps

Every catalog product has a per-run quantity cap. `MAX` respects that cap.

Reason: without caps, pressing `MAX` on the $1 exact-zero item could spend the entire $400B budget in one action, making all challenge durations meaningless. Caps preserve direct editing/MAX convenience while keeping the challenge a routing/selection game.

## 4. Reference-site audit

Reference inspected: `spend-elon-money.com/zh-cn/` on 2026-08-17.

Observed features included:

- a representative starting balance of $250B;
- product cards spanning cheap to extremely expensive items;
- editable quantities and real-time spend totals;
- receipt section;
- spending progress;
- 16 achievements;
- 30s, 60s, and 300s challenge selections;
- completion/results UI;
- statement that the simulator is unofficial and uses representative rather than live wealth values.

These observations are recorded only to understand genre expectations. They are **not** permission to copy implementation, assets, text, catalog composition, achievement wording, or visual design.

## 5. Resolved product risks

| Risk                                | Resolution                                |
| ----------------------------------- | ----------------------------------------- |
| Live wealth data changes constantly | Fixed $400B baseline                      |
| FX changes constantly               | Static approximate CNY display only       |
| Web/Mini Program rule divergence    | Shared pure TypeScript domain core        |
| Exact-zero may be impossible        | Mandatory $1 item                         |
| Backgrounding can pause challenge   | Timestamp-based timer                     |
| Reference product is too similar    | Original catalog/copy/achievements/assets |
| v1 scope expands into backend       | Explicit local-only boundary              |
| Persisted data breaks after updates | Versioned schema + migration              |

## 6. Open but non-blocking decisions

The following can be chosen during implementation without changing the baseline, provided the spec constraints are satisfied:

- exact color palette and typography;
- final original hero illustration;
- exact number of catalog products above the minimum useful set;
- exact humorous result sentence library;
- whether the UI uses tabs, chips, or horizontal category filters;
- exact animation implementation;
- whether PWA service worker integration uses a Taro/Vite-compatible plugin or equivalent Workbox configuration;
- whether lightweight UI state uses React reducer/context or a compatible small state library.

## 7. Decisions requiring explicit baseline change

Do not implement these without approval:

- change starting budget from $400B;
- make wealth or FX live;
- remove either Web/PWA or WeChat from v1.0;
- add accounts/backend/cloud ranking;
- add real payment or monetized virtual currency;
- change canonical money away from integer USD;
- remove challenge modes;
- copy the reference site's catalog/assets/copy;
- add native share/export to the v1.0 must-have scope.

## 8. Pre-implementation completeness audit

This is a requirements-document audit, not an implementation pass/fail report.

| Area                      | Baseline IDs                                   | Pre-implementation status                              |
| ------------------------- | ---------------------------------------------- | ------------------------------------------------------ |
| Money and completion      | BR-001, BR-005–BR-007, BR-023, BR-029, NFR-001 | Defined; automated tests planned                       |
| Catalog/originality       | BR-003, BR-004, BR-024, BR-027                 | Defined; initial catalog annex supplied                |
| Free/challenge gameplay   | BR-008–BR-011                                  | Defined; timestamp semantics specified                 |
| Receipt/results           | BR-012, BR-013                                 | Defined; deterministic stats specified                 |
| Achievements              | BR-014, BR-015                                 | Defined; achievement annex supplied                    |
| Persistence/records       | BR-016–BR-018, NFR-005                         | Defined; versioned local schema planned                |
| Platforms/offline parity  | BR-019–BR-022, BR-028                          | Defined; M0 technical spike required                   |
| Safety/scope boundary     | BR-002, BR-025, BR-026, NFR-006                | Defined                                                |
| Accessibility/motion/i18n | NFR-002–NFR-004                                | Defined; implementation verification deferred to M5/M6 |

No unresolved requirement is currently blocking M0. Any discovery during M0 that changes product behavior must be escalated through the document hierarchy rather than silently implemented.

## 9. Formal pre-development revision record — 2026-08-18

The product owner formally approved the following resolutions after the pre-implementation consistency audit. These entries record the original issue, controlling decision, changed documents, and closure state; they do not override the normative documents.

| Audit ID | Original issue                                                                                             | Severity | Final decision                                                                                                                              | Changed documents                                                               | Status   | Closed |
| -------- | ---------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------- | ------ |
| AUD-001  | `private-train` and `private-island` could each clear a fresh $400B run with one MAX command               | P0       | Explicit per-run caps are 7,999 and 4,999; prices remain unchanged; catalog validation must reject every fresh-run single-product MAX clear | `product-catalog.md`, `tasks.md`                                                | RESOLVED | Yes    |
| AUD-002  | SPEC required ascending prices while catalog rows/order behavior allowed price regressions                 | P1       | Default order is globally `priceUsd ASC`, then stable `order ASC`; categories only filter/group                                             | `spec.md`, `product-catalog.md`, `tasks.md`                                     | RESOLVED | Yes    |
| AUD-003  | Challenge actual duration was incomplete for natural/background/restored timeout                           | P1       | Early clear uses `completedAt - startedAt`; every timeout uses configured `durationMs`, never return time minus start                       | `requirements-baseline.md`, `spec.md`, `architecture.md`, `plan.md`, `tasks.md` | RESOLVED | Yes    |
| AUD-004  | “Return to products” could be read as resuming a completed challenge                                       | P1       | Completed/expired runs are frozen; return-to-products is read-only; purchasing requires a new run/retry                                     | `requirements-baseline.md`, `spec.md`, `architecture.md`, `plan.md`, `tasks.md` | RESOLVED | Yes    |
| AUD-005  | Best-record precision and tie replacement were unspecified                                                 | P1       | Spend records compare exact integer `totalSpent`; clear records compare millisecond `actualDurationMs`; ties preserve existing records      | `requirements-baseline.md`, `spec.md`, `architecture.md`, `plan.md`, `tasks.md` | RESOLVED | Yes    |
| AUD-006  | `sticker-finish` wording did not match its broad “owned sticker” condition                                 | P1       | Only a one-unit `lucky-sticker` purchase that changes balance from $1 to $0 qualifies                                                       | `spec.md`, `achievement-rules.md`, `architecture.md`, `plan.md`, `tasks.md`     | RESOLVED | Yes    |
| AUD-007  | BR-008, BR-026, BR-028, NFR-004, and NFR-006 had no explicit tasks                                         | P1       | Added explicit Free Mode, v1 boundary, 100-product performance, string-resource, and privacy tasks                                          | `plan.md`, `tasks.md`                                                           | RESOLVED | Yes    |
| AUD-008  | Pure achievement logic was scheduled after purchasing/results that depend on it                            | P1       | Stable tasks T0401/T0402 move to M1; event model, run unlock calculation, and table tests are also M1; persistence/UI remain M4             | `architecture.md`, `plan.md`, `tasks.md`                                        | RESOLVED | Yes    |
| AUD-009  | T0308, T0406, T0501, T0502, and T0601 bundled multiple independently verifiable outcomes                   | P1       | Preserved each stable ID with a narrowed responsibility and added dependent split tasks                                                     | `plan.md`, `tasks.md`                                                           | RESOLVED | Yes    |
| AUD-010  | Money, achievement, record, lifecycle, Free Mode, H5, PWA, and WeChat acceptance tests were incomplete     | P1       | Added explicit unit, integration, E2E, PWA, and Mini Program tasks with requirement traceability                                            | `plan.md`, `tasks.md`                                                           | RESOLVED | Yes    |
| AUD-011  | Architecture source tree omitted required Taro root/config/test/E2E structure and hard platform boundaries | P1       | Added complete recommended root structure and prohibited platform API dependencies from `domain/`                                           | `architecture.md`                                                               | RESOLVED | Yes    |

## 10. Revision outcome

- No confirmed decision conflicts with `constitution.md`.
- The official exact-zero regression path remains `$200B + $100B + 2×$35B + $20B + $6B + $4B = $400B` and remains within all resolved caps.
- M0 remains the next permitted implementation milestone; this revision itself creates no code or scaffold.
