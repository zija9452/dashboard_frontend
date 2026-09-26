/**
 * FOR TESTING ONLY - NOT THE FINAL SOURCE. These T-shirt ideal-price + rush numbers
 * are hardcoded here temporarily, used only by the Quotation page, so they don't
 * touch the DB and don't affect Customer Invoice (which reads prices from the DB
 * independently).
 *
 * This must move to the DB later: enter these same numbers for real via the
 * /ideal-pricing page (T-shirt category) and the Rush Order Rule box, then remove
 * the override calls in app/(invoices)/quotation/page.tsx (search
 * "LOCAL_TSHIRT_PRICING" / "LOCAL_RUSH_PRICING") so Quotation reads from the DB
 * like every other category.
 */

export const LOCAL_TSHIRT_CATEGORY_NAME = 'T-shirt';

export const LOCAL_TSHIRT_IDEAL_PRICES: Record<string, Record<string, number>> = {
  'Round Neck': { '1': 950, '5': 950 },
  'V-Neck': { '1': 950, '5': 950 },
  'Polo': { '1': 1000, '5': 1000 },
  'V-Neck Polo': { '1': 1000, '5': 1000 },
  'Sherwani Collar': { '1': 1000, '5': 1000 },
  'V-Neck Sherwani Collar': { '1': 1000, '5': 1000 },
  'Bent Neck': { '1': 1000, '5': 1000 },
  'Indian Neck': { '1': 1100, '5': 1100 },
};

export const LOCAL_TSHIRT_MODIFIERS: Record<string, Record<string, { type: 'flat' | 'multiply'; value: number }>> = {
  'Sleeves': {
    'Half': { type: 'flat', value: 0 },
    'Full': { type: 'flat', value: 50 },
  },
  'Fabric': {
    'Polyzone 130gsm': { type: 'flat', value: 0 },
    'Polyzone 160gsm': { type: 'flat', value: 100 },
    'Light Mesh': { type: 'flat', value: 100 },
    'Dye Fabric': { type: 'flat', value: -350 },
  },
  'Size Type': {
    'Adult': { type: 'flat', value: 0 },
    'Youth': { type: 'flat', value: -50 },
    'Oversize': { type: 'flat', value: 300 },
    'Oversize+': { type: 'multiply', value: 2 },
  },
  'Rib': {
    'Yes': { type: 'flat', value: 70 },
    'No': { type: 'flat', value: 0 },
  },
  'Zip': {
    'Yes': { type: 'flat', value: 100 },
    'No': { type: 'flat', value: 0 },
  },
  'Collar and Tukdi (Indian Neck)': {
    'Yes': { type: 'flat', value: 50 },
    'No': { type: 'flat', value: 0 },
  },
};

export const LOCAL_RUSH_PRICING = {
  price_per_piece: 300,
  threshold_days: 3,
};
