'use client';

import React from 'react';
import { DtfBlock, DtfLogo, DtfResult, HALF_METER_IN, INCHES_PER_METER, inches, metersLabel } from '@/lib/dtfLayout';

// One color per logo number, the same in the form preview and the designer view.
export const DTF_LOGO_COLORS = ['#0ea5e9', '#f97316', '#a855f7', '#22c55e', '#e11d48', '#64748b', '#eab308', '#14b8a6'];
const colorFor = (logo: number) => DTF_LOGO_COLORS[(logo - 1) % DTF_LOGO_COLORS.length];

// The roll drawn top to bottom, in inches. Dashed lines mark every 0.5 m step, the red
// line is where the last logo ends.
export const DtfRollPreview: React.FC<{ block: DtfBlock; maxHeight?: number }> = ({ block, maxHeight = 280 }) => {
  const steps = block.half_meters;
  const L = steps * HALF_METER_IN;
  const W = block.roll_width_in;
  const pad = 0.3;
  return (
    <div className="overflow-y-auto rounded-md border border-gray-200 bg-slate-50 p-1.5 pr-10" style={{ maxHeight }}>
      <div className="relative">
        <svg viewBox={`${-pad} ${-pad} ${W + pad * 2} ${L + pad * 2}`} className="block w-full h-auto" role="img" aria-label={`Logos placed on the ${W} inch roll`}>
          <rect x={0} y={0} width={W} height={L} fill="#ffffff" stroke="#94a3b8" strokeWidth={0.08} />
          <rect x={0} y={block.length_in} width={W} height={Math.max(0, L - block.length_in)} fill="#f1f5f9" />
          {block.layout.map((p, i) => {
            // Logo number in the middle of each box, sized to fit it. A print turned 90°
            // also gets "Rotate 90°" under the number so the designer sees it at a glance.
            const num = Math.min(p.w, p.h, 6) * (p.rotated ? 0.4 : 0.5);
            const tag = p.rotated ? Math.min(p.w / 6.2, p.h * 0.22, 1.4) : 0;
            const groupH = p.rotated ? num * 1.2 + tag : num;
            const cx = p.x + p.w / 2;
            const cy = p.y + p.h / 2;
            return (
              <g key={i}>
                <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={0.15} fill={colorFor(p.logo)} fillOpacity={0.85} />
                <text x={cx} y={cy - groupH / 2 + num / 2} textAnchor="middle" dominantBaseline="central" fontSize={num} fontWeight={700} fill="#ffffff">
                  {p.logo}
                </text>
                {p.rotated && (
                  <text x={cx} y={cy + groupH / 2 - tag / 2} textAnchor="middle" dominantBaseline="central" fontSize={tag} fontWeight={600} fill="#ffffff">
                    Rotate 90°
                  </text>
                )}
              </g>
            );
          })}
          {Array.from({ length: steps }, (_, k) => (
            <line key={k} x1={0} x2={W} y1={(k + 1) * HALF_METER_IN} y2={(k + 1) * HALF_METER_IN} stroke="#0f766e" strokeWidth={0.08} strokeDasharray="0.4 0.3" />
          ))}
          <line x1={0} x2={W} y1={block.length_in} y2={block.length_in} stroke="#dc2626" strokeWidth={0.1} />
        </svg>
        {/* Step labels beside the roll, in HTML so they stay readable at any size */}
        {Array.from({ length: steps }, (_, k) => (
          <span
            key={k}
            className="absolute -right-9 text-[10px] font-semibold text-teal-700"
            style={{ top: `calc(${(((k + 1) * HALF_METER_IN + pad) / (L + pad * 2)) * 100}% - 8px)` }}
          >
            {metersLabel(k + 1)}
          </span>
        ))}
      </div>
    </div>
  );
};

// The optional DTF box under "+ More options" in the item form (Quotation / Customer
// Invoice): one row per logo with only its width and height for ONE piece.
export const DtfLogoBox: React.FC<{
  category: string;
  logos: DtfLogo[];
  onChange: (logos: DtfLogo[]) => void;
  result: DtfResult;
  quantity: number | '';
}> = ({ category, logos, onChange, result, quantity }) => {
  const rows = logos.length ? logos : [{ w: '', h: '' } as DtfLogo];
  const badRows = result.status === 'error' ? result.badRows : [];
  const setValue = (i: number, key: 'w' | 'h', value: string) =>
    onChange(rows.map((l, idx) => (idx === i ? { ...l, [key]: value === '' ? '' : Number(value) } : l)));

  return (
    <div className="mt-3 bg-white rounded-lg p-3 flex flex-col gap-2.5 text-gray-800">
      <div className="flex flex-wrap justify-between items-baseline gap-2">
        <span className="text-sm font-semibold text-regal-black">
          DTF logos <span className="text-xs font-normal text-gray-500">(optional)</span>
        </span>
        <span className="text-xs text-gray-500">Size of one logo on one piece, in inches</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-[14px_58px_minmax(0,1fr)_minmax(0,1fr)_28px] gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          <span /><span /><span>Width &quot;</span><span>Height &quot;</span><span />
        </div>
        {rows.map((l, i) => (
          <div key={i} className="grid grid-cols-[14px_58px_minmax(0,1fr)_minmax(0,1fr)_28px] gap-1.5 items-center">
            <span className="w-3 h-3 rounded-sm" style={{ background: colorFor(i + 1) }} />
            <span className="text-sm font-medium">Logo {i + 1}</span>
            {(['w', 'h'] as const).map(key => (
              <input
                key={key}
                id={`dtf-logo-${i}-${key}`}
                type="number"
                min="0"
                step="0.5"
                value={l[key]}
                placeholder="0"
                aria-label={`Logo ${i + 1} ${key === 'w' ? 'width' : 'height'} in inches`}
                onChange={(e) => setValue(i, key, e.target.value)}
                className={`w-full min-w-0 px-2 py-1.5 text-sm border rounded-md tabular-nums ${badRows.includes(i) ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              />
            ))}
            <button
              type="button"
              aria-label={`Remove logo ${i + 1}`}
              onClick={() => onChange(rows.length > 1 ? rows.filter((_, idx) => idx !== i) : [{ w: '', h: '' }])}
              className="text-gray-400 hover:text-red-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          onChange([...rows, { w: '', h: '' }]);
          setTimeout(() => document.getElementById(`dtf-logo-${rows.length}-w`)?.focus(), 0);
        }}
        className="self-start text-sm font-medium border border-dashed border-gray-400 bg-gray-50 hover:bg-gray-100 rounded-md px-2.5 py-1"
      >
        + Add logo
      </button>

      <div className="border-t border-gray-200 pt-2.5 flex flex-col gap-2">
        {result.status === 'empty' && (
          <p className="text-xs text-gray-500">Leave empty if this {category} has no DTF. Add one row per logo with its width and height.</p>
        )}
        {result.status === 'error' && <p className="text-xs text-red-600">{result.message}</p>}
        {result.status === 'needs-quantity' && (
          <p className="text-xs text-gray-500">Enter the quantity below to work out the DTF roll length.</p>
        )}
        {result.status === 'ok' && (
          <>
            <p className="text-xs text-gray-600 tabular-nums">
              {result.block.logos.map((l, i) => `Logo ${i + 1} ${l.w}×${l.h}"`).join(' + ')} on each piece ·{' '}
              <b className="text-gray-800">{quantity} pcs × {result.block.logos.length} logo{result.block.logos.length > 1 ? 's' : ''} = {result.prints} prints</b>
            </p>
            <DtfRollPreview block={result.block} />
            <p className="text-xs text-gray-600 tabular-nums">
              Roll used: <b className="text-gray-800">{inches(result.block.length_in)}</b> ({(result.block.length_in / INCHES_PER_METER).toFixed(2)} m)
              {' '}· {metersLabel(result.block.half_meters)} fits up to {inches(result.block.half_meters * HALF_METER_IN)}
            </p>
            <div className="flex flex-wrap justify-between items-baseline gap-2 rounded-md border border-teal-200 bg-teal-50 px-2.5 py-2 text-teal-700 tabular-nums">
              <span>DTF charge · {metersLabel(result.block.half_meters)} ({metersLabel(1)} = Rs. {result.block.price_per_half_meter.toLocaleString()})</span>
              <b className="text-base text-regal-black">Rs. {result.block.charge.toLocaleString()}</b>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Totals-box rows: one editable "DTF printing - Jacket (1 m)" row per line with DTF,
// like the mockup rows. The amount starts at the roll-length charge; 0 waives it.
export const DtfChargeRows: React.FC<{
  lines: { id: string; category: string; dtf?: DtfBlock | null }[];
  onAmountChange: (id: string, amount: number) => void;
}> = ({ lines, onAmountChange }) => (
  <>
    {lines.filter(l => l.dtf).map(l => (
      <div
        key={l.id}
        className="flex flex-wrap justify-between items-center gap-2 text-sm text-teal-700 font-medium mb-2 px-2 py-1.5 bg-teal-50 border border-teal-200 rounded-md"
      >
        <label htmlFor={`dtf-amount-${l.id}`}>
          DTF printing - {l.category} ({metersLabel(l.dtf!.half_meters)})
          <span className="block text-xs font-normal text-gray-500">
            Roll length charge Rs. {l.dtf!.charge.toLocaleString()}.
          </span>
        </label>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          + Rs.
          <input
            id={`dtf-amount-${l.id}`}
            type="number"
            min="0"
            step="1"
            value={l.dtf!.amount}
            onChange={(e) => onAmountChange(l.id, e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
            className="w-24 px-2 py-1 text-right border border-teal-200 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
        </span>
      </div>
    ))}
  </>
);

// Designer view (Invoice Details page): the saved roll layout of one line and where
// every print goes, so the designer lines the logos up exactly the way it was priced.
export const DtfLayoutDetails: React.FC<{ block: DtfBlock; category: string; quantity: number }> = ({ block, category, quantity }) => {
  const [showPositions, setShowPositions] = React.useState(false);
  const sorted = [...block.layout].sort((a, b) => a.y - b.y || a.x - b.x);
  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-3 md:p-4 flex flex-col gap-3">
      <div className="flex flex-wrap justify-between items-baseline gap-2">
        <h4 className="text-sm font-semibold text-gray-900">DTF layout - {category}</h4>
        <span className="text-xs text-gray-600 tabular-nums">
          {inches(block.roll_width_in)} roll · {inches(block.gap_in)} gap · {block.layout.length} prints · {inches(block.length_in)} used · {metersLabel(block.half_meters)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {block.logos.map((l, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: colorFor(i + 1) }} />
            Logo {i + 1}: {l.w}×{l.h}&quot; × {quantity} pcs
          </span>
        ))}
      </div>
      <div className="max-w-md">
        <DtfRollPreview block={block} maxHeight={520} />
      </div>
      <button type="button" onClick={() => setShowPositions(s => !s)} className="self-start text-sm font-medium text-teal-700 hover:underline">
        {showPositions ? '− Hide positions' : '+ Show position of every print (inches from the top-left of the roll)'}
      </button>
      {showPositions && (
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-xs tabular-nums">
            <thead className="bg-gray-100 sticky top-0">
              <tr className="text-left text-gray-500 uppercase">
                <th className="px-2 py-1.5">#</th>
                <th className="px-2 py-1.5">Logo</th>
                <th className="px-2 py-1.5 text-right">From left</th>
                <th className="px-2 py-1.5 text-right">From top</th>
                <th className="px-2 py-1.5 text-right">Size on roll</th>
                <th className="px-2 py-1.5">Turned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sorted.map((p, i) => (
                <tr key={i}>
                  <td className="px-2 py-1">{i + 1}</td>
                  <td className="px-2 py-1">
                    <span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: colorFor(p.logo) }} />
                    Logo {p.logo}
                  </td>
                  <td className="px-2 py-1 text-right">{inches(p.x)}</td>
                  <td className="px-2 py-1 text-right">{inches(p.y)}</td>
                  <td className="px-2 py-1 text-right">{p.w}×{p.h}&quot;</td>
                  <td className="px-2 py-1">{p.rotated ? 'Rotate 90°' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
