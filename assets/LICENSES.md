# Asset register

> Status: Active  
> Register version: 1.0  
> Date: 2026-08-20

## Registry fields

Every shipped visual records: stable asset ID/path, product association where applicable, creator/source, license, format, modification notes, and whether attribution is required.

## Registered assets

| Asset                                               | Association                | Creator/source           | License                                              | Format                    | Modification notes                                                        | Attribution |
| --------------------------------------------------- | -------------------------- | ------------------------ | ---------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------- | ----------- |
| `src/static/pwa-icon.svg` / `pwa-icon-maskable.svg` | PWA application icons      | Spend_Musk_Money project | Project-original / repository distribution permitted | SVG                       | M5 formalized the product mark and added a maskable safe-zone variant     | No          |
| `product-mark:*` in `src/ui/product-visuals.ts`     | All 45 catalog product IDs | Spend_Musk_Money project | Project-original / repository distribution permitted | Code-native text/CSS mark | M5 original two-character marks rendered with the shared category palette | No          |
| Category palette in `src/pages/index/index.scss`    | 10 catalog categories      | Spend_Musk_Money project | Project-original / repository distribution permitted | CSS                       | Original flat-color presentation                                          | No          |

`PRODUCT_VISUAL_ASSETS` is the machine-readable source of truth for all 45 product marks. Automated validation requires one unique registered mark for every formal product ID and rejects missing or unknown associations.

## Acceptance checklist

- No real-person photograph, corporate logo, reference-game image, hotlink, or unclear third-party asset.
- Every formal product has one stable registered code-native mark.
- Product visuals remain decorative; the adjacent localized product name carries meaning for assistive technology.
- No product bitmap is shipped, so product imagery adds no raster payload or lazy-loading requirement.
- PWA icon and code-native marks compile into H5/PWA; product marks remain part of the same WEAPP component tree.
