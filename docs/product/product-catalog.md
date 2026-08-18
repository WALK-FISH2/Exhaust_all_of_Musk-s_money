# Product Catalog — Initial v1.0 Draft

> Status: Normative annex to `spec.md`  
> Catalog version: 2  
> Date: 2026-08-18

## 1. Catalog rules

- Prices are **game values**, not live market quotations.
- USD integer price is authoritative.
- Names and descriptions are original/generic wherever possible.
- Product images must follow `docs/engineering/asset-policy.md`.
- IDs are stable and must never be reused for a different product.
- A product can be reworded/localized without changing ID.
- At least one product must cost exactly `$1`.
- Every product has a deterministic `maxQuantityPerRun` derived from the cap table below unless an explicit catalog override is added later.
- Default display order is `priceUsd ASC`, then `order ASC` for equal prices. Category filtering does not redefine this ordering.

### 1.1 Default quantity-cap table

|                  Unit price USD | maxQuantityPerRun |
| ------------------------------: | ----------------: |
|                          $1–$99 |     1,000,000,000 |
|                     $100–$9,999 |        10,000,000 |
|                $10,000–$999,999 |           100,000 |
|          $1,000,000–$99,999,999 |            10,000 |
|       $100,000,000–$999,999,999 |               100 |
|   $1,000,000,000–$9,999,999,999 |                10 |
| $10,000,000,000–$99,999,999,999 |                 3 |
|              ≥ $100,000,000,000 |                 1 |

The cap is a gameplay rule, not a claim about real-world availability. It prevents `MAX` on the $1 item from becoming an instant $400B clear while still allowing absurd quantities.

### 1.2 Explicit v1 quantity-cap overrides

The catalog-source name `maxQuantityPerGame` and the domain name `maxQuantityPerRun` refer to the same per-run limit. Explicit overrides take precedence over the default table.

| Product ID       | `maxQuantityPerGame` / resolved `maxQuantityPerRun` | Reason                                                      |
| ---------------- | --------------------------------------------------: | ----------------------------------------------------------- |
| `private-train`  |                                               7,999 | Prevent a fresh-run MAX of 8,000 × $50M from clearing $400B |
| `private-island` |                                               4,999 | Prevent a fresh-run MAX of 5,000 × $80M from clearing $400B |

## 2. Initial categories

| ID       | Chinese label | English key                |
| -------- | ------------- | -------------------------- |
| everyday | 日常小物      | Everyday                   |
| food     | 吃喝自由      | Food & Drink               |
| tech     | 数码科技      | Tech                       |
| vehicles | 车库扩建      | Vehicles                   |
| homes    | 房产地图      | Homes & Real Estate        |
| luxury   | 奢侈一下      | Luxury                     |
| travel   | 世界走走      | Travel & Experiences       |
| sports   | 体育娱乐      | Sports & Entertainment     |
| business | 公司基建      | Companies & Infrastructure |
| space    | 太空与脑洞    | Space & Wild Ideas         |

## 3. Initial product set

The list intentionally differs from the reference site's detailed catalog.

The rows below are listed in the required default order: `priceUsd ASC`, then `order ASC`.

| Order | ID                 | Category | 中文名                   |  Game price USD | Type         | Notes/keywords             |
| ----: | ------------------ | -------- | ------------------------ | --------------: | ------------ | -------------------------- |
|    10 | lucky-sticker      | everyday | 一美元幸运贴纸           |               1 | realistic    | exact-zero tool, sticker   |
|    20 | bottled-water      | everyday | 一瓶矿泉水               |               2 | realistic    | water                      |
|    30 | bus-ticket         | everyday | 一张公交票               |               3 | realistic    | commute                    |
|    70 | bubble-tea         | food     | 一杯超大奶茶             |               6 | realistic    | drink, tea                 |
|    40 | socks              | everyday | 一双袜子                 |               8 | realistic    | clothing                   |
|    50 | umbrella           | everyday | 一把雨伞                 |              20 | realistic    | daily                      |
|    60 | movie-night        | sports   | 一张电影票               |              25 | realistic    | cinema                     |
|    80 | hotpot             | food     | 一顿火锅                 |              80 | realistic    | meal                       |
|    90 | fine-dinner        | food     | 一顿豪华晚餐             |             500 | realistic    | dining                     |
|   110 | flagship-phone     | tech     | 旗舰手机                 |           1,200 | realistic    | phone                      |
|   100 | coffee-machine     | food     | 全自动咖啡机             |           1,500 | realistic    | coffee                     |
|   150 | ebike              | vehicles | 高性能电助力自行车       |           4,000 | realistic    | bike                       |
|   120 | gaming-pc          | tech     | 顶配游戏电脑             |           5,000 | realistic    | pc, gaming                 |
|   130 | home-cinema        | tech     | 家庭影院套装             |          20,000 | realistic    | tv, audio                  |
|   160 | family-car         | vehicles | 一辆家用汽车             |          35,000 | realistic    | car                        |
|   250 | designer-watch     | luxury   | 一枚高级机械表           |          50,000 | realistic    | watch                      |
|   290 | around-world       | travel   | 一次环球旅行             |         200,000 | aspirational | travel                     |
|   170 | sports-car         | vehicles | 一辆超级跑车             |         350,000 | realistic    | supercar                   |
|   200 | city-apartment     | homes    | 一套城市公寓             |         500,000 | realistic    | apartment                  |
|   180 | armored-limo       | vehicles | 一辆定制防护礼宾车       |       1,500,000 | aspirational | limo                       |
|   140 | robot-lab          | tech     | 一套机器人实验室         |       2,000,000 | aspirational | robot, lab                 |
|   260 | giant-diamond      | luxury   | 一颗收藏级巨钻           |       5,000,000 | aspirational | diamond                    |
|   300 | polar-expedition   | travel   | 一支极地探险队           |       5,000,000 | aspirational | expedition                 |
|   210 | sea-villa          | homes    | 一栋海景别墅             |       8,000,000 | realistic    | villa                      |
|   330 | stadium-season     | sports   | 包下一座体育馆一个赛季   |      25,000,000 | fantasy      | stadium                    |
|   190 | private-train      | vehicles | 一列私人观光列车         |      50,000,000 | fantasy      | train, cap override 7,999  |
|   310 | private-jet        | travel   | 一架远程私人飞机         |      75,000,000 | aspirational | jet                        |
|   220 | private-island     | homes    | 一座私人小岛             |      80,000,000 | aspirational | island, cap override 4,999 |
|   270 | art-gallery        | luxury   | 买下一座美术馆藏品库     |     100,000,000 | fantasy      | art                        |
|   340 | esports-club       | sports   | 买下一家顶级电竞俱乐部   |     150,000,000 | aspirational | esports                    |
|   280 | megayacht          | luxury   | 一艘超级游艇             |     250,000,000 | aspirational | yacht                      |
|   410 | moon-trip          | space    | 一次绕月旅行             |     500,000,000 | fantasy      | moon                       |
|   370 | factory            | business | 建一座智能制造工厂       |     800,000,000 | aspirational | factory                    |
|   320 | floating-hotel     | travel   | 建一座海上漂浮酒店       |     900,000,000 | fantasy      | hotel                      |
|   420 | rocket-launch      | space    | 一次重型火箭发射         |   1,200,000,000 | fantasy      | rocket                     |
|   230 | skyscraper         | business | 一栋摩天大楼             |   1,500,000,000 | aspirational | building                   |
|   380 | solar-farm         | business | 建一片巨型太阳能基地     |   2,500,000,000 | aspirational | energy                     |
|   360 | theme-park         | sports   | 建一座大型主题乐园       |   4,000,000,000 | fantasy      | park                       |
|   350 | football-club      | sports   | 买下一家世界级足球俱乐部 |   6,000,000,000 | fantasy      | football                   |
|   240 | smart-town         | business | 建一座未来智慧小镇       |  12,000,000,000 | fantasy      | city, infrastructure       |
|   390 | airline            | business | 组建一家航空公司         |  15,000,000,000 | fantasy      | airline                    |
|   400 | ocean-cleanup      | business | 发起全球海洋清洁计划     |  20,000,000,000 | fantasy      | public-good                |
|   430 | lunar-base         | space    | 建一个月球科研基地       |  35,000,000,000 | fantasy      | moon base                  |
|   440 | mars-city          | space    | 火星城市一期工程         | 100,000,000,000 | fantasy      | mars, city                 |
|   450 | orbital-ring-study | space    | 启动轨道环超级工程研究   | 200,000,000,000 | fantasy      | megastructure              |

## 4. Balance/solvability checks

Automated catalog validation MUST assert:

- every price is a positive safe integer;
- every resolved `maxQuantityPerRun` is a positive safe integer;
- IDs and order values are unique;
- categories exist;
- catalog default output is sorted by `priceUsd ASC`, then `order ASC` for equal prices;
- at least one price equals 1;
- no individual product price exceeds the initial budget unless the UI explicitly marks it unavailable (the initial v1 catalog should avoid such items);
- `MAX` on any single product from a fresh $400B run cannot by itself spend the full budget;
- the catalog includes a verified multi-product path to reach exact zero within caps;
- the $1 item can resolve integer-dollar remainders once the remaining balance is within its cap range.

A baseline exact-zero regression path is: `$200B + $100B + 2×$35B + $20B + $6B + $4B = $400B` using catalog items `orbital-ring-study`, `mars-city`, `lunar-base`, `ocean-cleanup`, `football-club`, and `theme-park`. This path must remain valid unless a catalog version change intentionally replaces it.

The resolved override caps do not affect this path. Its quantities are `1, 1, 2, 1, 1, 1`, all within their resolved caps, and its exact integer total is `$400,000,000,000`.

## 5. Product imagery direction

Prefer a consistent original illustration system:

- clean flat/isometric objects;
- transparent or controlled neutral backgrounds;
- no copied e-commerce photography;
- no corporate logo required to understand the object;
- use visual exaggeration for fantasy products.

## 6. Future catalog changes

Adding products is backward-compatible if IDs are new. Removing or changing prices of existing IDs requires catalog migration review because saved runs may contain those IDs/prices.
