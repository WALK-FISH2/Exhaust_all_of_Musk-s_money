# Requirements Baseline — Spend_Musk_Money

> Status: **ACTIVE BASELINE**  
> Baseline: 1.1  
> Target product release: v0.1.0 → v1.0  
> Approved: 2026-08-17  
> Revised: 2026-08-18

## 1. Baseline intent

This file freezes the currently approved product decisions. It answers **what must be true**. Detailed interaction behavior belongs in `spec.md`; implementation choices belong in `architecture.md`.

## 2. Confirmed decisions

| Decision            | Baseline choice                                    |
| ------------------- | -------------------------------------------------- |
| Product name        | 花光马斯克的钱 / Spend Musk's Money                |
| Identity            | Unofficial entertainment simulation                |
| Starting budget     | Fixed $400,000,000,000                             |
| Real-time net worth | Not used in v1.0                                   |
| Canonical currency  | USD                                                |
| Secondary display   | Approximate CNY                                    |
| v1.0 platforms      | Web/PWA + WeChat Mini Program simultaneously       |
| Core modes          | Free + 30s + 60s + 300s challenges                 |
| Catalog strategy    | Original expanded catalog, not reference-site copy |
| Persistence         | Local-only                                         |
| Login/backend       | None in v1.0                                       |
| Ranking             | None in v1.0                                       |
| Result experience   | Rich result/receipt page with humorous statistics  |
| UI direction        | Modern flat UI + light humorous tone               |

## 3. Functional requirements

### BR-001 — Initial budget

Every newly started run MUST initialize with exactly `400,000,000,000` USD.

### BR-002 — Representative value disclaimer

The product MUST state that the budget is a game setting and not real-time net worth. It MUST state that the game is unofficial and not endorsed by Elon Musk or related companies.

### BR-003 — Product browsing

The player MUST be able to browse an original catalog covering inexpensive everyday items through extremely expensive/fantastical purchases.

### BR-004 — Product categories

v1.0 MUST include at least these categories:

1. Everyday
2. Food & Drink
3. Tech
4. Vehicles
5. Homes & Real Estate
6. Luxury
7. Travel & Experiences
8. Sports & Entertainment
9. Companies & Infrastructure
10. Space & Wild Ideas

Category names may be localized, but category identity must remain stable for achievement logic and saved data.

### BR-005 — Quantity controls

For a purchasable product the player MUST be able to:

- increase quantity;
- decrease quantity;
- set quantity through numeric editing;
- set quantity to the maximum currently allowed amount under affordability and catalog cap rules.

All operations MUST prevent negative quantity and negative balance. `MAX` means maximum allowed by both affordability and the product's per-run quantity cap; it must not mean “spend the entire remaining balance on this item regardless of game limits.”

### BR-006 — Immediate feedback

Changing quantity MUST immediately update:

- remaining balance;
- total spent;
- spending percentage;
- product subtotal;
- receipt/result data;
- newly triggered achievements.

### BR-007 — Exact completion

A run is complete when remaining balance is exactly zero. The catalog MUST contain a $1 item for dollar-level finishing, and the shipped catalog/cap configuration MUST include at least one regression-tested path from a fresh run to exact zero. Because quantities can be decreased/refunded, a player can always backtrack from a poor purchase combination and pursue a valid completion path.

### BR-008 — Free Mode

Free Mode has no countdown. The player may continue until balance reaches zero or they restart.

When balance reaches zero, the run transitions to a completed/frozen state. Returning to the product page for that completed run is read-only; further purchasing requires starting a new run.

### BR-009 — Challenge modes

v1.0 MUST provide 30-second, 60-second, and 300-second challenges.

The countdown starts after explicit challenge start, not while choosing a challenge. At timeout, purchasing is frozen and a challenge result is displayed. A timed-out run is completed/frozen and cannot be resumed for purchasing.

### BR-010 — Challenge lifecycle

Challenge elapsed time MUST be calculated from timestamps. Backgrounding, minimizing, tab throttling, or returning to the app MUST NOT grant extra time.

### BR-011 — Completion before timeout

If balance reaches zero before a challenge expires, the run ends immediately as a successful clear and records elapsed time in milliseconds as `completedAt - startedAt`. The completed challenge is frozen and cannot resume purchasing.

### BR-012 — Receipt

The current run MUST expose a receipt containing every product with quantity > 0, unit price, quantity, subtotal, total spent, and remaining balance.

### BR-013 — Results

A result screen MUST show at least:

- mode;
- total spent;
- remaining balance;
- spending percentage;
- distinct product types purchased;
- total item quantity;
- most expensive line item by subtotal;
- categories touched;
- achievements unlocked this run;
- a humorous summary sentence;
- “败家指数”, defined in v1.0 as rounded spending percentage from 0–100.

For challenge mode it MUST also show challenge duration and actual elapsed time.

Challenge actual elapsed time is deterministic:

- early exact-zero clear: `actualDurationMs = completedAt - startedAt`;
- natural timeout with remaining balance above zero: `actualDurationMs = durationMs`;
- a challenge found expired after backgrounding or restoration also uses `durationMs`, never `restoredAt - startedAt`.

Returning from a challenge result to its product page is read-only. The player must start a new run, retry, or select another challenge before purchasing again.

### BR-014 — Achievements

v1.0 MUST include an original achievement system. Achievement definitions live in `achievement-rules.md` and MUST NOT copy the reference site's names/descriptions one-for-one.

### BR-015 — Achievement persistence

Once a lifetime achievement is unlocked, it remains unlocked in local storage until the player explicitly clears local game data. Each result screen separately records which achievements were unlocked during that run.

### BR-016 — Current-run recovery

The app MUST automatically persist the active run locally and offer to restore it after reload/reopen when valid unfinished state exists.

Challenge restoration MUST use wall-clock timestamps; expired challenges restore directly to results rather than granting a fresh timer.

### BR-017 — Local records

v1.0 MUST store local best records at minimum for:

- highest spending percentage in each challenge duration;
- fastest exact-zero clear for each challenge duration, when achieved;
- lifetime achievement unlock state.

Highest challenge spending is compared using exact integer `totalSpent`, not a rounded display percentage. A new record replaces the stored record only when `new.totalSpent > old.totalSpent`; an equal value keeps the existing record.

Fastest exact-zero challenge clears are compared using integer `actualDurationMs`. A new record replaces the stored record only when its duration is strictly lower; an equal duration keeps the existing record.

### BR-018 — Restart

A player can restart at any time. If the current run has purchases, restart MUST require confirmation.

### BR-019 — No account/backend

All v1.0 core functionality MUST work without login, backend services, or cloud storage.

### BR-020 — Web target

The Web version MUST be responsive and installable/offline-capable as a PWA after an initial successful load of required assets.

### BR-021 — WeChat target

The WeChat Mini Program version MUST provide the same core catalog, purchase rules, modes, achievements, receipts, results, and local persistence as Web.

### BR-022 — Cross-platform parity

A deterministic test case given the same catalog version, mode, actions, and timestamps MUST produce the same money totals and achievement/result state on both targets.

### BR-023 — Currency display

USD is authoritative. CNY is displayed as an approximation using a configurable static display rate and must be labeled with `≈` or equivalent wording. The CNY value is not persisted as authoritative money.

Baseline default display rate: `1 USD ≈ 7.20 CNY`. This is a game display constant, not a claim of current FX accuracy.

### BR-024 — Original asset/copy requirement

The shipped catalog names/descriptions, achievement text, illustrations, UI copy, and result copy MUST be original or properly licensed and MUST NOT be taken from the reference site.

### BR-025 — No real-money mechanics

v1.0 MUST NOT include real purchases, deposits, withdrawals, cash prizes, gambling, financial instruments, investment suggestions, or virtual currency sold for money.

### BR-026 — Sharing scope

Native result-image export, link sharing, social sharing, and global ranking are OUT OF SCOPE for v1.0 unless separately approved. The v1.0 result page itself should be visually composed so a user can capture it manually.

### BR-027 — Search/filter

v1.0 SHOULD include category filtering and keyword search once the catalog exceeds 30 products. These controls cannot alter rule math.

### BR-028 — Performance

Normal quantity changes should feel immediate. Domain calculations must not require network access and should remain responsive with at least 100 catalog items.

### BR-029 — Product quantity caps

Every product MUST have a deterministic per-run maximum quantity. Caps exist to keep `MAX` and direct numeric editing useful without turning a timed challenge into a one-click clear on a cheap product. The cap policy is defined in `product-catalog.md` and is shared by Web and WeChat.

## 4. Non-functional requirements

### NFR-001 — Safety of calculations

All canonical amounts and quantities must remain safe integers. Overflow and invalid-number inputs must be rejected or clamped safely.

### NFR-002 — Accessibility

Core controls require readable labels/touch targets, visible focus on Web, and state communication that does not rely solely on color.

### NFR-003 — Reduced motion

Decorative motion must be disableable or reduced without changing game outcomes.

### NFR-004 — Localization readiness

v1.0 ships Chinese-first, but visible strings should be structured so English localization can be added without changing domain data IDs.

### NFR-005 — Data migration

Persisted data must contain a schema version. A catalog/app update must not crash because old local data exists.

### NFR-006 — Privacy

Core v1.0 must function without collecting personally identifiable information.

## 5. Explicitly out of scope for baseline v1.0

- live Elon Musk net-worth synchronization;
- backend/database;
- user accounts;
- cloud save;
- global/friend leaderboards;
- daily online challenges;
- ads as a required feature;
- in-app purchases;
- multiplayer;
- user-generated product catalogs;
- admin CMS;
- remote configuration required for gameplay;
- native iOS/Android apps outside the Web/PWA and WeChat targets;
- result-card image export/social APIs (planned candidate for v1.x).

## 6. Baseline acceptance gate

v1.0 cannot be considered complete until:

1. all MUST requirements above pass on Web and WeChat Mini Program;
2. money invariants have automated unit tests;
3. challenge timing has background/restore tests;
4. persistence migration has at least one version-migration test;
5. exact-zero completion is demonstrably reachable;
6. all shipped assets have known provenance;
7. no reference-site source/assets/copy were imported;
8. both target builds complete successfully.
