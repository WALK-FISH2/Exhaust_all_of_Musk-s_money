# Product Specification — Spend_Musk_Money

> Status: Active  
> Version: 1.3  
> Date: 2026-08-21  
> Parent: `requirements-baseline.md`

## 1. Experience summary

The player receives a fictional fixed budget of **$400 billion** and attempts to spend it through an absurdly broad original catalog. The design should create two simultaneous feelings:

1. small real-world purchases barely move the number;
2. increasingly wild purchases finally make the scale tangible.

The game is a simulation only; no real transaction occurs.

## 2. Information architecture

### 2.1 Primary flow

`Launch → Mode selection/default Free Mode → Browse/buy → Live receipt/progress → Achievements → Result → Restart/return`

### 2.2 Main game screen

Order on mobile:

1. compact header/brand;
2. sticky balance panel;
3. mode/status strip;
4. category/search controls;
5. product grid/list;
6. receipt summary;
7. achievement preview;
8. footer disclaimer.

On desktop the receipt may be a sticky side panel while products occupy the main column.

## 3. Startup behavior

### SPEC-001 — First launch

On first launch:

- show title, representative budget, and short unofficial-game disclaimer;
- default to Free Mode;
- allow the player to start immediately;
- expose “挑战模式” as a visible secondary action.

A mandatory onboarding carousel is not required.

### SPEC-002 — Restore prompt

If a valid unfinished run exists, show a lightweight choice:

- `继续上次游戏`
- `重新开始`

For an expired timed run, `继续` opens its result state rather than restarting its timer.

## 4. Balance panel

### SPEC-010 — Required fields

The balance panel shows:

- `剩余资产` and formatted USD;
- approximate CNY in smaller text;
- total spent;
- spend progress percentage;
- current mode;
- timer when a challenge is active.

Example display:

`$387,421,330,120`

`≈ ¥2.789 万亿元（游戏换算）`

### SPEC-011 — Formatting

- USD uses thousands separators.
- Large CNY values may use Chinese magnitude abbreviations for readability.
- Full exact USD is always accessible/visible.
- CNY must include `≈` and must never imply a live exchange quote.

### SPEC-012 — Sticky behavior

Free Mode keeps the existing sticky balance panel and does not render Challenge Status. In challenge mode, the balance panel and the single existing Challenge Status component form two independent stacked sticky regions: balance first, Challenge Status immediately below it. Challenge Status is sticky in `ready` and `active`, while `completed` and `expired` remain in normal flow. Their offsets and stacking order must keep the full balance and timer/actions visible without overlap, fixed/absolute overlays, transforms, or layout jumps.

## 5. Catalog and cards

Authoritative initial catalog: `product-catalog.md`.

### SPEC-020 — Product card

Each product card contains:

- original/licensed illustration or icon;
- product name;
- unit USD price;
- approximate CNY price where space permits;
- current quantity;
- current subtotal;
- quantity controls.

Optional short flavor copy may be shown in detail/expanded state.

### SPEC-021 — Quantity control

Default control:

`[ − ] [ quantity ] [ + ] [ MAX ]`

Rules:

- `−` subtracts one, floor 0;
- `+` adds one only if affordable;
- tapping/clicking quantity opens numeric editing;
- `MAX` sets quantity to the maximum affordable value **considering current holdings and the product's per-run quantity cap**;
- direct values are sanitized to non-negative safe integers and clamped to both affordability and the product cap;
- the UI should explain a clamp only when the entered value materially changes.

### SPEC-022 — Meaning of quantity

Quantity represents the current number owned in this run. Decreasing quantity is treated as undoing that simulated purchase and returns the corresponding fictional budget. This is a game editor, not a transaction ledger.

### SPEC-023 — Affordability

For product `p` with current quantity `q`, unit price `u`, current remaining balance `b`, and product cap `c`, maximum new quantity is:

`min(c, q + floor(b / u))`

No operation may exceed `c` or produce remaining balance below zero.

### SPEC-024 — Search/filter

When catalog size is above 30 items:

- search matches localized product name and configured keywords;
- category chips filter products;
- `全部` clears category filter;
- filtering never removes purchased items from receipt or calculations.

### SPEC-025 — Ordering

Default catalog ordering is globally deterministic:

1. `priceUsd ASC`;
2. when prices are equal, `order ASC`.

Category selection only filters or visually groups the catalog; it does not change the default global price ordering. Product IDs and `order` values remain stable. A future sort UI is optional, not required.

## 6. Mode behavior

### SPEC-030 — Free Mode

- no timer;
- run ends automatically when balance reaches zero;
- an exact-zero run becomes completed/frozen;
- returning to products after completion is read-only;
- the player may open the receipt/result preview before completion;
- restart remains available.

### SPEC-031 — Challenge selection

Challenge modal/sheet offers:

- 30 秒
- 60 秒
- 300 秒

Selecting duration does not start timing yet. The player presses `开始挑战`.

### SPEC-032 — Challenge countdown

After `开始挑战`:

- optional 3–2–1 visual countdown may play;
- authoritative `startedAt` is set at the moment gameplay becomes active;
- authoritative `durationMs` stores the selected duration;
- challenge deadline is `startedAt + durationMs`;
- purchasing is disabled before gameplay becomes active.

### SPEC-033 — Active timer

UI may update every 100–250ms for smoothness, but remaining time is always derived from `max(0, deadlineAt - Date.now())`, never by decrementing an authoritative counter. Intervals and animation frames only request a repaint.

### SPEC-034 — Timeout

At `now >= deadline`:

- input is disabled;
- final state is completed/frozen;
- `actualDurationMs = durationMs`;
- results open;
- late UI events are ignored by domain rules.

### SPEC-035 — Background/foreground

When returning from background:

- recompute current time from the clock;
- if expired, end the run immediately with `actualDurationMs = durationMs`;
- otherwise show the true remaining duration.

The same reconciliation runs when a browser tab becomes visible, a page is shown again, a Mini Program returns to foreground, or persisted state is restored. An expired restored run never uses `restoredAt - startedAt` as its actual duration.

### SPEC-036 — Early clear

If the player reaches exactly zero:

- mark the run completed/frozen immediately;
- record `completedAt`;
- calculate `actualDurationMs = completedAt - startedAt`;
- open success results.

## 7. Achievement behavior

Authoritative rules: `achievement-rules.md`.

### SPEC-040 — Evaluation

Achievements are evaluated after every successful state change that can affect their conditions. Evaluation receives both the authoritative before/after state and a normalized domain transition event so event-sensitive achievements remain deterministic.

### SPEC-041 — Toast

Newly unlocked achievements display a short, non-blocking toast/card. Multiple simultaneous unlocks are queued or combined without interrupting quantity input.

### SPEC-042 — Lifetime state

Lifetime unlocks persist locally. Resetting a run does not relock lifetime achievements.

A separate “清除本地数据” action may erase achievements and records after confirmation.

### SPEC-043 — Final-dollar sticker achievement

`sticker-finish` unlocks only when one successful positive purchase mutation meets all of these conditions:

- `remainingBeforePurchase === 1`;
- `productId === 'lucky-sticker'`;
- `purchasedQuantityDelta === 1`;
- `remainingAfterPurchase === 0`.

Merely owning or having previously purchased `lucky-sticker` does not satisfy this achievement.

## 8. Receipt

### SPEC-050 — Receipt contents

Receipt contains only products with quantity > 0, each with:

- name;
- unit price;
- quantity;
- subtotal.

Footer:

- distinct products;
- total quantity;
- total spent;
- remaining balance.

### SPEC-051 — Receipt ordering

Use catalog order by default. The result page may additionally highlight highest-subtotal lines.

## 9. Result screen

### SPEC-060 — Free completion result

When exact zero is reached, show celebratory but compact effects and:

- “你真的把 4000 亿美元花完了。” or equivalent original wording;
- total spent: $400B;
- time since run started if available, marked as informational in Free Mode;
- total quantity;
- distinct product count;
- category coverage;
- highest-subtotal line;
- achievements this run;
- lifetime achievement progress;
- 败家指数 = 100.

### SPEC-061 — Challenge result

Show:

- duration;
- spent;
- remaining;
- rounded spending percentage;
- 败家指数 = rounded spending percentage;
- whether exact-zero clear was achieved;
- actual elapsed time for every challenge result;
- purchased item/type/category metrics;
- highlighted absurd purchase;
- achievements unlocked;
- local record indicator if beaten.

Actual elapsed time is:

- early clear: `completedAt - startedAt` milliseconds;
- natural timeout: the selected `durationMs`;
- background/restored timeout: the selected `durationMs`, regardless of when the player returns.

### SPEC-062 — “Most absurd purchase” v1.0 definition

To keep the result deterministic, the highlighted “最离谱的一项” is the line with the highest subtotal. Tie-breaker:

1. higher unit price;
2. lower catalog order index.

Copy can be humorous, but the selection rule must remain deterministic.

### SPEC-063 — Result actions

Required:

- `再来一局`
- `返回商品`

Challenge result also provides `换个挑战`.

For a completed or expired challenge, `返回商品` opens the frozen run in read-only mode. Quantity controls are disabled and no command may mutate the run. Purchasing requires `再来一局` or `换个挑战`. A completed Free Mode run follows the same read-only rule.

Generated image export and Web Share are not required in v1.0. The approved WeChat native share behavior is defined by SPEC-065.

### SPEC-064 — Local record comparison

Challenge records use exact domain values:

- highest spending compares integer `totalSpent`; rounded percentage is display-only;
- strictly higher `totalSpent` replaces the record;
- equal or lower `totalSpent` keeps the existing record;
- fastest exact-zero clear compares integer `actualDurationMs` at millisecond precision;
- strictly lower `actualDurationMs` replaces the record;
- equal or higher `actualDurationMs` keeps the existing record.

### SPEC-065 — WeChat native sharing

The WeChat Mini Program page registers native friend sharing and timeline sharing in every game mode. All visible share copy is centralized.

Free Mode uses the validated query `shareMode=free` and ordinary invitation copy without challenge duration or record wording. It never serializes product quantities, balance, RunState, achievements, records, or any sender progress. Opening it selects a new Free Mode run. If replacement would discard a recipient's non-empty local run, the existing restart confirmation remains mandatory.

Challenge parameters use the same validated query contract:

- `challengeMode`: `challenge-30`, `challenge-60`, or `challenge-300`;
- `duration`: matching integer seconds `30`, `60`, or `300`;
- `record`: optional non-negative integer elapsed milliseconds no greater than the selected duration.

When a record is available, selection order is deterministic: the current frozen challenge result, then the duration's fastest-clear record, then its highest-spending record. Friend and timeline shares use the same mode/duration/record snapshot.

Opening a valid share selects the existing challenge mode and creates its normal `ready` run. It displays `好友挑战记录：xx 秒` when `record` is valid, leaves `startedAt`, `deadlineAt`, and `durationMs` unset, and requires the recipient to press `开始挑战`. It reuses the existing Challenge Picker and start transition; it never auto-starts or modifies timer math. If accepting the shared challenge would discard a non-empty active run, the existing restart confirmation remains mandatory.

Invalid or mismatched query values are ignored safely. The share adapter does not write a new Storage field and does not introduce account, backend, save upload, ranking, or generated-image behavior.

## 10. Motion and feedback

### SPEC-070 — Balance animation

When spending changes:

- the balance may animate/roll to the new value;
- the authoritative value updates immediately in state;
- animation never delays calculations.

### SPEC-071 — Large purchase feedback

Purchases crossing configurable spending thresholds may trigger mild visual effects (pulse, particles, shake). Effects must remain decorative.

Suggested thresholds for a single state delta:

- ≥ $1M: pulse;
- ≥ $1B: stronger pulse/particles;
- ≥ $10B: short celebratory burst.

### SPEC-072 — Reduced motion

Reduced-motion mode removes shake/large number transitions and uses simple opacity/state changes.

## 11. Persistence

### SPEC-080 — Persisted envelope

Persist:

- `schemaVersion`;
- `catalogVersion`;
- active run snapshot;
- lifetime achievements;
- local best records;
- preferences such as reduced motion and CNY display visibility.

Do not persist derived CNY money as authoritative state.

### SPEC-081 — Autosave

Save after meaningful mutations using a short debounce where appropriate. Page unload is not the only save mechanism.

### SPEC-082 — Corrupt data

If local state is invalid:

- do not crash;
- preserve recoverable lifetime data where safe;
- start a clean run if active-run recovery fails;
- optionally log a development-only diagnostic.

## 12. Settings

v1.0 settings may include:

- show/hide approximate CNY;
- reduced motion on/off/system where supported;
- sound on/off if sound is added;
- clear local data.

Changing the starting budget is not a v1.0 setting.

## 13. Copy and identity

### SPEC-090 — Disclaimer

A concise visible disclaimer must communicate:

- entertainment simulation;
- no real money;
- unofficial/no endorsement;
- net-worth/budget figure is representative game data.

### SPEC-091 — Tone

Tone is playful and slightly absurd, not insulting, defamatory, political, or framed as a factual statement about Musk's actual spending behavior.

## 14. Responsive requirements

### Mobile

- 1–2 product columns depending on width;
- sticky balance/timer;
- touch targets roughly 44 CSS px where practical;
- no horizontal scrolling for core controls.

### Desktop

- 3–5 product columns depending on width;
- receipt/result summary may occupy a side rail;
- balance remains visually dominant.

## 15. Error/edge cases

- empty numeric input → treat as 0 on commit;
- negative input → 0;
- decimal quantity → reject or normalize to integer, never store decimal;
- scientific notation/Infinity/NaN → reject;
- value above safe integer → clamp/reject;
- value above product cap → clamp to product cap (then affordability);
- `MAX` on unaffordable or already-capped product → keep current quantity;
- reducing quantity always refunds based on fixed catalog unit price for that run;
- catalog price changes between versions must not silently corrupt restored runs; use catalog version/migration rules;
- deadline race: domain command after expiry must be rejected even if UI timer has not repainted.
