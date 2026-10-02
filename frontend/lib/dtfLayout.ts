/**
 * DTF logo printing, shared by Quotation and Customer Invoice (and the designer view on
 * the Invoice Details page).
 *
 * A Hoodie / Jacket line (customer category with dtf_enabled) can have DTF logos: the
 * width x height of each logo on ONE piece. Every print (logos x quantity) is placed on
 * a roll `roll_width_in` wide with `gap_in` between prints, and the roll length used is
 * charged in 0.5 m steps (price_per_half_meter each) with no tolerance: 0.5 m = 19.685",
 * anything longer is 1 m. The rule comes from the Ideal Pricing page (per branch).
 *
 * The layout worked out here is saved with the order and drawn again for the designer,
 * so the designer places the logos exactly the way the order was priced. The backend
 * (utils/dtf_charges.py) checks the saved layout - keep the two in step.
 */

export interface DtfSettings {
  price_per_half_meter: number;
  roll_width_in: number;
  gap_in: number;
}

export interface DtfLogo {
  w: number | ''; // inches, one piece
  h: number | '';
}

// One print on the roll: printed size (no gap), top-left corner in inches.
export interface DtfPlacement {
  x: number;
  y: number;
  w: number;
  h: number;
  logo: number;      // 1-based logo number
  rotated: boolean;  // turned 90° to save roll length
}

// What a line saves as item.dtf (same shape the backend validates).
export interface DtfBlock {
  logos: { w: number; h: number }[];
  roll_width_in: number;
  gap_in: number;
  price_per_half_meter: number;
  layout: DtfPlacement[];
  length_in: number;
  half_meters: number;
  charge: number;   // roll-length price
  amount: number;   // charged - editable per order like the mockup charge (0 = waived)
}

export const INCHES_PER_METER = 39.37;
export const HALF_METER_IN = INCHES_PER_METER / 2; // 19.685"
export const MAX_DTF_PRINTS = 5000;                // same cap as the backend

export const halfMetersFor = (lengthIn: number) => Math.max(1, Math.ceil(lengthIn / HALF_METER_IN - 1e-9));
export const metersLabel = (halfMeters: number) => `${halfMeters / 2} m`;
export const inches = (n: number) => `${Math.round(n * 100) / 100}"`;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

// Places every print on the roll, biggest first, as high up the roll as it fits
// (MaxRects, bottom-left rule, turned 90° when that fits better). The gap is added to
// each print and the roll is treated as gap wider, so the last print in a line needs
// no gap after it.
function packPrints(prints: { w: number; h: number; logo: number }[], settings: DtfSettings): DtfPlacement[] | null {
  const GAP = settings.gap_in;
  const W = settings.roll_width_in + GAP, H = 1e7, EPS = 1e-9;
  type Rect = { x: number; y: number; w: number; h: number };
  let free: Rect[] = [{ x: 0, y: 0, w: W, h: H }];
  const placed: DtfPlacement[] = [];
  const list = prints
    .map(p => ({ ...p, pw: p.w + GAP, ph: p.h + GAP }))
    .sort((a, b) => Math.max(b.pw, b.ph) - Math.max(a.pw, a.ph) || b.pw * b.ph - a.pw * a.ph);

  for (const it of list) {
    let best: (Rect & { rotated: boolean; s1: number; s2: number }) | null = null;
    const orients: [number, number, boolean][] = it.pw === it.ph ? [[it.pw, it.ph, false]] : [[it.pw, it.ph, false], [it.ph, it.pw, true]];
    for (const f of free) {
      for (const [w, h, rotated] of orients) {
        if (w > f.w + EPS || h > f.h + EPS) continue;
        const s1 = f.y + h, s2 = f.x;
        if (!best || s1 < best.s1 - EPS || (Math.abs(s1 - best.s1) <= EPS && s2 < best.s2)) best = { x: f.x, y: f.y, w, h, rotated, s1, s2 };
      }
    }
    if (!best) return null;
    const r: Rect = { x: best.x, y: best.y, w: best.w, h: best.h };
    placed.push({ x: r.x, y: r.y, w: r.w - GAP, h: r.h - GAP, logo: it.logo, rotated: best.rotated });

    // Split every free space the new print overlaps into the parts left around it.
    const next: Rect[] = [];
    for (const f of free) {
      if (r.x >= f.x + f.w - EPS || r.x + r.w <= f.x + EPS || r.y >= f.y + f.h - EPS || r.y + r.h <= f.y + EPS) { next.push(f); continue; }
      if (r.x > f.x + EPS) next.push({ x: f.x, y: f.y, w: r.x - f.x, h: f.h });
      if (r.x + r.w < f.x + f.w - EPS) next.push({ x: r.x + r.w, y: f.y, w: f.x + f.w - (r.x + r.w), h: f.h });
      if (r.y > f.y + EPS) next.push({ x: f.x, y: f.y, w: f.w, h: r.y - f.y });
      if (r.y + r.h < f.y + f.h - EPS) next.push({ x: f.x, y: r.y + r.h, w: f.w, h: f.y + f.h - (r.y + r.h) });
    }
    // Drop spaces that sit fully inside another one.
    free = next.filter((a, i) => !next.some((b, j) => j !== i &&
      a.x >= b.x - EPS && a.y >= b.y - EPS && a.x + a.w <= b.x + b.w + EPS && a.y + a.h <= b.y + b.h + EPS &&
      (j < i || a.x !== b.x || a.y !== b.y || a.w !== b.w || a.h !== b.h)));
  }
  return placed;
}

export type DtfResult =
  | { status: 'empty' }                                  // no logo filled in - line has no DTF
  | { status: 'error'; message: string; badRows: number[] }
  | { status: 'needs-quantity' }
  | { status: 'ok'; block: DtfBlock; prints: number };

// Works out the layout and charge for the logos of one line, for `quantity` pieces.
export function computeDtf(logos: DtfLogo[], quantity: number | '', settings: DtfSettings | null): DtfResult {
  const rows = logos.map((l, i) => ({ ...l, i })).filter(l => l.w !== '' || l.h !== '');
  if (rows.length === 0) return { status: 'empty' };
  if (!settings) return { status: 'error', message: 'DTF rates are not loaded - refresh the page.', badRows: [] };

  const missing = rows.filter(l => !(Number(l.w) > 0) || !(Number(l.h) > 0));
  if (missing.length) {
    return { status: 'error', message: `Enter width and height for ${missing.map(l => `Logo ${l.i + 1}`).join(', ')}.`, badRows: missing.map(l => l.i) };
  }
  const tooWide = rows.filter(l => Math.min(Number(l.w), Number(l.h)) > settings.roll_width_in);
  if (tooWide.length) {
    return {
      status: 'error',
      message: `${tooWide.map(l => `Logo ${l.i + 1} (${l.w}×${l.h}")`).join(', ')} is wider than the ${settings.roll_width_in}" roll even when turned.`,
      badRows: tooWide.map(l => l.i),
    };
  }
  if (quantity === '' || quantity <= 0) return { status: 'needs-quantity' };
  const count = rows.length * quantity;
  if (count > MAX_DTF_PRINTS) {
    return { status: 'error', message: `${count} prints is more than the ${MAX_DTF_PRINTS} allowed in one item - split the quantity into two items.`, badRows: [] };
  }

  // Logos are renumbered 1..n in the order they were filled in (empty rows dropped).
  const cleanLogos = rows.map(l => ({ w: Number(l.w), h: Number(l.h) }));
  const prints: { w: number; h: number; logo: number }[] = [];
  cleanLogos.forEach((l, idx) => { for (let k = 0; k < quantity; k++) prints.push({ ...l, logo: idx + 1 }); });
  const placed = packPrints(prints, settings);
  if (!placed) return { status: 'error', message: 'A logo does not fit on the roll.', badRows: [] };

  const layout = placed.map(p => ({ ...p, x: round3(p.x), y: round3(p.y), w: round3(p.w), h: round3(p.h) }));
  const length = round3(Math.max(...layout.map(p => p.y + p.h)));
  const halfMeters = halfMetersFor(length);
  const charge = halfMeters * settings.price_per_half_meter;
  return {
    status: 'ok',
    prints: prints.length,
    block: {
      logos: cleanLogos,
      roll_width_in: settings.roll_width_in,
      gap_in: settings.gap_in,
      price_per_half_meter: settings.price_per_half_meter,
      layout,
      length_in: length,
      half_meters: halfMeters,
      charge,
      amount: charge,
    },
  };
}

// "Logo 1 4×4", Logo 2 10×12"" - short text for cart lines and chips.
export const dtfLogosLabel = (block: Pick<DtfBlock, 'logos'>) =>
  block.logos.map((l, i) => `Logo ${i + 1} ${l.w}×${l.h}"`).join(', ');

// Sum of the DTF amounts on the cart lines (added to the total like the mockup charge).
export const dtfTotalOf = (items: { dtf?: DtfBlock | null }[]) =>
  items.reduce((sum, i) => sum + (i.dtf ? i.dtf.amount : 0), 0);
