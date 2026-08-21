# Tasks — Spend_Musk_Money

> Status: Active task backlog  
> Version: 1.9  
> Date: 2026-08-21

Task IDs are stable references. Do not renumber completed tasks.

`Dependencies` lists prerequisite Task IDs. `None` means the task has no task-level prerequisite. A dependency may point to a later-numbered stable ID when a task was moved or split; numeric order is not execution order.

## M0 — Foundation

- [x] **T0001** Scaffold Taro 4.x + React + TypeScript project.  
      Requirements: BR-020, BR-021, BR-022.
- [x] **T0002** Configure scripts for H5 dev/build and WeChat dev/build.
- [x] **T0003** Add Vitest and one pure shared-domain test.
- [x] **T0004** Prove one platform-neutral storage repository with H5 and WeChat adapters.  
      Requirements: BR-016, NFR-005.
- [x] **T0005** Confirm PWA integration strategy for the selected Taro runner and document any architecture adjustment.  
      Requirements: BR-020.
- [x] **T0006** Add baseline lint/typecheck/test/build quality scripts.
- [x] **T0007** Establish centralized visible-string resources and key-based access for localization readiness.  
      Requirements: NFR-004.  
      Dependencies: T0001.

M0 completion evidence and outstanding runtime-verification limits are recorded in `docs/engineering/architecture.md` §17.1.

## M1 — Domain core

- [x] **T0101** Encode category and product schemas from `product-catalog.md`.  
      Requirements: BR-003, BR-004, BR-024.
- [x] **T0102** Implement catalog validation: unique IDs/orders, categories, positive safe-integer prices/caps, safe `price × quantity`, required $1 item, deterministic price/order sorting, explicit cap overrides, no single-item fresh-run MAX clear, and a verified exact-zero path.  
      Requirements: BR-007, BR-029, NFR-001.
- [x] **T0103** Implement `RunState` and run creation with $400B initial budget.  
      Requirements: BR-001.
- [x] **T0104** Implement derived `spent` and `balance` with invariants.
- [x] **T0105** Implement +1 quantity command with affordability validation.  
      Requirements: BR-005.
- [x] **T0106** Implement −1/refund quantity command.  
      Requirements: BR-005.
- [x] **T0107** Implement direct quantity set with sanitization/clamp.  
      Requirements: BR-005, NFR-001.
- [x] **T0108** Implement MAX command respecting affordability and per-product cap.  
      Requirements: BR-005, BR-029.
- [x] **T0109** Implement exact-zero completion transition.  
      Requirements: BR-007.
- [x] **T0110** Implement result derivations and tie-break for highest-subtotal line.  
      Requirements: BR-013.
- [x] **T0111** Implement CNY display conversion utility isolated from domain decisions.  
      Requirements: BR-023.
- [x] **T0112** Add domain invariant/property tests including random command sequences.  
      Requirements: NFR-001.
- [x] **T0401** Encode achievement definitions from `achievement-rules.md` in the shared data/domain layer. This stable ID is moved from M4 to M1.  
      Requirements: BR-014.  
      Dependencies: T0101.
- [x] **T0113** Implement a normalized achievement/domain transition event model containing command kind, product, quantity delta, before/after balance, and timestamp.  
      Requirements: BR-006, BR-014.  
      Dependencies: T0103, T0104.
- [x] **T0402** Implement the pure achievement evaluator. This stable ID is moved from M4 to M1.  
      Requirements: BR-006, BR-014.  
      Dependencies: T0401, T0113.
- [x] **T0114** Implement pure single-run achievement unlock calculation and deterministic unlock ordering.  
      Requirements: BR-006, BR-013, BR-014.  
      Dependencies: T0401, T0402.
- [x] **T0115** Add table-driven unit tests for every achievement: trigger, non-trigger, and boundary cases, with explicit coverage for `sticker-finish`, `challenge-clear`, `exact-zero`, and `max-button`.  
      Requirements: BR-014, NFR-001.  
      Dependencies: T0113, T0114.
- [x] **T0116** Add USD/CNY formatting tests: full USD never uses scientific notation, large values retain integer precision, and CNY cannot influence rule state.  
      Requirements: BR-023, NFR-001.  
      Dependencies: T0111.
- [x] **T0117** Implement and unit-test the Free Mode lifecycle/state machine: create, purchase, exact-zero completion, completed/frozen rejection, new run, and restorable unfinished state.  
      Requirements: BR-008, BR-016.  
      Dependencies: T0103, T0105, T0106, T0107, T0108, T0109, T0114.
- [x] **T0118** Add catalog/money regression tests for unique IDs, safe prices/quantities/products, affordability/caps, every single-product fresh-run MAX, deterministic sorting, and the official exact `$400B` multi-product path.  
      Requirements: BR-007, BR-022, BR-029, NFR-001.  
      Dependencies: T0101, T0102, T0104, T0108, T0109.

## M2 — Free Mode UI

- [x] **T0201** Build brand/header and unofficial representative-value disclaimer.  
      Requirements: BR-002.
- [x] **T0202** Build responsive/sticky balance panel.  
      Requirements: BR-006, BR-023.
- [x] **T0203** Build category filter/search UI.  
      Requirements: BR-027.
- [x] **T0204** Build product card with image/name/prices/subtotal.  
      Requirements: BR-003.
- [x] **T0205** Connect − / quantity / + / MAX controls to domain commands.  
      Requirements: BR-005, BR-006.
- [x] **T0206** Build receipt component.  
      Requirements: BR-012.
- [x] **T0207** Build restart confirmation flow.  
      Requirements: BR-018.
- [x] **T0208** Build Free Mode completion result page and completed/frozen read-only return-to-products behavior.  
      Requirements: BR-008, BR-013.  
      Dependencies: T0110, T0114, T0117, T0007.
- [x] **T0209** Verify exact-zero flow and the baseline capped multi-product $400B regression path on H5 and WeChat.  
      Requirements: BR-007, BR-022, BR-029.  
      Dependencies: T0118, T0205, T0208.

T0201–T0209 completion evidence is recorded in `docs/engineering/architecture.md` §17.3. First-render sizing, category layout, completed result/read-only navigation, mobile compact-card rules, and the formal exact-zero path have automated regression coverage. Final Microsoft Edge smoke passed across representative desktop/mobile widths with zero application Console errors or warnings; the same shared source and exact-zero rules compile to the WeChat target. Detailed WeChat Developer Tools and real-device acceptance remains owned by T0604/T0613.

## M3 — Challenge engine/UI

- [x] **T0301** Implement challenge modes and duration config.  
      Requirements: BR-009.
- [x] **T0302** Implement explicit challenge start with authoritative `startedAt`, `deadlineAt`, and `durationMs`.  
      Requirements: BR-009, BR-010.
- [x] **T0303** Implement `max(0, deadlineAt - Date.now())` clock reconciliation and reject-late-command rule; UI timers are repaint-only.  
      Requirements: BR-010.
- [x] **T0304** Connect Web visibility/page/route lifecycle reconciliation.  
      Requirements: BR-010, BR-020.
- [x] **T0305** Connect WeChat foreground/background/page lifecycle reconciliation.  
      Requirements: BR-010, BR-021.
- [x] **T0306** Implement timeout result freeze.  
      Requirements: BR-009.
- [x] **T0307** Implement early exact-zero completion/elapsed time.  
      Requirements: BR-011.
- [x] **T0308** Implement pure challenge-result derivation, including deterministic `actualDurationMs`, completion/expiry state, and frozen/read-only flags. The UI and record responsibilities formerly included here are split into T0311 and T0312.  
      Requirements: BR-013.  
      Dependencies: T0110, T0114, T0306, T0307.
- [x] **T0309** Unit-test boundary timestamps at deadline−1/deadline/deadline+1.  
      Requirements: BR-010, BR-011.
- [x] **T0310** Cross-platform smoke test background/return behavior.  
      Requirements: BR-022.
- [x] **T0311** Build the challenge result page and read-only return-to-products experience for early-clear and expired runs.  
      Requirements: BR-009, BR-011, BR-013.  
      Dependencies: T0308, T0007.
- [x] **T0312** Implement pure local-record candidate comparison using exact `totalSpent`, millisecond `actualDurationMs`, and preserve-existing-on-tie rules.  
      Requirements: BR-017.  
      Dependencies: T0308.
- [x] **T0313** Unit-test local-record comparison: higher/lower/equal spent and faster/slower/equal exact-zero duration.  
      Requirements: BR-017.  
      Dependencies: T0312.
- [x] **T0314** Add challenge domain tests for normal countdown, early clear, natural timeout, long-background reconciliation, route return, and late-command rejection.  
      Requirements: BR-009, BR-010, BR-011, BR-022.  
      Dependencies: T0302, T0303, T0306, T0307, T0308.

T0301–T0314 completion evidence is recorded in `docs/engineering/architecture.md` §17.4. Shared challenge timing, deadline-boundary commands, lifecycle reconciliation, result freezing, challenge achievements, and record comparison have automated coverage. Microsoft Edge production smoke passed for a real 30-second run, a roughly 10-second background interval, and backgrounding through expiry. The WeChat lifecycle adapter shares the same timestamp reconciler and compiles successfully; detailed Developer Tools/real-device lifecycle acceptance remains owned by T0415/T0613 because the installed IDE service port is disabled.

## M4 — Achievement persistence, UI, and local persistence

T0401 and T0402 retain their stable IDs but are executed in M1; they are listed only once in the M1 section.

- [x] **T0403** Implement atomic lifetime/run unlock recording in persisted state.  
      Requirements: BR-015.  
      Dependencies: T0114, T0406, T0414.
- [x] **T0404** Build achievement toast/queue UI.  
      Requirements: BR-014, BR-015.  
      Dependencies: T0403.
- [x] **T0405** Build achievement overview, lifetime progress, and unlock-history UI.  
      Requirements: BR-014, BR-015.  
      Dependencies: T0403, T0007.
- [x] **T0406** Define the versioned persistence envelope and schemas only. Validation, migration orchestration, and repository behavior are split into T0413 and T0414.  
      Requirements: NFR-005.  
      Dependencies: T0103, T0401.
- [x] **T0407** Implement autosave after meaningful mutations.  
      Requirements: BR-016.  
      Dependencies: T0414.
- [x] **T0408** Implement startup restore choice for valid unfinished runs.  
      Requirements: BR-016.  
      Dependencies: T0414.
- [x] **T0409** Implement expired-challenge restoration directly to frozen results with `actualDurationMs = durationMs`.  
      Requirements: BR-010, BR-013, BR-016.  
      Dependencies: T0308, T0408.
- [x] **T0410** Persist local best records using the pure T0312 comparator.  
      Requirements: BR-017.  
      Dependencies: T0312, T0414.
- [x] **T0411** Implement clear-local-data confirmation.  
      Requirements: BR-015, NFR-006.  
      Dependencies: T0414.
- [x] **T0412** Add persistence corruption and migration tests.  
      Requirements: NFR-005.  
      Dependencies: T0413, T0414.
- [x] **T0413** Implement persisted-data validation and sequential schema/catalog migration orchestration.  
      Requirements: BR-016, NFR-005.  
      Dependencies: T0406.
- [x] **T0414** Implement the storage repository read/write/remove flow, recoverable-corruption handling, and adapter error boundaries.  
      Requirements: BR-016, NFR-005, NFR-006.  
      Dependencies: T0004, T0406, T0413.
- [x] **T0415** Add challenge lifecycle/restore integration tests covering browser background, Mini Program background, long return, route return, process termination, expired-save restoration, and deadline-boundary purchases.  
      Requirements: BR-010, BR-016, BR-021, BR-022.  
      Dependencies: T0304, T0305, T0308, T0309, T0314, T0407, T0408, T0409.
- [x] **T0416** Add Free Mode autosave/restore integration tests, including completed/frozen state and starting a new run.  
      Requirements: BR-008, BR-016.  
      Dependencies: T0117, T0407, T0408.

T0403–T0416 completion evidence is recorded in `docs/engineering/architecture.md` §17.5. The formal versioned repository, migration/recovery rules, hydration gate and restore choice, meaningful-mutation autosave, permanent achievement overview/history, duration-isolated records, and confirmed local-data clearing have automated coverage. Microsoft Edge production smoke passed active and frozen Free restoration, deadline-preserving and expired Challenge restoration, lifetime/record persistence, and zero Console errors. The WeChat target and Taro Storage contract pass; Developer Tools/real-device lifecycle acceptance remains owned by T0613 because the installed IDE service port is disabled.

## M5 — UX, accessibility, PWA

- [x] **T0501** Establish original modern-flat design tokens only. Responsive layout primitives are split into T0512.  
      Requirements: BR-024, NFR-002.  
      Dependencies: T0007.
- [x] **T0502** Define the asset registry, naming/license fields, art direction, and acceptance checklist. Asset production is split into T0513–T0515.  
      Requirements: BR-024.  
      Dependencies: None.
- [x] **T0503** Add balance animation without coupling calculations to animation.
- [x] **T0504** Add large-purchase decorative effects.
- [x] **T0505** Implement reduced-motion preference.  
      Requirements: NFR-003.
- [x] **T0506** Audit keyboard/focus behavior on H5 and touch target sizes.  
      Requirements: NFR-002.
- [x] **T0507** Add PWA manifest/icons/install metadata.  
      Requirements: BR-020.  
      Dependencies: T0005, T0502.
- [x] **T0508** Add service worker/offline caching for app shell/static catalog assets.  
      Requirements: BR-020.  
      Dependencies: T0005, T0507.
- [x] **T0509** Verify PWA update does not erase valid saves.  
      Requirements: BR-020, NFR-005.  
      Dependencies: T0413, T0414, T0508.
- [x] **T0510** Add deterministic humorous result-copy templates through centralized string resources.  
      Requirements: BR-013, BR-024, NFR-004.  
      Dependencies: T0007, T0110.
- [x] **T0511** Add PWA acceptance tests for installability, manifest, service-worker control, offline startup, navigation fallback, old-service-worker update, and old-save migration.  
      Requirements: BR-020, NFR-005.  
      Dependencies: T0412, T0507, T0508, T0509.
- [x] **T0512** Implement responsive layout primitives, safe-area behavior, and mobile/desktop product/receipt composition.  
      Requirements: BR-020, NFR-002.  
      Dependencies: T0501.
- [x] **T0513** Produce and register approved original assets for Everyday, Food, and Tech products.  
      Requirements: BR-024.  
      Dependencies: T0502.
- [x] **T0514** Produce and register approved original assets for Vehicles, Homes, and Luxury products.  
      Requirements: BR-024.  
      Dependencies: T0502.
- [x] **T0515** Produce and register approved original assets for Travel, Sports, Business, and Space products.  
      Requirements: BR-024.  
      Dependencies: T0502.
- [x] **T0516** Validate asset dimensions, lazy-loading behavior, H5 payload, and WeChat package-size impact.  
      Requirements: BR-024, BR-028.  
      Dependencies: T0513, T0514, T0515.
- [x] **T0520** Benchmark a 100-product scenario on H5 and WeChat: list rendering, quantity updates, money derivation, search/category filtering, and avoidable rerenders.  
      Requirements: BR-028.  
      Dependencies: T0203, T0204, T0205, T0512.

T0501–T0516 and T0520 completion evidence is recorded in `docs/engineering/architecture.md` §17.6. For T0511, the project acceptor installed the production PWA from Microsoft Edge's application menu, reopened it in the installed standalone window, and exercised the game successfully; manifest, Service Worker, offline/update/save checks and the four-state install messaging also pass. For T0520, the existing H5/shared guardrail and a WeChat Developer Tools runtime fixture with 100 legal synthetic products pass first presentation, scrolling, category/search filtering, `+ / − / MAX / quantity input`, receipt derivation and state-to-UI updates without application Console errors. The formal 45-product catalog is unchanged, no reliable FPS value is claimed, and Developer Tools evidence is not real-device acceptance. M5 is `PASS / GO` for M6; no M6 task has started.

## M6 — Release audit

- [ ] **T0602** Test H5 at representative mobile/tablet/desktop widths.  
      Requirements: BR-020, NFR-002.
- [ ] **T0603** Test PWA install/offline reopen after first successful load.  
      Requirements: BR-020, NFR-005.  
      Dependencies: T0511.
- [ ] **T0604** Test WeChat Developer Tools and at least one real-device smoke pass.  
      Requirements: BR-021.
- [ ] **T0605** Verify catalog, achievement, money, result, record, and restore parity across H5 and WeChat builds.  
      Requirements: BR-021, BR-022.
- [ ] **T0606** Verify no negative balance/unsafe quantity path via manual fuzzing.  
      Requirements: BR-005, NFR-001.
- [ ] **T0607** Review all asset licenses/provenance.  
      Requirements: BR-024.
- [ ] **T0608** Review disclaimer placement and no-endorsement wording.  
      Requirements: BR-002.
- [ ] **T0609** Confirm no backend/login/live-wealth/payment features slipped into v1.0.  
      Requirements: BR-019, BR-025.
- [ ] **T0610** Produce Web and WeChat release candidate builds.
- [ ] **T0611** Add H5 Playwright or equivalent E2E coverage for start, purchase, MAX, exact zero, restart, challenge, result, and Storage restore.  
      Requirements: BR-008, BR-016, BR-020.  
      Dependencies: T0209, T0311, T0408, T0416.
- [ ] **T0613** Execute detailed WeChat Developer Tools and real-device acceptance for Storage, background timing, foreground recovery, offline reopen, safe areas, product-scroll performance, result view, and new-run flow.  
      Requirements: BR-008, BR-010, BR-016, BR-021, BR-028, NFR-002.  
      Dependencies: T0415, T0416, T0520, T0610.
- [x] **T0620** Implement approved WeChat friend/timeline challenge sharing with validated mode/duration/record parameters and a ready-only landing that never starts the countdown automatically.  
      Requirements: BR-009, BR-010, BR-021, BR-026.  
      Dependencies: T0314, T0410.
- [x] **T0621** Refine challenge header navigation, active-only sticky status visibility, and the WeChat compact `− / quantity / + / MAX` control row without changing shared commands.  
      Requirements: BR-005, BR-009, BR-010, BR-021, BR-022, NFR-002.  
      Dependencies: T0205, T0310, T0512.
- [x] **T0622** Extend approved WeChat friend/timeline sharing to Free Mode with progress-free new-run landing, and stack ready/active Challenge Status below the independent sticky balance panel.  
      Requirements: BR-008, BR-009, BR-010, BR-021, BR-026, NFR-002.  
      Dependencies: T0620, T0621.
- [ ] **T0614** Audit money, catalog, Free Mode, receipt/result, restart, currency, search, performance, and calculation-safety evidence. This is one domain portion split from T0601.  
      Requirements: BR-001, BR-002, BR-003, BR-004, BR-005, BR-006, BR-007, BR-008, BR-012, BR-013, BR-018, BR-023, BR-027, BR-028, BR-029, NFR-001.  
      Dependencies: T0118, T0209, T0416, T0520.
- [ ] **T0619** Audit challenge, achievement, current-run recovery, and local-record implementation/test evidence. This is the second domain portion split from T0601.  
      Requirements: BR-009, BR-010, BR-011, BR-014, BR-015, BR-016, BR-017.  
      Dependencies: T0115, T0313, T0314, T0415.
- [ ] **T0615** Audit platform, offline, migration, accessibility, localization, and asset evidence for BR-020–BR-022, BR-024, and NFR-002–NFR-005. This is the platform/quality portion split from T0601.  
      Requirements: BR-020, BR-021, BR-022, BR-024, NFR-002, NFR-003, NFR-004, NFR-005.  
      Dependencies: T0007, T0412, T0505, T0506, T0511, T0516, T0602, T0603, T0604, T0605, T0607, T0611, T0613, T0620, T0621, T0622.
- [ ] **T0617** Audit the v1 feature boundary and verify that cloud/global/friend ranking, accounts, backend servers, online synchronization, and unapproved social sharing are absent; Deferred items remain non-v1 work.  
      Requirements: BR-026.  
      Dependencies: T0609, T0620, T0622.
- [ ] **T0618** Audit privacy and local data minimization: no personal-data collection, save upload, sensitive fields, unnecessary tracking SDKs, or Storage beyond required game data.  
      Requirements: NFR-006.  
      Dependencies: T0414, T0609.
- [ ] **T0601** Assemble the final BR/NFR-to-implementation/test evidence index. The audits formerly bundled here are split into T0614, T0615, T0617, T0618, and T0619.  
      Dependencies: T0614, T0615, T0617, T0618, T0619.

## Deferred — do not implement under v1.0 tasks

- [ ] **D1001** Generated shareable result image.
- [ ] **D1002** Generated result-card image and Web Share integration beyond the approved v1.0 WeChat challenge-metadata share.
- [ ] **D1003** Global/friend leaderboard.
- [ ] **D1004** Account/cloud save.
- [ ] **D1005** Live net-worth API.
- [ ] **D1006** Live FX API.
