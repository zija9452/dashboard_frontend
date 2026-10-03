'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import { useBranch } from '@/lib/branch';

interface SubCategoryOption {
  sub_category: string;
  options: string[];
  is_modifier?: boolean; // true = a price adjustment dimension (Sleeves, Size Type...), not part of the base combination
}

interface ModifierValue {
  type: 'flat' | 'multiply';
  value: number;
}

interface CustomerCategoryGrouped {
  id: string;
  main_category: string;
  sub_categories: SubCategoryOption[];
  ideal_prices: Record<string, Record<string, number>>;
  modifiers?: Record<string, Record<string, ModifierValue>>; // sub_category -> option -> { type, value }
  mockup_charge?: number | null; // this category's designing / mockup charge; null = none
}

interface PriceCombination {
  id: string;
  combination: string;
  prices: Record<string, string>; // min_qty tier ('1', '5', '16', '100') -> rate as typed
}

interface ModifierRow {
  id: string;
  sub_category: string;
  option: string;
  type: 'flat' | 'multiply';
  value: string;
}

// Quantity tiers, saved as min_qty: 1-4 pcs, 5-15, 16-99, 100+. A tier left empty
// gives no rate on invoice/quotation for that quantity range (no fallback).
const PRICE_TIERS = [
  { key: '1', minQty: 1, header: 'One Piece (1-4)', summary: '1-4 pcs' },
  { key: '5', minQty: 5, header: 'Qty Piece (5-15)', summary: '5-15 pcs' },
  { key: '16', minQty: 16, header: 'Qty Piece (16-99)', summary: '16-99 pcs' },
  { key: '100', minQty: 100, header: 'Qty Piece (100+)', summary: '100+ pcs' },
];

const hasAnyPrice = (c: PriceCombination) => PRICE_TIERS.some(t => (c.prices[t.key] ?? '').trim() !== '');

const IdealPricingPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const currentBranch = useBranch(); // Branch this user is logged into

  const [categories, setCategories] = useState<CustomerCategoryGrouped[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<CustomerCategoryGrouped | null>(null);
  const [combinations, setCombinations] = useState<PriceCombination[]>([]);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [modifierRows, setModifierRows] = useState<ModifierRow[]>([]);
  const [savingModifierId, setSavingModifierId] = useState<string | null>(null);

  // Rush order rule - an order is automatically rush when the customer's required-by
  // date falls within `thresholdDays` of today. Cashier never toggles this manually.
  const [rushRate, setRushRate] = useState<string>('');
  const [rushRateInput, setRushRateInput] = useState<string>('');
  const [thresholdDays, setThresholdDays] = useState<string>('');
  const [thresholdDaysInput, setThresholdDaysInput] = useState<string>('');
  const [loadingRush, setLoadingRush] = useState(false);
  const [savingRush, setSavingRush] = useState(false);

  const fetchRushRate = async () => {
    try {
      setLoadingRush(true);
      const response = await fetch('/api/rush-pricing/', {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const rate = data.price_per_piece?.toString() || '';
      const days = data.threshold_days?.toString() || '';
      setRushRate(rate);
      setRushRateInput(rate);
      setThresholdDays(days);
      setThresholdDaysInput(days);
    } catch (error) {
      console.error('Error fetching rush rate:', error);
      showToast('Failed to fetch rush charge rate', 'error');
    } finally {
      setLoadingRush(false);
    }
  };

  const handleSaveRushRate = async () => {
    if (rushRateInput.trim() === '' || isNaN(Number(rushRateInput)) || Number(rushRateInput) < 0) {
      showToast('Please enter a valid rush charge amount', 'error');
      return;
    }
    if (thresholdDaysInput.trim() === '' || isNaN(Number(thresholdDaysInput)) || Number(thresholdDaysInput) < 1) {
      showToast('Please enter a valid number of days', 'error');
      return;
    }
    setSavingRush(true);
    try {
      const response = await fetch('/api/rush-pricing/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          price_per_piece: Number(rushRateInput),
          threshold_days: Number(thresholdDaysInput),
        }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const rate = data.price_per_piece?.toString() || '';
      const days = data.threshold_days?.toString() || '';
      setRushRate(rate);
      setRushRateInput(rate);
      setThresholdDays(days);
      setThresholdDaysInput(days);
      showToast('Rush order rule updated', 'success');
    } catch (error) {
      console.error('Error saving rush rate:', error);
      showToast('Failed to update rush charge rate', 'error');
    } finally {
      setSavingRush(false);
    }
  };

  // DTF logo printing rule (Hoodie / Jacket lines): roll length used is charged per
  // 0.5 m, logos laid out on a roll this wide with this gap between them.
  const [dtfSaved, setDtfSaved] = useState({ rate: '', width: '', gap: '' });
  const [dtfInput, setDtfInput] = useState({ rate: '', width: '', gap: '' });
  const [loadingDtf, setLoadingDtf] = useState(false);
  const [savingDtf, setSavingDtf] = useState(false);

  const applyDtfSetting = (data: { price_per_half_meter?: number | string; roll_width_in?: number | string; gap_in?: number | string }) => {
    const values = {
      rate: data.price_per_half_meter != null ? String(Number(data.price_per_half_meter)) : '',
      width: data.roll_width_in != null ? String(Number(data.roll_width_in)) : '',
      gap: data.gap_in != null ? String(Number(data.gap_in)) : '',
    };
    setDtfSaved(values);
    setDtfInput(values);
  };

  const fetchDtfSetting = async () => {
    try {
      setLoadingDtf(true);
      const response = await fetch('/api/dtf-pricing/', { method: 'GET', credentials: 'include' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      applyDtfSetting(await response.json());
    } catch (error) {
      console.error('Error fetching DTF rule:', error);
      showToast('Failed to fetch DTF rule', 'error');
    } finally {
      setLoadingDtf(false);
    }
  };

  const handleSaveDtf = async () => {
    const rate = Number(dtfInput.rate), width = Number(dtfInput.width), gap = Number(dtfInput.gap);
    if (dtfInput.rate.trim() === '' || isNaN(rate) || rate < 0) {
      showToast('Please enter a valid DTF rate per 0.5 m', 'error');
      return;
    }
    if (dtfInput.width.trim() === '' || isNaN(width) || width <= 0) {
      showToast('Please enter a valid roll width', 'error');
      return;
    }
    if (dtfInput.gap.trim() === '' || isNaN(gap) || gap < 0) {
      showToast('Please enter a valid gap', 'error');
      return;
    }
    setSavingDtf(true);
    try {
      const response = await fetch('/api/dtf-pricing/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ price_per_half_meter: rate, roll_width_in: width, gap_in: gap }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      applyDtfSetting(await response.json());
      showToast('DTF rule updated', 'success');
    } catch (error) {
      console.error('Error saving DTF rule:', error);
      showToast('Failed to update DTF rule', 'error');
    } finally {
      setSavingDtf(false);
    }
  };

  useEffect(() => {
    fetchRushRate();
    fetchDtfSetting();
  }, []);

  const fetchCategories = async (): Promise<CustomerCategoryGrouped[]> => {
    try {
      setLoading(true);
      const response = await fetch('/api/customer-category/grouped', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const fetched: CustomerCategoryGrouped[] = data.data || [];
      setCategories(fetched);
      return fetched;
    } catch (error) {
      console.error('Error fetching categories:', error);
      showToast('Failed to fetch customer categories', 'error');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Selected category's designing / mockup charge, as typed ('' = no mockup charge).
  const [categoryMockupInput, setCategoryMockupInput] = useState<string>('');
  const [savingCategoryMockup, setSavingCategoryMockup] = useState(false);
  const savedCategoryMockup = selectedCategory?.mockup_charge != null ? String(selectedCategory.mockup_charge) : '';

  const handleSaveCategoryMockup = async () => {
    if (!selectedCategory) return;
    const value = categoryMockupInput.trim();
    if (value !== '' && (isNaN(Number(value)) || Number(value) < 0)) {
      showToast('Please enter a valid flat charges amount, or leave it empty for no flat charges', 'error');
      return;
    }
    setSavingCategoryMockup(true);
    try {
      const response = await fetch(`/api/customer-category/${selectedCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mockup_charge: value === '' ? null : Number(value) }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const saved = value === '' ? null : Number(value);
      const updated = { ...selectedCategory, mockup_charge: saved };
      setSelectedCategory(updated);
      setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
      setCategoryMockupInput(saved === null ? '' : String(saved));
      showToast(`${selectedCategory.main_category} flat charges updated`, 'success');
    } catch (error) {
      console.error('Error saving category mockup charge:', error);
      showToast('Failed to update flat charges', 'error');
    } finally {
      setSavingCategoryMockup(false);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    const category = categories.find(cat => cat.id === categoryId);
    setSelectedCategory(category || null);
    setCategoryMockupInput(category?.mockup_charge != null ? String(category.mockup_charge) : '');

    if (category) {
      generateCombinationsForCategory(category);
      generateModifierRowsForCategory(category);
    } else {
      setCombinations([]);
      setModifierRows([]);
    }
  };

  const generateModifierRowsForCategory = (category: CustomerCategoryGrouped) => {
    const modifierSubCats = category.sub_categories.filter(sc => sc.is_modifier);
    const rows: ModifierRow[] = [];
    modifierSubCats.forEach(sc => {
      sc.options.forEach(option => {
        const existing = category.modifiers?.[sc.sub_category]?.[option];
        rows.push({
          id: `${sc.sub_category}::${option}`,
          sub_category: sc.sub_category,
          option,
          type: existing?.type || 'flat',
          value: existing ? String(existing.value) : '',
        });
      });
    });
    setModifierRows(rows);
  };

  const generateCombinationsForCategory = (category: CustomerCategoryGrouped) => {
    // Only "base" sub-categories (not flagged as modifiers) form the priced
    // combination — modifier dimensions (Sleeves, Size Type...) are adjustments
    // applied on top, managed separately below.
    const subCategories = category.sub_categories.filter(sc => !sc.is_modifier);
    if (subCategories.length === 0) {
      setCombinations([]);
      return;
    }

    const generate = (subCatIndex: number, currentCombination: string[]): string[][] => {
      if (subCatIndex === subCategories.length) {
        return [currentCombination];
      }

      const results: string[][] = [];
      const options = subCategories[subCatIndex].options;

      for (const option of options) {
        const newCombination = [...currentCombination, option];
        results.push(...generate(subCatIndex + 1, newCombination));
      }

      return results;
    };

    const allCombinations = generate(0, []);

    const priceCombinations: PriceCombination[] = allCombinations.map((comb, index) => {
      const combinationKey = comb.join('|');
      const tiers = category?.ideal_prices?.[combinationKey] || {};
      const prices: Record<string, string> = {};
      PRICE_TIERS.forEach(t => {
        prices[t.key] = tiers[t.key] !== undefined ? tiers[t.key].toString() : '';
      });

      return {
        id: `comb-${index}`,
        combination: combinationKey,
        prices,
      };
    });

    setCombinations(priceCombinations);
  };

  const handlePriceChange = (id: string, tierKey: string, value: string) => {
    setCombinations(prev =>
      prev.map(comb =>
        comb.id === id ? { ...comb, prices: { ...comb.prices, [tierKey]: value } } : comb
      )
    );
  };

  // A typed value differs from the saved one ('950' and '950.0' are the same). An emptied
  // field is not a change - saving never deletes a saved price/modifier.
  const isChangedValue = (typed: string | undefined, saved: number | undefined) => {
    const t = (typed ?? '').trim();
    if (t === '') return false;
    return saved === undefined || Number(t) !== Number(saved);
  };

  // Tiers of one row that were typed and differ from the saved price, ready to POST.
  const changedTierEntries = (c: PriceCombination) =>
    PRICE_TIERS
      .filter(t => isChangedValue(c.prices[t.key], selectedCategory?.ideal_prices?.[c.combination]?.[t.key]))
      .map(t => ({ min_qty: t.minQty, price: c.prices[t.key] }));

  const isModifierChanged = (row: ModifierRow) => {
    const saved = selectedCategory?.modifiers?.[row.sub_category]?.[row.option];
    if (row.value.trim() === '') return false;
    return !saved || saved.type !== row.type || Number(row.value) !== Number(saved.value);
  };

  // One request for any number of prices (and modifiers) of the selected category - the
  // backend saves them in one transaction (all or none), instead of one request each.
  const savePricesBulk = async (
    entries: { combination: string; min_qty: number; price: string }[],
    modifiers: ModifierRow[] = []
  ): Promise<{ ok: true; saved: number; modifiersSaved: number } | { ok: false; error: string }> => {
    try {
      const response = await fetch('/api/ideal-pricing/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          category_id: selectedCategoryId,
          branch: currentBranch?.name, // omitted until loaded -> backend uses the session's branch
          entries: entries.map(e => ({
            options_combination: e.combination,
            min_qty: e.min_qty,
            price: parseFloat(e.price),
          })),
          modifiers: modifiers.map(m => ({
            sub_category: m.sub_category,
            option_value: m.option,
            adjustment_type: m.type,
            value: Number(m.value),
          })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        // detail is a string for our own errors, a list for request-validation errors
        const message = typeof data.detail === 'string' ? data.detail : typeof data.error === 'string' ? data.error : '';
        return { ok: false, error: `${message || 'Failed to save prices'} — nothing was saved` };
      }
      return { ok: true, saved: Number(data.saved) || 0, modifiersSaved: Number(data.modifiers_saved) || 0 };
    } catch (error) {
      console.error('Error saving prices:', error);
      return { ok: false, error: 'Failed to save prices — check your connection' };
    }
  };

  const handleSavePrices = async () => {
    if (!selectedCategory || !selectedCategoryId) {
      showToast('Please select a category first', 'error');
      return;
    }

    if (combinations.length === 0 && modifierRows.length === 0) {
      showToast('No combinations to save', 'error');
      return;
    }

    // Only what changed: each combination's changed tiers...
    const entriesToSave: { combination: string; min_qty: number; price: string }[] = [];
    combinations.forEach(c => {
      changedTierEntries(c).forEach(e => entriesToSave.push({ combination: c.combination, ...e }));
    });

    // ...and changed price modifiers (Sleeves, Size Type...), in the same request.
    const modifiersToSave = modifierRows.filter(isModifierChanged);
    const invalidModifier = modifiersToSave.find(r => isNaN(Number(r.value)));
    if (invalidModifier) {
      showToast(`Enter a valid number for ${invalidModifier.sub_category}: ${invalidModifier.option}`, 'error');
      return;
    }

    if (entriesToSave.length === 0 && modifiersToSave.length === 0) {
      showToast('Nothing changed to save', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const result = await savePricesBulk(entriesToSave, modifiersToSave);
      if (!result.ok) {
        showToast(result.error, 'error');
        setSubmitting(false);
        return;
      }

      if (result.saved > 0 || result.modifiersSaved > 0) {
        Swal.fire({
          title: 'Saved!',
          text: `${result.saved} prices and ${result.modifiersSaved} modifiers saved successfully.`,
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });

        const freshCategories = await fetchCategories();

        const updatedCategory = freshCategories.find(cat => cat.id === selectedCategoryId);
        if (updatedCategory) {
          setSelectedCategory(updatedCategory);
          generateCombinationsForCategory(updatedCategory);
          generateModifierRowsForCategory(updatedCategory);
        }
      }

      setSubmitting(false);
    } catch (error) {
      console.error('Error saving prices:', error);
      showToast('Failed to save prices', 'error');
      setSubmitting(false);
    }
  };

  // Saves just one row (whichever quantity-tier prices are filled) — lets staff
  // confirm a single combination without waiting for/relying on the bulk "Save All".
  const saveOneCombination = async (combo: PriceCombination) => {
    if (!selectedCategoryId) return;

    const entries = changedTierEntries(combo);

    if (entries.length === 0) {
      showToast('Nothing changed in this row', 'error');
      return;
    }

    setSavingRowId(combo.id);
    try {
      const result = await savePricesBulk(entries.map(e => ({ combination: combo.combination, ...e })));

      if (result.ok && result.saved > 0) {
        showToast('Row saved', 'success');
        const freshCategories = await fetchCategories();
        const updatedCategory = freshCategories.find(cat => cat.id === selectedCategoryId);
        if (updatedCategory) {
          setSelectedCategory(updatedCategory);
          generateCombinationsForCategory(updatedCategory);
        }
      } else {
        showToast(result.ok ? 'Failed to save row' : result.error, 'error');
      }
    } catch (error) {
      console.error('Error saving row:', error);
      showToast('Failed to save row', 'error');
    } finally {
      setSavingRowId(null);
    }
  };

  const handleModifierFieldChange = (id: string, field: 'type' | 'value', value: string) => {
    setModifierRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const saveModifier = async (row: ModifierRow) => {
    if (!selectedCategoryId) return;
    if (row.value.trim() === '' || isNaN(Number(row.value))) {
      showToast('Enter a valid number first', 'error');
      return;
    }
    if (!isModifierChanged(row)) {
      showToast('Nothing changed in this row', 'error');
      return;
    }

    setSavingModifierId(row.id);
    try {
      const response = await fetch('/api/price-modifiers/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          category_id: selectedCategoryId,
          sub_category: row.sub_category,
          option_value: row.option,
          adjustment_type: row.type,
          value: Number(row.value),
        }),
      });

      if (response.ok) {
        showToast('Modifier saved', 'success');
        const freshCategories = await fetchCategories();
        const updatedCategory = freshCategories.find(cat => cat.id === selectedCategoryId);
        if (updatedCategory) {
          setSelectedCategory(updatedCategory);
          generateModifierRowsForCategory(updatedCategory);
        }
      } else {
        showToast('Failed to save modifier', 'error');
      }
    } catch (error) {
      console.error('Error saving modifier:', error);
      showToast('Failed to save modifier', 'error');
    } finally {
      setSavingModifierId(null);
    }
  };

  return (
    <div className="p-2 py-5">
      <PageHeader title="Ideal Pricing" />

      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => router.push('/customer-category')}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Rush Order Rule Setting */}
      <div className="mb-6 p-4 bg-gray-50 rounded border">
        <h3 className="text-md font-semibold text-regal-black mb-3">Rush Order Rule</h3>
        {loadingRush ? (
          <div className="animate-pulse h-10 bg-gray-200 rounded w-full max-w-md"></div>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Rs. per piece</label>
              <input
                type="number"
                value={rushRateInput}
                onChange={(e) => setRushRateInput(e.target.value)}
                className="regal-input w-40"
                placeholder="300"
                min="0"
                step="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rush if required within (days)</label>
              <input
                type="number"
                value={thresholdDaysInput}
                onChange={(e) => setThresholdDaysInput(e.target.value)}
                className="regal-input w-40"
                placeholder="4"
                min="1"
                step="1"
              />
            </div>
            <button
              onClick={handleSaveRushRate}
              disabled={savingRush || (rushRateInput === rushRate && thresholdDaysInput === thresholdDays)}
              className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {savingRush ? 'Saving...' : 'Save Rush Rule'}
            </button>
            <p className="text-xs text-gray-500 w-full">
              No manual toggle — if the customer's required-by date is within {thresholdDays || 'N'} day(s) of today, the order is automatically rush and charged Rs. {rushRate || '0'} × total pieces.
            </p>
          </div>
        )}
      </div>

      {/* DTF Logo Printing Rule (Hoodie / Jacket - categories ticked "DTF logos") */}
      <div className="mb-6 p-4 bg-gray-50 rounded border">
        <h3 className="text-md font-semibold text-regal-black mb-3">DTF Logo Printing</h3>
        {loadingDtf ? (
          <div className="animate-pulse h-10 bg-gray-200 rounded w-full max-w-md"></div>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="dtf-rate" className="block text-sm font-medium mb-1">Rs. per 0.5 m of roll</label>
              <input
                id="dtf-rate"
                type="number"
                value={dtfInput.rate}
                onChange={(e) => setDtfInput(prev => ({ ...prev, rate: e.target.value }))}
                className="regal-input w-40"
                placeholder="750"
                min="0"
                step="1"
              />
            </div>
            <div>
              <label htmlFor="dtf-width" className="block text-sm font-medium mb-1">Roll width (inches)</label>
              <input
                id="dtf-width"
                type="number"
                value={dtfInput.width}
                onChange={(e) => setDtfInput(prev => ({ ...prev, width: e.target.value }))}
                className="regal-input w-40"
                placeholder="23"
                min="1"
                step="0.5"
              />
            </div>
            <div>
              <label htmlFor="dtf-gap" className="block text-sm font-medium mb-1">Gap between logos (inches)</label>
              <input
                id="dtf-gap"
                type="number"
                value={dtfInput.gap}
                onChange={(e) => setDtfInput(prev => ({ ...prev, gap: e.target.value }))}
                className="regal-input w-40"
                placeholder="0.5"
                min="0"
                step="0.1"
              />
            </div>
            <button
              onClick={handleSaveDtf}
              disabled={savingDtf || (dtfInput.rate === dtfSaved.rate && dtfInput.width === dtfSaved.width && dtfInput.gap === dtfSaved.gap)}
              className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {savingDtf ? 'Saving...' : 'Save DTF Rule'}
            </button>
            <p className="text-xs text-gray-500 w-full">
              Logos are laid out on a {dtfSaved.width || 'N'}&quot; roll with {dtfSaved.gap || '0'}&quot; between them. Roll length used is charged per 0.5 m with no tolerance:
              up to 0.5 m = Rs. {Number(dtfSaved.rate || 0).toLocaleString()}, up to 1 m = Rs. {(Number(dtfSaved.rate || 0) * 2).toLocaleString()}, and so on.
              Only for categories ticked &quot;DTF logos&quot; on the Customer Category page.
            </p>
          </div>
        )}
      </div>

      {/* Category Selection */}
      <div className="border-0 p-0 mb-6">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded mb-4"></div>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Category *</label>
            <select
              value={selectedCategoryId}
              onChange={(e) => handleCategorySelect(e.target.value)}
              className="regal-input w-full"
            >
              <option value="">-- Select a Category --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.main_category} ({cat.sub_categories.reduce((acc, sc) => acc * sc.options.length, 1)} combinations)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* This category's designing / mockup charge (e.g. T-shirt 500, Jacket 1000) — empty = none */}
        {selectedCategory && (
          <div className="flex flex-wrap items-end gap-3 p-4 bg-gray-50 rounded border">
            <div>
              <label htmlFor="category-mockup" className="block text-sm font-medium mb-1">
                {selectedCategory.main_category} — flat charges (Rs.)
              </label>
              <input
                id="category-mockup"
                type="number"
                value={categoryMockupInput}
                onChange={(e) => setCategoryMockupInput(e.target.value)}
                className="regal-input w-40"
                placeholder="No flat charges"
                min="0"
                step="1"
              />
            </div>
            <button
              onClick={handleSaveCategoryMockup}
              disabled={savingCategoryMockup || categoryMockupInput.trim() === savedCategoryMockup}
              className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {savingCategoryMockup ? 'Saving...' : 'Save'}
            </button>
            <p className="text-xs text-gray-500 w-full">
              {selectedCategory.mockup_charge == null || Number(selectedCategory.mockup_charge) === 0
                ? `No flat charges for ${selectedCategory.main_category}.`
                : `Rs. ${Number(selectedCategory.mockup_charge).toLocaleString()} once when ${selectedCategory.main_category} has 1-4 pcs in a Quotation or Customer Invoice — not per piece, and none at 5+ pcs.`}
              {' '}Leave empty for no flat charges. Staff can change or waive it on each order.
            </p>
          </div>
        )}
      </div>

      {/* Combinations Table */}
      {selectedCategory && combinations.length > 0 && (
        <div className="border-0 p-0">
          <div className="flex justify-between gap-2 items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-regal-black">
                {selectedCategory.main_category} - Ideal Prices
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {combinations.length} combinations • {combinations.filter(hasAnyPrice).length} with at least one price set
              </p>
            </div>
            <button
              onClick={handleSavePrices}
              disabled={submitting || (!combinations.some(c => changedTierEntries(c).length > 0) && !modifierRows.some(isModifierChanged))}
              className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              title="Saves all prices and price modifiers of this category in one go"
            >
              {submitting ? 'Saving...' : 'Save All (Prices + Modifiers)'}
            </button>
          </div>

          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-gray-100">
                <tr className='text-black font-semibold text-xs uppercase'>
                  <th className="px-3 py-5 text-left w-12">#</th>
                  {selectedCategory.sub_categories.filter(subCat => !subCat.is_modifier).map((subCat, index) => (
                    <th key={index} className="px-2 py-5 text-left whitespace-nowrap">
                      {subCat.sub_category}
                    </th>
                  ))}
                  {PRICE_TIERS.map(t => (
                    <th key={t.key} className="px-2 py-5 text-left w-32 whitespace-nowrap">{t.header}</th>
                  ))}
                  <th className="px-2 py-5 text-center w-28 whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {combinations.map((comb, index) => {
                  const parts = comb.combination.split('|');
                  const hasExistingPrice = (comb.prices['1'] ?? '') !== '';
                  const rowChanged = changedTierEntries(comb).length > 0;

                  return (
                    <tr
                      key={comb.id}
                      className={`hover:bg-gray-50 text-sm text-gray-900 ${hasExistingPrice ? 'bg-regal-yellow/10' : ''}`}
                    >
                      <td className="px-3 py-4 text-sm text-gray-500 font-medium">
                        {index + 1}
                      </td>
                      {parts.map((part, partIndex) => (
                        <td key={partIndex} className="px-2 py-4 text-sm text-gray-900 whitespace-nowrap">
                          <span className="bg-regal-yellow text-black px-2 py-1 rounded text-xs font-medium">
                            {part.trim()}
                          </span>
                        </td>
                      ))}
                      {PRICE_TIERS.map(t => (
                        <td key={t.key} className="px-2 py-4">
                          <input
                            type="number"
                            value={comb.prices[t.key] ?? ''}
                            onChange={(e) => handlePriceChange(comb.id, t.key, e.target.value)}
                            className="regal-input w-full min-w-[100px] text-right font-semibold"
                            placeholder="0"
                            step="1"
                            min="0"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => saveOneCombination(comb)}
                          disabled={savingRowId === comb.id || !rowChanged}
                          className="regal-btn bg-regal-black text-white text-xs px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {savingRowId === comb.id ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {combinations.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No combinations found for this category.
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="mt-4 p-4 bg-gray-50 rounded border">
            <div className="flex flex-wrap justify-between items-center gap-2 text-sm">
              <span className="text-gray-600">
                Total Combinations: <span className="font-semibold">{combinations.length}</span>
              </span>
              {PRICE_TIERS.map(t => (
                <span key={t.key} className="text-blue-700">
                  {t.summary} Prices Entered: <span className="font-semibold">{combinations.filter(c => (c.prices[t.key] ?? '') !== '').length}</span>
                </span>
              ))}
              <span className="text-orange-700">
                Remaining (no price at all): <span className="font-semibold">{combinations.filter(c => !hasAnyPrice(c)).length}</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modifiers — price adjustments for dimensions like Sleeves / Size Type,
          applied on top of the base price above instead of needing a fixed price
          for every combination. */}
      {selectedCategory && modifierRows.length > 0 && (
        <div className="border-0 p-0 mt-8">
          <h3 className="text-lg font-semibold text-regal-black mb-1">
            {selectedCategory.main_category} - Price Modifiers
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Applied on top of the base price: (base + all flat adjustments) × all multiply adjustments.
          </p>

          {Object.entries(
            modifierRows.reduce<Record<string, ModifierRow[]>>((acc, row) => {
              (acc[row.sub_category] ||= []).push(row);
              return acc;
            }, {})
          ).map(([subCategory, rows]) => (
            <div key={subCategory} className="mb-6">
              <h4 className="text-sm font-semibold text-regal-black mb-2">{subCategory}</h4>
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-100">
                    <tr className="text-black font-semibold text-xs uppercase">
                      <th className="px-3 py-3 text-left">Option</th>
                      <th className="px-3 py-3 text-left w-40">Adjustment Type</th>
                      <th className="px-3 py-3 text-left w-40">Value</th>
                      <th className="px-3 py-3 text-center w-28"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rows.map(row => (
                      <tr key={row.id} className="text-sm text-gray-900">
                        <td className="px-3 py-3">
                          <span className="bg-regal-yellow text-black px-2 py-1 rounded text-xs font-medium">{row.option}</span>
                        </td>
                        <td className="px-3 py-3">
                          <select
                            value={row.type}
                            onChange={(e) => handleModifierFieldChange(row.id, 'type', e.target.value)}
                            className="regal-input w-full"
                          >
                            <option value="flat">Flat (+/- Rs.)</option>
                            <option value="multiply">Multiply (×)</option>
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            value={row.value}
                            onChange={(e) => handleModifierFieldChange(row.id, 'value', e.target.value)}
                            className="regal-input w-full"
                            placeholder={row.type === 'multiply' ? '1.0' : '0'}
                            step={row.type === 'multiply' ? '0.1' : '1'}
                          />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => saveModifier(row)}
                            disabled={savingModifierId === row.id || !isModifierChanged(row)}
                            className="regal-btn bg-regal-black text-white text-xs px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {savingModifierId === row.id ? 'Saving...' : 'Save'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!selectedCategory && !loading && (
        <div className="text-center py-12 text-gray-500">
          Select a category from above to manage ideal prices
        </div>
      )}
    </div>
  );
};

export default IdealPricingPage;
