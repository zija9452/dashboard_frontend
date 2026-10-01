'use client';

import React from 'react';
import { CategoryTierSummary, MockupLine, MOCKUP_MAX_PIECES } from '@/lib/quantityPricing';

// One card per category above the cart: current tier + mockup, and what adding a few
// more pieces would give (next tier's rate per variant, mockup waived).
export const QuantityTierCards: React.FC<{ summaries: CategoryTierSummary[] }> = ({ summaries }) => {
  if (summaries.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 mb-3">
      {summaries.map(s => (
        // One wrapping line: the current tier first, then the next-tier hint right after
        // it - it only moves to a second line when the first one runs out of space.
        // Each chunk is nowrap, so a chunk wraps as a whole instead of breaking inside.
        <div
          key={s.category}
          className={`rounded-lg border px-3 py-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-gray-600 ${s.isQty ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}
        >
          <span className="whitespace-nowrap">
            <span className="font-semibold text-gray-900">{s.category} · {s.pieces} pcs</span>
            <span className="text-gray-400"> → </span>
            {s.tierLabel}
          </span>
          {s.mockupAmount !== null && (
            <span className="whitespace-nowrap text-xs font-semibold text-purple-700 bg-white border border-purple-200 rounded-full px-2 py-px">
              + Rs. {s.mockupAmount.toLocaleString()} mockup
            </span>
          )}
          {s.next && (
            <>
              <span className="whitespace-nowrap text-xs font-bold text-regal-black bg-regal-yellow rounded px-1.5 py-px">
                Add {s.next.need} more pc{s.next.need > 1 ? 's' : ''}
              </span>
              <span className="whitespace-nowrap text-xs font-semibold text-gray-800">→ {s.next.label}</span>
              {s.next.rates.map((r, i) => (
                <span key={i} className="whitespace-nowrap text-xs text-green-700">
                  {r.variant && <span className="text-gray-600 font-medium">{r.variant}: </span>}
                  <b className="text-[13px]">{r.nextRate.toLocaleString()}</b>/pc
                  {r.currentRate !== null && r.nextRate < r.currentRate && <span className="text-gray-500"> instead of {r.currentRate.toLocaleString()}</span>}
                </span>
              ))}
              {s.mockupAmount !== null && (
                // The mockup charge this category drops at the next tier - struck out
                // like any other price that goes down, plus a FREE label.
                <span className="whitespace-nowrap inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-px">
                  Mockup
                  <span className="line-through text-gray-400">Rs. {s.mockupAmount.toLocaleString()}</span>
                  <span className="font-bold">FREE</span>
                </span>
              )}
              {s.next.tierPriceMissing && s.next.rates.length === 0 && (
                <span className="whitespace-nowrap text-xs text-gray-500">qty rate not set yet</span>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
};

// Totals-box rows: one editable "Designing / mockup - T-shirt (3 pcs)" row per category.
export const MockupChargeRows: React.FC<{
  lines: MockupLine[];
  onAmountChange: (category: string, amount: number) => void;
}> = ({ lines, onAmountChange }) => (
  <>
    {lines.map(m => (
      <div
        key={m.category}
        className="flex flex-wrap justify-between items-center gap-2 text-sm text-purple-700 font-medium mb-2 px-2 py-1.5 bg-purple-50 border border-purple-200 rounded-md"
      >
        <label htmlFor={`mockup-${m.category}`}>
          Designing / mockup - {m.category} ({m.pieces} pcs)
          <span className="block text-xs font-normal text-gray-500">
            Under {MOCKUP_MAX_PIECES + 1} pcs. Once for this category, not per piece.
          </span>
        </label>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          + Rs.
          <input
            id={`mockup-${m.category}`}
            type="number"
            min="0"
            step="1"
            value={m.amount}
            onChange={(e) => onAmountChange(m.category, e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
            className="w-24 px-2 py-1 text-right border border-purple-200 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </span>
      </div>
    ))}
  </>
);

// Under the Line Total in the item form: what adding this item does to the mockup.
export const MockupLinePreview: React.FC<{
  category: string;
  tierPieces: number;      // pieces of this category incl. this item
  alreadyInCart: number;   // pieces of this category already in the cart
  lineTotal: number;
  amount: number;
}> = ({ category, tierPieces, alreadyInCart, lineTotal, amount }) => {
  if (!category || tierPieces <= 0) return null;
  let text: React.ReactNode = null;
  if (tierPieces <= MOCKUP_MAX_PIECES) {
    text = alreadyInCart > 0
      ? <>{category} mockup (Rs. {amount.toLocaleString()}) is already in the total, not added again.</>
      : <>+ Mockup ({category}, under {MOCKUP_MAX_PIECES + 1} pcs): Rs. {amount.toLocaleString()} → <b className="text-gray-900">Rs. {(lineTotal + amount).toLocaleString()}</b> with mockup. Added once to the total, not per piece.</>;
  } else if (alreadyInCart > 0 && alreadyInCart <= MOCKUP_MAX_PIECES) {
    text = <>{category} reaches {tierPieces} pcs, so the Rs. {amount.toLocaleString()} mockup charge will be removed.</>;
  }
  if (!text) return null;
  return <p className="text-xs mt-1.5 px-2 py-1.5 rounded-md bg-purple-50 text-purple-700">{text}</p>;
};
