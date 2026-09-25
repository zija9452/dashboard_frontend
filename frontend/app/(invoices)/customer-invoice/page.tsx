'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import ReportModal from '@/components/ui/ReportModal';
import { ProductsApi } from '@/lib/api/products';

interface Customer {
  cus_id: string;
  cus_name: string;
  cus_phone: string;
}

interface NewCustomerType {
  cus_name: string;
  cus_phone: string;
  cus_cnic: string;
  cus_address: string;
  cus_sal_id_fk: string;
  branch: string;
}

interface Salesman {
  sal_id: string;
  sal_name: string;
}

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
  ideal_prices?: Record<string, Record<string, number>>;
  modifiers?: Record<string, Record<string, ModifierValue>>;
}

const BULK_MIN_QTY = 5;

interface CartItem {
  id: string;
  category: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  // Cloudinary image URLs
  image1: string | null;
  image2: string | null;
  image3: string | null;
  // Dynamic category fields - stores selected options for each sub-category
  // Example: { "Neck": "Round", "Fabric": "Polyzone" }
  category_fields?: Record<string, string>;
}

// Dynamic Category Fields Component - Shows ideal price when all options selected
const DynamicCategoryFields: React.FC<{
  selectedCategory: string;
  customerCategories: CustomerCategoryGrouped[];
  dynamicCategoryFields: Record<string, string>;
  setDynamicCategoryFields: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  quantity: number | '';
  onIdealPriceChange?: (price: number) => void;
}> = ({ selectedCategory, customerCategories, dynamicCategoryFields, setDynamicCategoryFields, quantity, onIdealPriceChange }) => {
  // Find the selected category in the categories list
  const categoryData = customerCategories.find(cat => cat.main_category === selectedCategory);

  if (!categoryData) return null;

  // Handle change in a sub-category dropdown
  const handleSubCategoryChange = (subCategory: string, value: string) => {
    setDynamicCategoryFields(prev => ({
      ...prev,
      [subCategory]: value
    }));
  };

  // Calculate price based on selected options. "Base" sub-categories (not flagged
  // is_modifier) form the priced combination (bulk 5+ rate once quantity reaches it,
  // else 1-piece); "modifier" sub-categories (Sleeves, Size Type...) are adjustments
  // applied on top: final = (base + sum of flat adjustments) × product of multiply
  // adjustments.
  const calculateIdealPrice = (): number | null => {
    if (!categoryData.ideal_prices || Object.keys(categoryData.ideal_prices).length === 0) {
      return null;
    }

    // Check if all sub-categories have been selected
    const allSelected = categoryData.sub_categories.every(subCat => !!dynamicCategoryFields[subCat.sub_category]);
    if (!allSelected) {
      return null;
    }

    // Quantity must be entered first — it's what decides which tier (bulk vs
    // single-piece) applies, so no price should be suggested before it's known.
    if (quantity === '' || quantity <= 0) {
      return null;
    }

    const baseSubCats = categoryData.sub_categories.filter(sc => !sc.is_modifier);
    const modifierSubCats = categoryData.sub_categories.filter(sc => sc.is_modifier);

    const combinationKey = baseSubCats.map(sc => dynamicCategoryFields[sc.sub_category]).join('|');

    // Lookup tiered prices for this exact base combination: { "1": price, "5": bulkPrice }
    const tiers = categoryData.ideal_prices[combinationKey];
    if (!tiers) return null;

    // Use the bulk (5+) rate once quantity reaches the bulk tier, falling back to the
    // 1-piece rate if no bulk rate has been set for this combination yet.
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
  };

  const idealPrice = calculateIdealPrice();

  // Notify parent of ideal price change (re-evaluates whenever quantity crosses the bulk tier)
  useEffect(() => {
    if (onIdealPriceChange && idealPrice !== null) {
      onIdealPriceChange(idealPrice);
    }
  }, [idealPrice, onIdealPriceChange]);

  return (
    <div className="space-y-4 p-4 bg-regal-yellow rounded">
      <h3 className="text-md font-semibold text-regal-black border-b-2 border-regal-black pb-2">
        {selectedCategory}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categoryData.sub_categories.map((subCat, index) => (
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

      {/* {(() => {
        const allSelected = categoryData.sub_categories.every(sc => !!dynamicCategoryFields[sc.sub_category]);
        const hasQuantity = typeof quantity === 'number' && quantity > 0;
        if (!allSelected) return null;
        if (!hasQuantity) {
          return <p className="text-xs text-regal-black mt-3">Enter quantity below to fill the fixed price into the Rate field.</p>;
        }
        if (idealPrice === null) {
          return <p className="text-xs text-amber-700 font-medium mt-3">No fixed price set for this combination — enter the Rate manually.</p>;
        }
        return (
          <p className="text-xs text-green-800 font-medium mt-3">
            ✓ Price filled into Rate field below ({quantity >= BULK_MIN_QTY ? 'bulk rate, 5+ pcs' : '1 pc rate'})
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
  const [salesmans, setSalesmans] = useState<Salesman[]>([]);
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
  const [teamName, setTeamName] = useState('');
  const [requiredByDate, setRequiredByDate] = useState('');
  // Fetched once so the rush charge can be previewed live, the same way the
  // backend computes it on submit (deadline within threshold_days => rush).
  const [rushRatePerPiece, setRushRatePerPiece] = useState<number | null>(null);
  const [rushThresholdDays, setRushThresholdDays] = useState<number | null>(null);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [balance, setBalance] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [submitting, setSubmitting] = useState(false);
  // Idempotency: identifies one checkout attempt so a lost-response retry (or a
  // resubmit after a page refresh) is recognized by the backend instead of creating
  // a duplicate invoice. Cleared as soon as create() confirms success (returns an
  // invoice_id) — after that point there's no more duplicate-creation risk.
  const idempotencyKeyRef = useRef<string | null>(null);
  const CUSTOMER_PENDING_KEY_STORAGE = 'customer-invoice-pending-key';
  // True while resolving a leftover pending key from localStorage on page load. Submit
  // stays disabled until this resolves, otherwise a fresh submit could race the check.
  const [checkingPendingInvoice, setCheckingPendingInvoice] = useState(false);
  const [pendingCheckError, setPendingCheckError] = useState(false);
  // True while fetchAndShowCustomerReceipt() is in flight — shows a full-screen
  // blurred loading overlay so the cashier isn't left staring at a blank screen
  // while the PDF (a separate, sometimes-slow call) is generated and fetched.
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  // Separate from the idempotency key above: once create() succeeds there's no more
  // duplicate risk, but the receipt (PDF) step is a second, independent call that can
  // still fail or be interrupted by a refresh. This remembers "invoice X exists but its
  // receipt hasn't been shown yet" so a refresh can quietly recover it — unlike the
  // idempotency key, this never blocks Submit, since there's nothing ambiguous to guard.
  const CUSTOMER_LAST_CREATED_STORAGE = 'customer-invoice-last-created';

  // Add customer modal state
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    cus_name: '',
    cus_phone: '',
    cus_cnic: '',
    cus_address: '',
    cus_sal_id_fk: '',
    branch: 'European Sports Light House'
  });
  const [addingCustomer, setAddingCustomer] = useState(false);

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

  // Whenever the selected combination (or the quantity, which can flip the bulk
  // tier) resolves to a fixed price, it's filled straight into the editable Rate
  // field below — no separate read-only "ideal price" box. Staff can type over it.
  const handleIdealPriceChange = (price: number) => {
    setUnitPrice(price);
    setPriceWasAutoFilled(true);
  };

  // Fetch customers, salesmans and customer categories
  useEffect(() => {
    fetchCustomers();
    fetchSalesmans();
    fetchCustomerCategories();
    fetchRushSettings();
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
        // indefinitely — fetch() doesn't fail on its own until the request settles,
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
  // (its response never arrived — e.g. lost connection or the page was refreshed
  // mid-submit). We never guess from cart content — we ask the backend for the
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
        // That attempt never actually reached the database — safe to discard.
        idempotencyKeyRef.current = null;
        try { localStorage.removeItem(CUSTOMER_PENDING_KEY_STORAGE); } catch { /* ignore */ }
        setCheckingPendingInvoice(false);
        return;
      }

      if (!res.ok) {
        // Ambiguous (server error) — don't guess, let the user retry the check.
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
      // Network still down — don't guess, keep the key and let the user retry.
      setPendingCheckError(true);
      setCheckingPendingInvoice(false);
    }
  };

  useEffect(() => {
    resolvePendingInvoice();
  }, []);

  // Separately, recover a receipt that never got shown (invoice creation itself
  // already succeeded — this is a plain re-fetch, so it never blocks Submit).
  // Called on mount, and again whenever the browser regains connectivity (see the
  // 'online' listener below) — so recovery doesn't require a manual refresh.
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
    // If it still fails (e.g. net is still down), leave it — the 'online' event,
    // next mount, or Duplicate Bill, can recover it. We don't retry-loop or block.
  };

  useEffect(() => {
    recoverLastCreatedReceipt();

    // The browser fires this the moment connectivity is restored — retry right
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
      }
    } catch (error) {
      console.error('Error fetching rush settings:', error);
    }
  };

  const fetchSalesmans = async () => {
    try {
      const response = await fetch('/api/admin/getcustomervendorbybranch', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSalesmans(data.salesmans || []);
      }
    } catch (error) {
      console.error('Error fetching salesmans:', error);
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

  // Calculate total and balance — rush charge (if the deadline falls within
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
    const rushCharge = isRush && rushRatePerPiece !== null ? rushRatePerPiece * totalPieces : 0;

    const total = subtotal + rushCharge;
    setTotalAmount(total);
    const paidAmount = amountPaid === '' ? 0 : Number(amountPaid);
    setBalance(total - paidAmount);
  }, [cart, amountPaid, requiredByDate, rushThresholdDays, rushRatePerPiece]);

  // Live preview for the RUSH badge/helper text next to the Deadline field —
  // same day-math as the useEffect above, just recomputed for render.
  const totalPieces = cart.reduce((sum, item) => sum + item.quantity, 0);
  let estimatedIsRush = false;
  if (requiredByDate && rushThresholdDays !== null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(`${requiredByDate}T00:00:00`);
    const daysUntil = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    estimatedIsRush = daysUntil <= rushThresholdDays;
  }
  const estimatedRushCharge = estimatedIsRush && rushRatePerPiece !== null ? rushRatePerPiece * totalPieces : 0;

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

      // Validate all sub-categories have selected options
      const missingFields = categoryData.sub_categories.filter(
        sc => !dynamicCategoryFields[sc.sub_category] || !dynamicCategoryFields[sc.sub_category].trim()
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
    };

    setCart([...cart, newItem]);

    // Clear form
    clearForm();
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

    // Show success message
    showToast('Item added to cart', 'success');
  };

  // Reset new customer form
  const resetNewCustomerForm = () => {
    setNewCustomer({
      cus_name: '',
      cus_phone: '',
      cus_cnic: '',
      cus_address: '',
      cus_sal_id_fk: '',
      branch: 'European Sports Light House'
    });
  };

  // Remove item from cart
  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

 const validateCustomerForm = (customer: NewCustomerType) => {
  const requiredFields = [
    { key: 'cus_name', label: 'Customer Name' },
    { key: 'cus_phone', label: 'Phone' },
    { key: 'cus_cnic', label: 'CNIC' },
    { key: 'cus_address', label: 'Address' },
    { key: 'cus_sal_id_fk', label: 'Salesman' },
  ];

  const missing = requiredFields.filter(field => {
    const value = customer[field.key as keyof NewCustomerType];
    return !value || (typeof value === 'string' && !value.trim());
  });

  return missing;
};

const handleAddCustomer = async () => {
  // 🔍 Validate all fields at once
  const missingFields = validateCustomerForm(newCustomer);
  
  if (missingFields.length > 0) {
    showToast('Please fill all required fields', 'error');
      return;
    }

    setAddingCustomer(true);

    try {
      const payload = {
        cus_name: newCustomer.cus_name,
        cus_phone: newCustomer.cus_phone,
        cus_cnic: newCustomer.cus_cnic,
        cus_address: newCustomer.cus_address,
        branch: newCustomer.branch,
        cus_sal_id_fk: newCustomer.cus_sal_id_fk,
      };

      const response = await fetch('/api/customerinvoice/Customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const addedCustomer = await response.json();
        
        // Refresh customer list immediately
        await fetchCustomers();
        
        // Auto-select the newly added customer
        setSelectedCustomer(addedCustomer.cus_id || addedCustomer.id);
        
        // Close modal and reset form
        setShowAddCustomerModal(false);
        setNewCustomer({
          cus_name: '',
          cus_phone: '',
          cus_cnic: '',
          cus_address: '',
          cus_sal_id_fk: '',
          branch: 'European Sports Light House'
        });

        Swal.fire({
          title: 'Success!',
          text: 'Customer added successfully!',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
      } else {
        const errorData = await response.json();
        console.error('Add customer error:', errorData.error);
        showToast(errorData.error || errorData.detail || 'Failed to add customer', 'error');
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      showToast('Failed to add customer', 'error');
    } finally {
      setAddingCustomer(false);
    }
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

    if (submitting || checkingPendingInvoice) return;
    setSubmitting(true);

    // A fresh key per attempt — never inferred from cart content. Persisted in
    // localStorage (not just memory) so a page refresh mid-request can still be
    // resolved by resolvePendingInvoice() on next load instead of retrying blind.
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = crypto.randomUUID();
      try {
        localStorage.setItem(CUSTOMER_PENDING_KEY_STORAGE, idempotencyKeyRef.current);
      } catch {
        // localStorage unavailable (e.g. private mode) — in-memory retry still works this session
      }
    }

    try {
      // Prepare items for backend with all category-specific fields
      const items = cart.map(item => {
        // Build product name with custom details for display in invoice
        let displayName = item.category;

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
        };
      });

      // Get customer details
      const customer = customers.find(c => c.cus_id === selectedCustomer);

      const payload = {
        items,
        customer_id: selectedCustomer,
        customer_name: customer?.cus_name || '',
        team_name: teamName,
        payment_method: paymentMethod.toLowerCase(),
        initial_paid_amount: amountPaid === '' ? 0 : Number(amountPaid),
        remarks: '',
        salesman_id: null,
        timezone: 'Asia/Karachi',
        date: new Date().toISOString().split('T')[0],
        required_by_date: requiredByDate,
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

        // Invoice is confirmed created — the duplicate-creation risk is over.
        idempotencyKeyRef.current = null;
        try { localStorage.removeItem(CUSTOMER_PENDING_KEY_STORAGE); } catch { /* ignore */ }

        // Reset form
        setCart([]);
        setSelectedCustomer('');
        setTeamName('');
        setRequiredByDate('');
        setAmountPaid('');
        setPaymentMethod('Cash');

        // Show receipt modal using report URL (consistent with customer details)
        if (result.invoice_id) {
          // Immediate confirmation that the sale itself is safe, shown before we even
          // attempt to fetch the printable receipt — so a slow/failed receipt fetch
          // never leaves the cashier wondering whether the sale went through.
          Swal.fire({
            title: 'Invoice Created!',
            text: `Invoice ${result.invoice_no} has been recorded.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });

          // Remember this invoice separately until its receipt is actually shown — if
          // the fetch below fails or a refresh interrupts it, the mount-time recovery
          // effect can find it and quietly re-fetch, without needing to guard against
          // duplicate creation (the invoice already, unambiguously, exists).
          try {
            localStorage.setItem(CUSTOMER_LAST_CREATED_STORAGE, JSON.stringify({
              invoiceId: result.invoice_id,
              invoiceNo: result.invoice_no
            }));
          } catch { /* ignore */ }

          const shown = await fetchAndShowCustomerReceipt(result.invoice_id);
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
        showToast(errorData.error || 'Failed to create invoice', 'error');
      }
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      const isNetworkError = error instanceof TypeError && /fetch/i.test(error.message || '');
      showToast(
        isNetworkError
          ? 'Internet connection problem. Please check your connection and try again.'
          : (error.message || 'Failed to create invoice'),
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
          <span>Couldn't verify your last transaction. Check your internet connection.</span>
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
            <div className="regal-card p-3 md:p-6 sticky lg:top-16">
              <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Add Item</h2>

              <div className="space-y-3 md:space-y-4">
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
                        setDynamicCategoryFields({});
                        setUnitPrice('');
                        setPriceWasAutoFilled(false);
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

                {/* Dynamic Category Fields - Rendered based on selected category */}
                {selectedCategory && customerCategories.length > 0 && (
                  <DynamicCategoryFields
                    selectedCategory={selectedCategory}
                    customerCategories={customerCategories}
                    dynamicCategoryFields={dynamicCategoryFields}
                    setDynamicCategoryFields={setDynamicCategoryFields}
                    quantity={quantity}
                    onIdealPriceChange={handleIdealPriceChange}
                  />
                )}

                {/* Quantity — comes before Rate: it decides which price tier (bulk 5+ vs single-piece) applies */}
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <input
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

                {/* Price (Total) */}
                <div>
                  <label className="block text-sm font-medium mb-1">Price (Total)</label>
                  <input
                    type="number"
                    value={price || ''}
                    className="regal-input w-full bg-gray-100"
                    readOnly
                    placeholder="Price"
                  />
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

            {/* Items Table (Right Top) */}
            <div className="regal-card p-3 md:p-6" style={{ minHeight: '320px' }}>
              <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Items ({cart.length})</h2>
              <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '280px' }}>
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-100 sticky top-0 z-10">
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
                    {cart.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm text-gray-900">{index + 1}</td>
                        <td className="px-4 py-4 text-sm">
                          <div className="font-medium text-gray-900">{item.category}</div>
                          
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
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">{item.unitPrice.toFixed(2)}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-4 text-sm font-semibold text-gray-900">{item.totalPrice.toFixed(2)}</td>
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
                        <td className="px-4 py-4 text-sm">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {cart.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            <p>No items added yet</p>
                            <p className="text-sm mt-1">Add items from the left panel</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

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

                  {/* Team Name */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Team Name</label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="regal-input w-full"
                      placeholder="Team Name"
                      required
                    />
                  </div>

                  {/* Deadline — rush status/charge is decided automatically from this,
                      the same way Quotation does it. No manual "Rush" toggle. */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Deadline *
                      {estimatedIsRush && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">RUSH</span>
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
                    {estimatedIsRush && (
                      <p className="text-xs text-red-700 font-medium mt-1">
                        + Rs. {estimatedRushCharge} rush charge ({rushRatePerPiece ?? 0} × {totalPieces} pcs)
                      </p>
                    )}
                  </div>
                </div>

                {/* Amount Fields - 4 in one row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
                  {/* Total Amount */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Total Amount</label>
                    <input
                      type="number"
                      value={totalAmount.toFixed(2)}
                      className="regal-input w-full bg-gray-100 font-semibold"
                      readOnly
                    />
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
                      value={balance.toFixed(2)}
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
                      <option value="Cash">Cash</option>
                      <option value="Easypaisa Zohaib">Easypaisa Zohaib</option>
                      <option value="Easypaisa Yasir">Easypaisa Yasir</option>
                      <option value="Faysal Bank">Faysal Bank</option>
                      <option value="Credit">Credit</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

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

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="regal-card bg-white p-3 md:p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Add New Customer</h3>

            <form onSubmit={(e) => { e.preventDefault(); handleAddCustomer(); }} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Customer Name *</label>
                <input
                  type="text"
                  value={newCustomer.cus_name}
                  onChange={(e) => setNewCustomer({...newCustomer, cus_name: e.target.value})}
                  className="regal-input w-full"
                  placeholder="Enter customer name"
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="text"
                  value={newCustomer.cus_phone}
                  onChange={(e) => setNewCustomer({...newCustomer, cus_phone: e.target.value})}
                  className="regal-input w-full"
                  placeholder="Enter phone number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">CNIC</label>
                <input
                  type="text"
                  value={newCustomer.cus_cnic}
                  onChange={(e) => setNewCustomer({...newCustomer, cus_cnic: e.target.value})}
                  className="regal-input w-full"
                  placeholder="Enter CNIC"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <textarea
                  value={newCustomer.cus_address}
                  onChange={(e) => setNewCustomer({...newCustomer, cus_address: e.target.value})}
                  className="regal-input w-full"
                  placeholder="Enter address"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Salesman</label>
                <select
                  value={newCustomer.cus_sal_id_fk}
                  onChange={(e) => setNewCustomer({...newCustomer, cus_sal_id_fk: e.target.value})}
                  className="regal-input w-full"
                >
                  <option value="">Select Salesman</option>
                  {salesmans.map(salesman => (
                    <option key={salesman.sal_id} value={salesman.sal_id}>
                      {salesman.sal_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Branch</label>
                <select
                  value={newCustomer.branch}
                  onChange={(e) => setNewCustomer({...newCustomer, branch: e.target.value})}
                  className="regal-input w-full"
                >
                  <option value="European Sports Light House">European Sports Light House</option>
                </select>
              </div>
          

            <div className="flex gap-2 mt-6">
              <button
              type='submit'
                onClick={handleAddCustomer}
                disabled={addingCustomer}
                className={`regal-btn bg-regal-yellow text-regal-black flex-1 ${addingCustomer ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {addingCustomer ? 'Adding...' : 'Add Customer'}
              </button>
              <button
              type='button'
                onClick={() => {
                  setShowAddCustomerModal(false);
                  resetNewCustomerForm();
                }}
                disabled={addingCustomer}
                className="regal-btn bg-gray-300 text-black flex-1"
              >
                Cancel
              </button>
            </div>
            </form>
          </div>
        </div>
      )}

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
