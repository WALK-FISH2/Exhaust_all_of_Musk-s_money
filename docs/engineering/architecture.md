# Architecture — Spend_Musk_Money

> Status: Active  
> Version: 1.4  
> Date: 2026-08-18  
> Parent: `spec.md`

## 1. Architectural goal

Build one deterministic game core and ship it to both H5/PWA and WeChat Mini Program with minimal platform duplication.

## 2. Recommended stack

### Cross-platform application

- **Taro 4.2.1**
- **React 18.3.1**
- **TypeScript 5.4.5**
- package manager: **pnpm 10.27.0**
- compiler runner: **Vite 4.5.14**

Rationale: current Taro 4.x documentation identifies it as a multi-end framework and its ecosystem includes H5 and WeChat Mini Program targets. The game mostly uses standard lists, controls, local state, and lifecycle APIs, making it a good fit for shared-code delivery.

### Testing

- unit/domain: **Vitest**
- H5 E2E/smoke: **Playwright**
- WeChat: build validation + Developer Tools smoke tests; add automation where practical after the baseline flow stabilizes.

### PWA

PWA capability is added at the H5 output layer:

- Web App Manifest;
- service worker/offline app shell;
- cached static catalog/assets;
- update strategy that does not corrupt local saves.

M0 validated `vite-plugin-pwa 1.3.0` inside the Taro Vite plugin chain for H5 production builds. The selected integration uses `injectManifest` with a repository-owned minimal service worker because Workbox's default `generateSW` path generation does not escape the apostrophe in this repository's Windows path. The service worker precaches the generated app shell and static assets, uses a cached `index.html` navigation fallback, and does not call `skipWaiting`; activation/refresh remains user-mediated. Formal update UI and full install/offline acceptance remain later PWA tasks.

## 3. Source layout

Recommended single-app structure. M0 creates this structure directly in the repository root; it must not add another nested project root:

```text
Spend_Musk_Money/
├── AGENTS.md
├── README.md
├── docs/
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── project.config.json
├── config/
│   ├── index.ts
│   ├── dev.ts
│   └── prod.ts
├── src/
│   ├── app.config.ts
│   ├── app.tsx
│   ├── app.scss
│   ├── pages/
│   │   ├── game/
│   │   ├── results/
│   │   ├── achievements/
│   │   └── settings/
│   ├── domain/
│   │   ├── money.ts
│   │   ├── game-state.ts
│   │   ├── commands.ts
│   │   ├── reducer.ts
│   │   ├── achievements.ts
│   │   ├── achievement-events.ts
│   │   ├── records.ts
│   │   ├── results.ts
│   │   └── timer.ts
│   ├── data/
│   │   ├── products.ts
│   │   ├── categories.ts
│   │   ├── achievements.ts
│   │   └── config.ts
│   ├── storage/
│   │   ├── schema.ts
│   │   ├── repository.ts
│   │   ├── migrations/
│   │   └── adapters/
│   │       ├── h5-storage.ts
│   │       └── weapp-storage.ts
│   ├── platform/
│   │   ├── lifecycle.ts
│   │   ├── clock.ts
│   │   ├── navigation.ts
│   │   ├── feedback.ts
│   │   ├── adapters/
│   │   └── pwa/
│   ├── components/
│   ├── assets/
│   ├── styles/
│   └── i18n/
├── tests/
│   ├── domain/
│   ├── persistence/
│   ├── catalog/
│   └── platform-contracts/
├── e2e/
│   ├── h5/
│   └── weapp-smoke/
└── assets/
    └── LICENSES.md
```

Do not create separate H5 and WeChat copies of `domain/` or `data/`.

`domain/` MUST NOT import or reference `window`, `document`, `localStorage`, `wx`, or Taro platform APIs. Browser, Mini Program, lifecycle, storage, navigation, feedback, and PWA differences enter through interfaces implemented under `storage/adapters/` or `platform/adapters/`.

## 4. Domain model

```ts
interface ProductDefinition {
  id: string
  categoryId: string
  order: number
  nameKey: string
  priceUsd: number // positive safe integer dollars
  maxQuantityPerRun: number // positive safe integer
  kind: 'realistic' | 'aspirational' | 'fantasy'
  keywords?: string[]
}

interface RunState {
  id: string
  catalogVersion: number
  mode: 'free' | 'challenge-30' | 'challenge-60' | 'challenge-300'
  initialBudgetUsd: number
  quantities: Record<string, number>
  unitPriceSnapshotsUsd: Record<string, number>
  startedAt: number | null
  deadlineAt: number | null
  durationMs: number | null
  completedAt: number | null
  status: 'ready' | 'active' | 'completed' | 'expired'
  runUnlockedAchievementIds: string[]
}
```

Derived values such as `spent`, `balance`, CNY text, distinct product count, and category coverage should be calculated from state rather than duplicated wherever practical.

## 5. Money model

### 5.1 Authoritative unit

Use integer USD dollars, not cents, because the v1 catalog uses integer-dollar game prices.

`MAX_SAFE_INTEGER` is far above the $400B baseline, but every arithmetic boundary must still assert `Number.isSafeInteger`.

### 5.2 Balance

```text
spent = Σ(priceUsd(product) × quantity(product))
balance = initialBudgetUsd - spent
```

Valid state invariant:

```text
0 <= spent <= initialBudgetUsd
0 <= balance <= initialBudgetUsd
quantity is integer >= 0
```

### 5.3 CNY

```text
approxCny = round(usd * displayRate)
```

This value is rendering-only. Do not use it in domain state transitions or achievements.

## 6. Command model

All mutations go through commands, for example:

- `StartRun(mode, now)`
- `IncrementProduct(productId, now)`
- `DecrementProduct(productId, now)`
- `SetProductQuantity(productId, target, now)`
- `MaxProduct(productId, now)`
- `Tick(now)` / `ReconcileTime(now)`
- `RestartRun(mode)`

The domain command handler must validate challenge expiry before applying a purchase command.

Every successful mutation also produces a normalized domain transition event containing the command kind, product ID when applicable, positive or negative quantity delta, balance before/after, and supplied timestamp. Achievement evaluation consumes the before/after state plus this event. This is required for event-sensitive rules such as `sticker-finish` and `max-button`; UI events are not authoritative achievement inputs.

## 7. MAX algorithm

Given product unit price `u`, current quantity `q`, current balance `b`, and per-run cap `c`:

```text
affordableTarget = q + floor(b / u)
target = min(c, affordableTarget)
```

If `target == q`, state remains unchanged. The cap is part of shared catalog/domain data and cannot differ by platform.

## 8. Timer architecture

Do NOT store a decrementing “seconds left” as authoritative state.

Store:

- `startedAt`;
- `deadlineAt`.
- `durationMs`.

Render:

`remainingMs = max(0, deadlineAt - Date.now())`

Production code accesses `Date.now()` through the injected shared `Clock` interface so tests can supply deterministic timestamps. Intervals and animation frames only trigger display refreshes and never decrement authoritative time.

Before any timed-run purchase command:

1. read `now`;
2. if `now >= deadlineAt`, transition to expired;
3. reject the purchase;
4. generate result from the pre-command quantities.

This handles browser throttling and Mini Program backgrounding consistently.

The same reconciliation runs on browser visibility/page-show events, Taro page show, Mini Program foreground entry, route return, and persisted-state restoration.

Challenge actual duration is derived as follows:

- early exact-zero clear: `completedAt - startedAt`;
- natural timeout: `durationMs`;
- timeout discovered after backgrounding or restoration: `durationMs`, never `restoredAt - startedAt`.

Both early-cleared and expired runs are frozen. Returning to their product page is read-only; domain commands reject further mutations regardless of UI state.

## 9. Persistence architecture

### 9.1 Envelope

```ts
interface PersistedGameDataV1 {
  schemaVersion: 1
  catalogVersion: 2
  activeRun: RunState | null
  lifetimeAchievementIds: string[]
  records: LocalRecords
  preferences: Preferences
}
```

### 9.2 Adapters

Expose a shared repository interface:

```ts
interface StorageAdapter {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
}
```

H5 and WeChat provide platform adapters. Domain code cannot import browser `localStorage` or `wx.*` APIs.

M0 implements this contract with an H5 `localStorage` adapter and an async Taro Storage adapter selected in the platform layer. A platform-neutral M0 repository serializes only the disposable `m0-storage-test` record; it is not the v1 save schema. Both adapters run through the same contract probe for missing reads, set/get, JSON parsing, overwrite, and removal.

### 9.3 Migration

Read flow:

`raw → parse → validate version → migrate sequentially → validate current schema → use`

Invalid active-run data may be dropped without deleting valid lifetime records when separation is possible.

## 10. Catalog-version handling

A restored run must calculate against the product prices that were authoritative for that saved run.

For v1, choose one of these implementation-safe approaches during M0/M1:

1. persist a price snapshot for products present in the run; or
2. retain catalog-version snapshots/migrations in code.

M1 selected the first approach: `RunState.unitPriceSnapshotsUsd` captures a product's authoritative unit price when its quantity first becomes positive. Spend/balance derivation reuses that snapshot for the life of the run, while current catalog data continues to provide names, categories, caps, and future assets. This prevents a later catalog price edit from changing already-spent totals without introducing the formal persistence schema before M4.

## 10.1 Local record comparison

Record comparison is pure domain logic:

- highest challenge spending compares exact integer `totalSpent`;
- only a strictly higher value replaces the stored record;
- fastest exact-zero clear compares integer `actualDurationMs` at millisecond precision;
- only a strictly lower value replaces the stored record;
- ties preserve the existing record.

Rounded percentages are rendering-only and never participate in record comparison.

## 11. State management

Keep domain transitions framework-independent. UI can use a small adapter around React state/context. If a third-party store is introduced, it must call the same pure domain command functions rather than reimplementing rules in selectors/actions.

M2 uses a small React reducer/controller adapter. `FreeModeUiState.run` is the only authoritative game state; search, category selection, result/product view selection, confirmation visibility, and feedback queues are UI-only state. Product cards receive quantities and stable callbacks, while every purchase, removal, direct-set, MAX, achievement, receipt total, and result value is produced by the shared data/domain layer. The M2 page does not read or write formal Storage and does not contain challenge timing.

## 12. Platform boundaries

Allowed platform-specific concerns:

- storage adapter;
- lifecycle events;
- share API in future versions;
- PWA install/update behavior;
- responsive CSS differences;
- safe-area handling;
- WeChat navigation configuration.
- vibration/capability detection and safe-area handling.

Not allowed to diverge:

- initial budget;
- prices;
- quantities;
- achievements;
- timer semantics;
- results math;
- records math.

## 13. PWA update strategy

Service worker updates must not silently wipe local data. The Web client should either:

- activate a compatible update safely; or
- present a non-blocking refresh/update action after a new version is ready.

Persisted schema migration runs before active game state is mounted.

## 14. Performance

- Catalog data is static and bundled.
- Product cards should avoid whole-page rerender storms when one quantity changes.
- Derivations may be memoized after profiling; correctness comes first.
- Images use appropriately sized assets and lazy loading where supported.
- No network request is required per purchase.

## 15. Security/privacy

- No secrets in client code.
- Do not place WeChat `AppSecret` in the Mini Program.
- No remote HTML/script execution.
- Treat imported JSON/data as build-time trusted assets; validate persisted user-local values.
- Avoid analytics until explicitly approved.

## 16. Test strategy

### Unit must cover

- balance invariant;
- direct quantity clamp;
- MAX with affordability + product-cap interaction;
- decrease/refund;
- exact zero;
- $1 solvability;
- timeout boundary at `deadline - 1`, `deadline`, `deadline + 1`;
- command after expiry rejected;
- early clear elapsed time;
- every achievement condition;
- event-sensitive `sticker-finish` positive and negative cases;
- deterministic result tie-break;
- exact local-record replacement and tie behavior;
- CNY cannot influence rule state;
- persistence migration/corruption handling.

### Property/invariant tests recommended

Generate random valid product mutations and assert:

- balance never negative;
- spent + balance == initial budget;
- quantity stays integer/non-negative;
- replaying the same command sequence yields the same final state.

## 17. Architecture decision gate M0

Before building product UI, Codex/developer must verify with a minimal spike:

1. current stable Taro 4.x project compiles to H5 and WeChat;
2. React + TypeScript works in both;
3. chosen storage abstraction works in both;
4. PWA manifest/service worker can be integrated with the H5 build;
5. one shared domain test suite runs outside either client.

If the PWA build pipeline differs from the preferred plugin, update this architecture document—not the product baseline—before proceeding.

### 17.1 M0 verification result — 2026-08-18

- Taro 4.2.1 compiled the same React/TypeScript source to `dist/h5/` and `dist/weapp/`.
- Vitest 3.2.4 ran the shared pure-domain and storage-adapter contract tests outside both clients.
- The H5 development page was loaded in a browser; shared Domain and H5 Storage checks both reported `PASS` with no browser console errors or warnings.
- The H5 production build emitted the manifest, registration script, service worker, app-shell assets, icon, precache list, and navigation fallback. Automated artifact checks passed.
- WeChat production compilation passed. Developer Tools/runtime and device verification remain outstanding because the installed IDE has its CLI service port disabled; M0 did not change that security setting automatically.
- Browser install-prompt and server-disconnected offline-reload acceptance remain outstanding and are owned by T0507/T0511/T0603; the M0 build route is nevertheless proven.

### 17.2 M1 verification result — 2026-08-18

- The shared static source contains 45 products and 10 categories from catalog version 2; executable validation reports no duplicate IDs/orders, invalid prices/caps/categories, unsafe maximum subtotals, or single-product fresh-run MAX clears.
- The official capped exact-zero path evaluates to exactly `$400,000,000,000`.
- Integer USD arithmetic, deterministic USD/CNY display formatting, immutable RunState transitions, purchase/remove/direct-set/MAX commands, exact-zero freezing, result metrics, and price snapshots are implemented as platform-neutral TypeScript.
- All 20 formal achievement definitions have executable pure evaluators plus trigger, non-trigger, and boundary tests; `sticker-finish` also has explicit event-regression coverage.
- 164 unit/contract tests pass across 10 test files, including 1,000 generated quantity mutations and deterministic replay.
- Typecheck, lint, formatting, H5 build, WeChat build, and PWA build/artifact verification pass. M2 UI, M3 challenge timing/lifecycle, and M4 persistence remain intentionally unimplemented.

### 17.3 M2 implementation and verification status — 2026-08-18

- The former M0 status page is replaced by the playable Free Mode composition: branded disclaimer, sticky USD-first balance/CNY display, local category/search filters, 45 product cards, Domain-backed quantity controls, receipt, per-run achievement feedback, restart confirmation, completed result, and frozen read-only product return.
- The React page delegates authoritative state transitions to a centralized Free Mode controller around M1 `RunState`; UI-local state cannot calculate or overwrite balance, MAX, achievements, receipt totals, or result metrics.
- Product visuals are original CSS/emoji placeholders. No external image, real-person photo, company logo, reference-site asset, backend, account, analytics, formal save schema, lifetime achievement storage, or challenge timer was added.
- 174 tests pass across 11 test files. New state-flow coverage includes creation, +/−, MAX, direct-input clamp/errors, category/search preservation, receipt synchronization, restart, official exact-zero completion/freeze, play-again, and the `$1 → $0` `sticker-finish` UI action sequence.
- Typecheck, lint, formatting, H5 build, WeChat build, and PWA build/artifact verification pass. The production H5 shell also responds with HTTP 200 from a local static server.
- T0209 remains open: the required interactive H5 browser smoke could not be executed because the available browser-control runtime failed during local initialization before a tab was created. No application console result is claimed. WeChat compilation passes to `dist/weapp/`; Developer Tools/runtime and device verification remain outstanding under the documented round boundary and later acceptance tasks.
