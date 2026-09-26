/**
 * FOR TESTING ONLY - NOT THE FINAL SOURCE. Same pattern as localTshirtPricing.ts /
 * localShortPricing.ts / localTrouserPricing.ts: hardcoded here temporarily, used only
 * by the Quotation page, so it doesn't touch the DB and doesn't affect Customer Invoice
 * (which reads prices from the DB independently).
 *
 * This must move to the DB later: enter these same numbers for real via the
 * /ideal-pricing page (Jacket category), then remove the override call in
 * app/(invoices)/quotation/page.tsx (search "LOCAL_JACKET_PRICING") so Quotation reads
 * from the DB like every other category.
 */

export const LOCAL_JACKET_CATEGORY_NAME = 'Jacket';

// Base dimension is "Fabric" (matches the DB sub_category name/options for Jacket).
// Bulk (5+) rate is the same as the 1-piece rate - no bulk discount defined yet.
export const LOCAL_JACKET_IDEAL_PRICES: Record<string, Record<string, number>> = {
  'Dye Light Speedo': { '1': 1600, '5': 1600 },
  'Light Speedo': { '1': 2050, '5': 2050 },
  'Speedo 280gsm': { '1': 2150, '5': 2150 },
};

export const LOCAL_JACKET_MODIFIERS: Record<string, Record<string, { type: 'flat' | 'multiply'; value: number }>> = {
  'Zip': {
    'Yes': { type: 'flat', value: 0 },
    'No': { type: 'flat', value: 0 },
  },
  'Rib': {
    'Yes': { type: 'flat', value: 0 },
    'No': { type: 'flat', value: 0 },
  },
  'Pocket': {
    'Yes': { type: 'flat', value: 0 },
    'No': { type: 'flat', value: 0 },
  },
  'Size Type': {
    'Adult': { type: 'flat', value: 0 },
    'Youth': { type: 'flat', value: 0 },
    'Oversize': { type: 'flat', value: 300 },
    'Oversize+': { type: 'multiply', value: 2 },
  },
};
