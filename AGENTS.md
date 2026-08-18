# AGENTS.md — Spend_Musk_Money

> Status: Active  
> Version: 1.1  
> Date: 2026-08-18

## 1. Purpose

This file tells Codex/AI coding agents how to work in this repository. It is an execution guide, not a product-requirements source.

## 2. Mandatory document priority

When documents conflict, use this priority from highest to lowest:

1. `docs/constitution.md`
2. `docs/product/requirements-baseline.md`
3. `docs/product/spec.md`
4. Normative annexes explicitly referenced by the spec:
   - `docs/product/product-catalog.md`
   - `docs/product/achievement-rules.md`
5. `docs/engineering/architecture.md`
6. `docs/planning/plan.md`
7. `docs/planning/tasks.md`
8. `AGENTS.md`

Non-normative files such as `docs/product/requirements-audit.md` and `docs/reference/gameplay-reference.md` may explain context but MUST NOT override the hierarchy above.

If a lower-priority document conflicts with a higher-priority document, do not silently reconcile them in code. Follow the higher-priority rule and report the conflict.

## 3. Change-control rule

Before implementing a requirement that is new, ambiguous, or apparently inconsistent with the baseline:

1. Locate the controlling requirement ID.
2. Check the hierarchy above.
3. If the requirement changes product behavior, update the appropriate product document first.
4. If it changes an already frozen baseline decision, update `requirements-baseline.md` only after explicit user approval.
5. Then update downstream architecture/plan/tasks as needed.

Do not let code become the only place where a product decision exists.

## 4. Product guardrails

The project is an original entertainment simulation inspired by the general “spend a billionaire's money” game genre.

Agents MUST NOT:

- clone the reference site's UI, copy, catalog, achievement names, image assets, CSS, source code, or layout one-for-one;
- scrape or hotlink reference-site assets;
- imply endorsement by Elon Musk, Tesla, SpaceX, X, xAI, or any other person/company;
- add real payment, gambling, cash-out, financial investment, or purchasable virtual-currency systems;
- add accounts, backend, analytics, ad SDKs, cloud ranking, or live-net-worth APIs in v1.0 without a requirements change;
- expose secrets or WeChat `AppSecret` in client code.

## 5. Core technical rules

- Canonical game money is integer USD dollars.
- `INITIAL_BUDGET_USD = 400_000_000_000` for baseline v1.0.
- Never use floating-point currency as authoritative state.
- CNY is display-only and derived from a configurable static display rate.
- Quantity is a non-negative safe integer and MUST NOT exceed the product's per-run cap.
- `MAX` respects both affordability and the per-run product cap.
- Balance MUST never become negative.
- All domain transitions must be implemented through testable pure functions.
- Challenge timing must be timestamp-based so backgrounding the app cannot pause or extend the timer.
- Persisted state must include a schema version and migration path.
- Web and WeChat Mini Program must share the same domain rules and product/achievement data source.

## 6. Required workflow for each task

Before coding:

- read the controlling task in `docs/planning/tasks.md`;
- read referenced requirement IDs;
- inspect existing implementation and tests;
- identify whether the task changes cross-platform behavior.

During coding:

- keep platform-specific code behind adapters;
- do not duplicate game math between H5 and WeChat builds;
- add/update tests with the behavior change;
- keep UI text and catalog data out of core calculation functions;
- record every completed addition, change, fix, removal, deprecation, or security change under `CHANGELOG.md` > `Unreleased`.

Before considering a task complete:

- run type checking;
- run unit tests;
- run lint/format checks if configured;
- build H5;
- build WeChat Mini Program for tasks that touch shared or mini-program code;
- verify no new requirement conflict was introduced;
- verify `CHANGELOG.md` accurately records the completed scope and any material known limitations.

## 7. Definition of done

A task is done only when:

- its acceptance criteria pass;
- referenced requirement IDs are satisfied;
- tests cover material rule logic;
- no currency/quantity overflow or negative-balance case is introduced;
- both targets remain buildable when the task is cross-platform;
- any changed product decision is reflected in documentation;
- `CHANGELOG.md` contains an accurate `Unreleased` entry for the completed change.

## 8. Commit discipline

Prefer small commits grouped by one coherent behavior. Suggested prefixes:

- `feat:` feature
- `fix:` bug fix
- `test:` tests
- `docs:` documentation
- `refactor:` behavior-preserving refactor
- `chore:` tooling/build

Do not mix unrelated cleanup into a feature task unless needed to make the task safe.

## 9. Changelog discipline

- Maintain the root `CHANGELOG.md` for all future work, including code, dependencies, tooling, architecture, requirements documentation, and material fixes.
- During development, add entries under `Unreleased` using the applicable `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, or `Security` heading.
- Reference Task IDs and requirement IDs when they materially help traceability.
- Record only completed or verified facts; place material unverified behavior under `Known limitations` instead of presenting it as complete.
- When publishing a release, move the relevant `Unreleased` entries into a new `## [version] - YYYY-MM-DD` section and keep released history immutable except for factual corrections.
