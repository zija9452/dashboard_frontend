'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';

interface SubCategoryOption {
  sub_category: string;
  options: string[];
}

interface CustomerCategoryGrouped {
  id: string;
  main_category: string;
  sub_categories: SubCategoryOption[];
  ideal_prices: Record<string, number>;
}

interface PriceCombination {
  id: string;
  combination: string;
  price: string;
}

const IdealPricingPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<CustomerCategoryGrouped[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<CustomerCategoryGrouped | null>(null);
  const [combinations, setCombinations] = useState<PriceCombination[]>([]);

  const fetchCategories = async () => {
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
      setCategories(data.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      showToast('Failed to fetch customer categories', 'error');
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
    } else {
      setCombinations([]);
    }
  };

  const generateCombinationsForCategory = (category: CustomerCategoryGrouped) => {
    const subCategories = category.sub_categories;
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
      const existingPrice = category?.ideal_prices?.[combinationKey];

      return {
        id: `comb-${index}`,
        combination: combinationKey,
        price: existingPrice ? existingPrice.toString() : '',
      };
    });

    setCombinations(priceCombinations);
  };

  const handlePriceChange = (id: string, price: string) => {
    setCombinations(prev =>
      prev.map(comb =>
        comb.id === id ? { ...comb, price } : comb
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

    const pricesToSave = combinations.filter(c => c.price.trim() !== '');

    if (pricesToSave.length === 0) {
      showToast('Please enter at least one price', 'error');
      return;
    }

    setSubmitting(true);

    try {
      let successCount = 0;

      for (const priceCombo of pricesToSave) {
        try {
          const response = await fetch('/api/ideal-pricing/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              category_id: selectedCategoryId,
              options_combination: priceCombo.combination,
              price: parseFloat(priceCombo.price),
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

        await fetchCategories();
        
        const updatedCategory = categories.find(cat => cat.id === selectedCategoryId);
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

  return (
    <div className="p-4">
      <PageHeader title="Ideal Pricing Management" />

      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => router.push('/customer-category')}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            ← Back to Customer Categories
          </button>
        </div>
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
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-regal-black">
                {selectedCategory.main_category} - Ideal Prices
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {combinations.length} combinations • {combinations.filter(c => c.price).length} prices set
              </p>
            </div>
            <button
              onClick={handleSavePrices}
              disabled={submitting || combinations.filter(c => c.price).length === 0}
              className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {submitting ? 'Saving...' : 'Save All Prices'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-100">
                <tr className='text-black font-semibold text-xs uppercase'>
                  <th className="px-3 py-5 text-left w-12">#</th>
                  {selectedCategory.sub_categories.map((subCat, index) => (
                    <th key={index} className="px-2 py-5 text-left">
                      {subCat.sub_category}
                    </th>
                  ))}
                  <th className="px-2 py-5 text-left w-32">Ideal Price</th>
                  <th className="px-2 py-5 text-center w-24">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {combinations.map((comb, index) => {
                  const parts = comb.combination.split('|');
                  const hasExistingPrice = comb.price !== '';

                  return (
                    <tr 
                      key={comb.id} 
                      className={`hover:bg-gray-50 text-sm text-gray-900 ${hasExistingPrice ? 'bg-regal-yellow/10' : ''}`}
                    >
                      <td className="px-3 py-4 text-sm text-gray-500 font-medium">
                        {index + 1}
                      </td>
                      {parts.map((part, partIndex) => (
                        <td key={partIndex} className="px-2 py-4 text-sm text-gray-900">
                          <span className="bg-regal-yellow text-black px-2 py-1 rounded text-xs font-medium">
                            {part.trim()}
                          </span>
                        </td>
                      ))}
                      <td className="px-2 py-4">
                        <input
                          type="number"
                          value={comb.price}
                          onChange={(e) => handlePriceChange(comb.id, e.target.value)}
                          className="regal-input w-full text-right font-semibold"
                          placeholder="0"
                          step="1"
                          min="0"
                        />
                      </td>
                      <td className="px-2 py-4 text-center">
                        {hasExistingPrice ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Set
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            ○ Empty
                          </span>
                        )}
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
                Prices Entered: <span className="font-semibold">{combinations.filter(c => c.price).length}</span>
              </span>
              <span className="text-orange-700">
                Remaining: <span className="font-semibold">{combinations.filter(c => !c.price).length}</span>
              </span>
            </div>
          </div>
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
