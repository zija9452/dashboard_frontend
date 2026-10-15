'use client';

import React from 'react';

// Cart numbers typed in place (Quotation / Customer Invoice): a line's qty and its team's
// MOQ / DTF amounts. Each keystroke applies, so rates and totals move as it's typed. The
// box never goes empty or below its minimum: erasing it puts the minimum back, selected,
// so the next digit replaces it.

const BOX = 'h-8 px-2 text-sm font-medium text-gray-900 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-regal-yellow focus:border-regal-yellow';
// Cart box that reads as plain text (colour from its cell) until focused, then shows the
// yellow theme box. Shared by `plain` NumberBoxes and the Walk-in cart.
export const PLAIN_BOX = 'h-8 px-2 text-sm rounded-md border border-transparent bg-transparent cursor-text focus:outline-none focus:bg-yellow-50 focus:ring-2 focus:ring-regal-yellow focus:border-regal-yellow [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

const NumberBox: React.FC<{
  id?: string;
  value: number;
  min: number;
  label: string;
  className: string;
  plain?: boolean;
  onChange: (value: number) => void;
}> = ({ id, value, min, label, className, plain, onChange }) => (
  <input
    id={id}
    type="text"
    inputMode="numeric"
    value={String(value)}
    onChange={(e) => {
      const typed = Number(e.target.value.replace(/\D/g, '') || 0);
      const next = Math.max(min, typed);
      onChange(next);
      if (next !== typed) {
        const box = e.target;
        requestAnimationFrame(() => box.select());
      }
    }}
    onFocus={(e) => e.target.select()}
    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    aria-label={label}
    className={`${plain ? PLAIN_BOX : BOX} ${className}`}
  />
);

// Qty of a cart line - at least 1. `onChange` returns false when the qty isn't taken
// (e.g. DTF doesn't fit), and the box keeps the old qty.
export const QtyInput: React.FC<{
  value: number;
  label: string;
  plain?: boolean;
  onChange: (qty: number) => boolean;
}> = ({ value, label, plain, onChange }) => (
  <NumberBox value={value} min={1} label={`Quantity for ${label}`} className="w-14 text-center" plain={plain} onChange={onChange} />
);

// MOQ / DTF amount in the Total column - 0 = waived. align="right" lines the number up
// under right-aligned line totals.
export const AmountInput: React.FC<{
  id: string;
  value: number;
  label: string;
  align?: 'left' | 'right';
  plain?: boolean;
  onChange: (amount: number) => void;
}> = ({ id, value, label, align = 'right', plain, onChange }) => (
  <NumberBox id={id} value={value} min={0} label={label} className={`w-24 ${align === 'right' ? 'text-right' : 'text-left'}`} plain={plain} onChange={onChange} />
);
