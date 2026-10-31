'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { apiErrorMessage } from '@/lib/apiError';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import ReportModal from '@/components/ui/ReportModal';
import { ProductsApi } from '@/lib/api/products';
import {
  CustomerCategoryGrouped,
  PricedLine,
  tierForQuantity,
  isQtyTier, tierRangeLabel,
  lookupIdealPrice,
  piecesOfCategory,
  repriceCart,
  mockupLines,
  categoryTierSummaries,
  kitFlatDefault,
  findArticle,
  ReadyArticle,
  isDyeLine,
  dyePiecesOfCategory,
  formDyePieces,
  lineDyeMultiplier,
  teamsIn,
  mockupKey,
  MockupLine,
  MOCKUP_MAX_PIECES,
} from '@/lib/quantityPricing';
import { QuantityTierCards } from '@/components/QuantityTierCards';
import TeamSearchInput, { KitKindChips } from '@/components/TeamSearchInput';
import { AmountInput, QtyInput } from '@/components/CartNumberInputs';
import { DtfSettings, DtfLogo, DtfResult, computeDtf, dtfLogosLabel, dtfTotalOf, metersLabel } from '@/lib/dtfLayout';
import { DtfLogoBox } from '@/components/DtfLogos';
import AddCustomerModal from '@/components/AddCustomerModal';
import ProofImagePicker from '@/components/ProofImagePicker';
import { PAYMENT_METHODS, isOnlineMethod, uploadProofImages } from '@/lib/paymentMethods';

interface Customer {
  cus_id: string;
  cus_name: string;
  cus_phone: string;
}

// Pricing (tiers from all pieces of a category, re-pricing, mockup) is shared with
// the Quotation page - see lib/quantityPricing.ts.
interface CartItem extends PricedLine {
  // Cloudinary image URLs
  image1: string | null;
  image2: string | null;
  image3: string | null;
  // Every line has a team (Team Name above the item form) - flat charges and rate
  // tiers are counted per team. `group` = id of the line it was added from with
  // "+ Similar"; it is listed right under that line.
  team: string;
  group?: string | null;
}

// Cart filter: all teams together (default) or one team.
const ALL_TEAMS = '__all_teams__';

// Trimmed, single-spaced, no "|" (used in the flat charge keys); 100 chars like the backend.
const cleanTeamName = (value: string) => value.replace(/\|/g, ' ').trim().replace(/\s+/g, ' ').slice(0, 100);

// Cart lines in display/save order: teams in the order they were first added; in each
// team the lines in order, with each line's "+ Similar" lines right under it.
const orderedLines = (cart: CartItem[]): CartItem[] => {
  const ids = new Set(cart.map(i => i.id));
  return teamsIn(cart).flatMap(team => {
    const lines = cart.filter(i => i.team === team);
    const firsts = lines.filter(i => !i.group || !ids.has(i.group));
    return firsts.flatMap(first => [first, ...lines.filter(i => i.group === first.id)]);
  });
};

// Dynamic Category Fields Component - Shows ideal price when all options selected
const DynamicCategoryFields: React.FC<{
  selectedCategory: string;
  customerCategories: CustomerCategoryGrouped[];
  dynamicCategoryFields: Record<string, string>;
  setDynamicCategoryFields: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  tierPieces: number | ''; // this item's quantity + pieces of this category already in the cart
  dyePieces: number;       // dye pieces of this category incl. this item (0 when not dye)
  onIdealPriceChange?: (price: number) => void;
  // DTF logos box (categories with dtf_enabled) - state lives in the page so Add to Invoice can use it
  dtfLogos: DtfLogo[];
  onDtfLogosChange: (logos: DtfLogo[]) => void;
  dtfResult: DtfResult;
  quantity: number | '';
}> = ({ selectedCategory, customerCategories, dynamicCategoryFields, setDynamicCategoryFields, tierPieces, dyePieces, onIdealPriceChange, dtfLogos, onDtfLogosChange, dtfResult, quantity }) => {
  // Whether the optional fields (Rib, Zip...) are revealed - hidden by default,
  // shown via the "+" button below the required fields.
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  // Find the selected category in the categories list
  const categoryData = customerCategories.find(cat => cat.main_category === selectedCategory);

  // Handle change in a sub-category dropdown
  const handleSubCategoryChange = (subCategory: string, value: string) => {
    setDynamicCategoryFields(prev => ({
      ...prev,
      [subCategory]: value
    }));
  };

  // Price for the selected options at the tier of all this category's pieces (see
  // lookupIdealPrice in lib/quantityPricing.ts).
  const idealPrice = lookupIdealPrice(categoryData, dynamicCategoryFields, tierPieces, dyePieces);

  // Notify parent of ideal price change (re-evaluates whenever quantity crosses the bulk tier)
  useEffect(() => {
    if (onIdealPriceChange && idealPrice !== null) {
      onIdealPriceChange(idealPrice);
    }
  }, [idealPrice, onIdealPriceChange]);

  // After the hooks: hooks must run in the same order on every render.
  if (!categoryData) return null;

  return (
    <div className="space-y-4 p-4 bg-regal-yellow rounded">
      <h3 className="text-md font-semibold text-regal-black border-b-2 border-regal-black pb-2">
        {selectedCategory}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categoryData.sub_categories.filter(subCat => !subCat.is_optional).map((subCat, index) => (
          <div key={index} className="space-y-1">
            <label className="block text-sm font-medium text-regal-black">
              {subCat.sub_category}:
            </label>
            <select
              value={dynamicCategoryFields[subCat.sub_category] || ''}
              onChange={(e) => handleSubCategoryChange(subCat.sub_category, e.target.value)}
              className="regal-input w-full"
              required
            >
              <option value="">Select {subCat.sub_category}</option>
              {subCat.options.map((option, optIndex) => (
                <option key={optIndex} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Optional fields (Rib, Zip...) and DTF logos - hidden by default, revealed via "+" */}
      {(categoryData.sub_categories.some(subCat => subCat.is_optional) || categoryData.dtf_enabled) && (
        <div className="pt-2 border-t border-regal-black/20">
          {!showOptionalFields ? (
            <button
              type="button"
              onClick={() => setShowOptionalFields(true)}
              className="text-sm font-medium text-regal-black flex items-center gap-1 hover:underline"
            >
              <span className="text-lg leading-none">+</span> More options{categoryData.dtf_enabled && ' (DTF logos)'}
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
              {categoryData.sub_categories.some(subCat => subCat.is_optional) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryData.sub_categories.filter(subCat => subCat.is_optional).map((subCat, index) => (
                  <div key={index} className="space-y-1">
                    <label className="block text-sm font-medium text-regal-black">
                      {subCat.sub_category}: <span className="text-xs font-normal text-regal-black/60">(optional)</span>
                    </label>
                    <select
                      value={dynamicCategoryFields[subCat.sub_category] || ''}
                      onChange={(e) => handleSubCategoryChange(subCat.sub_category, e.target.value)}
                      className="regal-input w-full"
                    >
                      <option value="">Select {subCat.sub_category}</option>
                      {subCat.options.map((option, optIndex) => (
                        <option key={optIndex} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              )}
              {categoryData.dtf_enabled && (
                <DtfLogoBox
                  category={selectedCategory}
                  logos={dtfLogos}
                  onChange={onDtfLogosChange}
                  result={dtfResult}
                  quantity={quantity}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* {(() => {
        const allSelected = categoryData.sub_categories.every(sc => !!dynamicCategoryFields[sc.sub_category]);
        const hasQuantity = typeof quantity === 'number' && quantity > 0;
        if (!allSelected) return null;
        if (!hasQuantity) {
          return <p className="text-xs text-regal-black mt-3">Enter quantity below to fill the fixed price into the Rate field.</p>;
        }
        if (idealPrice === null) {
          return <p className="text-xs text-amber-700 font-medium mt-3">No fixed price set for this combination - enter the Rate manually.</p>;
        }
        return (
          <p className="text-xs text-green-800 font-medium mt-3">
            ✓ Price filled into Rate field below ({tierForQuantity(quantity).label})
          </p>
        );
      })()} */}
    </div>
  );
};

const CustomerInvoicePage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();
  
  // Products API for image upload
  const productsApi = new ProductsApi();

  // Form state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [priceWasAutoFilled, setPriceWasAutoFilled] = useState(false);
  const [quantity, setQuantity] = useState<number | ''>('');
  const [price, setPrice] = useState<number>(0);
  
  // Image states - Cloudinary URLs
  const [image1Url, setImage1Url] = useState<string | null>(null);
  const [image2Url, setImage2Url] = useState<string | null>(null);
  const [image3Url, setImage3Url] = useState<string | null>(null);
  
  // Image upload states
  const [uploadingImage1, setUploadingImage1] = useState(false);
  const [uploadingImage2, setUploadingImage2] = useState(false);
  const [uploadingImage3, setUploadingImage3] = useState(false);
  
  // File input keys for forcing re-render
  const [image1Key, setImage1Key] = useState(0);
  const [image2Key, setImage2Key] = useState(0);
  const [image3Key, setImage3Key] = useState(0);
  
  // Image modal state
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  // Team Name box at the top of the item form. Emptied after every Add; "+ Similar"
  // fills it with that line's team.
  const [teamInput, setTeamInput] = useState('');
  // Cart filter - ALL_TEAMS or one team name.
  const [cartView, setCartView] = useState(ALL_TEAMS);
  // Id of the line "+ Similar" was clicked on - the next Add goes right under it.
  const [similarOf, setSimilarOf] = useState<string | null>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const itemFormRef = useRef<HTMLDivElement>(null);
  const [requiredByDate, setRequiredByDate] = useState('');
  // Fetched once so the rush charge can be previewed live, the same way the
  // backend computes it on submit (deadline within threshold_days => rush).
  const [rushRatePerPiece, setRushRatePerPiece] = useState<number | null>(null);
  const [rushThresholdDays, setRushThresholdDays] = useState<number | null>(null);
  // Per-piece rush rate actually charged - pre-filled with the default above, but
  // editable by the cashier (like the item Rate field). Sent to the backend on save.
  const [rushRate, setRushRate] = useState<number | ''>('');
  // An emptied rush rate box counts as 0 (no rush charge), both here and on save.
  const rushRateValue = rushRate === '' ? 0 : rushRate;
  // Designing / mockup ("flat") charge per team and category with 1-4 pcs - each
  // category's own amount (customer_categories.mockup_charge), editable per order in the
  // cart. Keyed by mockupKey(team, category).
  const [mockupAmounts, setMockupAmounts] = useState<Record<string, number>>({});
  // Our ready articles (products without size) for the Team Name search and the kit flat.
  const [articles, setArticles] = useState<ReadyArticle[]>([]);
  // Default flat of a team + category: the category's own charge (e.g. Jacket 1000; not
  // set or 0 = none), or the kit flat / 0 for our ready article - see kitFlatDefault.
  const flatDefault = (category: string, team: string, items: PricedLine[] = cart) =>
    kitFlatDefault(items, customerCategories, articles, category, team);
  const mockupDefaultFor = (category: string, team: string, items: PricedLine[] = cart) => flatDefault(category, team, items).amount;
  const mockupAmountOf = (team: string, category: string) => mockupAmounts[mockupKey(team, category)] ?? mockupDefaultFor(category, team);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [proofFiles, setProofFiles] = useState<File[]>([]); // screenshots of an online payment
  const [balance, setBalance] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [submitting, setSubmitting] = useState(false);
  // Idempotency: identifies one checkout attempt so a lost-response retry (or a
  // resubmit after a page refresh) is recognized by the backend instead of creating
  // a duplicate invoice. Cleared as soon as create() confirms success (returns an
  // invoice_id) - after that point there's no more duplicate-creation risk.
  const idempotencyKeyRef = useRef<string | null>(null);
  const CUSTOMER_PENDING_KEY_STORAGE = 'customer-invoice-pending-key';
  // True while resolving a leftover pending key from localStorage on page load. Submit
  // stays disabled until this resolves, otherwise a fresh submit could race the check.
  const [checkingPendingInvoice, setCheckingPendingInvoice] = useState(false);
  const [pendingCheckError, setPendingCheckError] = useState(false);
  // True while fetchAndShowCustomerReceipt() is in flight - shows a full-screen
  // blurred loading overlay so the cashier isn't left staring at a blank screen
  // while the PDF (a separate, sometimes-slow call) is generated and fetched.
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  // Separate from the idempotency key above: once create() succeeds there's no more
  // duplicate risk, but the receipt (PDF) step is a second, independent call that can
  // still fail or be interrupted by a refresh. This remembers "invoice X exists but its
  // receipt hasn't been shown yet" so a refresh can quietly recover it - unlike the
  // idempotency key, this never blocks Submit, since there's nothing ambiguous to guard.
  const CUSTOMER_LAST_CREATED_STORAGE = 'customer-invoice-last-created';

  // Add customer modal state
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  // Receipt modal state - using ReportModal component
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [invoiceIdForReceipt, setInvoiceIdForReceipt] = useState('');
  const [receiptPdfData, setReceiptPdfData] = useState('');

  // Customer categories state (dynamic)
  const [customerCategories, setCustomerCategories] = useState<CustomerCategoryGrouped[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  // Dynamic category fields state - stores selected option for each sub-category
  // Example: { "Neck Style": "Round", "Sleeve": "Full" }
  const [dynamicCategoryFields, setDynamicCategoryFields] = useState<Record<string, string>>({});

  // DTF logos (width x height on one piece) for a category with dtf_enabled - see lib/dtfLayout.ts.
  const [dtfLogos, setDtfLogos] = useState<DtfLogo[]>([]);
  const [dtfSettings, setDtfSettings] = useState<DtfSettings | null>(null);

  // Whenever the selected combination (or the quantity, which can flip the bulk
  // tier) resolves to a fixed price, it's filled straight into the editable Rate
  // field below - no separate read-only "ideal price" box. Staff can type over it.
  // Stable (useCallback): a new function every render re-ran the fill on every keystroke,
  // so a typed rate (1000 -> 950) went straight back to the ideal price.
  const handleIdealPriceChange = useCallback((price: number) => {
    setUnitPrice(price);
    setPriceWasAutoFilled(true);
  }, []);

  // Teams in the order they were first added; a team leaves when its last line is removed.
  const teams = teamsIn(cart);
  // The typed name, matched to a team already in the cart (or one of our articles)
  // regardless of case/spaces.
  const typedTeam = cleanTeamName(teamInput);
  const activeTeam = teams.find(t => t.toLowerCase() === typedTeam.toLowerCase()) ?? findArticle(articles, typedTeam)?.name ?? typedTeam;
  const activeArticle = findArticle(articles, activeTeam);
  const similarLine = similarOf ? cart.find(i => i.id === similarOf) ?? null : null;

  // The tier comes from every piece of this category in this team: what's already in
  // the cart for the team + the quantity being entered.
  const piecesAlreadyInCart = selectedCategory ? piecesOfCategory(cart, selectedCategory, activeTeam) : 0;
  const tierPieces: number | '' = quantity === '' ? '' : quantity + piecesAlreadyInCart;
  const selectedCategoryData = customerCategories.find(cat => cat.main_category === selectedCategory);
  const entryIsDye = isDyeLine(customerCategories.find(c => c.main_category === selectedCategory), dynamicCategoryFields);
  const entryDyePieces = formDyePieces(cart, customerCategories, selectedCategory, dynamicCategoryFields, quantity, activeTeam);
  const matchedIdealPrice = lookupIdealPrice(selectedCategoryData, dynamicCategoryFields, tierPieces, entryDyePieces);
  // Roll layout + charge for the logos being entered, re-worked on every keystroke.
  const dtfResult = useMemo(
    () => (selectedCategoryData?.dtf_enabled ? computeDtf(dtfLogos, quantity, dtfSettings) : computeDtf([], '', null)),
    [selectedCategoryData?.dtf_enabled, dtfLogos, quantity, dtfSettings]
  );
  const dtfTotal = dtfTotalOf(cart);

  const mockups = mockupLines(cart, customerCategories, mockupAmounts, mockupDefaultFor);
  const mockupTotal = mockups.reduce((sum, m) => sum + m.amount, 0);
  const linesMissingPrice = cart.filter(item => item.missingTierPrice);

  // MOQ Charges of the line being entered = what it adds to its team + category's flat
  // (0 when that flat is already in the cart, or for a free kit line). Price (Total) adds it.
  const moq = (() => {
    if (!activeTeam || !selectedCategory || quantity === '' || quantity <= 0) return { amount: 0, reason: '' };
    const key = mockupKey(activeTeam, selectedCategory);
    const before = mockups.find(m => m.key === key);
    const withLine: PricedLine[] = [...cart, {
      id: '__new__', category: selectedCategory, unitPrice: unitPrice || 0, quantity, totalPrice: price,
      category_fields: { ...dynamicCategoryFields }, autoPriced: false, team: activeTeam,
    }];
    const after = mockupLines(withLine, customerCategories, mockupAmounts, mockupDefaultFor).find(m => m.key === key);
    if (before) return { amount: 0, reason: `Already added for ${activeTeam} · ${selectedCategory} (Rs. ${before.amount})` };
    if (after) return { amount: after.amount, reason: flatDefault(selectedCategory, activeTeam, withLine).reason };
    if (tierPieces !== '' && tierPieces > MOCKUP_MAX_PIECES) return { amount: 0, reason: `${tierPieces} pcs (${MOCKUP_MAX_PIECES + 1}+) - no MOQ charges` };
    if (entryIsDye) return { amount: 0, reason: 'Dye - the dye rate applies instead' };
    const kit = flatDefault(selectedCategory, activeTeam, withLine);
    return { amount: 0, reason: kit.amount === 0 && findArticle(articles, activeTeam) ? kit.reason : '' };
  })();

  // Per team: its lines (display order), pieces, flat charges and total (lines + flat + DTF).
  const teamBlocks = teams.map(team => {
    const lines = orderedLines(cart).filter(i => i.team === team);
    const flats: MockupLine[] = mockups.filter(m => m.team === team);
    const flatTotal = flats.reduce((sum, m) => sum + m.amount, 0);
    return {
      team,
      lines,
      flats,
      flatTotal,
      pieces: lines.reduce((sum, i) => sum + i.quantity, 0),
      total: lines.reduce((sum, i) => sum + i.totalPrice, 0) + flatTotal + dtfTotalOf(lines),
      tierSummaries: categoryTierSummaries(cart, customerCategories, c => mockupAmountOf(team, c), c => mockupDefaultFor(c, team) > 0, team),
    };
  });
  const shownBlocks = cartView === ALL_TEAMS ? teamBlocks : teamBlocks.filter(b => b.team === cartView);

  // Fetch customers and customer categories
  useEffect(() => {
    fetchCustomers();
    fetchCustomerCategories();
    fetchRushSettings();
    fetchDtfSettings();
    fetchArticles();
  }, []);

  // Fetch a receipt PDF for an already-created invoice and show it. This is a plain
  // read (no side effects), so unlike the create step it's always safe to retry.
  // Fetches explicitly (rather than handing reportUrl to ReportModal) so the caller
  // knows whether it actually succeeded, e.g. to decide whether to clear the
  // "receipt not shown yet" recovery record.
  const fetchAndShowCustomerReceipt = async (invoiceId: string): Promise<boolean> => {
    setLoadingReceipt(true);
    try {
      const res = await fetch(`/api/customerinvoice/receipt/${invoiceId}`, {
        method: 'POST',
        credentials: 'include',
        // A stalled connection (e.g. internet drops mid-request) can otherwise hang
        // indefinitely - fetch() doesn't fail on its own until the request settles,
        // so without this the loading overlay could get stuck forever.
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) return false;
      const data = await res.json();
      const pdf = typeof data === 'string' ? data : data.pdf;
      if (!pdf) return false;
      setReceiptPdfData(pdf);
      setInvoiceIdForReceipt(invoiceId);
      setShowReceiptModal(true);
      return true;
    } catch {
      return false;
    } finally {
      setLoadingReceipt(false);
    }
  };

  // On load, resolve any "pending" checkout attempt left over from a previous visit
  // (its response never arrived - e.g. lost connection or the page was refreshed
  // mid-submit). We never guess from cart content - we ask the backend for the
  // authoritative outcome, then clear the pending key either way. Submit stays
  // disabled until this resolves so a fresh submit can't race it.
  const resolvePendingInvoice = async () => {
    let pendingKey: string | null = null;
    try {
      pendingKey = localStorage.getItem(CUSTOMER_PENDING_KEY_STORAGE);
    } catch {
      pendingKey = null;
    }
    if (!pendingKey) return;

    setCheckingPendingInvoice(true);
    setPendingCheckError(false);
    try {
      const res = await fetch(`/api/customerinvoice/by-idempotency-key/${pendingKey}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (res.status === 404) {
        // That attempt never actually reached the database - safe to discard.
        idempotencyKeyRef.current = null;
        try { localStorage.removeItem(CUSTOMER_PENDING_KEY_STORAGE); } catch { /* ignore */ }
        setCheckingPendingInvoice(false);
        return;
      }

      if (!res.ok) {
        // Ambiguous (server error) - don't guess, let the user retry the check.
        setPendingCheckError(true);
        setCheckingPendingInvoice(false);
        return;
      }

      const data = await res.json();
      idempotencyKeyRef.current = null;
      try { localStorage.removeItem(CUSTOMER_PENDING_KEY_STORAGE); } catch { /* ignore */ }

      showToast(`Your last invoice was already created: ${data.invoice_no}`, 'success');
      await fetchAndShowCustomerReceipt(data.invoice_id);
      setCheckingPendingInvoice(false);
    } catch {
      // Network still down - don't guess, keep the key and let the user retry.
      setPendingCheckError(true);
      setCheckingPendingInvoice(false);
    }
  };

  useEffect(() => {
    resolvePendingInvoice();
  }, []);

  // Separately, recover a receipt that never got shown (invoice creation itself
  // already succeeded - this is a plain re-fetch, so it never blocks Submit).
  // Called on mount, and again whenever the browser regains connectivity (see the
  // 'online' listener below) - so recovery doesn't require a manual refresh.
  const recoverLastCreatedReceipt = async () => {
    let stored: { invoiceId: string; invoiceNo: string } | null = null;
    try {
      stored = JSON.parse(localStorage.getItem(CUSTOMER_LAST_CREATED_STORAGE) || 'null');
    } catch {
      stored = null;
    }
    if (!stored) return;

    const shown = await fetchAndShowCustomerReceipt(stored.invoiceId);
    if (shown) {
      try { localStorage.removeItem(CUSTOMER_LAST_CREATED_STORAGE); } catch { /* ignore */ }
      showToast(`Recovered receipt for invoice ${stored.invoiceNo}`, 'success');
    }
    // If it still fails (e.g. net is still down), leave it - the 'online' event,
    // next mount, or Duplicate Bill, can recover it. We don't retry-loop or block.
  };

  useEffect(() => {
    recoverLastCreatedReceipt();

    // The browser fires this the moment connectivity is restored - retry right
    // then instead of making the cashier remember to refresh the page.
    window.addEventListener('online', recoverLastCreatedReceipt);
    return () => window.removeEventListener('online', recoverLastCreatedReceipt);
  }, []);

  const fetchCustomerCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await fetch('/api/customer-category/grouped', {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCustomerCategories(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching customer categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers/viewcustomer?page=1&limit=1000', {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        // Backend returns: { data: [...] }
        const customerList = Array.isArray(data.data) ? data.data : [];
        setCustomers(customerList);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchRushSettings = async () => {
    try {
      const response = await fetch('/api/rush-pricing/', { method: 'GET', credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setRushRatePerPiece(Number(data.price_per_piece));
        setRushThresholdDays(Number(data.threshold_days));
        setRushRate(Number(data.price_per_piece));
      }
    } catch (error) {
      console.error('Error fetching rush settings:', error);
    }
  };

  // DTF rule (Rs per 0.5 m, roll width, gap), saved on the Ideal Pricing page.
  // Our ready articles - new products show up here by themselves.
  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/ready-articles', { method: 'GET', credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setArticles(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Error fetching ready articles:', error);
    }
  };

  const fetchDtfSettings = async () => {
    try {
      const response = await fetch('/api/dtf-pricing/', { method: 'GET', credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setDtfSettings({
          price_per_half_meter: Number(data.price_per_half_meter),
          roll_width_in: Number(data.roll_width_in),
          gap_in: Number(data.gap_in),
        });
      }
    } catch (error) {
      console.error('Error fetching DTF settings:', error);
    }
  };

  // Calculate price when unit price or quantity changes
  useEffect(() => {
    if (unitPrice !== '' && quantity !== '') {
      setPrice(unitPrice * quantity);
    } else {
      setPrice(0);
    }
  }, [unitPrice, quantity]);

  // Calculate total and balance - rush charge (if the deadline falls within
  // threshold_days of today) is added the same way quotation.py's _build_totals
  // adds it; discount here stays purely informational (pre-existing behavior).
  useEffect(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalPieces = cart.reduce((sum, item) => sum + item.quantity, 0);

    let isRush = false;
    if (requiredByDate && rushThresholdDays !== null) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deadline = new Date(`${requiredByDate}T00:00:00`);
      const daysUntil = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      isRush = daysUntil <= rushThresholdDays;
    }
    const rushCharge = isRush ? rushRateValue * totalPieces : 0;

    const total = subtotal + rushCharge + mockupTotal + dtfTotal;
    setTotalAmount(total);
    const paidAmount = amountPaid === '' ? 0 : Number(amountPaid);
    setBalance(total - paidAmount);
  }, [cart, amountPaid, requiredByDate, rushThresholdDays, rushRateValue, mockupTotal, dtfTotal]);

  // Live preview for the RUSH badge/helper text next to the Deadline field -
  // same day-math as the useEffect above, just recomputed for render.
  const totalPieces = cart.reduce((sum, item) => sum + item.quantity, 0);
  let estimatedIsRush = false;
  let deadlineDaysLeft: number | null = null;
  if (requiredByDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(`${requiredByDate}T00:00:00`);
    deadlineDaysLeft = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (rushThresholdDays !== null) estimatedIsRush = deadlineDaysLeft <= rushThresholdDays;
  }
  const estimatedRushCharge = estimatedIsRush ? rushRateValue * totalPieces : 0;
  const deadlineLabel = deadlineDaysLeft === null ? ''
    : deadlineDaysLeft <= 0 ? 'today'
    : deadlineDaysLeft === 1 ? 'tomorrow'
    : `in ${deadlineDaysLeft} days`;

  // Convert file to base64 (keeping for backward compatibility if needed)
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Handle image upload to Cloudinary - Image 1
  const handleImage1Change = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingImage1(true);
      try {
        const { url } = await productsApi.uploadImage(file);
        setImage1Url(url);
      } catch (error) {
        console.error('Image upload error:', error);
        showToast('Failed to upload image 1', 'error');
        // Fallback - use local file
        const reader = new FileReader();
        reader.onloadend = () => {
          setImage1Url(reader.result as string);
        };
        reader.readAsDataURL(file);
      } finally {
        setUploadingImage1(false);
      }
    }
  };

  // Handle image upload to Cloudinary - Image 2
  const handleImage2Change = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingImage2(true);
      try {
        const { url } = await productsApi.uploadImage(file);
        setImage2Url(url);
      } catch (error) {
        console.error('Image upload error:', error);
        showToast('Failed to upload image 2', 'error');
        // Fallback
        const reader = new FileReader();
        reader.onloadend = () => {
          setImage2Url(reader.result as string);
        };
        reader.readAsDataURL(file);
      } finally {
        setUploadingImage2(false);
      }
    }
  };

  // Handle image upload to Cloudinary - Image 3
  const handleImage3Change = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingImage3(true);
      try {
        const { url } = await productsApi.uploadImage(file);
        setImage3Url(url);
      } catch (error) {
        console.error('Image upload error:', error);
        showToast('Failed to upload image 3', 'error');
        // Fallback
        const reader = new FileReader();
        reader.onloadend = () => {
          setImage3Url(reader.result as string);
        };
        reader.readAsDataURL(file);
      } finally {
        setUploadingImage3(false);
      }
    }
  };

  // Handle image deletion
  const handleDeleteImage = async (imageNumber: number) => {
    const result = await Swal.fire({
      title: 'Delete Image?',
      text: `Are you sure you want to delete image ${imageNumber}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        // Get the image URL to delete
        let imageUrlToDelete: string | null = null;
        if (imageNumber === 1) {
          imageUrlToDelete = image1Url;
        } else if (imageNumber === 2) {
          imageUrlToDelete = image2Url;
        } else if (imageNumber === 3) {
          imageUrlToDelete = image3Url;
        }

        // Delete from Cloudinary via backend if URL exists
        if (imageUrlToDelete && imageUrlToDelete.includes('cloudinary.com')) {
          await productsApi.deleteImage(imageUrlToDelete);
        }

        // Clear frontend state
        if (imageNumber === 1) {
          setImage1Url(null);
        } else if (imageNumber === 2) {
          setImage2Url(null);
        } else if (imageNumber === 3) {
          setImage3Url(null);
        }
        
        showToast(`Image ${imageNumber} deleted`, 'success');
      } catch (error) {
        console.error('Error deleting image:', error);
        showToast('Failed to delete image', 'error');
      }
    }
  };

  // Add item to cart
  const addToCart = async () => {
    if (!activeTeam) {
      showToast('Please enter team name', 'error');
      return;
    }
    // Validate category
    if (!selectedCategory) {
      showToast('Please select a category', 'error');
      return;
    }

    // Validate dynamic category fields for database categories
    const categoryData = customerCategories.find(cat => cat.main_category === selectedCategory);
    
    if (categoryData && categoryData.sub_categories.length > 0) {
      // Check if at least one sub-category option is selected
      const selectedOptions = Object.keys(dynamicCategoryFields);
      
      if (selectedOptions.length === 0) {
        showToast('Please select options for all sub-categories', 'error');
        return;
      }

      // Validate all required sub-categories have selected options - optional
      // ones (Rib, Zip...) are fine left blank.
      const missingFields = categoryData.sub_categories.filter(
        sc => !sc.is_optional && (!dynamicCategoryFields[sc.sub_category] || !dynamicCategoryFields[sc.sub_category].trim())
      );

      if (missingFields.length > 0) {
        const missingNames = missingFields.map(sc => sc.sub_category).join(', ');
        showToast(`Please select: ${missingNames}`, 'error');
        return;
      }
    }

    // Validate price and quantity
    if (unitPrice === '' || unitPrice <= 0) {
      showToast('Please enter a valid unit price', 'error');
      return;
    }
    if (quantity === '' || quantity <= 0) {
      showToast('Please enter a valid quantity', 'error');
      return;
    }
    if (dtfResult.status === 'error') {
      showToast(`DTF: ${dtfResult.message}`, 'error');
      return;
    }

    const newItem: CartItem = {
      id: Date.now().toString(),
      category: selectedCategory,
      unitPrice,
      quantity,
      totalPrice: price,
      // Cloudinary image URLs
      image1: image1Url,
      image2: image2Url,
      image3: image3Url,
      // Dynamic category fields - stores selected options for each sub-category
      category_fields: { ...dynamicCategoryFields },
      // Only a rate still equal to the price-list rate is re-priced later; a rate the
      // staff typed stays as typed.
      autoPriced: priceWasAutoFilled && matchedIdealPrice !== null && unitPrice === matchedIdealPrice,
      dtf: dtfResult.status === 'ok' ? dtfResult.block : null,
      team: activeTeam,
      // Listed under the "+ Similar" line only while it's still the same team and category.
      group: similarLine && similarLine.team === activeTeam && similarLine.category === selectedCategory ? similarLine.id : null,
    };

    updateCart([...cart, newItem]);

    // Clear form - Team Name stays (shown with its spelling), so the rest of the kit -
    // Short, Trouser - goes to the same team; clicking into the box selects it to type
    // another team.
    clearForm();
    setTeamInput(activeTeam);
    setSimilarOf(null);
  };

  // Every add/remove re-prices the auto-priced lines from their team + category's new
  // total. No toast - the change shows in the cart itself (tier cards, rate tags, mockup rows).
  const updateCart = (next: CartItem[]) => {
    const { items } = repriceCart(next, customerCategories);
    // A team + category that left the cart forgets its edited mockup amount.
    setMockupAmounts(prev => Object.fromEntries(Object.entries(prev).filter(([key]) => items.some(i => mockupKey(i.team, i.category) === key))));
    setCart(items);
    // A team whose last line was removed leaves the filter.
    if (cartView !== ALL_TEAMS && !items.some(i => i.team === cartView)) setCartView(ALL_TEAMS);
  };

  // For a line whose tier has no price in the list: the rate typed here makes it a
  // manual line (never re-priced) and clears the warning.
  const setLineRate = (id: string, rate: number) => {
    setCart(cart.map(item => item.id === id
      ? { ...item, unitPrice: rate, totalPrice: rate * item.quantity, autoPriced: false, missingTierPrice: false, previousUnitPrice: null, rateChange: null }
      : item));
  };

  // Qty edited in the cart: the line total, its team + category's rate tier (repriceCart),
  // MOQ and DTF all follow. False = not taken (bad qty, or a DTF that doesn't fit it).
  const setLineQty = (id: string, qty: number): boolean => {
    const item = cart.find(i => i.id === id);
    if (!item || !Number.isInteger(qty) || qty <= 0) return false;
    if (qty === item.quantity) return true;
    let dtf = item.dtf;
    if (dtf) {
      const result = computeDtf(dtf.logos, qty, dtfSettings);
      if (result.status !== 'ok') {
        showToast(`DTF: ${result.status === 'error' ? result.message : 'cannot work out the DTF for this qty'}`, 'error');
        return false;
      }
      const edited = dtf.amount !== dtf.charge;
      dtf = { ...result.block, amount: edited ? dtf.amount : result.block.charge };
    }
    updateCart(cart.map(i => (i.id === id ? { ...i, quantity: qty, totalPrice: i.unitPrice * qty, dtf } : i)));
    return true;
  };

  // DTF amount of one line, edited in its team's block in the cart (like the mockup amount).
  const setDtfAmount = (id: string, amount: number) => {
    setCart(cart.map(item => (item.id === id && item.dtf ? { ...item, dtf: { ...item.dtf, amount } } : item)));
  };

  // Clear form
  const clearForm = () => {
    setSelectedCategory('');
    setUnitPrice('');
    setPriceWasAutoFilled(false);
    setQuantity('');
    setPrice(0);
    // Clear images
    setImage1Url(null);
    setImage2Url(null);
    setImage3Url(null);
    // Reset file input keys to force re-render and clear file selection
    setImage1Key(prev => prev + 1);
    setImage2Key(prev => prev + 1);
    setImage3Key(prev => prev + 1);
    // Clear dynamic category fields
    setDynamicCategoryFields({});
    setDtfLogos([]);
  };

  // Remove item from cart. A first line removed: its first "+ Similar" line takes its
  // place and the rest of the group moves under that one.
  const removeFromCart = (id: string) => {
    const heir = cart.find(item => item.group === id);
    const next = cart.flatMap(item =>
      item.id === id ? (heir ? [{ ...heir, group: null }] : [])
      : heir && item.id === heir.id ? []
      : [item.group === id && heir ? { ...item, group: heir.id } : item]);
    if (similarOf === id) setSimilarOf(heir ? heir.id : null);
    updateCart(next);
  };

  // "+ Similar": the line's team, category and options go into the form; only the
  // quantity is left to enter. Images are not copied - deleting one in the form deletes
  // it from Cloudinary, which would take it away from this line too.
  const addSimilar = (line: CartItem) => {
    clearForm();
    setTeamInput(line.team);
    setSimilarOf(line.group || line.id);
    setSelectedCategory(line.category);
    setDynamicCategoryFields({ ...(line.category_fields || {}) });
    itemFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => quantityInputRef.current?.focus({ preventScroll: true }), 0);
  };

  // Submit invoice
  const handleSubmit = async () => {
    if (cart.length === 0) {
      showToast('Please add at least one item', 'error');
      return;
    }
    if (!selectedCustomer) {
      showToast('Please select a customer', 'error');
      return;
    }
    if (!requiredByDate) {
      showToast('Please enter the deadline', 'error');
      return;
    }
    if (linesMissingPrice.length > 0) {
      showToast(`Enter the rate for ${linesMissingPrice.length} item(s) marked "no price for this tier"`, 'error');
      return;
    }

    if (submitting || checkingPendingInvoice) return;
    setSubmitting(true);

    // A fresh key per attempt - never inferred from cart content. Persisted in
    // localStorage (not just memory) so a page refresh mid-request can still be
    // resolved by resolvePendingInvoice() on next load instead of retrying blind.
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = crypto.randomUUID();
      try {
        localStorage.setItem(CUSTOMER_PENDING_KEY_STORAGE, idempotencyKeyRef.current);
      } catch {
        // localStorage unavailable (e.g. private mode) - in-memory retry still works this session
      }
    }

    try {
      // Saved in display order (grouped by team, "+ Similar" lines under their line), so
      // the bills list them the same way; similar_of = that line's number.
      const ordered = orderedLines(cart);
      const lineNo = new Map(ordered.map((item, index) => [item.id, index + 1]));
      // Prepare items for backend with all category-specific fields
      const items = ordered.map(item => {
        // Build product name with custom details for display in invoice
        const displayName = item.category;

        return {
          pro_name: displayName,
          cat_name: item.category,
          unit_price: item.unitPrice,
          pro_quantity: item.quantity,
          total_price: item.totalPrice,
          imgfile: item.image1 || '',
          imgfile2: item.image2 || '',
          imgfile3: item.image3 || '',
          // Dynamic category fields (sub-categories and options) as JSON string
          category_fields: JSON.stringify(item.category_fields || {}),
          // DTF logos + saved roll layout (checked by the backend, shown to the designer)
          ...(item.dtf ? { dtf: item.dtf } : {}),
          team: item.team,
          ...(item.group && lineNo.has(item.group) ? { similar_of: lineNo.get(item.group) } : {}),
        };
      });

      // Get customer details
      const customer = customers.find(c => c.cus_id === selectedCustomer);

      const payload = {
        items,
        customer_id: selectedCustomer,
        customer_name: customer?.cus_name || '',
        team_name: teams.join(', '), // the backend saves the same from the items
        payment_method: paymentMethod.toLowerCase(),
        initial_paid_amount: amountPaid === '' ? 0 : Number(amountPaid),
        remarks: '',
        salesman_id: null,
        timezone: 'Asia/Karachi',
        date: new Date().toISOString().split('T')[0],
        required_by_date: requiredByDate,
        rush_rate_per_piece: rushRateValue,
        rush_threshold_days: rushThresholdDays,
        mockup_charges: mockups.map(m => ({ team: m.team, category: m.category, amount: m.amount })),
        idempotency_key: idempotencyKeyRef.current,
      };

      const response = await fetch('/api/customerinvoice/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();

        // Invoice is confirmed created - the duplicate-creation risk is over.
        idempotencyKeyRef.current = null;
        try { localStorage.removeItem(CUSTOMER_PENDING_KEY_STORAGE); } catch { /* ignore */ }

        // Reset form
        setCart([]);
        setSelectedCustomer('');
        setTeamInput('');
        setCartView(ALL_TEAMS);
        setSimilarOf(null);
        setRequiredByDate('');
        setRushRate(rushRatePerPiece ?? '');
        setMockupAmounts({});
        setAmountPaid('');
        setPaymentMethod('Cash');
        const screenshots = proofFiles;
        setProofFiles([]);

        // Show receipt modal using report URL (consistent with customer details)
        if (result.invoice_id) {
          // Immediate confirmation that the sale itself is safe, shown before we even
          // attempt to fetch the printable receipt - so a slow/failed receipt fetch
          // never leaves the cashier wondering whether the sale went through.
          Swal.fire({
            title: 'Invoice Created!',
            text: `Invoice ${result.invoice_no} has been recorded.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });

          // Remember this invoice separately until its receipt is actually shown - if
          // the fetch below fails or a refresh interrupts it, the mount-time recovery
          // effect can find it and quietly re-fetch, without needing to guard against
          // duplicate creation (the invoice already, unambiguously, exists).
          try {
            localStorage.setItem(CUSTOMER_LAST_CREATED_STORAGE, JSON.stringify({
              invoiceId: result.invoice_id,
              invoiceNo: result.invoice_no
            }));
          } catch { /* ignore */ }

          // Online payment: upload its screenshots while the receipt loads. The invoice
          // is already saved, so a failed upload only leaves the proof "missing".
          const proofUpload = result.proof_id && screenshots.length > 0
            ? uploadProofImages(result.proof_id, screenshots).then(() => '', (error: unknown) =>
                error instanceof Error ? error.message : 'Pay slip upload failed')
            : null;
          if (result.proof_id && screenshots.length === 0) {
            showToast(`Pay slip not attached for ${result.invoice_no} - attach it later from Customer Payment or Payments Record.`, 'warning');
          }

          const shown = await fetchAndShowCustomerReceipt(result.invoice_id);
          const uploadError = proofUpload ? await proofUpload : '';
          if (uploadError) {
            showToast(`Invoice ${result.invoice_no} saved, but the pay slip did not upload (${uploadError}). Attach it later from Customer Payment or Payments Record.`, 'error');
          }
          if (shown) {
            try { localStorage.removeItem(CUSTOMER_LAST_CREATED_STORAGE); } catch { /* ignore */ }
          } else {
            showToast(
              `Invoice ${result.invoice_no} was created, but the receipt could not be loaded. Check your internet connection and reopen it from Duplicate Bill.`,
              'error'
            );
          }
        } else {
          Swal.fire({
            title: 'Success!',
            text: 'Customer invoice created successfully!',
            icon: 'success',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false,
          });
        }
      } else {
        const errorData = await response.json();
        showToast(apiErrorMessage(errorData, 'Failed to create invoice'), 'error');
      }
    } catch (error: unknown) {
      console.error('Error creating invoice:', error);
      const message = error instanceof Error ? error.message : '';
      const isNetworkError = error instanceof TypeError && /fetch/i.test(message);
      showToast(
        isNetworkError
          ? 'Internet connection problem. Please check your connection and try again.'
          : (message || 'Failed to create invoice'),
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className=" bg-white min-h-screen">
      {pendingCheckError && (
        <div className="bg-red-100 border-b-2 border-red-400 text-red-800 px-4 py-2 flex items-center justify-between gap-3 text-sm">
          <span>Couldn&apos;t verify your last transaction. Check your internet connection.</span>
          <button
            onClick={resolvePendingInvoice}
            className="regal-btn bg-red-600 text-white px-3 py-1 text-xs"
          >
            Retry
          </button>
        </div>
      )}
      {/* Navbar Header */}
      <nav className="flex px-4 md:px-6 mb-4 md:mb-6 py-2 md:py-1 bg-regal-yellow shadow-lg relative">
        <div className="flex items-center">
          <div className="h-10 w-10 md:h-14 md:w-14 rounded-full bg-gradient-to-br from-regal-orange via-regal-yellow to-regal-orange p-0.5 shadow-lg">
            <div className="h-full w-full rounded-full bg-white flex items-center justify-center overflow-hidden">
              <img src="/european-logo.svg" alt="European Sports Logo" className="h-7 w-7 md:h-9 md:w-9 object-contain" />
            </div>
          </div>
          <span className='text-lg md:text-2xl font-semibold text-regal-black font-serif ml-2 hidden md:inline'>European <span className='font-bold'>Sports</span></span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-lg md:text-2xl font-bold text-regal-black text-center">CUSTOMER INVOICES</div>
        </div>
      </nav>

      <div className="max-w-[98%] md:max-w-[95%] mx-auto px-2 md:px-4">
        {/* Top Section - Add Items (Left) + Items Table (Right Top) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">

          {/* Left Side - Add Items Form */}
          <div className="lg:col-span-1">
            <div ref={itemFormRef} className="regal-card p-3 md:p-6 sticky lg:top-16 scroll-mt-20">
              <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Add Item</h2>

              <div className="space-y-3 md:space-y-4">
                {/* Team first: every line belongs to a team; flat charges and rate tiers are per team. */}
                <div>
                  <label htmlFor="invoice-team" className="block text-sm font-medium mb-1">Team Name *</label>
                  <TeamSearchInput
                    id="invoice-team"
                    value={teamInput}
                    onChange={setTeamInput}
                    // Leaving the box fixes the spelling to the team / article ("royal fc" -> "Royal FC").
                    onBlur={() => { if (teams.includes(activeTeam) || activeArticle) setTeamInput(activeTeam); }}
                    teams={teamBlocks.map(b => ({ name: b.team, pieces: b.pieces }))}
                    articles={articles}
                    orderLabel="invoice"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    {!activeTeam
                      ? 'Search our articles, or type a new team name.'
                      : teams.includes(activeTeam)
                        ? <>Items go to <b>{activeTeam}</b> ({teamBlocks.find(b => b.team === activeTeam)?.pieces ?? 0} pcs so far).</>
                        : <>New team. <b>{activeTeam}</b> joins this invoice with its first item.</>}
                  </p>
                  {activeArticle ? (
                    <div className="mt-2 rounded-lg border border-green-600 bg-green-50 px-3 py-2 text-xs text-gray-800">
                      <div className="flex flex-wrap items-center gap-2 font-bold text-green-700 text-[13px]">✓ Our article <KitKindChips article={activeArticle} /></div>
                    </div>
                  ) : activeTeam && articles.length > 0 ? (
                    <p className="text-xs text-gray-500 mt-1">Custom team (not our article) - normal MOQ charges.</p>
                  ) : null}
                </div>

                {/* Category - Dynamic from API - Show only main category names */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Category</label>
                  {loadingCategories ? (
                    <div className="text-center py-2 text-gray-500">Loading categories...</div>
                  ) : customerCategories.length > 0 ? (
                    <select
                      value={selectedCategory}
                      onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setSimilarOf(null);
                        setDynamicCategoryFields({});
                        setUnitPrice('');
                        setPriceWasAutoFilled(false);
                        setDtfLogos([]);
                      }}
                      className="regal-input w-full"
                    >
                      <option value="" disabled>Select Category</option>
                      {customerCategories.map((catGroup) => (
                        <option
                          key={catGroup.main_category}
                          value={catGroup.main_category}
                        >
                          {catGroup.main_category}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-center py-4 text-gray-500 bg-gray-50 rounded border border-gray-200">
                      <p className="text-sm">No categories available</p>
                      <p className="text-xs mt-1">
                        Please add categories from{' '}
                        <button
                          onClick={() => router.push('/customer-category')}
                          className="text-regal-yellow hover:underline font-medium"
                        >
                          Customer Category
                        </button>{' '}
                        page
                      </p>
                    </div>
                  )}
                </div>

                {similarLine && selectedCategory && (
                  <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-regal-yellow bg-yellow-50 px-3 py-1.5 text-sm text-gray-800">
                    <span>+ Similar of {similarLine.team} · {similarLine.category} ({similarLine.quantity} pcs). Will be listed under it.</span>
                    <button type="button" onClick={() => setSimilarOf(null)} className="text-xs text-red-600 hover:underline">Not similar</button>
                  </div>
                )}

                {/* Dynamic Category Fields - Rendered based on selected category */}
                {selectedCategory && customerCategories.length > 0 && (
                  <DynamicCategoryFields
                    selectedCategory={selectedCategory}
                    customerCategories={customerCategories}
                    dynamicCategoryFields={dynamicCategoryFields}
                    setDynamicCategoryFields={setDynamicCategoryFields}
                    tierPieces={tierPieces}
                    dyePieces={entryDyePieces}
                    onIdealPriceChange={handleIdealPriceChange}
                    dtfLogos={dtfLogos}
                    onDtfLogosChange={setDtfLogos}
                    dtfResult={dtfResult}
                    quantity={quantity}
                  />
                )}

                {/* Quantity - comes before Rate: it decides which price tier (bulk 5+ vs single-piece) applies */}
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <input
                    ref={quantityInputRef}
                    type="text"
                    inputMode="numeric"
                    value={quantity}
                    onChange={(e) => {
                      const value = e.target.value.trim();
                      if (value === '') {
                        setQuantity('');
                      } else {
                        // Only allow positive integers
                        const numValue = parseInt(value, 10);
                        if (!isNaN(numValue) && numValue > 0) {
                          setQuantity(numValue);
                        } else if (value.match(/^\d*$/)) {
                          // Allow typing digits only (but don't set invalid values)
                          setQuantity(value === '' ? '' : parseInt(value, 10) || '');
                        }
                      }
                    }}
                    onBlur={(e) => {
                      // Ensure valid value on blur
                      const value = e.target.value;
                      if (value && (!parseInt(value, 10) || parseInt(value, 10) <= 0)) {
                        setQuantity('');
                      }
                    }}
                    className="regal-input w-full"
                    placeholder="Quantity"
                    min="1"
                  />
                  {/* <p className="text-xs text-gray-500 mt-1">Enter quantity first - it decides whether the bulk (5+) or single-piece rate applies.</p> */}
                  {tierPieces !== '' && tierPieces > 0 && selectedCategory && (
                    <p className={`text-xs mt-1 font-medium ${isQtyTier(tierPieces) ? 'text-purple-700' : 'text-gray-500'}`}>
                      {tierForQuantity(tierPieces).label}
                      {piecesAlreadyInCart > 0 && ` - ${tierPieces} ${selectedCategory} pcs in ${activeTeam} (${piecesAlreadyInCart} already added + ${quantity})`}
                    </p>
                  )}
                </div>

                {/* Rate (Unit Price) */}
                <div>
                  <label className="block text-sm font-medium mb-1">Rate (Unit Price)</label>
                  <input
                    type="number"
                    value={unitPrice}
                    onChange={(e) => { setUnitPrice(e.target.value === '' ? '' : Number(e.target.value)); setPriceWasAutoFilled(false); }}
                    className="regal-input w-full"
                    placeholder="Unit Price"
                    min="0"
                    step="1"
                  />
                  {priceWasAutoFilled && unitPrice !== '' && (
                    <p className="text-xs font-normal text-green-700 mt-1">✓ filled from price list</p>
                  )}
                </div>

                {/* MOQ Charges - the flat charge this line brings (once per team + category,
                    1-4 pcs; kit rule), editable later in the cart */}
                <div>
                  <label htmlFor="invoice-moq" className="block text-xs font-medium text-gray-600 mb-1">MOQ Charges</label>
                  <input id="invoice-moq" type="text" value={moq.amount ? `Rs. ${moq.amount}` : '0'} readOnly className="regal-input w-full bg-gray-100 text-gray-700" />
                  {moq.reason && <p className="text-[11px] text-gray-500 mt-1">{moq.reason}</p>}
                </div>

                {/* Price (Total) = rate x qty + MOQ */}
                <div>
                  <label className="block text-sm font-medium mb-1">Price (Total)</label>
                  <input
                    type="number"
                    value={price + moq.amount || ''}
                    className="regal-input w-full bg-gray-100"
                    readOnly
                    placeholder="Price"
                  />
                  {dtfResult.status === 'ok' && (
                    <p className="text-xs mt-1.5 px-2 py-1.5 rounded-md bg-teal-50 text-teal-700">
                      + DTF: {metersLabel(dtfResult.block.half_meters)} roll = <b className="text-gray-900">Rs. {dtfResult.block.charge}</b> →{' '}
                      <b className="text-gray-900">Rs. {(price + moq.amount + dtfResult.block.charge)}</b> for this {selectedCategory} with DTF. Added to the team total, editable in the cart.
                    </p>
                  )}
                </div>

                {/* Image Uploads with Cloudinary */}
                <div className="space-y-3">
                  {/* Image 1 */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Image 1</label>
                    <input
                      key={image1Key}
                      type="file"
                      accept="image/*"
                      onChange={handleImage1Change}
                      disabled={uploadingImage1}
                      className="regal-input w-full text-sm mb-2"
                    />
                    {/* Upload Loader - Shows in image box */}
                    {uploadingImage1 && (
                      <div className="flex items-center justify-center h-24 w-24 border-2 border-dashed border-regal-yellow rounded bg-gray-50">
                        <div className="text-center">
                          <svg className="animate-spin h-8 w-8 text-regal-yellow mx-auto" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      </div>
                    )}
                    {/* Image Preview with View/Delete */}
                    {image1Url && !uploadingImage1 && (
                      <div className="flex items-center gap-2">
                        <div className="relative group">
                          <img src={image1Url} alt="Image 1 preview" className="h-24 w-24 object-cover rounded border-2 border-gray-200 hover:border-regal-yellow transition-colors cursor-pointer" />
                          {/* View Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setModalImages([image1Url, image2Url, image3Url].filter((img): img is string => !!img));
                              setCurrentImageIndex(0);
                              setShowImageModal(true);
                            }}
                            className="absolute top-1 right-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            title="View image"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(1)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-md shadow-lg transition-colors"
                          title="Delete image"
                        >
                          <span>Delete Image</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Image 2 */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Image 2</label>
                    <input
                      key={image2Key}
                      type="file"
                      accept="image/*"
                      onChange={handleImage2Change}
                      disabled={uploadingImage2}
                      className="regal-input w-full text-sm mb-2"
                    />
                    {/* Upload Loader - Shows in image box */}
                    {uploadingImage2 && (
                      <div className="flex items-center justify-center h-24 w-24 border-2 border-dashed border-regal-yellow rounded bg-gray-50">
                        <div className="text-center">
                          <svg className="animate-spin h-8 w-8 text-regal-yellow mx-auto" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      </div>
                    )}
                    {/* Image Preview with View/Delete */}
                    {image2Url && !uploadingImage2 && (
                      <div className="flex items-center gap-2">
                        <div className="relative group">
                          <img src={image2Url} alt="Image 2 preview" className="h-24 w-24 object-cover rounded border-2 border-gray-200 hover:border-regal-yellow transition-colors cursor-pointer" />
                          {/* View Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setModalImages([image1Url, image2Url, image3Url].filter((img): img is string => !!img));
                              setCurrentImageIndex(1);
                              setShowImageModal(true);
                            }}
                            className="absolute top-1 right-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            title="View image"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(2)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-md shadow-lg transition-colors"
                          title="Delete image"
                        >
                          <span>Delete Image</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Image 3 */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Image 3</label>
                    <input
                      key={image3Key}
                      type="file"
                      accept="image/*"
                      onChange={handleImage3Change}
                      disabled={uploadingImage3}
                      className="regal-input w-full text-sm mb-2"
                    />
                    {/* Upload Loader - Shows in image box */}
                    {uploadingImage3 && (
                      <div className="flex items-center justify-center h-24 w-24 border-2 border-dashed border-regal-yellow rounded bg-gray-50">
                        <div className="text-center">
                          <svg className="animate-spin h-8 w-8 text-regal-yellow mx-auto" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      </div>
                    )}
                    {/* Image Preview with View/Delete */}
                    {image3Url && !uploadingImage3 && (
                      <div className="flex items-center gap-2">
                        <div className="relative group">
                          <img src={image3Url} alt="Image 3 preview" className="h-24 w-24 object-cover rounded border-2 border-gray-200 hover:border-regal-yellow transition-colors cursor-pointer" />
                          {/* View Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setModalImages([image1Url, image2Url, image3Url].filter((img): img is string => !!img));
                              setCurrentImageIndex(2);
                              setShowImageModal(true);
                            }}
                            className="absolute top-1 right-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            title="View image"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(3)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-md shadow-lg transition-colors"
                          title="Delete image"
                        >
                          <span>Delete Image</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Add and Clear Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={addToCart}
                    className="regal-btn bg-regal-yellow text-regal-black flex-1"
                  >
                    Add
                  </button>
                  <button
                    onClick={clearForm}
                    className="regal-btn bg-gray-300 text-black flex-1"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Items Table (Top) + Customer Details (Bottom) */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">

            {/* Items Table (Right Top) - one block per team: its lines, flat charges, DTF and total */}
            <div className="regal-card p-3 md:p-6" style={{ minHeight: '320px' }}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 md:mb-4">
                <h2 className="text-lg md:text-xl font-semibold">Items ({cart.length})</h2>
                {/* All teams by default; pick one team to see only its lines. */}
                {teams.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label htmlFor="invoice-team-filter" className="text-sm font-medium">Show</label>
                    <select
                      id="invoice-team-filter"
                      value={cartView}
                      onChange={(e) => setCartView(e.target.value)}
                      className="regal-input py-1.5 font-semibold"
                    >
                      <option value={ALL_TEAMS}>All teams ({teams.length} · {totalPieces} pcs)</option>
                      {teamBlocks.map(b => (
                        <option key={b.team} value={b.team}>{b.team} ({b.pieces} pcs)</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {cart.length === 0 ? (
                <div className="px-4 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <p>No items added yet</p>
                    <p className="text-sm mt-1">Type a Team Name and add items from the left panel</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 overflow-y-auto" style={{ maxHeight: '560px' }}>
                  {shownBlocks.map(block => (
                    <div key={block.team}>
                      <div className="flex flex-wrap justify-between items-baseline gap-2 px-3 py-2 bg-regal-yellow border border-regal-yellow rounded-t-lg">
                        <span className="font-bold text-regal-black">{block.team}</span>
                        <span className="text-sm font-medium text-regal-black">{block.pieces} pcs · Rs. {block.total}</span>
                      </div>
                      <div className="border border-t-0 border-gray-200 rounded-b-lg p-2 md:p-3">
                        <QuantityTierCards summaries={block.tierSummaries} />
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[600px]">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Images</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {block.lines.map((item, index) => {
                                const isSimilar = !!item.group && block.lines.some(l => l.id === item.group);
                                const tierPcs = piecesOfCategory(cart, item.category, item.team);
                                return (
                                  <tr key={item.id} className={isSimilar ? 'bg-gray-50' : 'hover:bg-gray-50'}>
                                    <td className="px-4 py-4 text-sm text-gray-900">{index + 1}</td>
                                    <td className={`py-4 pr-4 text-sm ${isSimilar ? 'pl-8' : 'pl-4'}`}>
                                      <div className="font-medium text-gray-900">
                                        {isSimilar && <span className="text-gray-400 mr-1" aria-hidden="true">↳</span>}
                                        {item.category}
                                      </div>

                                      {/* Show dynamic category fields (sub-categories and options) */}
                                      {item.category_fields && Object.keys(item.category_fields).length > 0 && (
                                        <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                                          {Object.entries(item.category_fields).map(([subCategory, option]) => (
                                            <div key={subCategory}>
                                              <span className="font-medium text-gray-700">{subCategory}:</span>
                                              <span className="text-gray-600 ml-1">{option}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {item.dtf && (
                                        <div className="text-xs text-teal-700 mt-1">
                                          <span className="font-medium">DTF:</span> {dtfLogosLabel(item.dtf)} · {metersLabel(item.dtf.half_meters)} roll
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-gray-900">
                                      {item.previousUnitPrice != null && (
                                        <span className="block text-xs text-gray-400 line-through">{item.previousUnitPrice}</span>
                                      )}
                                      {item.missingTierPrice ? (
                                        <input
                                          type="number"
                                          defaultValue={item.unitPrice}
                                          min="1"
                                          step="1"
                                          aria-label={`Rate for ${item.category}`}
                                          onBlur={(e) => { const v = Number(e.target.value); if (v > 0) setLineRate(item.id, v); }}
                                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
                                          className="w-24 px-2 py-1 border border-amber-400 rounded-md"
                                        />
                                      ) : (
                                        <span className={item.rateChange === 'down' ? 'text-green-700 font-medium' : ''}>{item.unitPrice}</span>
                                      )}
                                      {item.rateChange === 'down' && (
                                        <span className="block text-[10px] text-green-700">qty rate · {tierRangeLabel(tierPcs)}</span>
                                      )}
                                      {item.rateChange === 'up' && (
                                        <span className="block text-[10px] text-amber-600">
                                          {isQtyTier(tierPcs) ? 'qty' : 'single'} rate · {tierRangeLabel(tierPcs)}
                                        </span>
                                      )}
                                      {item.autoPriced && lineDyeMultiplier(cart, customerCategories, item) > 1 && (
                                        <span className="block text-[10px] text-pink-700">dye ×{lineDyeMultiplier(cart, customerCategories, item)}</span>
                                      )}
                                      {!item.autoPriced && <span className="block text-[10px] text-gray-400">manual</span>}
                                      {item.missingTierPrice && (
                                        <span className="block text-[10px] text-amber-600">no price for this tier - enter rate</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-900">
                                      <QtyInput plain value={item.quantity} label={item.category} onChange={(qty) => setLineQty(item.id, qty)} />
                                    </td>
                                    <td className="px-4 py-4 text-sm font-semibold text-gray-900">{item.totalPrice}</td>
                                    <td className="px-4 py-4 text-sm">
                                      <div className="flex gap-1 flex-wrap">
                                        {item.image1 || item.image2 || item.image3 ? (
                                          <>
                                            {item.image1 && <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">1</span>}
                                            {item.image2 && <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">2</span>}
                                            {item.image3 && <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">3</span>}
                                          </>
                                        ) : (
                                          <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">No Img</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 text-sm whitespace-nowrap">
                                      {/* "+ Similar" only on a first line; its similar lines sit under it. */}
                                      {!isSimilar && (
                                        <button
                                          type="button"
                                          onClick={() => addSimilar(item)}
                                          className="mr-3 px-2 py-0.5 text-xs font-semibold rounded-md border border-regal-black bg-regal-yellow text-regal-black hover:bg-yellow-400"
                                          title="Copy this item's team and options into the form"
                                        >
                                          + Similar
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => removeFromCart(item.id)}
                                        className="text-red-600 hover:text-red-900 font-medium"
                                      >
                                        Delete
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                              {/* Flat charges of this team - editable, 0 = waived. */}
                              {block.flats.map(m => (
                                <tr key={m.key}>
                                  <td className="px-4 py-2 text-sm text-gray-900" colSpan={4}>
                                    <label htmlFor={`mockup-${m.key}`} className="font-medium">
                                      MOQ Charges - {m.category}
                                    </label>
                                  </td>
                                  {/* Amount in the Total column, under the line totals */}
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    <AmountInput plain id={`mockup-${m.key}`} value={m.amount} label={`MOQ Charges - ${m.category}`} align="left" onChange={(v) => setMockupAmounts(prev => ({ ...prev, [m.key]: v }))} />
                                  </td>
                                  <td colSpan={2}></td>
                                </tr>
                              ))}
                              {/* DTF of this team's lines - editable like before. */}
                              {block.lines.filter(l => l.dtf).map(l => (
                                <tr key={`dtf-${l.id}`} className="bg-teal-50">
                                  <td className="px-4 py-2 text-sm text-teal-700" colSpan={4}>
                                    <label htmlFor={`dtf-amount-${l.id}`} className="font-medium">
                                      DTF printing - {l.category} ({metersLabel(l.dtf!.half_meters)})
                                    </label>
                                    <span className="block text-xs text-gray-500">Roll length charge Rs. {l.dtf!.charge}.</span>
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    <AmountInput id={`dtf-amount-${l.id}`} value={l.dtf!.amount} label={`DTF printing - ${l.category}`} align="left" onChange={(v) => setDtfAmount(l.id, v)} />
                                  </td>
                                  <td colSpan={2}></td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-yellow-100 font-semibold text-regal-black text-sm border-t-2 border-gray-300">
                                <td className="px-4 py-2.5" colSpan={3}>{block.team} total</td>
                                <td className="px-4 py-2.5 whitespace-nowrap">{block.pieces} pcs</td>
                                <td className="px-4 py-2.5 whitespace-nowrap" colSpan={3}>Rs. {block.total}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subtotal - each team's total (its lines + MOQ + DTF, edited in the team's block
                above), the rush charge, then the Total - between the cart and Customer Details. */}
            {teamBlocks.length > 0 && (
              <div className="regal-card p-3 md:p-6">
                <div className="text-base font-semibold text-gray-800 mb-1">Subtotal ({totalPieces} pcs)</div>
                <div className="mb-2 pl-3 space-y-1">
                  {teamBlocks.map(b => (
                    <div key={b.team} className="flex justify-between items-center gap-2 text-base text-gray-700">
                      <span>{b.team} ({b.pieces} pcs)</span>
                      <span className="whitespace-nowrap">Rs. {b.total}</span>
                    </div>
                  ))}
                </div>
                {estimatedIsRush && estimatedRushCharge > 0 && (
                  <div className="flex justify-between items-center gap-2 text-sm text-orange-700 font-medium mb-2">
                    <span>Rush Charge (Rs. {rushRateValue} × {totalPieces} pcs)</span>
                    <span className="whitespace-nowrap">+ Rs. {estimatedRushCharge}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span className="whitespace-nowrap">Rs. {totalAmount}</span>
                </div>
              </div>
            )}

            {/* Customer Details (Right Bottom) */}
            <div className="regal-card p-3 md:p-6 sticky lg:top-4">
              <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Customer Details</h2>

              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4">
                  {/* Customer Name */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Customer Name</label>
                    <div className="flex gap-2">
                      <select
                        value={selectedCustomer}
                        onChange={(e) => setSelectedCustomer(e.target.value)}
                        className="regal-input w-full"
                        required
                      >
                        <option value="">Select Customer</option>
                        {customers.map((customer) => (
                          <option key={customer.cus_id} value={customer.cus_id}>
                            {customer.cus_name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowAddCustomerModal(true)}
                        className="regal-btn bg-regal-yellow text-regal-black px-5"
                        title="Add New Customer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Teams - typed in Team Name on the Add Item form */}
                  <div>
                    <span className="block text-sm font-medium mb-1">Teams in this invoice</span>
                    <div className="flex flex-wrap gap-1.5 min-h-[42px] items-center">
                      {teamBlocks.length === 0
                        ? <span className="text-xs text-gray-500">Typed in Team Name on the Add Item form.</span>
                        : teamBlocks.map(b => (
                          <span key={b.team} className="text-xs font-semibold px-2.5 py-1 rounded-full border border-regal-yellow bg-yellow-100">
                            {b.team} · {b.pieces} pcs
                          </span>
                        ))}
                    </div>
                  </div>

                  {/* Deadline - rush status/charge is decided automatically from this,
                      the same way Quotation does it. No manual "Rush" toggle. */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Deadline *
                      {estimatedIsRush && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">RUSH</span>
                      )}
                    </label>
                    <input
                      type="date"
                      value={requiredByDate}
                      onChange={(e) => setRequiredByDate(e.target.value)}
                      className="regal-input w-full"
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                    {requiredByDate && !estimatedIsRush && (
                      <p className="text-xs text-green-700 font-medium mt-1">
                        ✓ Normal order - due {deadlineLabel}, no rush charge
                      </p>
                    )}
                  </div>
                </div>

                {/* Rush panel - shown only when the deadline makes it a rush order.
                    The per-piece rate is pre-filled with the default and editable. */}
                {estimatedIsRush && (
                  <div className="mb-3 md:mb-4 rounded-lg border border-orange-200 bg-orange-50/50 overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-orange-50 border-b border-orange-100">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-orange-500 text-white tracking-wide">RUSH ORDER</span>
                        <span className="text-sm text-gray-800 font-medium">
                          Deadline is {deadlineLabel}
                          {rushThresholdDays !== null && ` (rush applies within ${rushThresholdDays} day${rushThresholdDays === 1 ? '' : 's'})`}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 py-3 items-start">
                      <div>
                        <label htmlFor="rush-rate" className="block text-xs font-semibold text-gray-800 mb-1">Rush rate per piece</label>
                        <div className="flex items-center rounded-lg border border-orange-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-orange-300">
                          <span className="px-3 py-2 text-sm font-semibold text-orange-700 bg-orange-50/50 border-r border-orange-100">Rs.</span>
                          <input
                            id="rush-rate"
                            type="number"
                            value={rushRate}
                            onChange={(e) => setRushRate(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full px-3 py-2 text-right font-semibold border-0 focus:outline-none focus:ring-0"
                            min="0"
                            step="1"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="text-sm text-gray-800">
                        <div className="text-xs font-semibold mb-1">Calculation</div>
                        <div className="px-3 py-2 rounded-lg bg-white border border-orange-100">
                          Rs. {rushRateValue} × {totalPieces} pcs
                        </div>
                      </div>
                      <div className="text-sm text-gray-800">
                        <div className="text-xs font-semibold mb-1">Rush charge (added to total)</div>
                        <div className="px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 font-bold text-right">
                          + Rs. {estimatedRushCharge}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Amount Fields - 4 in one row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
                  {/* Total Amount */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Total Amount</label>
                    <input
                      type="number"
                      value={Number(totalAmount.toFixed(2))}
                      className="regal-input w-full bg-gray-100 font-semibold"
                      readOnly
                    />
                    {estimatedIsRush && estimatedRushCharge > 0 && (
                      <p className="text-xs text-orange-700 mt-1">Includes Rs. {estimatedRushCharge} rush charge</p>
                    )}
                    {dtfTotal > 0 && (
                      <p className="text-xs text-teal-700 mt-1">Includes Rs. {dtfTotal} DTF printing</p>
                    )}
                  </div>

                  {/* Amount Paid */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Amount Paid</label>
                    <input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="regal-input w-full"
                      placeholder="Enter amount"
                      min="0"
                      step="1"
                      required
                    />
                  </div>

                  {/* Balance */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Balance</label>
                    <input
                      type="number"
                      value={Number(balance.toFixed(2))}
                      className={`regal-input w-full font-semibold ${balance > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}
                      readOnly
                    />
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="regal-input w-full"
                    >
                      {PAYMENT_METHODS.map(method => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Screenshot of an online payment (optional - can be added later) */}
                {isOnlineMethod(paymentMethod) && Number(amountPaid) > 0 && (
                  <ProofImagePicker
                    files={proofFiles}
                    onChange={setProofFiles}
                    onError={(message) => showToast(message, 'error')}
                    disabled={submitting}
                  />
                )}

                {/* Pay and Bill Button */}
                <button
                  type="submit"
                  disabled={submitting || checkingPendingInvoice}
                  className={`regal-btn bg-regal-yellow text-regal-black w-full py-3 text-lg font-semibold ${(submitting || checkingPendingInvoice) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </span>
                  ) : checkingPendingInvoice ? (
                    'Checking previous transaction...'
                  ) : (
                    'Pay and Bill'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Add Customer Modal - shared with Quotation */}
      <AddCustomerModal
        open={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onAdded={async (customerId) => {
          await fetchCustomers();
          setSelectedCustomer(customerId);
        }}
      />

      {loadingReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg px-8 py-6 shadow-xl flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-regal-orange" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-regal-black font-medium">Loading receipt...</span>
          </div>
        </div>
      )}

      {/* Receipt Modal - Using shared ReportModal component with report URL (consistent with customer details) */}
      <ReportModal
        isOpen={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          setInvoiceIdForReceipt('');
          setReceiptPdfData('');
        }}
        title="Invoice Receipt"
        pdfData={receiptPdfData}
      />

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          >
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={modalImages[currentImageIndex]}
            alt="Product preview"
            className="max-h-[80vh] max-w-full object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
};

export default CustomerInvoicePage;
