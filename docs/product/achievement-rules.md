# Achievement Rules — v1.0

> Status: Normative annex to `spec.md`  
> Version: 2  
> Date: 2026-08-18

## 1. Principles

- Achievement IDs are stable.
- Wording is original to this project.
- Achievements are evaluated from authoritative USD/game state only.
- CNY display never affects achievements.
- Lifetime unlock state persists locally.
- A result records which achievements first unlocked during that run.

## 2. Achievement definitions

| ID                | Name                 | Condition                                                                                    | Scope    |
| ----------------- | -------------------- | -------------------------------------------------------------------------------------------- | -------- |
| first-swipe       | 第一笔，刷！         | totalSpent >= $1                                                                             | lifetime |
| million-warmup    | 百万美元热身         | totalSpent >= $1,000,000                                                                     | lifetime |
| billion-click     | 十亿美元一按         | totalSpent >= $1,000,000,000                                                                 | lifetime |
| ten-billion       | 钱开始有感觉了       | totalSpent >= $10,000,000,000                                                                | lifetime |
| hundred-billion   | 三位数十亿俱乐部     | totalSpent >= $100,000,000,000                                                               | lifetime |
| exact-zero        | 一分不剩             | remainingBalance == 0                                                                        | lifetime |
| sticker-finish    | 最后一美元           | a successful purchase of exactly one `lucky-sticker` changes remaining balance from $1 to $0 | lifetime |
| thousand-items    | 仓库告急             | totalQuantity >= 1,000                                                                       | lifetime |
| twenty-types      | 选择困难症           | distinctProducts >= 20                                                                       | lifetime |
| five-categories   | 到处都买点           | distinctCategories >= 5                                                                      | lifetime |
| all-categories    | 十项全能买家         | all 10 baseline categories have quantity > 0                                                 | lifetime |
| tech-basket       | 数码桌已经放不下     | at least 4 distinct `tech` products purchased                                                | lifetime |
| garage-boss       | 车库再扩三层         | at least 4 distinct `vehicles` products purchased                                            | lifetime |
| island-life       | 今天开始当岛民       | `private-island` quantity >= 1                                                               | lifetime |
| sky-office        | 通勤方式升级         | `private-jet` quantity >= 1                                                                  | lifetime |
| city-maker        | 地图上多了个项目     | `smart-town` or `skyscraper` quantity >= 1                                                   | lifetime |
| space-brain       | 地球已经装不下购物车 | any 3 distinct `space` products purchased                                                    | lifetime |
| max-button        | 这一项我全要了       | player successfully uses MAX and increases a product quantity                                | lifetime |
| challenge-half-30 | 三十秒烧掉一半       | in 30s challenge, spendPercent >= 50 at end                                                  | lifetime |
| challenge-clear   | 手速超过余额         | exact zero in any timed challenge before deadline                                            | lifetime |

## 3. Evaluation definitions

### Total spent

`INITIAL_BUDGET_USD - remainingBalance`

### Total quantity

Sum of all product quantities.

### Distinct products

Count of product IDs whose quantity > 0.

### Distinct categories

Count of category IDs containing at least one product whose quantity > 0.

### MAX event

`max-button` requires an explicit player MAX command that results in `newQuantity > oldQuantity`. Merely reaching an equivalent quantity via typing does not trigger it.

### Final-dollar sticker event

`sticker-finish` is event-sensitive and requires one successful positive purchase transition where all conditions hold atomically:

```text
remainingBeforePurchase === 1
productId === "lucky-sticker"
purchasedQuantityDelta === 1
remainingAfterPurchase === 0
```

The triggering transition may originate from an increment, direct-set, or MAX command only when its positive quantity delta is exactly one. Decrease/refund commands never qualify. Merely owning or having purchased `lucky-sticker` earlier in the run does not qualify.

## 4. Unlock notification

On a single mutation unlocking multiple achievements:

- store all unlocks atomically with the new game state;
- UI may show a combined “解锁 X 个成就” summary followed by details;
- result order follows the achievement table order unless a future spec states otherwise.

## 5. Reset behavior

- `重新开始游戏` resets the run only; lifetime achievements remain.
- `清除本地数据` clears lifetime achievements after confirmation.
- app update migration must preserve unlocked IDs that still exist.
