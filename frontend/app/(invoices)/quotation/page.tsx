'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import {
  LOCAL_TSHIRT_CATEGORY_NAME,
  LOCAL_TSHIRT_IDEAL_PRICES,
  LOCAL_TSHIRT_MODIFIERS,
  LOCAL_RUSH_PRICING,
} from '@/lib/localTshirtPricing';
import {
  LOCAL_SHORT_CATEGORY_NAME,
  LOCAL_SHORT_IDEAL_PRICES,
  LOCAL_SHORT_MODIFIERS,
} from '@/lib/localShortPricing';
import {
  LOCAL_TROUSER_CATEGORY_NAME,
  LOCAL_TROUSER_IDEAL_PRICES,
  LOCAL_TROUSER_MODIFIERS,
} from '@/lib/localTrouserPricing';
import {
  LOCAL_JACKET_CATEGORY_NAME,
  LOCAL_JACKET_IDEAL_PRICES,
  LOCAL_JACKET_MODIFIERS,
} from '@/lib/localJacketPricing';
import {
  LOCAL_HOODIE_JACKET_CATEGORY_NAME,
  LOCAL_HOODIE_JACKET_IDEAL_PRICES,
  LOCAL_HOODIE_JACKET_MODIFIERS,
} from '@/lib/localHoodieJacketPricing';
import {
  LOCAL_SANDO_CATEGORY_NAME,
  LOCAL_SANDO_IDEAL_PRICES,
  LOCAL_SANDO_MODIFIERS,
} from '@/lib/localSandoPricing';

interface Customer {
  cus_id: string;
  cus_name: string;
  cus_phone: string;
}

interface SubCategoryOption {
  sub_category: string;
  options: string[];
  is_modifier?: boolean; // true = a price adjustment dimension (Sleeves, Size Type...), not part of the base combination
  is_optional?: boolean; // true = hidden by default, shown via the "+" more-options toggle
}

interface ModifierValue {
  type: 'flat' | 'multiply';
  value: number;
}

interface CustomerCategoryGrouped {
  id: string;
  main_category: string;
  sub_categories: SubCategoryOption[];
  ideal_prices?: Record<string, Record<string, number>>;
  modifiers?: Record<string, Record<string, ModifierValue>>;
}

interface CartItem {
  id: string;
  category: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  category_fields?: Record<string, string>;
}

const BULK_MIN_QTY = 5;

// Looks up the price for the selected options + quantity tier. "Base" sub-categories
// (not flagged is_modifier) form the priced combination (bulk 5+ rate once quantity
// reaches it, else 1-piece); "modifier" sub-categories (Sleeves, Size Type...) are
// adjustments applied on top: final = (base + sum of flat adjustments) × product of
// multiply adjustments. Returns null until quantity + every option is selected, or
// when nothing is fixed for that exact base combination yet.
function lookupIdealPrice(
  categoryData: CustomerCategoryGrouped | undefined,
  dynamicCategoryFields: Record<string, string>,
  quantity: number | ''
): number | null {
  if (!categoryData?.ideal_prices) return null;

  // Quantity must be entered first — it's what decides which tier (bulk vs
  // single-piece) applies, so no price should be suggested before it's known.
  if (quantity === '' || quantity <= 0) return null;

  // Optional sub-categories (Rib, Zip...) don't block the price - only required
  // (non-optional) fields need to be selected.
  const allSelected = categoryData.sub_categories
    .filter(sc => !sc.is_optional)
    .every(sc => !!dynamicCategoryFields[sc.sub_category]);
  if (!allSelected) return null;

  const baseSubCats = categoryData.sub_categories.filter(sc => !sc.is_modifier);
  const modifierSubCats = categoryData.sub_categories.filter(sc => sc.is_modifier);

  const combinationKey = baseSubCats.map(sc => dynamicCategoryFields[sc.sub_category]).join('|');
  const tiers = categoryData.ideal_prices[combinationKey];
  if (!tiers) return null;

  const basePrice = (quantity >= BULK_MIN_QTY && tiers[String(BULK_MIN_QTY)] !== undefined)
    ? tiers[String(BULK_MIN_QTY)]
    : tiers['1'];
  if (basePrice === undefined) return null;

  let flatSum = 0;
  let multiplyProduct = 1;
  for (const sc of modifierSubCats) {
    const selectedOption = dynamicCategoryFields[sc.sub_category];
    const modifier = categoryData.modifiers?.[sc.sub_category]?.[selectedOption];
    if (!modifier) continue;
    if (modifier.type === 'multiply') {
      multiplyProduct *= modifier.value;
    } else {
      flatSum += modifier.value;
    }
  }

  return (basePrice + flatSum) * multiplyProduct;
}

const QuotationPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerCategories, setCustomerCategories] = useState<CustomerCategoryGrouped[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [teamName, setTeamName] = useState('');
  const [requiredByDate, setRequiredByDate] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('');
  const [dynamicCategoryFields, setDynamicCategoryFields] = useState<Record<string, string>>({});
  // Whether the optional fields (Rib, Zip...) are revealed — hidden by default,
  // shown via the "+" button below the required fields.
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [priceWasAutoFilled, setPriceWasAutoFilled] = useState(false);
  const [quantity, setQuantity] = useState<number | ''>('');
  const [price, setPrice] = useState<number>(0);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [discount, setDiscount] = useState<number | ''>('');

  // PDF modal — shown right after creating a quotation instead of redirecting away
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [pdfFilename, setPdfFilename] = useState<string>('');
  // Blurred loading overlay while the PDF is being fetched — same pattern as
  // customer-invoice/page.tsx's loadingReceipt.
  const [loadingPdf, setLoadingPdf] = useState(false);

  // Fetched once so the rush charge can be previewed live in the UI, the same way
  // the backend will compute it on submit (deadline within threshold_days => rush).
  const [rushRatePerPiece, setRushRatePerPiece] = useState<number | null>(null);
  const [rushThresholdDays, setRushThresholdDays] = useState<number | null>(null);

  const categoryData = customerCategories.find(cat => cat.main_category === selectedCategory);
  const allOptionsSelected = !!categoryData && categoryData.sub_categories.length > 0 &&
    categoryData.sub_categories.filter(sc => !sc.is_optional).every(sc => !!dynamicCategoryFields[sc.sub_category]);
  const matchedIdealPrice = lookupIdealPrice(categoryData, dynamicCategoryFields, quantity);

  // Whenever the selected combination (or the quantity, which can flip the bulk
  // tier) resolves to a fixed price, fill it straight into the editable Rate field
  // — no separate read-only "ideal price" box. Staff can still type over it.
  useEffect(() => {
    if (matchedIdealPrice !== null) {
      setUnitPrice(matchedIdealPrice);
      setPriceWasAutoFilled(true);
    } else if (priceWasAutoFilled) {
      // The combination changed (e.g. a different Fabric option with no ideal price
      // set yet) and no longer matches - clear the stale auto-filled value instead of
      // carrying over the previous combination's price. A manually-typed price
      // (priceWasAutoFilled false) is left alone.
      setUnitPrice('');
      setPriceWasAutoFilled(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedIdealPrice]);

  useEffect(() => {
    fetchCustomers();
    fetchCustomerCategories();
    fetchRushSettings();
  }, []);

  useEffect(() => {
    if (unitPrice !== '' && quantity !== '') {
      setPrice(unitPrice * quantity);
    } else {
      setPrice(0);
    }
  }, [unitPrice, quantity]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers/viewcustomer?page=1&limit=1000', {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCustomers(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchCustomerCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await fetch('/api/customer-category/grouped', { method: 'GET', credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const categoriesData: CustomerCategoryGrouped[] = data.data || [];

        // FOR TESTING ONLY - NOT FINAL: T-shirt pricing isn't in the DB yet (Ideal
        // Prices table is empty), so it's overridden here with locally-given numbers
        // instead of waiting on the DB. This must move to the DB later - once real
        // prices are entered via /ideal-pricing, remove this override so T-shirt
        // reads from the DB like every other category.
        const withLocalOverride = categoriesData.map(cat => {
          if (cat.main_category === LOCAL_TSHIRT_CATEGORY_NAME) {
            return { ...cat, ideal_prices: LOCAL_TSHIRT_IDEAL_PRICES, modifiers: LOCAL_TSHIRT_MODIFIERS };
          }
          if (cat.main_category === LOCAL_SHORT_CATEGORY_NAME) {
            return { ...cat, ideal_prices: LOCAL_SHORT_IDEAL_PRICES, modifiers: LOCAL_SHORT_MODIFIERS };
          }
          if (cat.main_category === LOCAL_TROUSER_CATEGORY_NAME) {
            return { ...cat, ideal_prices: LOCAL_TROUSER_IDEAL_PRICES, modifiers: LOCAL_TROUSER_MODIFIERS };
          }
          if (cat.main_category === LOCAL_JACKET_CATEGORY_NAME) {
            return { ...cat, ideal_prices: LOCAL_JACKET_IDEAL_PRICES, modifiers: LOCAL_JACKET_MODIFIERS };
          }
          if (cat.main_category === LOCAL_HOODIE_JACKET_CATEGORY_NAME) {
            return { ...cat, ideal_prices: LOCAL_HOODIE_JACKET_IDEAL_PRICES, modifiers: LOCAL_HOODIE_JACKET_MODIFIERS };
          }
          if (cat.main_category === LOCAL_SANDO_CATEGORY_NAME) {
            return { ...cat, ideal_prices: LOCAL_SANDO_IDEAL_PRICES, modifiers: LOCAL_SANDO_MODIFIERS };
          }
          return cat;
        });

        setCustomerCategories(withLocalOverride);
      }
    } catch (error) {
      console.error('Error fetching customer categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchRushSettings = async () => {
    // FOR TESTING ONLY - NOT FINAL: using the locally-given rush rate instead of the
    // DB-backed /api/rush-pricing/ endpoint. This must move to the DB later - once
    // this rate is saved via the Ideal Pricing page's Rush Order Rule box, switch
    // back to fetching from /api/rush-pricing/.
    setRushRatePerPiece(LOCAL_RUSH_PRICING.price_per_piece);
    setRushThresholdDays(LOCAL_RUSH_PRICING.threshold_days);
  };

  const clearItemForm = () => {
    setSelectedCategory('');
    setUnitPrice('');
    setPriceWasAutoFilled(false);
    setQuantity('');
    setPrice(0);
    setDynamicCategoryFields({});
    setShowOptionalFields(false);
  };

  const addToCart = () => {
    if (!selectedCategory) {
      showToast('Please select a category', 'error');
      return;
    }

    if (categoryData && categoryData.sub_categories.length > 0) {
      // Optional sub-categories (Rib, Zip...) are fine left blank.
      const missingFields = categoryData.sub_categories.filter(
        sc => !sc.is_optional && (!dynamicCategoryFields[sc.sub_category] || !dynamicCategoryFields[sc.sub_category].trim())
      );
      if (missingFields.length > 0) {
        showToast(`Please select: ${missingFields.map(sc => sc.sub_category).join(', ')}`, 'error');
        return;
      }
    }

    if (unitPrice === '' || unitPrice <= 0) {
      showToast('Please enter a valid unit price', 'error');
      return;
    }
    if (quantity === '' || quantity <= 0) {
      showToast('Please enter a valid quantity', 'error');
      return;
    }

    const newItem: CartItem = {
      id: Date.now().toString(),
      category: selectedCategory,
      unitPrice,
      quantity,
      totalPrice: price,
      category_fields: { ...dynamicCategoryFields },
    };

    setCart([...cart, newItem]);
    clearItemForm();
    showToast('Item added', 'success');
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalPieces = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Live preview of what the backend will compute on submit: rush applies when the
  // deadline falls within threshold_days of today (inclusive), charged per piece
  // across the whole cart.
  let estimatedIsRush = false;
  if (requiredByDate && rushThresholdDays !== null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(`${requiredByDate}T00:00:00`);
    const daysUntil = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    estimatedIsRush = daysUntil <= rushThresholdDays;
  }
  const estimatedRushCharge = estimatedIsRush && rushRatePerPiece !== null ? rushRatePerPiece * totalPieces : 0;
  const estimatedTotal = cartSubtotal - (discount || 0) + estimatedRushCharge;

  const handleSubmit = async () => {
    if (cart.length === 0) {
      showToast('Please add at least one item', 'error');
      return;
    }
    if (!selectedCustomer) {
      showToast('Please select a customer', 'error');
      return;
    }
    if (!teamName.trim()) {
      showToast('Please enter team name', 'error');
      return;
    }
    if (!requiredByDate) {
      showToast('Please enter the deadline (Required By date)', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const customer = customers.find(c => c.cus_id === selectedCustomer);

      const items = cart.map(item => ({
        pro_name: item.category,
        cat_name: item.category,
        unit_price: item.unitPrice,
        pro_quantity: item.quantity,
        total_price: item.totalPrice,
        category_fields: JSON.stringify(item.category_fields || {}),
      }));

      const payload = {
        customer_id: selectedCustomer || null,
        customer_name: customer?.cus_name || null,
        team_name: teamName || null,
        items: JSON.stringify(items),
        required_by_date: requiredByDate,
        discounts: discount || 0,
      };

      const response = await fetch('/api/quotation/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        await Swal.fire({
          title: 'Quotation Created!',
          html: `<p><strong>${result.quotation_no}</strong></p>` +
                (result.is_rush ? `<p style="color:#B91C1C;font-weight:bold;">RUSH ORDER — Rs. ${result.rush_charge} rush charge applied</p>` : '<p>Normal order (not rush)</p>') +
                `<p>Total: Rs. ${result.total_amount}</p>`,
          icon: 'success',
        });
        setCart([]);
        setSelectedCustomer('');
        setTeamName('');
        setRequiredByDate('');
        setDiscount('');

        // Same blob-building pattern as view-quotation/page.tsx's handleViewPdf —
        // show the PDF right here instead of redirecting to /view-quotation.
        setLoadingPdf(true);
        try {
          const pdfResponse = await fetch(`/api/quotation/${result.quotation_id}/pdf`, { method: 'GET', credentials: 'include' });
          const pdfResult = await pdfResponse.json();
          if (pdfResponse.ok && pdfResult.pdf_base64) {
            const byteChars = atob(pdfResult.pdf_base64);
            const byteNumbers = new Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
            const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
            setPdfFilename(pdfResult.filename || 'quotation.pdf');
            setShowPdfModal(true);
          }
        } catch (pdfError) {
          console.error('Error loading PDF:', pdfError);
        } finally {
          setLoadingPdf(false);
        }
      } else {
        showToast(result.error || result.detail || 'Failed to create quotation', 'error');
      }
    } catch (error) {
      console.error('Error creating quotation:', error);
      showToast('Failed to create quotation', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[98%] md:max-w-[95%] mx-auto px-2 md:px-4 py-4">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-regal-black">New Quotation</h1>
          <p className="text-sm text-gray-500 mt-0.5">A price offer for the customer — converts into a real order once approved.</p>
        </div>
        <button onClick={() => router.push('/view-quotation')} className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap">
          View Quotations
        </button>
      </div>

      {/* Left: build what's being ordered (category, options, price, quantity) first.
          Right: cart on top, customer/deadline + submit at the bottom — same split as
          the Customer Invoice builder, so item entry always comes before customer info. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

        {/* Left Side - Add Item Form */}
        <div className="lg:col-span-1">
          <div className="regal-card p-3 md:p-6 sticky lg:top-16">
            <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Add Item</h2>

            <div className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                {loadingCategories ? (
                  <div className="animate-pulse h-10 bg-gray-200 rounded"></div>
                ) : (
                  <select
                    value={selectedCategory}
                    onChange={(e) => { setSelectedCategory(e.target.value); setDynamicCategoryFields({}); setUnitPrice(''); setPriceWasAutoFilled(false); setShowOptionalFields(false); }}
                    className="regal-input w-full"
                  >
                    <option value="">-- Select Category --</option>
                    {customerCategories.map((cat) => (
                      <option key={cat.id} value={cat.main_category}>{cat.main_category}</option>
                    ))}
                  </select>
                )}
              </div>

              {selectedCategory && categoryData && (
                <div className="p-4 bg-regal-yellow rounded">
                  <h3 className="text-sm font-semibold text-regal-black border-b-2 border-regal-black pb-2 mb-3">{selectedCategory}</h3>
                  <div className="grid grid-cols-2 gap-3">
                  {categoryData.sub_categories.filter(subCat => !subCat.is_optional).map((subCat, index) => (
                    <div key={index}>
                      <label className="block text-sm font-medium text-regal-black mb-1">{subCat.sub_category}</label>
                      <select
                        value={dynamicCategoryFields[subCat.sub_category] || ''}
                        onChange={(e) => setDynamicCategoryFields(prev => ({ ...prev, [subCat.sub_category]: e.target.value }))}
                        className="regal-input w-full"
                      >
                        <option value="">Select {subCat.sub_category}</option>
                        {subCat.options.map((option, optIndex) => (
                          <option key={optIndex} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  </div>

                  {/* Optional fields (Rib, Zip...) — hidden by default, revealed via "+" */}
                  {categoryData.sub_categories.some(subCat => subCat.is_optional) && (
                    <div className="mt-3 pt-3 border-t border-regal-black/20">
                      {!showOptionalFields ? (
                        <button
                          type="button"
                          onClick={() => setShowOptionalFields(true)}
                          className="text-sm font-medium text-regal-black flex items-center gap-1 hover:underline"
                        >
                          <span className="text-lg leading-none">+</span> More options
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setShowOptionalFields(false)}
                            className="text-xs text-regal-black/70 hover:underline mb-2"
                          >
                            − Hide more options
                          </button>
                          <div className="grid grid-cols-2 gap-3">
                            {categoryData.sub_categories.filter(subCat => subCat.is_optional).map((subCat, index) => (
                              <div key={index}>
                                <label className="block text-sm font-medium text-regal-black mb-1">
                                  {subCat.sub_category} <span className="text-xs font-normal text-regal-black/60">(optional)</span>
                                </label>
                                <select
                                  value={dynamicCategoryFields[subCat.sub_category] || ''}
                                  onChange={(e) => setDynamicCategoryFields(prev => ({ ...prev, [subCat.sub_category]: e.target.value }))}
                                  className="regal-input w-full"
                                >
                                  <option value="">Select {subCat.sub_category}</option>
                                  {subCat.options.map((option, optIndex) => (
                                    <option key={optIndex} value={option}>{option}</option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))} className="regal-input w-full" min="1" step="1" placeholder="0" />
                <p className="text-xs text-gray-500 mt-1">Enter quantity first — it decides whether the bulk (5+) or single-piece rate applies.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Rate (Unit Price)</label>
                <input
                  type="number"
                  value={unitPrice}
                  onChange={(e) => { setUnitPrice(e.target.value === '' ? '' : Number(e.target.value)); setPriceWasAutoFilled(false); }}
                  className="regal-input w-full"
                  min="0"
                  step="1"
                  placeholder="0"
                />
                {allOptionsSelected && matchedIdealPrice !== null && priceWasAutoFilled && (
                  <p className="text-xs font-normal text-green-700 mt-1">✓ filled from price list</p>
                )}
                {allOptionsSelected && matchedIdealPrice === null && (quantity === '' || quantity <= 0) && (
                  <p className="text-xs text-gray-500 mt-1">Enter quantity above to see the fixed price for this combination.</p>
                )}
                {allOptionsSelected && matchedIdealPrice === null && quantity !== '' && quantity > 0 && (
                  <p className="text-xs text-amber-600 mt-1">No fixed price set for this combination — enter manually.</p>
                )}
                {quantity !== '' && quantity > 0 && (
                  <p className={`text-xs mt-1 font-medium ${quantity >= BULK_MIN_QTY ? 'text-purple-700' : 'text-gray-500'}`}>
                    {quantity >= BULK_MIN_QTY
                      ? `Bulk rate — charged as ${BULK_MIN_QTY}+ pieces`
                      : 'Single piece rate — normal charge'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Line Total</label>
                <input type="text" value={price} disabled className="regal-input w-full bg-gray-100 font-semibold" />
              </div>

              <button onClick={addToCart} className="regal-btn bg-regal-yellow text-regal-black w-full">
                + Add to Quotation
              </button>
            </div>
          </div>
        </div>

        {/* Right Side - Items Table (Top) + Customer & Deadline + Submit (Bottom) */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">

          <div className="regal-card p-3 md:p-6" style={{ minHeight: '220px' }}>
            <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Items ({cart.length})</h2>
            {cart.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">No items added yet — build the order on the left.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Rate</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {cart.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.category}</div>
                          {item.category_fields && Object.keys(item.category_fields).length > 0 && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {Object.entries(item.category_fields).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">{item.unitPrice}</td>
                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-right font-medium">{item.totalPrice}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => removeFromCart(item.id)} className="text-red-600 hover:underline text-xs">Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="regal-card p-3 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Customer & Deadline</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer *</label>
                  <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} className="regal-input w-full" required>
                    <option value="">Select Customer</option>
                    {customers.map((c) => (
                      <option key={c.cus_id} value={c.cus_id}>{c.cus_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Team Name *</label>
                  <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} className="regal-input w-full" placeholder="e.g. City Warriors FC" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Deadline (Required By) *
                    {estimatedIsRush && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">RUSH</span>
                    )}
                  </label>
                  <input type="date" value={requiredByDate} onChange={(e) => setRequiredByDate(e.target.value)} className="regal-input w-full" min={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Rush status and rush charge are decided automatically from the deadline above — there is no manual "Rush" toggle.
                {rushThresholdDays !== null && ` A deadline within ${rushThresholdDays} day(s) of today makes it a rush order.`}
              </p>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
                <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
                  <span>Subtotal ({totalPieces} pcs)</span>
                  <span>Rs. {cartSubtotal}</span>
                </div>
                {estimatedIsRush && (
                  <div className="flex justify-between text-sm text-red-700 font-medium mb-2">
                    <span>Rush Charge (Rs. {rushRatePerPiece ?? 0} × {totalPieces} pcs)</span>
                    <span>+ Rs. {estimatedRushCharge}</span>
                  </div>
                )}
                {/* Discount UI hidden for now — state/calc/payload still wired, just not shown.
                <div className="flex justify-between items-center text-sm mb-2">
                  <label htmlFor="quotation-discount" className="text-gray-600">Discount</label>
                  <div className="flex items-center rounded-lg overflow-hidden">
                    <span className="px-2 py-1.5 text-green-700 font-semibold text-sm">− Rs.</span>
                    <input
                      id="quotation-discount"
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-20 px-2 py-1.5 text-sm text-right border-0 focus:ring-0 focus:outline-none"
                      min="0"
                      max={cartSubtotal || undefined}
                      step="1"
                      placeholder="0"
                    />
                  </div>
                </div>
                */}
                <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-gray-200">
                  <span>Estimated Total</span>
                  <span>Rs. {estimatedTotal}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || cart.length === 0}
                className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed w-full py-3 text-lg font-semibold"
              >
                {submitting ? 'Creating...' : 'Create Quotation'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {loadingPdf && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg px-8 py-6 shadow-xl flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-regal-orange" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-regal-black font-medium">Loading quotation PDF...</span>
          </div>
        </div>
      )}

      {/* PDF Modal — same pattern as view-quotation/page.tsx and duplicate-bill/page.tsx */}
      {showPdfModal && pdfUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={() => setShowPdfModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[95vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Quotation PDF</h2>
              <button
                onClick={() => setShowPdfModal(false)}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <iframe
              src={pdfUrl}
              className="w-full h-[80vh] border-2 border-gray-300 rounded-lg"
              title={pdfFilename}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationPage;
