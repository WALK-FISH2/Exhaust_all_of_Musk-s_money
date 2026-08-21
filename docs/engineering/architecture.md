# Architecture — Spend_Musk_Money

> Status: Active  
> Version: 2.2  
> Date: 2026-08-21  
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

M0 validated `vite-plugin-pwa 1.3.0` inside the Taro Vite plugin chain for H5 production builds. The selected integration uses `injectManifest` with a repository-owned minimal service worker because Workbox's default `generateSW` path generation does not escape the apostrophe in this repository's Windows path. M5 formalizes the manifest identity, standard/maskable original icons, scoped cache ownership, app-shell/static-asset precache, network-first navigation with cached `index.html` fallback, install readiness UI, offline readiness UI, and a non-destructive waiting-update notice. The service worker does not call `skipWaiting`; a downloaded update activates only after existing clients release it. Service-worker code does not read, write, or delete the formal game Storage key.

`beforeinstallprompt` is an optional signal that the page can directly open the browser's standard install prompt; its absence is not evidence that PWA installation is unsupported. The H5 status adapter therefore distinguishes direct prompt availability, no in-page prompt with browser-menu installation guidance, installed/standalone display mode, and an unknown capability state. Standalone detection takes precedence, all user-facing text comes from the centralized string resource, and no non-standard installation API is introduced.

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

M4 promotes the same adapter contract into the formal `GameStorageRepository`. The repository owns the single stable root key `spend-musk-money:game-data`, serializes exactly one `PersistedGameDataV1` document, queues writes in order, and exposes controlled read/write/remove results instead of leaking platform exceptions into React or Domain code. H5 and WeChat therefore share repository, validation, migration, recovery, and game-progress behavior; only the adapter implementation is platform-specific.

### 9.3 Migration

Read flow:

`raw → parse → validate version → migrate sequentially → validate current schema → use`

Invalid active-run data may be dropped without deleting valid lifetime records when separation is possible.

M4 implements separate sequential registries for schema and catalog migrations. The internal pre-release schema-0 fixture migrates to schema 1 by adding default preferences; it is test coverage for the migration mechanism and is not presented as a previously released public save format. Catalog version 2 is the first formal persisted catalog version, so no earlier released catalog migration is registered.

Untrusted input is validated before it reaches application state. Invalid/unknown product quantities, unsafe integers, missing authoritative price snapshots, invalid challenge timestamps, malformed records, and unknown achievement IDs are rejected or recovered at the smallest safe boundary. Valid lifetime achievements, records, and preferences survive when an invalid active run can be isolated. Corrupt JSON and adapter failures produce controlled statuses. A save from a future schema or catalog version is never overwritten by the older client unless the user explicitly confirms clearing all local data.

### 9.4 Hydration, autosave, and durable progress

- The page renders a hydration gate until repository loading finishes, preventing a fresh `$400B` run from flashing before a saved run is resolved.
- A valid unfinished Free or Challenge run opens an explicit `继续上次游戏` / `重新开始` choice. Restarting preserves lifetime achievements, local records, and preferences.
- Challenge hydration reconciles `deadlineAt` against the injected current clock before the run becomes interactive. An active run keeps its original deadline; a run found beyond that deadline is frozen with `actualDurationMs = durationMs`. Completed and expired saves open their stable result directly.
- Autosave is debounced after authoritative game/progress/preferences revisions only. The 200 ms challenge repaint interval never creates storage writes.
- Per-run achievements continue to drive the run UI, while first-time IDs are appended atomically to ordered lifetime history. Starting a new run clears only per-run state.
- Challenge records are stored independently for 30, 60, and 300 seconds. Highest spend and fastest exact-zero clear reuse the strict M3 comparators, so ties preserve the existing record.
- Clearing local data requires confirmation and removes the entire root document before resetting current, lifetime, record, and preference state.

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

M2 uses a small React reducer/controller adapter. `FreeModeUiState.run` is the only authoritative game state; search, category selection, result/product view selection, confirmation visibility, and feedback queues are UI-only state. Product cards receive quantities and stable callbacks, while every purchase, removal, direct-set, MAX, achievement, receipt total, and result value is produced by the shared data/domain layer. Completed runs may switch repeatedly between `result` and `products` presentation views; the reducer permits entry to `result` only for a frozen completed/expired run and derives the result from that same `RunState`. The M2 page does not read or write formal Storage and does not contain challenge timing.

## 12. Platform boundaries

Allowed platform-specific concerns:

- storage adapter;
- lifecycle events;
- approved WeChat challenge sharing behind a platform adapter;
- PWA install/update behavior;
- responsive CSS differences;
- safe-area handling;
- WeChat navigation configuration.
- vibration/capability detection and safe-area handling.

### 12.1 Responsive unit policy

H5 product UI styles use native CSS pixels and media queries. H5 `pxtransform` is disabled so Taro does not convert responsive desktop/mobile CSS to root-font-relative `rem`. Taro 4.2.1 still injects its root-font script when that transform is disabled, so an H5-only post-template plugin removes this unused scaler; the generated H5 entry must not contain it. WeChat Mini Program compilation keeps its existing `pxtransform` path so the same authored component styles remain usable on that target.

Do not compensate for H5 first-render sizing with browser zoom, `transform: scale(...)`, synthetic `resize` events, or machine-specific widths. The H5 build artifact check verifies the CSS-pixel game shell, absence of the root-font scaler, and intrinsic wrapping category controls.

### 12.2 Responsive product-card policy

Product cards keep one cross-platform component tree and the same Domain callbacks at every width. Desktop/tablet presentation retains the wider two-column card layout. At viewport widths up to 820px the product grid uses two compact columns: the visual becomes a short header band, names are single-line ellipsized, USD/CNY share a price row, and the quantity summary plus subtotal remain visible. H5 retains `− / quantity / +` plus a compact full-row MAX. The WeChat build adds only a presentation class that places `− / quantity / + / MAX` in one row and gives MAX an approximately square 88rpx target; both variants invoke the same shared MAX command. At 350px and below the grid falls back to one compact column so controls do not become unusably narrow.

Responsive presentation must not introduce a second product dataset, alternate money math, or platform-specific MAX implementation. H5 build checks protect the two-column and very-narrow fallback rules; WEAPP must continue compiling the same component and styles.

### 12.4 M6 WeChat sharing and challenge-navigation policy

- `platform/weapp/challenge-share.ts` is the only query serializer/parser for the approved WeChat share contract. It validates challenge mode, matching 30/60/300-second duration, and an optional bounded integer millisecond record before application state sees the route.
- `use-challenge-sharing.ts` registers Taro's `useShareAppMessage` and `useShareTimeline` hooks and exposes the standard WeChat friend/timeline menu only while a challenge mode supplies a valid snapshot. Free Mode hides those entries. Friend and timeline payloads reuse the same snapshot; no server, account, ranking, upload, remote image, or Storage field is added.
- A valid landing is applied only after hydration and reuses the existing `select-mode` transition. The resulting challenge remains `ready` with null `startedAt`, `deadlineAt`, and `durationMs`; only the existing explicit start action begins timing. The existing non-empty-run restart confirmation still guards destructive mode changes.
- Shared-record display is route/UI state only. It is not added to `RunState`, local records, or the persisted schema.
- The challenge header reuses the existing picker and mode-selection actions. Active status alone receives the sticky class; ready, completed, and expired statuses remain in normal flow. Sticky positioning is presentation-only and cannot affect deadline reconciliation.

### 12.3 M5 presentation and accessibility policy

- Shared design tokens own the formal palette, radii, shadows, motion durations, content widths, and responsive breakpoints. Component styles consume these values instead of introducing a second visual system.
- All 45 formal products use unique original code-native marks registered against product IDs. Asset records include creator, format, license, source, and attribution fields. Product visuals are decorative; product names remain the accessible content source.
- Balance, large-purchase, achievement, result, and challenge-urgency effects are presentation-only. They observe authoritative state after a Domain transition and cannot calculate money, quantity, achievement, timer, save, or record values.
- Motion preference is `system | reduce | full`, persists through the existing preference schema, and never changes gameplay. `reduce` disables decorative motion; `system` honors `prefers-reduced-motion`; `full` is an explicit user override.
- H5 Taro buttons are custom elements, so the shared `AccessibleButton` supplies button role, keyboard focus, disabled state, and Enter/Space activation without duplicating business handlers. Modal focus is trapped and restored; safe initial actions and Escape dismissal are explicit per dialog.
- Selected, urgent, unlocked, new-record, disabled, online/offline, and update states use text or symbols in addition to color. Keyboard focus remains visibly outlined.
- The shared shell accounts for safe-area insets. Desktop widths use the full composition, widths through 820px use compact layout, and widths through 350px use a single-column product fallback with 44px primary touch targets.

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

Persisted schema migration runs before active game state is mounted. The M5 service worker owns only caches prefixed `spend-musk-money-app-shell-`; activation never deletes another application's origin caches. A waiting update is surfaced as non-blocking status text and is not force-activated or paired with an automatic reload. Game progress remains exclusively in the versioned Storage repository.

## 14. Performance

- Catalog data is static and bundled.
- Product cards should avoid whole-page rerender storms when one quantity changes.
- Derivations may be memoized after profiling; correctness comes first.
- Images use appropriately sized assets and lazy loading where supported.
- No network request is required per purchase.
- The H5 unpacked-build budget is 5 MiB, the WeChat early-warning package budget is 2 MiB, and image payload warning budget is 256 KiB. The asset artifact check reports exact file and byte counts for both targets.
- A test-only legal 100-product fixture exercises formal ProductCard rendering, repeated search/category filtering, receipt/result derivation, and a one-item update without changing the 45-product catalog. Measurements are guardrail evidence, not browser FPS or real-device proof.

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
- WeChat production compilation passed. Developer Tools/runtime and device verification were still outstanding at the M0 gate because the installed IDE's CLI service port was disabled; M0 did not change that security setting automatically. The Developer Tools portion was later closed in M5, while real-device acceptance remains in M6.
- Browser install-prompt and server-disconnected offline-reload acceptance were still outstanding at the M0 gate and assigned to T0507/T0511/T0603; the M0 build route was nevertheless proven. T0511 was later closed by the M5 installation acceptance recorded in §17.6.

### 17.2 M1 verification result — 2026-08-18

- The shared static source contains 45 products and 10 categories from catalog version 2; executable validation reports no duplicate IDs/orders, invalid prices/caps/categories, unsafe maximum subtotals, or single-product fresh-run MAX clears.
- The official capped exact-zero path evaluates to exactly `$400,000,000,000`.
- Integer USD arithmetic, deterministic USD/CNY display formatting, immutable RunState transitions, purchase/remove/direct-set/MAX commands, exact-zero freezing, result metrics, and price snapshots are implemented as platform-neutral TypeScript.
- All 20 formal achievement definitions have executable pure evaluators plus trigger, non-trigger, and boundary tests; `sticker-finish` also has explicit event-regression coverage.
- 164 unit/contract tests pass across 10 test files, including 1,000 generated quantity mutations and deterministic replay.
- Typecheck, lint, formatting, H5 build, WeChat build, and PWA build/artifact verification pass. M2 UI, M3 challenge timing/lifecycle, and M4 persistence remain intentionally unimplemented.

### 17.3 M2 implementation and verification status — 2026-08-20

- The former M0 status page is replaced by the playable Free Mode composition: branded disclaimer, sticky USD-first balance/CNY display, local category/search filters, 45 product cards, Domain-backed quantity controls, receipt, per-run achievement feedback, restart confirmation, completed result, and frozen read-only product return.
- The React page delegates authoritative state transitions to a centralized Free Mode controller around M1 `RunState`; UI-local state cannot calculate or overwrite balance, MAX, achievements, receipt totals, or result metrics.
- Product visuals are original CSS/emoji placeholders. No external image, real-person photo, company logo, reference-site asset, backend, account, analytics, formal save schema, lifetime achievement storage, or challenge timer was added.
- Completed runs now support an application-owned `result ⇄ products (read-only)` navigation loop. The presentation view changes without copying or mutating the frozen RunState; product commands remain disabled in the read-only view.
- Mobile product browsing uses two compact columns through 820px and a one-column compact fallback at 350px and below. The same ProductCard data and Domain callbacks are used on H5 and WeChat builds.
- 176 tests pass across 13 test files. New coverage includes creation, +/−, MAX, direct-input clamp/errors, category/search preservation, all 11 category controls, completed-view round trips with unchanged RunState/results, compact-card control completeness, receipt synchronization, restart, official exact-zero completion/freeze, play-again, and the `$1 → $0` `sticker-finish` UI action sequence.
- Typecheck, lint, formatting, 176 tests, H5 build, WeChat build, PWA build/artifact verification, and the expanded H5 layout artifact regression pass. The production H5 shell also responds with HTTP 200 from a local static server.
- The reported H5 first-render half-scale defect was traced to Taro 4.2.1 converting authored CSS pixels to `rem` and injecting a root-font script whose initial synchronous measurement could be clamped to 20px until a later browser resize. H5 now keeps authored CSS pixels and emits no root-font scaler; the WeChat conversion remains enabled.
- The category strip defect was traced to Taro H5's default button `width: 100%` inside a single-line horizontal container. Category controls now override to intrinsic width and use a wrapping flex layout, exposing all 10 categories plus “all” without a hidden horizontal-scroll dependency.
- T0209 final Microsoft Edge smoke passes at 100% zoom. Initial load, F5, Ctrl+F5, reopening, all 11 category controls, search, +/−, MAX, direct quantity input, receipt synchronization, restart cancellation/confirmation, the formal capped `$400B` exact-zero path, completed freezing, repeated `result ⇄ products (read-only)` navigation, and play-again were exercised against the production H5 build. Repeated result derivation preserved the same `$400,000,000,000` spend, 1,000,000,008 total items, eight product kinds, four covered categories, top line item, achievements, and 100/100 result.
- Responsive Edge smoke passes at 1920×1080 and 1366×768 desktop widths, at 430×932, 390×844, and 360×800 two-column compact widths, and at the 320×720 single-column fallback. No tested viewport has document-level horizontal overflow; compact quantity controls do not overlap, names retain ellipsis containment, and mobile purchase controls remain operable. Edge reported zero application errors, warnings, or deprecation warnings.
- T0209 is complete. The shared exact-zero regression path is covered by automated Domain/application tests and the H5 production smoke above, while the same shared source compiles successfully to `dist/weapp/`. Detailed WeChat Developer Tools and real-device acceptance remains assigned to T0604/T0613 and is not claimed by this M2 browser smoke.

### 17.4 M3 implementation and verification status — 2026-08-20

- Challenge configuration is centralized as the exact baseline modes `challenge-30`, `challenge-60`, and `challenge-300`, with durations of 30,000, 60,000, and 300,000 milliseconds. Selecting a duration creates a `ready` run without timestamps; only the explicit start command sets `startedAt`, `durationMs`, and `deadlineAt` and enables purchasing.
- Production wall-clock access is isolated behind the injected `Clock` interface. `platform/clock.ts` is the only M3 production source that calls `Date.now()`; challenge Domain functions receive timestamps and remain independent of React, Taro, browser, WeChat, Storage, and timer APIs.
- Authoritative remaining time is always derived as `max(0, deadlineAt - now)`. The 200 ms UI interval is repaint-only. Every timed purchase command first reconciles the supplied timestamp, so a command at `deadlineAt` or later expires the run and is rejected without changing quantities or balance.
- The shared lifecycle reconciler runs on H5 `visibilitychange`, `pageshow`, and `pagehide`, and on Taro `useDidShow`/`useDidHide` for the Mini Program/page lifecycle. A foreground/show event reads the current `Clock` and reconciles immediately; no client maintains a decrementing authoritative counter.
- Exact zero before the deadline completes the run atomically at the purchase timestamp and records millisecond elapsed time. Natural or late-discovered timeout freezes the pre-command state at the configured duration. Challenge results are pure derivations and expose completion/expiry, configured and actual duration, spend, remaining balance, statistics, and read-only state.
- The challenge UI supports duration selection, an explicit ready/start step, active countdown and purchase controls, timeout/early-clear results, frozen return to products, same-duration retry, and challenge switching without a page refresh. Repeated lifecycle reconciliation does not force a user out of the frozen product view.
- `challenge-half-30` and `challenge-clear` are evaluated through the shared achievement pipeline. Pure record-candidate derivation/comparison supports exact integer spend and millisecond clear times; strict improvements replace records and ties preserve the existing record. No record or run persistence was added in M3; that remains T0407–T0410.
- Boundary and lifecycle coverage includes all three durations at `deadline−1`, `deadline`, and `deadline+1`; normal countdown, early clear, natural timeout, long-background and route-return reconciliation, late-command rejection, challenge achievements, result navigation, retry/switch flows, lifecycle adapter contracts, and higher/lower/equal record comparisons.
- 204 tests pass across 18 files. Typecheck, ESLint, Prettier, H5 build, WeChat build, and PWA artifact/layout checks pass. The same challenge Domain and lifecycle reconciliation source compiles to `dist/h5/` and `dist/weapp/`.
- Microsoft Edge production smoke passed a real 30-second natural timeout with a purchase, frozen read-only return and result actions; a separate 30-second run backgrounded in another tab for about 10.2 seconds reconciled from `00:30` to `00:19`; and another 30-second run backgrounded through its deadline returned directly to the timeout result with `actualDurationMs = 30,000`. Edge reported no application console errors.
- The installed WeChat Developer Tools remains unable to accept CLI smoke commands because its IDE service port is disabled. M3 did not change that user security setting. The WeChat build and shared/adaptor automated coverage pass; detailed Developer Tools and real-device background/foreground acceptance remains assigned to T0415/T0613 and is not claimed here.

### 17.5 M4 implementation and verification status — 2026-08-20

- Schema 1 / catalog 2 persistence is implemented as one versioned root document behind the formal H5 and Taro Storage adapters. Sequential migration, untrusted-data validation, recoverable corruption, future-version write protection, ordered writes, and controlled adapter failures have repository-level coverage.
- Hydration completes before the playable UI is shown. Valid unfinished runs present an explicit continue/restart decision; completed and expired runs reopen frozen. Active challenge restoration preserves the original `deadlineAt`, and restoration after that deadline produces the configured-duration timeout result before interaction resumes.
- Meaningful mutations autosave current run, ordered lifetime achievements, per-duration records, and preferences atomically. Timer repaint ticks do not write. Starting a new run preserves lifetime progress and records; confirmed local-data clearing resets the root document.
- All 20 achievements appear in the permanent overview with locked/unlocked state, rule description, count, and ordered unlock history. Per-run unlock feedback remains available, while lifetime IDs are deduplicated across runs and reloads.
- Challenge 30/60/300 records are isolated by duration. Strictly higher spending and strictly faster exact-zero completion replace prior values; equal values and regressions preserve the existing record. New-record UI appears only for a strict improvement.
- Persistence and restore coverage includes Free active/completed/new-run flows, challenge active/expired/early-completed flows, process-style reopen, corrupt JSON, partial active-run recovery, schema migration, unknown/duplicate IDs, future schema/catalog protection, price-snapshot authority, adapter failures, record ties, and clear-data confirmation. The full quality gate passes with 232 tests across 21 files, followed by successful H5, WeChat, and PWA production builds.
- Microsoft Edge production smoke passed purchase → full reload → continue, completed Free reload/freeze, active Challenge reload without deadline reset, closing the page across a 30-second deadline, immediate expired result with `30.00` seconds, permanent achievement retention, record retention after another reload, and confirmed local-data reset. Edge reported zero application Console errors.
- The WeChat production target and formal Taro Storage repository contract pass. The installed WeChat Developer Tools IDE service port remains disabled, so tool-runtime and real-device lifecycle acceptance is not claimed here and remains assigned to T0613.

### 17.6 M5 implementation and verification status — 2026-08-21

- T0501–T0516 and T0520 are implemented and verified. Formal tokens, 45 registered original code-native product marks, asset/license metadata, responsive/safe-area rules, balance and purchase feedback, centralized deterministic result copy, persisted reduced-motion preference, H5 keyboard/dialog behavior, manifest/icons, scoped app-shell service worker, package budgets, PWA install acceptance and the 100-product cross-target benchmark are in place without changing any product, price, cap, achievement, money, timer, persistence, or record rule.
- The production Edge smoke passed at 1920×1080, 1366×768, 430×932, 390×844, 360×800, and 320×720. The 320px layout retains usable product controls; keyboard Enter/Space activation, Escape dismissal, dialog focus wrap, visible selected-state text, and persisted reduced-motion selection were exercised. The original Taro H5 custom-button output lacked role/focus/keyboard semantics; the shared accessible wrapper fixed that defect and the browser rerun passed.
- A fresh Edge origin loaded the current M5 service worker, then the static server was stopped. Full reload still opened the app shell, restored a `$1` purchase, allowed a second offline purchase, and restored the resulting `$3` spend after another offline reload. A 30-second challenge also started offline, reconciled elapsed wall-clock time while another tab was active, and froze at the exact `30.00`-second timeout result. A prior-worker update was observed waiting without forced reload; valid local progress remained available before and after the update path.
- T0511 installation acceptance is complete. The project acceptor used Microsoft Edge's application menu to install the production PWA as “花光 $400B”, reopened the installed application, and exercised game behavior successfully. The manifest declares `display: standalone`, the display-mode adapter recognizes standalone launches, and absence of `beforeinstallprompt` now gives browser-menu guidance instead of falsely reporting unsupported installation.
- T0520 uses a test-only build flag and 100 legal synthetic product definitions without mutating the formal 45-product catalog. Because a synchronous 100-card commit caused an observable long stall in Developer Tools, the fixture now commits batches of 20 until all 100 real product cards are mounted; no virtual-list, global-state or performance-framework dependency was added. The production 45-product build does not enable this fixture.
- In WeChat Developer Tools on the iPhone 12/13 (Pro) simulator (`platform: devtools`, iOS 10.0.1, SDK 3.17.1, 390×753), staged first presentation reached all 100 products and the runtime bridge completed scrolling, category changes, search/reset, `+`, `−`, `MAX`, quantity input, receipt derivation and state-to-UI updates. Recorded action samples ranged from 103.78 ms to 545.02 ms; the final quantity and receipt quantity were both 3, and the application runtime Console error list was empty. The tool did not expose a reliable FPS sample, so no FPS is claimed.
- The same Developer Tools session passed a basic formal-build smoke: home startup, Free purchase, compact product layout, persisted purchase restoration, 30-second challenge ready/start flow, page scrolling and absence of application runtime errors. Developer Tools evidence is not a substitute for M6 real-device acceptance.
- 242 tests across 25 files pass. TypeScript, ESLint, Prettier, the aggregate quality gate, H5/WeChat/PWA production builds, H5 layout checks, PWA artifact checks, and H5/WeChat asset-budget checks pass in the final M5 gate run.
- M5 is `PASS / GO` for M6. No M6 implementation or real-device acceptance is claimed.

### 17.7 M6 sharing and challenge UX slice — 2026-08-21

- T0620 implements the BR-026-approved WeChat friend/timeline metadata share. Both entry points carry one validated `challengeMode / duration / record` query snapshot; a valid recipient route selects the existing challenge in `ready` state, displays the optional friend record, and never starts the authoritative timer automatically.
- T0621 changes only navigation/presentation behavior: Free Mode retains `自由模式 / 挑战模式 / 重新开始`; a challenge uses the clickable current duration, `返回自由模式`, and `重新开始`; the current-duration action opens the existing Challenge Picker. Active challenge status is sticky while ready/completed/expired remain non-sticky.
- The WeChat ProductCard build class renders `− / quantity / + / MAX` in one compact row with an approximately square 88rpx MAX target. H5 keeps its existing desktop and compact layouts, and both targets continue to call the same Domain command callbacks.
- The Storage schema remains version 1 and catalog version 2. No Domain money, catalog, achievement, record, persistence, or challenge-timing rule changed.
- The aggregate gate passes with 247 tests across 26 files. TypeScript, ESLint, Prettier, H5, WeChat, and PWA production builds pass; the generated WeChat page bundle contains `useShareAppMessage`, `useShareTimeline`, `showShareMenu`, the validated query keys, active-only sticky class, and inline WeChat MAX layout.
- This UX slice is complete, but the remaining M6 release-audit and real-device tasks are not claimed complete.
