'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import ReportModal from '@/components/ui/ReportModal';

interface Customer {
  cus_id: string;
  cus_name: string;
  cus_phone: string;
}

interface Salesman {
  sal_id: string;
  sal_name: string;
}

interface Product {
  id?: string;
  pro_id?: string;
  product_name?: string;
  category?: string;
  price?: number;
  cost?: number;
  stock_level?: number;
  stock?: number;
  barcode?: string;
  pro_barcode?: string;
}

interface CartItem {
  id: string;
  product_name: string;
  category: string;
  unit_price: number;
  quantity: number;
  price: number;
  discount: number;
  total: number;
  barcode: string;
}

const WalkInInvoicePage: React.FC = () => {
  const { showToast } = useToast();

  // Customer and Salesman state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesmans, setSalesmans] = useState<Salesman[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedSalesman, setSelectedSalesman] = useState<string>('');

  // Search and selection state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [defaultProducts, setDefaultProducts] = useState<Product[]>([]);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Item form state
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [price, setPrice] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);

  // Cart state
  const [selectedItems, setSelectedItems] = useState<CartItem[]>([]);
  
  // Payment state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [manualDiscount, setManualDiscount] = useState<number>(0); // Manual discount at payment time

  // Stock view modal
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [stockProducts, setStockProducts] = useState<Product[]>([]);

  // Today sales state
  const [todaySales, setTodaySales] = useState<any[]>([]);
  const [showTodaySalesModal, setShowTodaySalesModal] = useState(false);

  // Opening/Closing state
  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState<string>('');
  const [closingAmount, setClosingAmount] = useState<string>('');
  const [openingNote, setOpeningNote] = useState<string>('');
  const [closingNote, setClosingNote] = useState<string>('');
  const [todayTotalSales, setTodayTotalSales] = useState<number>(0);
  const [todayCashSales, setTodayCashSales] = useState<number>(0);
  const [isOpeningDone, setIsOpeningDone] = useState(false);
  const [isClosingDone, setIsClosingDone] = useState(false);
  const [openingData, setOpeningData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate totals
  const totalAmount = selectedItems.reduce((sum, item) => sum + item.price, 0); // Sum of prices before discount
  const itemDiscount = selectedItems.reduce((sum, item) => sum + item.discount, 0); // Sum of item discounts
  const totalDiscount = itemDiscount + manualDiscount; // Total discount (item + manual)
  const finalAmount = totalAmount - totalDiscount; // Final amount after discount

  // Fetch products for search from stock API (only products with stock > 0)
  const fetchProducts = async (search: string) => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      // Use stock API with search_string parameter (same as stock page)
      const params = new URLSearchParams();
      params.append('search_string', search);
      params.append('limit', '20'); // Limit search results

      const response = await fetch(`/api/stock/viewstock?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Filter only products with stock > 0
        const products = (data.data || data.products || []).filter((p: any) => (p.stock_level || p.stock || 0) > 0);
        setSearchResults(products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch default products on mount
  useEffect(() => {
    fetchDefaultProducts();
    fetchCustomers();
    fetchSalesmans();
    checkOpeningStatus();
    checkClosingStatus();
  }, []);

  // Check if opening is done for today (from database)
  const checkOpeningStatus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/walkin-invoices/daily-cash/${today}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.found && data.cash_opening > 0) {
          setIsOpeningDone(true);
          setOpeningData(data);
        } else {
          setIsOpeningDone(false);
          setOpeningData(null);
        }
      } else {
        setIsOpeningDone(false);
        setOpeningData(null);
      }
    } catch (error) {
      console.error('Error checking opening status:', error);
      setIsOpeningDone(false);
      setOpeningData(null);
    }
  };

  // Check if closing is done for today (from database)
  const checkClosingStatus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/walkin-invoices/daily-cash/${today}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.found && data.cash_closing !== null && data.cash_closing !== undefined) {
          setIsClosingDone(true);
        } else {
          setIsClosingDone(false);
        }
      } else {
        setIsClosingDone(false);
      }
    } catch (error) {
      console.error('Error checking closing status:', error);
      setIsClosingDone(false);
    }
  };

  // Fetch default 100 products from stock API
  const fetchDefaultProducts = async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', '100');

      const response = await fetch(`/api/stock/viewstock?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Filter only products with stock > 0
        const products = (data.data || data.products || []).filter((p: any) => (p.stock_level || p.stock || 0) > 0);
        setDefaultProducts(products);
      }
    } catch (error) {
      console.error('Error fetching default products:', error);
    }
  };

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers/viewcustomer?page=1&limit=1000', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const customersList = Array.isArray(data.data) ? data.data : [];
        setCustomers(customersList);
        
        // Set default to Walk-in Customer
        const walkInCustomer = customersList.find((c: Customer) => 
          c.cus_name.toLowerCase().includes('walk-in') || 
          c.cus_name.toLowerCase().includes('walk in')
        );
        if (walkInCustomer) {
          setSelectedCustomer(walkInCustomer.cus_id);
        }
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  // Fetch salesmans
  const fetchSalesmans = async () => {
    try {
      const response = await fetch('/api/admin/getcustomervendorbybranch', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const salesmansList = Array.isArray(data.salesmans) ? data.salesmans : [];
        setSalesmans(salesmansList);
      }
    } catch (error) {
      console.error('Error fetching salesmans:', error);
    }
  };

  // Handle product selection
  const handleProductSelect = (product: Product) => {
    // Check if product has stock
    const stockQty = product.stock_level || product.stock || 0;
    if (stockQty <= 0) {
      showToast('This product is out of stock', 'error');
      return;
    }

    setSelectedProduct(product);
    setSelectedRowId(product.id || product.pro_id || null);
    setUnitPrice(product.price || 0);
    setQuantity(''); // Empty quantity field
    setPrice(0);
    setSearchTerm(product.product_name || ''); // Show selected product name in search field
    setSearchResults([]);
  };

  // Calculate price when quantity changes
  useEffect(() => {
    if (unitPrice && quantity) {
      setPrice(Number(unitPrice) * Number(quantity));
    }
  }, [unitPrice, quantity]);

  // Add item to selected items
  const addToCart = () => {
    // Validate: Check if product name is filled
    if (!selectedProduct && !searchTerm.trim()) {
      showToast('Please select a product from the list', 'error');
      return;
    }

    // Validate: Check if product exists in stock
    if (!selectedProduct) {
      showToast('Product not found in stock. Please select from suggestions.', 'error');
      return;
    }

    // Validate: Check if stock is available
    const stockQty = selectedProduct.stock_level || selectedProduct.stock || 0;
    if (stockQty <= 0) {
      showToast('This product is out of stock', 'error');
      return;
    }

    // Validate: Check quantity
    if (!quantity || Number(quantity) <= 0) {
      showToast('Please enter a valid quantity', 'error');
      return;
    }

    // Validate: Check if quantity exceeds stock
    if (Number(quantity) > stockQty) {
      showToast(`Cannot add more quantity. Available quantity: ${stockQty}`, 'error');
      return;
    }

    const newItem: CartItem = {
      id: selectedProduct.id || selectedProduct.pro_id || '',
      product_name: selectedProduct.product_name || '',
      category: selectedProduct.category || '',
      unit_price: Number(unitPrice),
      quantity: Number(quantity),
      price: price, // price before discount (unit_price × quantity)
      discount: discount * Number(quantity), // discount per item × quantity = total discount
      total: price, // total before discount
      barcode: selectedProduct.barcode || selectedProduct.pro_barcode || ''
    };

    setSelectedItems([...selectedItems, newItem]);

    // Reset form
    setSelectedProduct(null);
    setSelectedRowId(null);
    setUnitPrice('');
    setQuantity('');
    setPrice(0);
    setDiscount(0);
    setSearchTerm('');
    setSearchResults([]);
  };

  // Remove from selected items
  const removeFromSelected = (index: number) => {
    const updated = [...selectedItems];
    updated.splice(index, 1);
    setSelectedItems(updated);
  };

  // Clear all items
  const clearAll = () => {
    setSelectedItems([]);
  };

  // Handle payment
  const handlePayment = async () => {
    if (selectedItems.length === 0) {
      showToast('Please add items to the invoice', 'error');
      return;
    }

    setShowPaymentModal(true);
  };

  // Submit payment
  const submitPayment = async () => {
    const paidAmount = Number(amountPaid);
    if (paidAmount <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }

    if (!selectedCustomer) {
      showToast('Please select a customer', 'error');
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      const response = await fetch('/api/walkin-invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          items: selectedItems.map(item => ({
            pro_name: item.product_name,
            pro_quantity: item.quantity,
            unit_price: item.unit_price,
            discount: item.discount,
            cat_name: item.category,
            name: item.product_name  // Backend expects 'name' field
          })),
          customer_id: selectedCustomer,
          salesman_id: selectedSalesman || null,
          payment_method: paymentMethod.toLowerCase(),
          payment_date: paymentDate,
          manual_discount: manualDiscount,
          notes: ''
        }),
      });

      if (response.ok) {
        Swal.fire({
          title: 'Invoice Created!',
          text: 'Walk-in invoice has been created successfully.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });

        // Reset form
        clearAll();
        setShowPaymentModal(false);
        setAmountPaid('');
        setSelectedCustomer('');
        setSelectedSalesman('');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setManualDiscount(0);
      } else {
        const errorData = await response.json();
        showToast(errorData.error || errorData.detail || 'Failed to create invoice', 'error');
      }
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      showToast(error.message || 'Failed to create invoice', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch today sales
  const fetchTodaySales = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/walkin-invoices/today?date=${today}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setTodaySales(data.invoices || []);
        setTodayTotalSales(data.total_amount || 0);
        setShowTodaySalesModal(true);
      }
    } catch (error) {
      console.error('Error fetching today sales:', error);
      showToast('Failed to fetch today sales', 'error');
    }
  };

  // Handle Opening
  const handleOpening = () => {
    setShowOpeningModal(true);
  };

  // Submit Opening
  const submitOpening = async () => {
    const amount = Number(openingAmount);
    if (amount < 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch('/api/walkin-invoices/opening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          date: today,
          amount: amount,
          notes: openingNote
        }),
      });

      if (response.ok) {
        setIsOpeningDone(true);
        Swal.fire({
          title: 'Opening Saved!',
          text: 'Opening balance has been recorded.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        setShowOpeningModal(false);
        setOpeningAmount('');
        setOpeningNote('');
        checkOpeningStatus();
        checkClosingStatus();
      } else {
        const errorData = await response.json();
        showToast(errorData.detail || 'Failed to save opening', 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to save opening', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Closing
  const handleClosing = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/walkin-invoices/today?date=${today}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Calculate total sales and cash sales
        const totalAmount = data.total_amount || 0;
        const cashAmount = data.cash_amount || 0;
        
        setTodayTotalSales(totalAmount);
        setTodayCashSales(cashAmount);
        setShowClosingModal(true);
      } else {
        setTodayTotalSales(0);
        setTodayCashSales(0);
        setShowClosingModal(true);
      }
    } catch (error) {
      console.error('Error fetching today sales:', error);
      setTodayTotalSales(0);
      setTodayCashSales(0);
      setShowClosingModal(true);
    }
  };

  // Submit Closing
  const submitClosing = async () => {
    const amount = Number(closingAmount);
    if (amount < 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch('/api/walkin-invoices/closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          date: today,
          amount: amount,
          notes: closingNote
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        let message = `Closing balance recorded.\nOpening: Rs. ${result.opening}\nCash Sales: Rs. ${result.sales}\nExpected: Rs. ${result.expected}\nClosing: Rs. ${result.closing}`;
        if (result.difference !== 0) {
          message += `\nDifference: Rs. ${Math.abs(result.difference)} ${result.difference > 0 ? '(Extra)' : '(Short)'}`;
        } else {
          message += `\n✓ Balanced!`;
        }

        setIsClosingDone(true);
        Swal.fire({
          title: 'Closing Saved!',
          text: message,
          icon: 'success',
          timer: 5000,
          showConfirmButton: false
        });
        setShowClosingModal(false);
        setClosingAmount('');
        setClosingNote('');
        checkOpeningStatus();
        checkClosingStatus();
      } else {
        const errorData = await response.json();
        showToast(errorData.detail || 'Failed to save closing', 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to save closing', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch stock for view stock modal
  const fetchStock = async () => {
    try {
      const response = await fetch(`/api/stock/viewstock?search=${encodeURIComponent(stockSearchTerm)}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setStockProducts(data.products || []);
        setShowStockModal(true);
      }
    } catch (error) {
      console.error('Error fetching stock:', error);
      showToast('Failed to fetch stock', 'error');
    }
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Navbar Header */}
      <nav className="flex items-center justify-between mb-6 px-6 py-2 bg-regal-yellow shadow-lg relative">
        <div className="flex items-center">
          <Image width={50} height={50} src="/jns_logo.svg" alt="J&S Logo" className="h-12 w-auto" />
          <span className='text-2xl font-semibold text-regal-black font-serif'>J&S <span className=''>Sportswear</span></span>
        </div>
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <div className="text-2xl font-bold text-regal-black">INVOICES</div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowOpeningModal(true)}
            disabled={isOpeningDone || isSubmitting}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition shadow-sm ${
              isOpeningDone
                ? 'bg-green-500 text-white cursor-not-allowed'
                : 'bg-regal-black text-regal-yellow hover:bg-gray-800'
            }`}
          >
            {isSubmitting ? 'Processing...' : isOpeningDone ? '✓ Opening Done' : 'Opening'}
          </button>
          <button
            onClick={handleClosing}
            disabled={isClosingDone || isSubmitting}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition shadow-sm ${
              isClosingDone
                ? 'bg-green-500 text-white cursor-not-allowed'
                : 'bg-regal-black text-regal-yellow hover:bg-gray-800'
            }`}
          >
            {isSubmitting ? 'Processing...' : isClosingDone ? '✓ Closing Done' : 'Closing'}
          </button>
          <button
            onClick={() => fetchStock()}
            className="bg-regal-black text-regal-yellow px-4 py-2 rounded-md text-sm font-semibold hover:bg-gray-800 transition shadow-sm"
          >
            View Stock
          </button>
          <button
            onClick={() => fetchTodaySales()}
            className="bg-regal-black text-regal-yellow px-4 py-2 rounded-md text-sm font-semibold hover:bg-gray-800 transition shadow-sm"
          >
            Today Sales
          </button>
        </div>
      </nav>

      <div className="max-w-[95%] mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side - Product Selection Form (1 column) */}
          <div className="lg:col-span-1 space-y-3">
          <div className="regal-card">
            <h2 className="text-lg font-semibold mb-3">Add Product</h2>

            {/* Product Name / Search */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Product Name</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedProduct(null);
                }}
                placeholder="Search product..."
                className="regal-input w-full h-9"
              />
            </div>

            {/* Unit Price */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Unit Price</label>
              <input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                className="regal-input w-full h-9"
                placeholder="Unit Price"
              />
            </div>

            {/* Quantity */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="regal-input w-full h-9"
                placeholder="Quantity"
              />
            </div>

            {/* Price */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Price</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="regal-input w-full h-9"
                placeholder="Product Price"
                readOnly
              />
            </div>

            {/* Discount */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Discount</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="regal-input w-full h-9"
                placeholder="Product Discount"
              />
            </div>

            {/* Add Button - Centered with reduced width */}
            <button
              onClick={addToCart}
              className="regal-btn bg-regal-yellow text-regal-black w-1/2 mx-auto block py-2 mb-2"
            >
              Add
            </button>

            {/* Payment Button */}
            <button
              onClick={handlePayment}
              disabled={selectedItems.length === 0}
              className="regal-btn bg-regal-yellow text-regal-black w-1/2 mx-auto block py-2 mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Payment
            </button>

            {/* Clear Button */}
            <button
              onClick={clearAll}
              className="regal-btn bg-gray-300 text-black w-1/2 mx-auto block py-2 mb-3"
            >
              Clear
            </button>

            {/* Totals Summary */}
            <div className="border-t pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold">Rs. {totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Quantities:</span>
                <span className="font-semibold">{selectedItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Items:</span>
                <span className="font-semibold">{selectedItems.length}</span>
              </div>
            </div>
          </div>
          </div>

        {/* Right Side - Products List (Top) + Selected Items (Bottom) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Products List (Top) - Shows search results or default products */}
          <div className="regal-card" style={{ minHeight: '320px' }}>
            <h2 className="text-xl font-semibold mb-4">
              Products ({searchResults.length > 0 ? searchResults.length : defaultProducts.filter(p => (p.stock_level || p.stock || 0) > 0).length})
            </h2>
            
            {/* Search Bar */}
            <div className="mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="regal-input w-full h-10"
              />
            </div>
            
            <div className="overflow-hidden" style={{ maxHeight: '280px', overflowY: 'auto' }}>
              <table className="w-full">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                    <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase">Cost</th> 
                    <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(searchResults.length > 0 ? searchResults : defaultProducts.filter(p => (p.stock_level || p.stock || 0) > 0)).map((product, index) => (
                    <tr
                      key={product.id || product.pro_id || index}
                      onClick={() => handleProductSelect(product)}
                      className={`${
                        selectedRowId === (product.id || product.pro_id) ? 'bg-yellow-100 ring-2 ring-blue-500' : ''
                      } cursor-pointer bg-yellow-50`}
                    >
                      <td className="px-4 py-4 text-sm text-gray-900">{index + 1}</td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">{product.product_name}</td>
                      <td className="px-4 py-4 text-sm text-gray-900">{product.category || '-'}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-gray-900">{product.price || 0}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-gray-900">{product.cost || 0}</td>
                      <td className="px-4 py-4 text-sm text-gray-900">{product.stock_level || product.stock || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Items (Bottom) */}
          <div className="regal-card" style={{ minHeight: '200px' }}>
            <h2 className="text-xl font-semibold mb-4">Selected Items ({selectedItems.length})</h2>
            <div className="overflow-hidden" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              <table className="w-full">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                    <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase">After Discount</th>
                    <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedItems.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-4 text-sm">{item.product_name}</td>
                      <td className="px-3 py-4 text-sm">{item.unit_price}</td>
                      <td className="px-3 py-4 text-sm">{item.quantity}</td>
                      <td className="px-3 py-4 text-sm text-center text-red-700">{item.discount}</td>
                      <td className="px-3 py-4 text-sm">{item.price}</td>
                      <td className="px-3 py-4 text-sm font-semibold text-green-700 text-center">{item.price - item.discount}</td>
                      <td className="px-3 py-4 text-sm">
                        <button
                          onClick={() => removeFromSelected(index)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {selectedItems.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                        No selected items
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Payment</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Customer and Salesman */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Customer</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="regal-input w-full"
                >
                  <option value="">Select Customer</option>
                  {customers.map((customer) => (
                    <option key={customer.cus_id} value={customer.cus_id}>
                      {customer.cus_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Select Salesman</label>
                <select
                  value={selectedSalesman}
                  onChange={(e) => setSelectedSalesman(e.target.value)}
                  className="regal-input w-full"
                >
                  <option value="">Select Salesman</option>
                  {salesmans.map((salesman) => (
                    <option key={salesman.sal_id} value={salesman.sal_id}>
                      {salesman.sal_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Payment Method and Total Amount */}
            <div className="grid grid-cols-2 gap-4 mb-4">
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
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Total Amount</label>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => {}}
                  className="regal-input w-full bg-gray-100"
                  readOnly
                />
              </div>
            </div>

            {/* Total Discount and After Discount */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Total Discount
                  {itemDiscount > 0 && (
                    <span className="text-xs text-gray-500 ml-2">
                      (Item: Rs. {itemDiscount})
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  value={manualDiscount}
                  onChange={(e) => setManualDiscount(Number(e.target.value))}
                  className="regal-input w-full"
                  placeholder="Enter discount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">After Discount</label>
                <input
                  type="number"
                  value={finalAmount}
                  onChange={(e) => {}}
                  className="regal-input w-full bg-gray-100"
                  readOnly
                />
              </div>
            </div>

            {/* Amount Paid and Date */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Amount Paid</label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="regal-input w-full"
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="regal-input w-full"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={submitPayment}
                disabled={submitting}
                className="regal-btn bg-regal-yellow text-regal-black flex-1 disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Confirm Payment'}
              </button>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="regal-btn bg-gray-300 text-black flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock View Modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">View Stock</h2>
              <button
                onClick={() => setShowStockModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                value={stockSearchTerm}
                onChange={(e) => setStockSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="regal-input w-full"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stockProducts.map((product, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{product.name}</td>
                      <td className="px-4 py-3 text-sm">{product.category}</td>
                      <td className="px-4 py-3 text-sm">{product.stock_level}</td>
                      <td className="px-4 py-3 text-sm">Rs. {product.unit_price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Opening Modal */}
      {showOpeningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Opening Balance</h2>
              <button
                onClick={() => setShowOpeningModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={new Date().toISOString().split('T')[0]}
                className="regal-input w-full bg-gray-100"
                readOnly
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Amount *</label>
              <input
                type="number"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                className="regal-input w-full"
                placeholder="Enter amount"
                autoFocus
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
              <textarea
                value={openingNote}
                onChange={(e) => setOpeningNote(e.target.value)}
                className="regal-input w-full"
                placeholder="Any notes..."
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={submitOpening}
                disabled={isSubmitting}
                className="regal-btn bg-regal-yellow text-regal-black flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save Opening'}
              </button>
              <button
                onClick={() => setShowOpeningModal(false)}
                disabled={isSubmitting}
                className="regal-btn bg-gray-300 text-black flex-1 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Closing Modal */}
      {showClosingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Closing Balance</h2>
              <button
                onClick={() => setShowClosingModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={new Date().toISOString().split('T')[0]}
                className="regal-input w-full bg-gray-100"
                readOnly
              />
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Sales:</span>
                <span className="font-semibold">Rs. {todayTotalSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Cash Sales:</span>
                <span className="font-semibold">Rs. {todayCashSales.toFixed(2)}</span>
              </div>
              {openingData && (
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-gray-600">Opening:</span>
                  <span className="font-semibold">Rs. {openingData.cash_opening.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold border-t pt-2">
                <span className="text-gray-800">Cash Expected:</span>
                <span className="font-bold text-regal-black">Rs. {(todayCashSales + (openingData?.cash_opening || 0)).toFixed(2)}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Cash Closing Amount *</label>
              <input
                type="number"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
                className="regal-input w-full"
                placeholder="Enter physical cash count"
                autoFocus
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
              <textarea
                value={closingNote}
                onChange={(e) => setClosingNote(e.target.value)}
                className="regal-input w-full"
                placeholder="Any notes..."
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={submitClosing}
                disabled={isSubmitting}
                className="regal-btn bg-regal-yellow text-regal-black flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save Closing'}
              </button>
              <button
                onClick={() => setShowClosingModal(false)}
                disabled={isSubmitting}
                className="regal-btn bg-gray-300 text-black flex-1 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Today Sales Modal */}
      {showTodaySalesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Today Sales</h2>
              <button
                onClick={() => setShowTodaySalesModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {todaySales.map((sale, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{sale.invoice_no}</td>
                      <td className="px-4 py-3 text-sm">Rs. {sale.total_amount}</td>
                      <td className="px-4 py-3 text-sm">{sale.payment_method}</td>
                      <td className="px-4 py-3 text-sm">{new Date(sale.created_at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};


export default WalkInInvoicePage;
