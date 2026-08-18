# Asset & Identity Policy

> Status: Active engineering/product safeguard  
> Version: 1.0  
> Date: 2026-08-17

## 1. Goal

Keep the project visually original and maintain enough provenance to ship Web and WeChat builds responsibly.

## 2. Allowed asset sources

- project-original artwork;
- artwork generated specifically for the project under terms permitting intended use;
- public-domain assets;
- permissively licensed assets where license terms are satisfied;
- purchased/licensed asset packs with compatible distribution rights.

## 3. Avoid by default

- scraped images from the reference game;
- hotlinked third-party images;
- celebrity press photographs without an appropriate license;
- company logos as product-card art;
- copyrighted game/cartoon characters;
- copied screenshots used as production UI;
- stock images with unclear redistribution rights.

## 4. Musk identity treatment

Because the title names Elon Musk, the UI must not imply official association. Prefer an original thematic treatment rather than a copied photograph or corporate branding.

Required nearby/about-page disclaimer concept:

> 本作品为非官方娱乐模拟游戏，与埃隆·马斯克本人及其相关公司无隶属、赞助或背书关系。游戏中的资产与商品价格为玩法设定，不代表实时财务数据或真实报价。

Final legal copy can be reviewed separately before public launch.

## 5. Asset register

For each non-original asset, record:

| Field              | Required      |
| ------------------ | ------------- |
| asset path         | yes           |
| source/creator     | yes           |
| license            | yes           |
| source reference   | yes           |
| modification notes | if modified   |
| attribution text   | when required |

A future `assets/LICENSES.md` or machine-readable registry may implement this.

## 6. Reference-site rule

Reference screenshots may be kept privately for design analysis, but production assets and source code must not depend on them.
