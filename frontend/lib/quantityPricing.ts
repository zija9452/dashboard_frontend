/**
 * Quantity-tier pricing + designing/mockup charge, shared by Quotation and Customer
 * Invoice so both pages price the same order the same way.
 *
 * - The rate tier comes from ALL pieces of the same main category in the order (all
 *   T-shirts together, Shorts counted separately), not from one line's quantity.
 * - Teams (Quotation page): every count - rate tier, dye, mockup - is per team. Two
 *   teams with 8 jerseys each are two 5-15 tiers, not one 16-99 tier. Lines without a
 *   team (Customer Invoice page) are all one team, so they price as before.
 * - When pieces are added/removed, auto-priced lines move to the new tier by
 *   themselves. A rate the staff typed (manual) never changes by itself.
 * - A category with only 1-4 pcs gets one mockup charge (once per category, not per
 *   piece). The amount is the category's own customer_categories.mockup_charge.
 * - Dye lines (an option ticked "Dye" on the Customer Category page) get no mockup
 *   charge; their rate is raised instead, by the dye pieces of the category: 1-4 pcs =
 *   dye_rate_single (default x2), 5-15 = dye_rate_qty (x1.5), 16+ = normal. Both rates
 *   are set per category on the Ideal Pricing page (see dyeMultiplier).
 * - Kit (see kitFlatDefault): for a team that is one of our ready articles, its Jersey /
 *   Short share ONE kit flat (the first one added pays it, the other 0), and its Trouser
 *   is 0 when the team's Jersey is in the order. Still only at 1-4 pcs.
 */

import type { DtfBlock } from './dtfLayout';

export interface SubCategoryOption {
  sub_category: string;
  options: string[];
  is_modifier?: boolean; // true = a price adjustment dimension (Sleeves, Size Type...), not part of the base combination
  is_optional?: boolean; // true = hidden by default, shown via the "+" more-options toggle
  dye_options?: string[]; // options ticked "Dye" (e.g. Dye Fabric) - see isDyeLine
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
  dtf_enabled?: boolean;         // true = the optional DTF logos box shows for this category (Hoodie, Jacket)
  dye_rate_single?: number;      // dye rate multiplier at 1-4 dye pcs (default 2)
  dye_rate_qty?: number;         // dye rate multiplier at 5-15 dye pcs (default 1.5)
  kit_role?: KitRole | null;     // Jersey / Short once it has an Our article MOQ (Ideal Pricing page)
  kit_flat_charge?: number | null; // Our article MOQ (Jersey / Short); null = its normal MOQ
}

export type KitRole = 'jersey' | 'short' | 'trouser';
export const KIT_LABEL: Record<KitRole, string> = { jersey: 'Jersey', short: 'Short', trouser: 'Trouser' };

// One of our ready articles: products grouped by team without size (GET /ready-articles),
// with the kit kinds we have for it.
export interface ReadyArticle {
  name: string;
  kinds: KitRole[];
}

export const findArticle = (articles: ReadyArticle[], team: string) => {
  const name = team.trim().toLowerCase();
  return name ? articles.find(a => a.name.toLowerCase() === name) ?? null : null;
};

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

// A line is dye when a selected option is ticked "Dye" on the Customer Category page.
export const isDyeLine = (categoryData: CustomerCategoryGrouped | undefined, fields?: Record<string, string>) =>
  !!categoryData && !!fields &&
  categoryData.sub_categories.some(sc => !!fields[sc.sub_category] && (sc.dye_options || []).includes(fields[sc.sub_category]));

// Dye rate multiplier from the category's dye pieces: 1-4 = dye_rate_single, 5-15 =
// dye_rate_qty, 16+ = x1.
export const dyeMultiplier = (categoryData: CustomerCategoryGrouped | undefined, dyePieces: number) =>
  dyePieces <= 0 ? 1
    : dyePieces <= MOCKUP_MAX_PIECES ? Number(categoryData?.dye_rate_single ?? 2)
    : dyePieces < PRICE_TIERS[2].minQty ? Number(categoryData?.dye_rate_qty ?? 1.5)
    : 1;

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
// Dye lines add (base + flat adjustments) x (dyeMultiplier - 1) on top, so the dye extra
// isn't multiplied again by Oversize+ (100 -> Oversize+ 200 -> dye 1-4 pcs 300).
export function lookupIdealPrice(
  categoryData: CustomerCategoryGrouped | undefined,
  fields: Record<string, string>,
  tierPieces: number | '',
  dyePieces: number = 0 // dye pieces of this category incl. this line (0 for non-dye)
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

  const dyeExtra = isDyeLine(categoryData, fields) ? (basePrice + flatSum) * (dyeMultiplier(categoryData, dyePieces) - 1) : 0;
  return (basePrice + flatSum) * multiplyProduct + dyeExtra;
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
  dtf?: DtfBlock | null;             // DTF logos + saved roll layout (Hoodie / Jacket) - see lib/dtfLayout.ts
  team?: string;                     // team this line belongs to (Quotation page); unset = the one team
}

export const teamOf = (line: PricedLine) => line.team ?? '';

// Edited mockup amounts are keyed by team + category; without a team it's just the
// category, as before.
export const mockupKey = (team: string, category: string) => (team ? `${team}|${category}` : category);

// Pieces of one category in one team ('' = lines without a team).
export const piecesOfCategory = (items: PricedLine[], category: string, team = '') =>
  items.filter(i => i.category === category && teamOf(i) === team).reduce((sum, i) => sum + i.quantity, 0);

export const categoriesIn = (items: PricedLine[]) => Array.from(new Set(items.map(i => i.category)));

export const teamsIn = (items: PricedLine[]) => Array.from(new Set(items.map(teamOf)));

const findCategory = (categories: CustomerCategoryGrouped[], category: string) =>
  categories.find(c => c.main_category === category);

// A category's part in a team kit of our articles: Trouser by its name (Rs. 0 with the
// team's Jersey), Jersey / Short once it has an Our article MOQ (Ideal Pricing page).
export const kitRoleOf = (c?: CustomerCategoryGrouped | null): KitRole | null =>
  !c ? null : /trouser/i.test(c.main_category) ? 'trouser'
    : c.kit_role === 'jersey' || c.kit_role === 'short' ? c.kit_role : null;

export const dyePiecesOfCategory = (items: PricedLine[], categories: CustomerCategoryGrouped[], category: string, team = '') => {
  const categoryData = findCategory(categories, category);
  return items
    .filter(i => i.category === category && teamOf(i) === team && isDyeLine(categoryData, i.category_fields))
    .reduce((sum, i) => sum + i.quantity, 0);
};

// Dye pieces for the line being entered in the form: dye already in the cart + this
// quantity, or 0 when the selected options aren't dye.
export const formDyePieces = (
  items: PricedLine[], categories: CustomerCategoryGrouped[], category: string,
  fields: Record<string, string>, quantity: number | '', team = ''
) =>
  isDyeLine(findCategory(categories, category), fields) && quantity !== ''
    ? dyePiecesOfCategory(items, categories, category, team) + quantity
    : 0;

// A cart line's dye multiplier right now (1 = not dye, or 16+ dye pcs).
export const lineDyeMultiplier = (items: PricedLine[], categories: CustomerCategoryGrouped[], line: PricedLine) => {
  const categoryData = findCategory(categories, line.category);
  return isDyeLine(categoryData, line.category_fields)
    ? dyeMultiplier(categoryData, dyePiecesOfCategory(items, categories, line.category, teamOf(line)))
    : 1;
};

// Re-prices every auto-priced line from its category's total pieces in its team. Returns
// the new lines plus, per mockupKey(team, category), whether rates went down or up.
export function repriceCart<T extends PricedLine>(
  items: T[],
  categories: CustomerCategoryGrouped[]
): { items: T[]; changed: Map<string, 'down' | 'up'> } {
  const changed = new Map<string, 'down' | 'up'>();
  const out = items.map(item => {
    if (!item.autoPriced) return { ...item, previousUnitPrice: null, rateChange: null, missingTierPrice: false };
    const categoryData = categories.find(c => c.main_category === item.category);
    const price = lookupIdealPrice(
      categoryData, item.category_fields || {},
      piecesOfCategory(items, item.category, teamOf(item)), dyePiecesOfCategory(items, categories, item.category, teamOf(item))
    );
    if (price === null) {
      // Keep the current rate but flag it: this tier has no price in the list.
      return { ...item, previousUnitPrice: null, rateChange: null, missingTierPrice: true };
    }
    if (price === item.unitPrice) {
      return { ...item, previousUnitPrice: null, rateChange: null, missingTierPrice: false };
    }
    const direction = price < item.unitPrice ? 'down' : 'up';
    changed.set(mockupKey(teamOf(item), item.category), direction);
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

// 1-4 pcs of the category in the team and at least one non-dye piece (dye pays x2 instead).
export const needsMockup = (items: PricedLine[], categories: CustomerCategoryGrouped[], category: string, team = '') => {
  const pieces = piecesOfCategory(items, category, team);
  return pieces > 0 && pieces <= MOCKUP_MAX_PIECES && pieces > dyePiecesOfCategory(items, categories, category, team);
};

// The flat (MOQ) charge a team + category starts with, and why. Only used where the
// category has a flat at all (1-4 pcs, not dye-only - see needsMockup).
// - Custom team, or a category that isn't in the team's kit: the category's own MOQ.
// - Our article's kit: its Jersey when we have it; its Short when we have the Short or the
//   Jersey; its Trouser when we have the Jersey (we have the design). The first kit
//   category added (cart order, with a MOQ) pays the Our article MOQ once, the rest 0 -
//   e.g. only a Trouser of a team whose Jersey we have still pays 300, not 500.
export interface FlatDefault {
  amount: number;
  reason: string;
  kitPayer: boolean; // pays the kit flat for the team's whole kit
}

// Is this kit part in the team's kit? (see kitFlatDefault)
const inKit = (article: ReadyArticle, role: KitRole) =>
  article.kinds.includes(role) || (role !== 'jersey' && article.kinds.includes('jersey'));

export function kitFlatDefault(
  items: PricedLine[],
  categories: CustomerCategoryGrouped[],
  articles: ReadyArticle[],
  category: string,
  team: string
): FlatDefault {
  const categoryData = findCategory(categories, category);
  const own = Number(categoryData?.mockup_charge ?? 0);
  const role = kitRoleOf(categoryData);
  const article = findArticle(articles, team);
  const normal = (reason: string): FlatDefault => ({ amount: own, reason, kitPayer: false });
  if (!article || !role) return normal('MOQ charges (1-4 pcs)');
  if (role === 'trouser' && !article.kinds.includes('jersey')) return normal(`We don't have a ${team} Jersey - normal MOQ`);
  if (!inKit(article, role)) return normal(`We don't have a ${team} ${KIT_LABEL[role]} - normal MOQ`);

  // The first kit category of this team added (cart order) that has a MOQ pays it.
  const payer = categoriesIn(items.filter(i => teamOf(i) === team)).find(c => {
    const r = kitRoleOf(findCategory(categories, c));
    return r !== null && inKit(article, r) && needsMockup(items, categories, c, team);
  });
  if (payer && payer !== category) {
    const payerRole = kitRoleOf(findCategory(categories, payer)) as KitRole;
    return { amount: 0, reason: `Kit: ${team} ${KIT_LABEL[payerRole]} already pays the Our article MOQ`, kitPayer: false };
  }
  // A Trouser has no Our article MOQ of its own - it pays the Jersey's.
  const jerseyKit = categories.find(c => kitRoleOf(c) === 'jersey')?.kit_flat_charge;
  return {
    amount: Number(categoryData?.kit_flat_charge ?? jerseyKit ?? own),
    reason: `Our article MOQ - ${team} (rest of the kit Rs. 0)`,
    kitPayer: true,
  };
}

export interface MockupLine {
  team: string;     // '' = lines without a team
  category: string;
  key: string;      // mockupKey(team, category) - the key in `amounts`
  pieces: number;
  amount: number;
}

// One mockup charge per team and category with 1-4 pcs (not dye-only), skipping the ones
// whose default is 0 (no flat for the category, or a kit line that's free) - those
// aren't shown at all. `amounts` holds per-order edits by mockupKey; one without an
// edit gets `defaultFor` (worked out from `items`, so kit defaults follow the cart).
export function mockupLines(
  items: PricedLine[],
  categories: CustomerCategoryGrouped[],
  amounts: Record<string, number>,
  defaultFor: (category: string, team: string, items: PricedLine[]) => number
): MockupLine[] {
  return teamsIn(items).flatMap(team => {
    const teamLines = items.filter(i => teamOf(i) === team);
    return categoriesIn(teamLines)
      .filter(c => needsMockup(items, categories, c, team) && defaultFor(c, team, items) > 0)
      .map(c => {
        const key = mockupKey(team, c);
        return { team, category: c, key, pieces: piecesOfCategory(items, c, team), amount: amounts[key] ?? defaultFor(c, team, items) };
      });
  });
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
  dyePieces: number;
  dyeMultiplier: number;       // dye_rate_single / dye_rate_qty / 1 - see dyeMultiplier
  next: { need: number; label: string; rates: NextTierRate[]; tierPriceMissing: boolean } | null;
}

// One summary per category of one team ('' = lines without a team).
export function categoryTierSummaries(
  allItems: PricedLine[],
  categories: CustomerCategoryGrouped[],
  mockupAmountFor: (category: string) => number,
  hasMockupCharge: (category: string) => boolean,
  team = ''
): CategoryTierSummary[] {
  const items = allItems.filter(i => teamOf(i) === team);
  return categoriesIn(items).map(category => {
    const pieces = piecesOfCategory(items, category, team);
    const dyePieces = dyePiecesOfCategory(items, categories, category, team);
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
        // Same lookup the cart uses, at the next tier's piece count. For a dye line the
        // added pieces are taken as more of the same dye item.
        const lineIsDye = isDyeLine(categoryData, line.category_fields);
        const nextRate = lookupIdealPrice(categoryData, line.category_fields || {}, next.minQty, lineIsDye ? dyePieces + next.need : 0);
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
      mockupAmount: needsMockup(items, categories, category, team) && hasMockupCharge(category) ? mockupAmountFor(category) : null,
      dyePieces,
      dyeMultiplier: dyeMultiplier(categories.find(c => c.main_category === category), dyePieces),
      next: nextInfo,
    };
  });
}
