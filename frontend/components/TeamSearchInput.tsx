'use client';

import React, { useState } from 'react';
import { KIT_LABEL, KitRole, ReadyArticle, findArticle } from '@/lib/quantityPricing';

const KINDS: KitRole[] = ['jersey', 'short', 'trouser'];
const MAX_ARTICLES = 100;

// ✓ Jersey ✓ Short Trouser - the kit kinds we have get a tick; the rest are plain grey
// (no cross).
export const KitKindChips: React.FC<{ article: ReadyArticle }> = ({ article }) => (
  <span className="inline-flex flex-wrap gap-1">
    {KINDS.map(k => (
      <span
        key={k}
        className={`text-[11px] font-semibold rounded-full px-2 border ${article.kinds.includes(k) ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-400'}`}
      >
        {article.kinds.includes(k) && '✓ '}{KIT_LABEL[k]}
      </span>
    ))}
  </span>
);

// Team Name box of Quotation / Customer Invoice: type to search the teams already in the
// order and our ready articles (products without size). Any other name is a custom team.
// Clicking into the box selects the name, so typing replaces it; ✕ clears it.
const TeamSearchInput: React.FC<{
  id: string;
  value: string;
  onChange: (value: string) => void;
  teams: { name: string; pieces: number }[]; // teams already in this order
  articles: ReadyArticle[];
  orderLabel: string;                         // "quotation" / "invoice"
  onBlur?: () => void;                        // e.g. fix the spelling to the matched team
}> = ({ id, value, onChange, teams, articles, orderLabel, onBlur }) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const query = value.trim().toLowerCase();
  const inOrder = teams.filter(t => !query || t.name.toLowerCase().includes(query));
  const teamNames = new Set(teams.map(t => t.name.toLowerCase()));
  const matches = articles
    .filter(a => !teamNames.has(a.name.toLowerCase()) && (!query || a.name.toLowerCase().includes(query)))
    .slice(0, MAX_ARTICLES);
  const options = [...inOrder.map(t => t.name), ...matches.map(a => a.name)];
  const exact = teamNames.has(query) || !!findArticle(articles, value);
  const listId = `${id}-list`;

  const pick = (name: string) => {
    onChange(name);
    setOpen(false);
    setActiveIndex(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!options.length) return;
      e.preventDefault();
      setOpen(true);
      setActiveIndex(i => (i + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
    } else if (e.key === 'Enter' && open && activeIndex >= 0 && options[activeIndex]) {
      e.preventDefault();
      pick(options[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const optionRow = (name: string, index: number, right: React.ReactNode) => (
    <li
      key={`${index}-${name}`}
      id={`${id}-opt-${index}`}
      role="option"
      aria-selected={index === activeIndex}
      // mousedown, not click: the input's blur would close the list first
      onMouseDown={(e) => { e.preventDefault(); pick(name); }}
      className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-md cursor-pointer ${index === activeIndex ? 'bg-yellow-100' : 'hover:bg-yellow-50'}`}
    >
      <b className="text-sm text-regal-black">{name}</b>
      {right}
    </li>
  );

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActiveIndex(-1); }}
        onFocus={(e) => { e.target.select(); setOpen(true); }}
        onBlur={() => { setOpen(false); onBlur?.(); }}
        onKeyDown={onKeyDown}
        className="regal-input w-full font-semibold pr-9"
        placeholder="Search our articles or type a new team"
        autoComplete="off"
        maxLength={100}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && options.length > 0}
        aria-controls={listId}
        aria-activedescendant={activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined}
      />
      {value && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { onChange(''); setOpen(true); document.getElementById(id)?.focus(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          aria-label="Clear team name"
          title="Clear team name"
        >
          ✕
        </button>
      )}
      {open && options.length > 0 && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-gray-300 rounded-lg shadow-lg max-h-72 overflow-y-auto p-1">
          {inOrder.length > 0 && (
            <li role="presentation" className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 px-3 pt-2 pb-1">In this {orderLabel}</li>
          )}
          {inOrder.map((t, i) => optionRow(t.name, i, <span className="text-xs text-gray-500">{t.pieces} pcs</span>))}
          {matches.length > 0 && (
            <li role="presentation" className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 px-3 pt-2 pb-1">Our articles</li>
          )}
          {matches.map((a, i) => optionRow(a.name, inOrder.length + i, <KitKindChips article={a} />))}
          {query && !exact && (
            <li role="presentation" className="text-xs text-gray-500 px-3 py-2 border-t border-gray-200 mt-1">
              Not in the list? Keep typing - &quot;{value.trim()}&quot; becomes a custom team.
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default TeamSearchInput;
