import type { ProductDefinition } from '../domain/catalog'

export interface ProductVisualAsset {
  readonly productId: string
  readonly assetId: `product-mark:${string}`
  readonly symbol: string
  readonly format: 'code-native-mark'
  readonly creator: 'Spend_Musk_Money project'
  readonly license: 'Project-original / repository distribution permitted'
  readonly source: 'src/ui/product-visuals.ts'
  readonly attributionRequired: false
}

const PRODUCT_MARKS = [
  ['lucky-sticker', '贴纸'],
  ['bottled-water', '水瓶'],
  ['bus-ticket', '公交'],
  ['bubble-tea', '奶茶'],
  ['socks', '袜子'],
  ['umbrella', '雨伞'],
  ['movie-night', '电影'],
  ['hotpot', '火锅'],
  ['fine-dinner', '晚餐'],
  ['flagship-phone', '手机'],
  ['coffee-machine', '咖啡'],
  ['ebike', '电单'],
  ['gaming-pc', '游戏'],
  ['home-cinema', '影院'],
  ['family-car', '家车'],
  ['designer-watch', '名表'],
  ['around-world', '环球'],
  ['sports-car', '跑车'],
  ['city-apartment', '公寓'],
  ['armored-limo', '礼宾'],
  ['robot-lab', '机器'],
  ['giant-diamond', '巨钻'],
  ['polar-expedition', '极地'],
  ['sea-villa', '海墅'],
  ['stadium-season', '体育'],
  ['private-train', '列车'],
  ['private-jet', '飞机'],
  ['private-island', '小岛'],
  ['art-gallery', '艺馆'],
  ['esports-club', '电竞'],
  ['megayacht', '游艇'],
  ['moon-trip', '绕月'],
  ['factory', '工厂'],
  ['floating-hotel', '海店'],
  ['rocket-launch', '火箭'],
  ['skyscraper', '高楼'],
  ['solar-farm', '光伏'],
  ['theme-park', '乐园'],
  ['football-club', '足球'],
  ['smart-town', '智慧'],
  ['airline', '航空'],
  ['ocean-cleanup', '清海'],
  ['lunar-base', '月基'],
  ['mars-city', '火城'],
  ['orbital-ring-study', '轨环'],
] as const

export const PRODUCT_VISUAL_ASSETS: readonly ProductVisualAsset[] = PRODUCT_MARKS.map(
  ([productId, symbol]) => ({
    productId,
    assetId: `product-mark:${productId}`,
    symbol,
    format: 'code-native-mark',
    creator: 'Spend_Musk_Money project',
    license: 'Project-original / repository distribution permitted',
    source: 'src/ui/product-visuals.ts',
    attributionRequired: false,
  }),
)

const PRODUCT_VISUAL_BY_ID = new Map(PRODUCT_VISUAL_ASSETS.map((asset) => [asset.productId, asset]))

export function getProductVisualAsset(product: ProductDefinition): ProductVisualAsset {
  const asset = PRODUCT_VISUAL_BY_ID.get(product.id)
  if (asset === undefined) {
    throw new Error(`Missing product visual asset: ${product.id}`)
  }
  return asset
}
