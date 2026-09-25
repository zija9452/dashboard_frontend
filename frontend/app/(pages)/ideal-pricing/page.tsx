'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';

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
}

interface PriceCombination {
  id: string;
  combination: string;
  price: string;      // 1-piece rate (min_qty = 1)
  price5: string;      // bulk rate for 5+ pieces (min_qty = 5)
}

interface ModifierRow {
  id: string;
  sub_category: string;
  option: string;
  type: 'flat' | 'multiply';
  value: string;
}

const BULK_MIN_QTY = 5;

const IdealPricingPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

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

  useEffect(() => {
    fetchRushRate();
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

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    const category = categories.find(cat => cat.id === categoryId);
    setSelectedCategory(category || null);

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
      const existingPrice = tiers['1'];
      const existingBulkPrice = tiers[String(BULK_MIN_QTY)];

      return {
        id: `comb-${index}`,
        combination: combinationKey,
        price: existingPrice !== undefined ? existingPrice.toString() : '',
        price5: existingBulkPrice !== undefined ? existingBulkPrice.toString() : '',
      };
    });

    setCombinations(priceCombinations);
  };

  const handlePriceChange = (id: string, field: 'price' | 'price5', value: string) => {
    setCombinations(prev =>
      prev.map(comb =>
        comb.id === id ? { ...comb, [field]: value } : comb
      )
    );
  };

  const handleSavePrices = async () => {
    if (!selectedCategory || !selectedCategoryId) {
      showToast('Please select a category first', 'error');
      return;
    }

    if (combinations.length === 0) {
      showToast('No combinations to save', 'error');
      return;
    }

    // Each combination can contribute up to two tier rows: 1-piece and 5+ bulk
    const entriesToSave: { combination: string; min_qty: number; price: string }[] = [];
    combinations.forEach(c => {
      if (c.price.trim() !== '') {
        entriesToSave.push({ combination: c.combination, min_qty: 1, price: c.price });
      }
      if (c.price5.trim() !== '') {
        entriesToSave.push({ combination: c.combination, min_qty: BULK_MIN_QTY, price: c.price5 });
      }
    });

    if (entriesToSave.length === 0) {
      showToast('Please enter at least one price', 'error');
      return;
    }

    setSubmitting(true);

    try {
      let successCount = 0;

      for (const entry of entriesToSave) {
        try {
          const response = await fetch('/api/ideal-pricing/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              category_id: selectedCategoryId,
              options_combination: entry.combination,
              min_qty: entry.min_qty,
              price: parseFloat(entry.price),
              branch: 'European Sports Light House'
            }),
          });

          if (response.ok) {
            successCount++;
          }
        } catch (error) {
          console.error('Error saving price:', error);
        }
      }

      if (successCount > 0) {
        Swal.fire({
          title: 'Saved!',
          text: `${successCount} prices saved successfully.`,
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
        }
      }

      setSubmitting(false);
    } catch (error) {
      console.error('Error saving prices:', error);
      showToast('Failed to save prices', 'error');
      setSubmitting(false);
    }
  };

  // Saves just one row (its 1-pc and/or 5+ price, whichever is filled) — lets staff
  // confirm a single combination without waiting for/relying on the bulk "Save All".
  const saveOneCombination = async (combo: PriceCombination) => {
    if (!selectedCategoryId) return;

    const entries: { min_qty: number; price: string }[] = [];
    if (combo.price.trim() !== '') entries.push({ min_qty: 1, price: combo.price });
    if (combo.price5.trim() !== '') entries.push({ min_qty: BULK_MIN_QTY, price: combo.price5 });

    if (entries.length === 0) {
      showToast('Enter at least one price for this row first', 'error');
      return;
    }

    setSavingRowId(combo.id);
    try {
      let successCount = 0;
      for (const entry of entries) {
        try {
          const response = await fetch('/api/ideal-pricing/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              category_id: selectedCategoryId,
              options_combination: combo.combination,
              min_qty: entry.min_qty,
              price: parseFloat(entry.price),
              branch: 'European Sports Light House'
            }),
          });
          if (response.ok) successCount++;
        } catch (error) {
          console.error('Error saving row:', error);
        }
      }

      if (successCount > 0) {
        showToast('Row saved', 'success');
        const freshCategories = await fetchCategories();
        const updatedCategory = freshCategories.find(cat => cat.id === selectedCategoryId);
        if (updatedCategory) {
          setSelectedCategory(updatedCategory);
          generateCombinationsForCategory(updatedCategory);
        }
      } else {
        showToast('Failed to save row', 'error');
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
                {combinations.length} combinations • {combinations.filter(c => c.price).length} single-piece prices set • {combinations.filter(c => c.price5).length} bulk (5+) prices set
              </p>
            </div>
            <button
              onClick={handleSavePrices}
              disabled={submitting || (combinations.filter(c => c.price).length === 0 && combinations.filter(c => c.price5).length === 0)}
              className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {submitting ? 'Saving...' : 'Save All Prices'}
            </button>
          </div>

          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-100">
                <tr className='text-black font-semibold text-xs uppercase'>
                  <th className="px-3 py-5 text-left w-12">#</th>
                  {selectedCategory.sub_categories.filter(subCat => !subCat.is_modifier).map((subCat, index) => (
                    <th key={index} className="px-2 py-5 text-left whitespace-nowrap">
                      {subCat.sub_category}
                    </th>
                  ))}
                  <th className="px-2 py-5 text-left w-32 whitespace-nowrap">One Piece</th>
                  <th className="px-2 py-5 text-left w-32 whitespace-nowrap">Qty Piece (5+)</th>
                  <th className="px-2 py-5 text-center w-36 whitespace-nowrap">Status / Save</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {combinations.map((comb, index) => {
                  const parts = comb.combination.split('|');
                  const hasExistingPrice = comb.price !== '';
                  const hasBulkPrice = comb.price5 !== '';

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
                      <td className="px-2 py-4">
                        <input
                          type="number"
                          value={comb.price}
                          onChange={(e) => handlePriceChange(comb.id, 'price', e.target.value)}
                          className="regal-input w-full min-w-[100px] text-right font-semibold"
                          placeholder="0"
                          step="1"
                          min="0"
                        />
                      </td>
                      <td className="px-2 py-4">
                        <input
                          type="number"
                          value={comb.price5}
                          onChange={(e) => handlePriceChange(comb.id, 'price5', e.target.value)}
                          className="regal-input w-full min-w-[100px] text-right font-semibold"
                          placeholder="0"
                          step="1"
                          min="0"
                        />
                      </td>
                      <td className="px-2 py-4 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1.5">
                          {hasExistingPrice && hasBulkPrice ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓ Both Set
                            </span>
                          ) : hasExistingPrice || hasBulkPrice ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓ Set
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              ○ Empty
                            </span>
                          )}
                          <button
                            onClick={() => saveOneCombination(comb)}
                            disabled={savingRowId === comb.id || (!hasExistingPrice && !hasBulkPrice)}
                            className="regal-btn bg-regal-black text-white text-xs px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {savingRowId === comb.id ? 'Saving...' : 'Save'}
                          </button>
                        </div>
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
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">
                Total Combinations: <span className="font-semibold">{combinations.length}</span>
              </span>
              <span className="text-green-700">
                1-pc Prices Entered: <span className="font-semibold">{combinations.filter(c => c.price).length}</span>
              </span>
              <span className="text-blue-700">
                5+ Bulk Prices Entered: <span className="font-semibold">{combinations.filter(c => c.price5).length}</span>
              </span>
              <span className="text-orange-700">
                Remaining (no price at all): <span className="font-semibold">{combinations.filter(c => !c.price && !c.price5).length}</span>
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
                            disabled={savingModifierId === row.id}
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
