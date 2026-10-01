/**
 * Quantity-tier pricing + designing/mockup charge, shared by Quotation and Customer
 * Invoice so both pages price the same order the same way.
 *
 * - The rate tier comes from ALL pieces of the same main category in the order (all
 *   T-shirts together, Shorts counted separately), not from one line's quantity.
 * - When pieces are added/removed, auto-priced lines move to the new tier by
 *   themselves. A rate the staff typed (manual) never changes by itself.
 * - A category with only 1-4 pcs gets one mockup charge (once per category, not per
 *   piece). The amount is the category's own customer_categories.mockup_charge.
 */

export interface SubCategoryOption {
  sub_category: string;
  options: string[];
  is_modifier?: boolean; // true = a price adjustment dimension (Sleeves, Size Type...), not part of the base combination
  is_optional?: boolean; // true = hidden by default, shown via the "+" more-options toggle
}

export interface ModifierValue {
  type: 'flat' | 'multiply';
  value: number;
}

export interface CustomerCategoryGrouped {
  id: string;
  main_category: string;
  sub_categories: SubCategoryOption[];
  ideal_prices?: Record<string, Record<string, number>>;
  modifiers?: Record<string, Record<string, ModifierValue>>;
  mockup_charge?: number | null; // this category's mockup charge (Ideal Pricing page); null or 0 = no mockup
}

// The mockup charge a category starts with, set per category on the Ideal Pricing page
// (e.g. T-shirt 500, Jacket 1000). Not set (or 0) = this category gets no mockup charge.
export const categoryMockupDefault = (categories: CustomerCategoryGrouped[], category: string): number =>
  Number(categories.find(c => c.main_category === category)?.mockup_charge ?? 0);

// Quantity tiers, keyed by min_qty in ideal_prices: 1-4 pcs, 5-15, 16-99, 100+.
export const PRICE_TIERS = [
  { minQty: 1, label: 'Single piece rate (1-4 pcs)' },
  { minQty: 5, label: 'Qty rate (5-15 pcs)' },
  { minQty: 16, label: 'Qty rate (16-99 pcs)' },
  { minQty: 100, label: 'Qty rate (100+ pcs)' },
];

// 1-4 pcs = single piece tier, which is also where the mockup charge applies.
export const MOCKUP_MAX_PIECES = PRICE_TIERS[1].minQty - 1;

export const tierForQuantity = (quantity: number) =>
  [...PRICE_TIERS].reverse().find(t => quantity >= t.minQty) ?? PRICE_TIERS[0];

export const isQtyTier = (pieces: number) => pieces >= PRICE_TIERS[1].minQty;

// The next tier up and how many more pieces reach it, or null at the top tier.
export const nextTierFor = (pieces: number) => {
  const next = PRICE_TIERS.find(t => t.minQty > pieces);
  return next ? { need: next.minQty - pieces, minQty: next.minQty, label: next.label } : null;
};

// Looks up the price for the selected options at the tier `tierPieces` falls in.
// "Base" sub-categories (not is_modifier) form the priced combination; "modifier"
// sub-categories (Sleeves, Size Type...) are applied on top:
// final = (base + sum of flat adjustments) × product of multiply adjustments.
// Returns null until every required option is selected, or when that exact tier has
// no price (no fallback to another tier - staff enter the rate manually).
export function lookupIdealPrice(
  categoryData: CustomerCategoryGrouped | undefined,
  fields: Record<string, string>,
  tierPieces: number | ''
): number | null {
  if (!categoryData?.ideal_prices) return null;
  if (tierPieces === '' || tierPieces <= 0) return null;

  // Optional sub-categories (Rib, Zip...) don't block the price.
  const allSelected = categoryData.sub_categories
    .filter(sc => !sc.is_optional)
    .every(sc => !!fields[sc.sub_category]);
  if (!allSelected) return null;

  const baseSubCats = categoryData.sub_categories.filter(sc => !sc.is_modifier);
  const modifierSubCats = categoryData.sub_categories.filter(sc => sc.is_modifier);

  const combinationKey = baseSubCats.map(sc => fields[sc.sub_category]).join('|');
  const tiers = categoryData.ideal_prices[combinationKey];
  if (!tiers) return null;

  const basePrice = tiers[String(tierForQuantity(tierPieces).minQty)];
  if (basePrice === undefined) return null;

  let flatSum = 0;
  let multiplyProduct = 1;
  for (const sc of modifierSubCats) {
    const modifier = categoryData.modifiers?.[sc.sub_category]?.[fields[sc.sub_category]];
    if (!modifier) continue;
    if (modifier.type === 'multiply') multiplyProduct *= modifier.value;
    else flatSum += modifier.value;
  }

  return (basePrice + flatSum) * multiplyProduct;
}

// The pricing-related fields every cart line carries (each page adds its own extras).
export interface PricedLine {
  id: string;
  category: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  category_fields?: Record<string, string>;
  autoPriced: boolean;               // rate came from the price list (false = typed by staff, never re-priced)
  previousUnitPrice?: number | null; // shown struck out - only right after the rate went DOWN
  rateChange?: 'down' | 'up' | null; // direction of the last automatic change, for the tag under the rate
  missingTierPrice?: boolean;        // the category's tier has no price for this line - staff must enter it
}

export const piecesOfCategory = (items: PricedLine[], category: string) =>
  items.filter(i => i.category === category).reduce((sum, i) => sum + i.quantity, 0);

export const categoriesIn = (items: PricedLine[]) => Array.from(new Set(items.map(i => i.category)));

// Re-prices every auto-priced line from its category's total pieces. Returns the new
// lines plus, per category, whether rates went down or up (for the toast).
export function repriceCart<T extends PricedLine>(
  items: T[],
  categories: CustomerCategoryGrouped[]
): { items: T[]; changed: Map<string, 'down' | 'up'> } {
  const changed = new Map<string, 'down' | 'up'>();
  const out = items.map(item => {
    if (!item.autoPriced) return { ...item, previousUnitPrice: null, rateChange: null, missingTierPrice: false };
    const categoryData = categories.find(c => c.main_category === item.category);
    const price = lookupIdealPrice(categoryData, item.category_fields || {}, piecesOfCategory(items, item.category));
    if (price === null) {
      // Keep the current rate but flag it: this tier has no price in the list.
      return { ...item, previousUnitPrice: null, rateChange: null, missingTierPrice: true };
    }
    if (price === item.unitPrice) {
      return { ...item, previousUnitPrice: null, rateChange: null, missingTierPrice: false };
    }
    const direction = price < item.unitPrice ? 'down' : 'up';
    changed.set(item.category, direction);
    return {
      ...item,
      previousUnitPrice: direction === 'down' ? item.unitPrice : null,
      rateChange: direction,
      unitPrice: price,
      totalPrice: price * item.quantity,
      missingTierPrice: false,
    };
  });
  return { items: out, changed };
}

export const needsMockup = (items: PricedLine[], category: string) => {
  const pieces = piecesOfCategory(items, category);
  return pieces > 0 && pieces <= MOCKUP_MAX_PIECES;
};

export interface MockupLine {
  category: string;
  pieces: number;
  amount: number;
}

// One mockup charge per category with 1-4 pcs, skipping categories whose own charge is
// 0. `amounts` holds per-order edits; a category without an edit gets `defaultFor`.
export function mockupLines(
  items: PricedLine[],
  amounts: Record<string, number>,
  defaultFor: (category: string) => number
): MockupLine[] {
  return categoriesIn(items)
    .filter(c => needsMockup(items, c) && defaultFor(c) > 0)
    .map(c => ({ category: c, pieces: piecesOfCategory(items, c), amount: amounts[c] ?? defaultFor(c) }));
}

// For the card above the cart: what each item in the cart would cost per piece at the
// next tier - the full rate for the options the user picked (base + modifiers), the same
// rate the cart line would get after reaching that tier.
export interface NextTierRate {
  variant: string;   // options that differ between the category's items (e.g. "Full"), '' if only one item kind
  nextRate: number;
  currentRate: number | null; // the item's rate now
}

export interface CategoryTierSummary {
  category: string;
  pieces: number;
  tierLabel: string;
  isQty: boolean;
  mockupAmount: number | null; // null = no mockup for this category
  next: { need: number; label: string; rates: NextTierRate[]; tierPriceMissing: boolean } | null;
}

export function categoryTierSummaries(
  items: PricedLine[],
  categories: CustomerCategoryGrouped[],
  mockupAmountFor: (category: string) => number,
  hasMockupCharge: (category: string) => boolean
): CategoryTierSummary[] {
  return categoriesIn(items).map(category => {
    const pieces = piecesOfCategory(items, category);
    const next = nextTierFor(pieces);
    let nextInfo: CategoryTierSummary['next'] = null;
    if (next) {
      const categoryData = categories.find(c => c.main_category === category);
      const autoLines = items.filter(i => i.category === category && i.autoPriced);
      // Name items by the options that differ between them (e.g. Half / Full).
      const keys = categoryData ? categoryData.sub_categories.map(sc => sc.sub_category) : [];
      const differing = keys.filter(k => new Set(autoLines.map(i => i.category_fields?.[k] || '')).size > 1);
      const seen = new Set<string>();
      const rates: NextTierRate[] = [];
      let tierPriceMissing = false;
      for (const line of autoLines) {
        // Same lookup the cart uses, at the next tier's piece count.
        const nextRate = lookupIdealPrice(categoryData, line.category_fields || {}, next.minQty);
        if (nextRate === null) { tierPriceMissing = true; continue; }
        // A bare "Yes"/"No" means nothing on its own, so those get their sub-category
        // name ("Panel: Yes"); other options read fine alone ("Full", "Oversize+").
        const variant = differing
          .filter(k => line.category_fields?.[k])
          .map(k => /^(yes|no)$/i.test(line.category_fields![k]) ? `${k}: ${line.category_fields![k]}` : line.category_fields![k])
          .join(' · ');
        const key = `${variant}|${nextRate}|${line.unitPrice}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rates.push({ variant, nextRate, currentRate: line.unitPrice });
      }
      nextInfo = { need: next.need, label: next.label, rates, tierPriceMissing };
    }
    return {
      category,
      pieces,
      tierLabel: tierForQuantity(pieces).label,
      isQty: isQtyTier(pieces),
      mockupAmount: needsMockup(items, category) && hasMockupCharge(category) ? mockupAmountFor(category) : null,
      next: nextInfo,
    };
  });
}
