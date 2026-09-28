/**
 * FOR TESTING ONLY - NOT THE FINAL SOURCE. Same pattern as localJacketPricing.ts etc:
 * hardcoded here temporarily, used only by the Quotation page, so it doesn't touch the
 * DB and doesn't affect Customer Invoice (which reads prices from the DB independently).
 *
 * This must move to the DB later: enter these same numbers for real via the
 * /ideal-pricing page (Hoodie Jacket category), then remove the override call in
 * app/(invoices)/quotation/page.tsx (search "LOCAL_HOODIE_JACKET_PRICING") so Quotation
 * reads from the DB like every other category.
 */

export const LOCAL_HOODIE_JACKET_CATEGORY_NAME = 'Hoodie Jacket';

// Base dimension is "Fabric" (matches the DB sub_category name/options for Hoodie Jacket).
// Tier keys (min qty): '1' = 1-4 pcs, '5' = 5-15, '16' = 16-99, '100' = 100+.
// Only '1' is set for now - '5', '16' and '100' are empty, so 5+ pcs gives no rate (Rate stays empty).
export const LOCAL_HOODIE_JACKET_IDEAL_PRICES: Record<string, Record<string, number>> = {
  'Dye Light Speedo': { '1': 1610 },
  'Light Speedo': { '1': 2800 },
  'Speedo 280gsm': { '1': 3200 },
};

export const LOCAL_HOODIE_JACKET_MODIFIERS: Record<string, Record<string, { type: 'flat' | 'multiply'; value: number }>> = {
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
  'Pipin': {
    'Yes': { type: 'flat', value: 100 },
    'No': { type: 'flat', value: 0 },
  },
  'Size Type': {
    'Adult': { type: 'flat', value: 0 },
    'Youth': { type: 'flat', value: 0 },
    'Oversize': { type: 'flat', value: 300 },
    'Oversize+': { type: 'multiply', value: 2 },
  },
};
