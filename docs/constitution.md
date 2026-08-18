# Spend_Musk_Money Constitution

> Status: Active / Highest Authority  
> Version: 1.0  
> Approved: 2026-08-17

## Article I — Product identity

The product is an original, lighthearted entertainment simulation currently titled **“花光马斯克的钱 / Spend Musk's Money”**. Its purpose is to turn an extremely large fictionalized budget into an intuitive, playful spending experience.

The product must clearly state that it is an unofficial entertainment simulation, is not endorsed by Elon Musk or related companies, contains no real money, and uses representative game values rather than real-time financial data.

## Article II — Originality over cloning

The project may learn from the general interaction pattern of existing “spend a billionaire's money” games, but it MUST remain independently designed.

The project MUST NOT copy a reference site's source code, proprietary assets, detailed product list, achievement wording, page copy, or visual composition one-for-one. Product data, achievements, UI details, copy, icons, illustrations, motion, and result presentation must be independently authored or properly licensed.

## Article III — One rule engine, multiple clients

The v1.0 product targets both:

- responsive Web/H5 with PWA capability;
- WeChat Mini Program.

Both platforms MUST use one shared domain model, one shared money-calculation rule set, and the same authoritative product and achievement definitions. Platform adapters may differ only where APIs, layout constraints, storage, lifecycle, or sharing capabilities differ.

## Article IV — Deterministic money rules

1. Canonical game currency is USD.
2. Authoritative amounts are stored as integer USD dollars.
3. Initial budget for baseline v1.0 is exactly **$400,000,000,000**.
4. CNY is an approximate display value only and MUST NOT affect purchase eligibility, remaining balance, achievements, results, or persistence.
5. Balance may reach zero but MUST never be negative.
6. Quantity is integer and cannot be negative.
7. The catalog must contain at least one $1 item so an exact-zero completion is mathematically reachable.

## Article V — Offline-first v1.0

v1.0 is a client-only game. It MUST NOT require a backend, login, cloud database, remote ranking, or live wealth API to complete the core experience.

Core play, achievements, current-session recovery, local records, and results must work without network after the Web PWA has been successfully loaded/installed and in the bundled Mini Program client.

## Article VI — Modes

v1.0 MUST contain:

- Free Mode;
- 30-second Challenge;
- 60-second Challenge;
- 300-second Challenge.

Challenge behavior must be deterministic and resistant to accidental timer extension caused by app backgrounding, tab suspension, or rendering throttling.

## Article VII — Player control and fairness

The player must be able to increase, decrease, directly edit, and maximize affordable quantity without hidden purchases. No purchase action may silently spend more than the current balance.

A restart that would discard a non-empty session must require confirmation.

## Article VIII — Privacy and monetization boundary

Baseline v1.0 requires no account and no personal profile. Do not collect personal data unless a future approved requirement creates a necessary purpose.

Baseline v1.0 contains no:

- real payment;
- in-app purchase;
- gambling;
- prize redemption;
- cash-out;
- investment or financial advice;
- ad SDK requirement.

## Article IX — Asset safety

All shipped images, icons, fonts, audio, and illustrations must be original, generated for the project with usable rights, public-domain, or licensed for the intended distribution. A source/license record must be maintained for non-original assets.

Avoid unauthorized use of celebrity photographs, company logos, or brand artwork. A stylized original thematic illustration may be used only if it does not falsely imply endorsement.

## Article X — Accessibility and responsive behavior

Core interactions must be usable by pointer and touch. Critical information cannot depend on color alone. Motion effects must not prevent play and should respect reduced-motion preferences on Web where available.

The layout must support at minimum common mobile widths and desktop browsers without hiding purchasing controls or balance information.

## Article XI — Testability

Money math, purchase eligibility, quantity clamping, challenge timing, achievements, result statistics, persistence migration, and completion detection must be testable without rendering the UI.

A feature that materially changes these rules is incomplete until its tests are updated.

## Article XII — Requirement governance

The authority order is:

`constitution.md > requirements-baseline.md > spec.md > normative annexes > architecture.md > plan.md > tasks.md > AGENTS.md`

`requirements-audit.md` and `gameplay-reference.md` are explanatory/audit artifacts and cannot override normative requirements.

Any request that conflicts with this constitution requires an explicit constitution revision before implementation.
