/**
 * FOR TESTING ONLY - NOT THE FINAL SOURCE. Same pattern as localTshirtPricing.ts /
 * localShortPricing.ts: hardcoded here temporarily, used only by the Quotation page,
 * so it doesn't touch the DB and doesn't affect Customer Invoice (which reads prices
 * from the DB independently).
 *
 * This must move to the DB later: enter these same numbers for real via the
 * /ideal-pricing page (Trouser category), then remove the override call in
 * app/(invoices)/quotation/page.tsx (search "LOCAL_TROUSER_PRICING") so Quotation
 * reads from the DB like every other category.
 */

export const LOCAL_TROUSER_CATEGORY_NAME = 'Trouser';

// Base dimension is "Pocket with zip" (matches the DB sub_category name for Trouser).
// Bulk (5+) rate is the same as the 1-piece rate - no bulk discount defined yet.
export const LOCAL_TROUSER_IDEAL_PRICES: Record<string, Record<string, number>> = {
  'Yes': { '1': 850, '5': 850 },
  'No': { '1': 850, '5': 850 },
};

export const LOCAL_TROUSER_MODIFIERS: Record<string, Record<string, { type: 'flat' | 'multiply'; value: number }>> = {
  'Bottom Rib': {
    'Yes': { type: 'flat', value: 70 },
    'No': { type: 'flat', value: 0 },
  },
  'Pipin': {
    'Yes': { type: 'flat', value: 50 },
    'No': { type: 'flat', value: 0 },
  },
  'Fabric': {
    'Dye Fabric': { type: 'flat', value: 0 },
    'Light Mesh': { type: 'flat', value: -150 },
    'Speedo 200gsm': { type: 'flat', value: 200 },
  },
  'Size Type': {
    'Adult': { type: 'flat', value: 0 },
    'Youth': { type: 'flat', value: -100 },
    'Oversize': { type: 'flat', value: 300 },
    'Oversize+': { type: 'multiply', value: 2 },
  },
};
