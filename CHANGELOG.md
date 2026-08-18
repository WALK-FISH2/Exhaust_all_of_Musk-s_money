# 变更日志

本文件记录项目中值得关注的新增、变更、修复与已知限制。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。开发期间的变更先记录在 `Unreleased`；正式发布时再归入带日期的版本。除纠正事实错误外，不应改写已经发布的历史记录。

## [Unreleased]

### Added

- 新增根目录 `CHANGELOG.md`，集中维护项目变更历史。
- 完成 M2 的 T0201–T0208：新增正式自由模式页面、非官方娱乐声明、响应式粘性资产区、45 商品卡、10 分类与中英文/关键词本地搜索。
- 新增集中式 Free Mode controller/hook，以 M1 `RunState` 为唯一权威状态，并将 +/−、直接数量、MAX、错误反馈和重开流程接入正式 Domain command。
- 新增由 RunState 派生的收据/消费明细、单局成就轻量反馈、精确清零结果页、完成冻结与只读返回商品页。
- 新增原创 CSS/Emoji 商品占位视觉、移动/平板/桌面响应式组合、跨端 `ariaLabel` 与 reduced-motion 降级；未引入外部素材或新增依赖。
- 新增 10 项 Free Mode controller/state-flow 测试，覆盖筛选与购买状态保持、收据同步、重开、官方 `$400B` 清零路径和 `sticker-finish` 的 `$1 → $0` UI 操作序列。
- 完成 M1 的 T0101–T0118、T0401 与 T0402：新增安全整数 USD 运算、确定性 USD/CNY 展示格式化和固定 `$400B` 初始预算。
- 将 catalog version 2 的 45 个商品、10 个分类及 20 个正式成就编码为共享、类型安全的静态数据。
- 新增商品目录校验器，覆盖 ID/order、分类、价格/cap、安全乘积、排序、两个 cap override、单商品 MAX 与官方精确清零路径。
- 新增不可变 RunState、单价快照、购买、增加、减少/退款、直接数量设置、MAX、精确清零冻结和稳定领域错误码。
- 新增消费/余额、商品/分类统计、最高小计行及确定性 tie-break 等结果推导。
- 新增规范化领域事件、20 条纯成就 evaluator、确定性单局解锁排序及 `sticker-finish` 原子事件判定。
- 新增目录、Money、命令、Free Mode、结果、货币展示、成就及领域不变量测试，包括 1,000 次确定性生成操作与重放验证。

### Changed

- 将持续维护变更日志纳入 `AGENTS.md` 的强制工作流与完成标准。
- 在 `README.md` 中增加变更日志入口和维护约定。
- RunState 采用每局 `unitPriceSnapshotsUsd`，防止未来目录价格变化追溯修改当前局已消费金额。
- 将原 M0 技术状态页替换为可玩的 M2 自由模式组合；M0 Storage 技术验证代码保留，但正式页面不读取或写入存档。
- 将架构和任务文档更新到 M2 当前验证状态；正式产品基线、商品规则和成就规则未修改。

### Verified

- `pnpm run check` 通过：TypeScript、ESLint、174 项测试和格式检查全部通过。
- `pnpm run build:h5`、`pnpm run build:weapp` 与 `pnpm run build:pwa` 均通过；PWA manifest、Service Worker、预缓存、导航回退和安全更新策略检查通过。
- H5 生产应用壳经本地静态服务请求返回 HTTP 200；微信小程序输出位于 `dist/weapp/`。

### Known limitations

- T0209 尚未关闭：浏览器控制运行时在创建标签页前初始化失败，因此本轮未完成、也未宣称交互式 H5 smoke 或 Console 验证；控制器回归、H5/WEAPP/PWA 构建均已通过。
- M3 挑战计时/生命周期与 M4 正式持久化、永久成就和本地记录仍未实现。

## [0.1.0] - 2026-08-18

### Requirements and planning

- 完成开发前正式文档修订，关闭 `AUD-001` 至 `AUD-011`：未发现与 `constitution.md` 冲突的阻塞项，结论为允许进入 M0。
- 将 `private-train` 与 `private-island` 的单局数量上限分别冻结为 7,999 和 4,999，禁止任一单商品从全新 `$400B` 局面通过一次 MAX 直接清零；商品价格保持不变。
- 冻结默认商品排序为 `priceUsd ASC`、同价时 `order ASC`，分类仅用于筛选、浏览与视觉分组。
- 冻结挑战计时与结算规则：权威剩余时间基于 `deadlineAt - Date.now()`；提前清零记录真实毫秒耗时，超时统一记录配置时长；已完成或过期的局被冻结，返回商品页只读。
- 冻结历史最佳比较规则：消费成绩使用精确整数 `totalSpent`，最快清零使用毫秒整数 `actualDurationMs`，相同时保留原记录。
- 将 `sticker-finish` 冻结为一次 `lucky-sticker` 购买使余额从 `$1` 变为 `$0` 时才触发。
- 为 BR-008、BR-026、BR-028、NFR-004 与 NFR-006 增加明确任务覆盖，并把纯成就判断逻辑提前到 M1。
- 拆分 T0308、T0406、T0501、T0502 与 T0601 的过大职责，补充金额、成就、最佳成绩、生命周期、H5、PWA 与微信小程序验收任务。
- 补全推荐工程目录与 `domain` 平台隔离边界，并保留经验证的 `$400B` 多商品精确清零回归路径。

### Added

- 完成 Taro 4、React 18 与 TypeScript 5 的跨端工程初始化，建立 H5/PWA 与微信小程序双目标构建基础。
- 建立严格 TypeScript、ESLint、Prettier、Vitest 及统一质量检查脚本。
- 建立 `domain`、`storage`、`platform`、`pages` 等分层边界，并提供不依赖平台 API 的纯函数环境验证。
- 建立跨端 Storage 抽象，包含 H5 `localStorage`、Taro 异步 Storage 适配器、平台选择器及 M0 验证仓储。
- 增加 Storage 契约测试，覆盖缺失值、写入读取、JSON 数据、覆盖与删除行为。
- 增加 M0 技术验证页面，用于展示当前平台、领域层计算结果与 Storage 验证结果。
- 集成 PWA manifest、应用图标、Service Worker 注册、应用壳预缓存与导航回退。
- 增加 H5/PWA 构建产物检查脚本，验证 manifest、Service Worker、注册代码与关键预缓存资源。
- 增加本地原创 PWA 图标，并建立素材授权记录入口。
- 补充项目启动、质量检查、双端构建、目录边界与 M0 验证说明。

### Changed

- M0 验证环境使用 Node.js 24.12.0；项目锁定 pnpm 10.27.0、Taro 4.2.1、React 18.3.1、TypeScript 5.4.5、Vitest 3.2.4、Vite 4.5.14、ESLint 8.57.1 与 Prettier 3.9.6。
- 将 H5 与微信小程序的领域规则、数据来源和持久化调用边界统一到共享代码层。
- 同步工程架构与任务文档，将 M0 的 T0001 至 T0007 标记为完成。

### Verified

- 通过 TypeScript 类型检查、单元测试、Lint 与格式检查。
- 通过 H5/PWA 生产构建及构建产物自动检查。
- 通过微信小程序生产构建。
- 通过 H5 开发环境浏览器冒烟验证。

### Known limitations

- 微信开发者工具 CLI 服务端口尚未启用，因此尚未完成开发者工具和真机运行验证；相关验收保留到后续跨端验证任务。
- PWA 安装提示与真实断网后的浏览器重载尚未完成手工验证；当前仅完成构建产物和开发环境验证。
- Taro 依赖链仍会输出 Sass legacy JavaScript API 警告；ESLint 8 由 Taro 当前 peer dependency 约束保留。
- `skipLibCheck` 当前用于规避 Taro 第三方类型声明问题，不改变项目自身 TypeScript 严格检查要求。
- M1 及后续正式游戏功能尚未开始实现。
