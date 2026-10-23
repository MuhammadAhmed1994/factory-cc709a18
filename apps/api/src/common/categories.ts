export const CATEGORY_NAMES = ['food', 'transport', 'shopping', 'education', 'bills'] as const;
export type CategoryName = (typeof CATEGORY_NAMES)[number];