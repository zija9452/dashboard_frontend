/**
 * FOR TESTING ONLY - NOT THE FINAL SOURCE. Same pattern as localJacketPricing.ts etc:
 * hardcoded here temporarily, used only by the Quotation page, so it doesn't touch the
 * DB and doesn't affect Customer Invoice (which reads prices from the DB independently).
 *
 * This must move to the DB later: enter these same numbers for real via the
 * /ideal-pricing page (Sando category), then remove the override call in
 * app/(invoices)/quotation/page.tsx (search "LOCAL_SANDO_PRICING") so Quotation reads
 * from the DB like every other category.
 *
 * INCOMPLETE - still pending from the user: Polyzone 160gsm price, Dye Fabric price,
 * Rib = Yes adjustment, Youth adjustment. Until given, selecting those options won't
 * auto-fill a Rate (Fabric gap) or will silently add 0 (Rib/Youth gap, since an
 * undefined modifier is skipped) - staff must type the Rate manually for those.
 */

export const LOCAL_SANDO_CATEGORY_NAME = 'Sando';

// Base dimension is "Fabric" (matches the DB sub_category name for Sando). Bulk (5+)
// rate is the same as the 1-piece rate - no bulk discount defined yet.
// Polyzone 160gsm and Dye Fabric are intentionally omitted - price not given yet.
export const LOCAL_SANDO_IDEAL_PRICES: Record<string, Record<string, number>> = {
  'Polyzone 130gsm': { '1': 750, '5': 750 },
  'Light Mesh': { '1': 800, '5': 800 },
};

// Rib 'Yes' and Size Type 'Youth' are intentionally omitted - adjustment not given yet.
export const LOCAL_SANDO_MODIFIERS: Record<string, Record<string, { type: 'flat' | 'multiply'; value: number }>> = {
  'Rib': {
    'No': { type: 'flat', value: 0 },
  },
  'Size Type': {
    'Adult': { type: 'flat', value: 0 },
    'Oversize': { type: 'flat', value: 300 },
    'Oversize+': { type: 'multiply', value: 2 },
  },
};
