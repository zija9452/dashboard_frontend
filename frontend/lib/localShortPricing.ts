/**
 * FOR TESTING ONLY - NOT THE FINAL SOURCE. Same pattern as localTshirtPricing.ts:
 * hardcoded here temporarily, used only by the Quotation page, so it doesn't touch
 * the DB and doesn't affect Customer Invoice (which reads prices from the DB
 * independently).
 *
 * This must move to the DB later: enter these same numbers for real via the
 * /ideal-pricing page (Short category), then remove the override call in
 * app/(invoices)/quotation/page.tsx (search "LOCAL_SHORT_PRICING") so Quotation
 * reads from the DB like every other category.
 */

export const LOCAL_SHORT_CATEGORY_NAME = 'Short';

// Base dimension is Pocket (No = without pocket, Yes = with pocket). Bulk (5+) rate
// is the same as the 1-piece rate - no bulk discount defined yet.
export const LOCAL_SHORT_IDEAL_PRICES: Record<string, Record<string, number>> = {
  'No': { '1': 550, '5': 550 },
  'Yes': { '1': 600, '5': 600 },
};

export const LOCAL_SHORT_MODIFIERS: Record<string, Record<string, { type: 'flat' | 'multiply'; value: number }>> = {
  'Fabric': {
    'Polyzone 130gsm': { type: 'flat', value: 0 },
    'Polyzone 160gsm': { type: 'flat', value: 100 },
    'Light Mesh': { type: 'flat', value: 100 },
    'Dye Fabric': { type: 'flat', value: -70 },
  },
  'Size Type': {
    'Adult': { type: 'flat', value: 0 },
    'Youth': { type: 'flat', value: -50 },
    'Oversize': { type: 'flat', value: 300 },
    'Oversize+': { type: 'multiply', value: 2 },
  },
};
