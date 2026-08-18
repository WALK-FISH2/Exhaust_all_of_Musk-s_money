import type { CategoryDefinition } from '../domain/catalog'

export const CATEGORIES = [
  {
    id: 'everyday',
    nameKey: 'category.everyday',
    nameZh: '日常小物',
    nameEn: 'Everyday',
  },
  { id: 'food', nameKey: 'category.food', nameZh: '吃喝自由', nameEn: 'Food & Drink' },
  { id: 'tech', nameKey: 'category.tech', nameZh: '数码科技', nameEn: 'Tech' },
  { id: 'vehicles', nameKey: 'category.vehicles', nameZh: '车库扩建', nameEn: 'Vehicles' },
  {
    id: 'homes',
    nameKey: 'category.homes',
    nameZh: '房产地图',
    nameEn: 'Homes & Real Estate',
  },
  { id: 'luxury', nameKey: 'category.luxury', nameZh: '奢侈一下', nameEn: 'Luxury' },
  {
    id: 'travel',
    nameKey: 'category.travel',
    nameZh: '世界走走',
    nameEn: 'Travel & Experiences',
  },
  {
    id: 'sports',
    nameKey: 'category.sports',
    nameZh: '体育娱乐',
    nameEn: 'Sports & Entertainment',
  },
  {
    id: 'business',
    nameKey: 'category.business',
    nameZh: '公司基建',
    nameEn: 'Companies & Infrastructure',
  },
  {
    id: 'space',
    nameKey: 'category.space',
    nameZh: '太空与脑洞',
    nameEn: 'Space & Wild Ideas',
  },
] as const satisfies readonly CategoryDefinition[]

export const CATEGORY_IDS: ReadonlySet<string> = new Set(CATEGORIES.map((category) => category.id))
