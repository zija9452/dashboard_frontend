'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';

// Print styles - only print modal content
const printStyles = `
  @media print {
    body {
      visibility: hidden;
    }
    body * {
      visibility: hidden;
    }
    /* Show the modal container and printable report */
    .print-modal-container,
    .print-modal-container * {
      visibility: visible !important;
    }
    .print-modal-container {
      position: absolute !important;
      inset: 0 !important;
      background: white !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    /* Show only the printable report content */
    #printable-report {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      padding: 0;
      margin: 0;
      background: white;
    }
    #printable-report * {
      visibility: visible !important;
    }
    /* Hide only the sticky header bar (buttons) */
    #printable-report .sticky {
      display: none !important;
    }
    @page {
      margin: 1cm;
      size: A4;
    }
  }
`;

interface Customer {
  cus_id: string;
  cus_name: string;
  cus_phone: string;
}

interface Product {
  id?: string;
  product_name?: string;
  category?: string;
  price?: number;
  stock?: number;
  barcode?: string;
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

// Helper function: Convert base64 to blob
const base64ToBlob = (base64: string, mimeType: string) => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

const WarehouseInvoicePage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  // User role state
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  // PDF viewing state
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [billType, setBillType] = useState<string>('WAREHOUSE RECEIPT');

  // Customer state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');

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
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [manualDiscount, setManualDiscount] = useState<number>(0);

  // Calculate totals
  const totalAmount = selectedItems.reduce((sum, item) => sum + item.price, 0);
  const itemDiscount = selectedItems.reduce((sum, item) => sum + item.discount, 0);
  const totalDiscount = itemDiscount + manualDiscount;
  const finalAmount = totalAmount - totalDiscount;

  // Update amountPaid when finalAmount changes if modal is open
  useEffect(() => {
    if (showPaymentModal && amountPaid === 0) {
      setAmountPaid(finalAmount);
    }
  }, [finalAmount, showPaymentModal]);

  // Fetch products (only warehouse products with stock > 0)
  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/warehouse-invoice', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setDefaultProducts(data);
      }
    } catch (error) {
      console.error('Error fetching warehouse products:', error);
    }
  };

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.user?.role) {
            setUserRole(data.user.role);
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setRoleLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  // Filtering products for search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const filtered = defaultProducts.filter(p => 
      p.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode?.includes(searchTerm)
    );
    setSearchResults(filtered);
  }, [searchTerm, defaultProducts]);

  // Fetch data on mount
  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/warehouse-customers/viewcustomer?page=1&limit=1000', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const customersList = Array.isArray(data.data) ? data.data : [];
        setCustomers(customersList);
        
        // Auto-select European Sports from warehouse customers
        const euroSports = customersList.find((c: Customer) => 
          c.cus_name.toLowerCase().includes('european sports')
        );
        if (euroSports) {
          setSelectedCustomer(euroSports.cus_id);
        }
      }
    } catch (error) {
      console.error('Error fetching warehouse customers:', error);
    }
  };

  // Handle product selection
  const handleProductSelect = (product: Product) => {
    const stockQty = product.stock || 0;
    if (stockQty <= 0) {
      showToast('This product is out of stock in warehouse', 'error');
      return;
    }

    setSelectedProduct(product);
    setSelectedRowId(product.id || null);
    setUnitPrice(product.price || 0);
    setQuantity('');
    setPrice(0);
    setSearchTerm(product.product_name || '');
    setSearchResults([]);
  };

  // Calculate price
  useEffect(() => {
    if (unitPrice && quantity) {
      setPrice(Number(unitPrice) * Number(quantity));
    } else {
      setPrice(0);
    }
  }, [unitPrice, quantity]);

  // Add item to cart
  const addToCart = () => {
    if (!selectedProduct && !searchTerm.trim()) {
      showToast('Please select a product', 'error');
      return;
    }
    if (!selectedProduct) {
      showToast('Product not found. Please select from the list.', 'error');
      return;
    }
    if (!quantity || Number(quantity) < 1) {
      showToast('Quantity must be at least 1', 'error');
      return;
    }
    if (Number(quantity) > (selectedProduct.stock || 0)) {
      showToast(`Only ${selectedProduct.stock} items available in warehouse`, 'error');
      return;
    }

    const newItem: CartItem = {
      id: selectedProduct.id || '',
      product_name: selectedProduct.product_name || '',
      category: selectedProduct.category || '',
      unit_price: Number(unitPrice),
      quantity: Number(quantity),
      price: price,
      discount: discount * Number(quantity),
      total: price,
      barcode: selectedProduct.barcode || ''
    };

    setSelectedItems([...selectedItems, newItem]);

    // Reset
    setSelectedProduct(null);
    setSelectedRowId(null);
    setUnitPrice('');
    setQuantity('');
    setPrice(0);
    setDiscount(0);
    setSearchTerm('');
  };

  const removeFromSelected = (index: number) => {
    const updated = [...selectedItems];
    updated.splice(index, 1);
    setSelectedItems(updated);
  };

  const clearAll = () => {
    setSelectedItems([]);
  };

  const handlePayment = () => {
    if (selectedItems.length === 0) {
      showToast('Please add items to the invoice', 'error');
      return;
    }
    setShowPaymentModal(true);
  };

  const submitPayment = async () => {
    if (!selectedCustomer) {
      showToast('Please select a customer', 'error');
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      const response = await fetch('/api/warehouse-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: selectedItems.map(item => ({
            pro_name: item.product_name,
            pro_quantity: item.quantity,
            unit_price: item.unit_price,
            discount: item.discount / item.quantity,
            cat_name: item.category
          })),
          customer_id: selectedCustomer,
          payment_method: paymentMethod.toLowerCase(),
          payment_date: paymentDate,
          manual_discount: manualDiscount,
          amount_paid: amountPaid,
          notes: ''
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const pdfBlob = base64ToBlob(data.pdf, 'application/pdf');
        const pdfObjectUrl = URL.createObjectURL(pdfBlob);

        setPdfUrl(pdfObjectUrl);
        setBillType('WAREHOUSE RECEIPT');
        setShowPdfModal(true);

        clearAll();
        setShowPaymentModal(false);
        setManualDiscount(0);
        setAmountPaid(0);
        fetchProducts(); // Refresh stock
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || errorData.detail || 'Failed to create invoice';
        Swal.fire('Error', errorMessage, 'error');
      }
    } catch (error: any) {
      console.error('Submit Payment Error:', error);
      Swal.fire('Error', 'Server connection failed. Please check if the backend is running.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className="bg-white min-h-screen">
      {/* Navbar Header */}
      <nav className="flex items-center mb-4 md:mb-6 px-4 md:px-6 py-2 md:py-8 bg-regal-yellow shadow-lg relative">
  
        <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
          <div className="text-lg md:text-2xl font-bold text-regal-black uppercase">Warehouse Invoice</div>
          <div className="text-[10px] md:text-xs font-medium text-regal-black opacity-70">(Stock Transfer)</div>
        </div>
      </nav>

      <div className="max-w-[98%] md:max-w-[95%] mx-auto px-2 md:px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Side - Form */}
          <div className="lg:col-span-1 space-y-3 md:space-y-4">
            <div className="regal-card p-3 md:p-6">
              <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Add Product</h2>

              <div className="mb-3 md:mb-4">
                <label className="block text-sm font-medium mb-1">Product Name</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search product..."
                  className="regal-input w-full h-9"
                />
              </div>

              <div className="mb-3 md:mb-4">
                <label className="block text-sm font-medium mb-1">Unit Price</label>
                <input
                  type="number"
                  value={unitPrice}
                  readOnly
                  className="regal-input w-full h-9 bg-gray-50"
                  placeholder="Unit Price"
                />
              </div>

              <div className="mb-3 md:mb-4">
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  className="regal-input w-full h-9"
                  placeholder="Quantity"
                />
              </div>

              <div className="mb-3 md:mb-4">
                <label className="block text-sm font-medium mb-1">Total Price</label>
                <input
                  type="number"
                  value={price}
                  className="regal-input w-full h-9 bg-gray-50"
                  readOnly
                />
              </div>

              <div className="mb-3 md:mb-4">
                <label className="block text-sm font-medium mb-1">Discount (per qty)</label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="regal-input w-full h-9"
                  placeholder="Discount"
                />
              </div>

              <button
                onClick={addToCart}
                className="regal-btn bg-regal-yellow text-regal-black w-1/2 mx-auto block py-2 mb-2"
              >
                Add
              </button>

              <button
                onClick={handlePayment}
                disabled={selectedItems.length === 0}
                className="regal-btn bg-regal-yellow text-regal-black w-1/2 mx-auto block py-2 mb-2 disabled:opacity-50"
              >
                Payment
              </button>

              <button
                onClick={clearAll}
                className="regal-btn bg-gray-300 text-black w-1/2 mx-auto block py-2 mb-3"
              >
                Clear
              </button>

              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">Rs. {totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Items:</span>
                  <span className="font-semibold">{selectedItems.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Lists */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Products Search/List */}
            <div className="regal-card p-3 md:p-6" style={{ minHeight: '350px' }}>
              <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Warehouse Inventory</h2>

              <div className="mb-3 md:mb-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products by name or barcode..."
                  className="regal-input w-full h-10"
                />
              </div>

              <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '200px' }}>
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase">W-Stock</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(searchResults.length > 0 ? searchResults : defaultProducts).map((product, index) => (
                      <tr
                        key={product.id || index}
                        onClick={() => handleProductSelect(product)}
                        className={`${
                          selectedRowId === product.id ? 'bg-yellow-100 ring-2 ring-blue-500' : ''
                        } cursor-pointer hover:bg-yellow-50`}
                      >
                        <td className="px-4 py-4 text-sm text-gray-900">{index + 1}</td>
                        <td className="px-4 py-4 text-sm font-medium text-gray-900">{product.product_name}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{product.category || '-'}</td>
                        <td className="px-4 py-4 text-sm font-semibold text-gray-900">{product.price || 0}</td>
                        <td className="px-4 py-4 text-sm text-gray-900 font-bold">{product.stock || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected Items Table */}
            <div className="regal-card p-3 md:p-6" style={{ minHeight: '330px' }}>
              <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Selected Transfer Items ({selectedItems.length})</h2>
              <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '230px' }}>
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedItems.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-4 text-sm">{item.product_name}</td>
                        <td className="px-3 py-4 text-sm">{item.unit_price}</td>
                        <td className="px-3 py-4 text-sm font-bold">{item.quantity}</td>
                        <td className="px-3 py-4 text-sm text-red-700">{item.discount}</td>
                        <td className="px-3 py-4 text-sm font-semibold">{item.price - item.discount}</td>
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
                        <td colSpan={6} className="px-3 py-8 text-center text-gray-500 italic">
                          No items added for transfer
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 md:p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-3 md:p-6">
            <div className="flex justify-between items-center mb-3 md:mb-4">
              <h2 className="text-lg md:text-xl font-bold uppercase">Complete Warehouse Invoice</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:gap-4 mb-3 md:mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Target Customer</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="regal-input w-full"
                >
                  <option value="">Select Customer</option>
                  {customers.map((customer) => (
                    <option key={customer.cus_id} value={customer.cus_id}>{customer.cus_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Transfer Logic</label>
                <div className="p-2 bg-blue-50 text-blue-800 rounded text-xs font-semibold">
                  Decrease Warehouse Stock → Increase Shop Stock
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Total Amount</label>
                <input type="number" value={totalAmount} className="regal-input w-full bg-gray-100" readOnly />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Additional Discount</label>
                <input
                  type="number"
                  value={manualDiscount}
                  onChange={(e) => setManualDiscount(Number(e.target.value))}
                  className="regal-input w-full"
                  placeholder="Enter discount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Net Total</label>
                <input type="number" value={finalAmount} className="regal-input w-full bg-gray-100 font-bold" readOnly />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount Paid*</label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val > finalAmount) {
                      showToast('Paid amount cannot exceed total amount', 'error');
                      setAmountPaid(finalAmount);
                    } else {
                      setAmountPaid(val);
                    }
                  }}
                  className="regal-input w-full border-blue-500 font-bold"
                  placeholder="Enter paid amount"
                />
              </div>
              <div className="flex flex-col justify-end">
                 <div className="p-3 bg-yellow-50 text-yellow-800 rounded text-xs font-semibold border border-yellow-200">
                    Remaining: Rs. {(finalAmount - amountPaid).toFixed(2)}
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select 
                  value={paymentMethod} 
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    if (e.target.value === 'Credit') {
                      setAmountPaid(0);
                    } else {
                      setAmountPaid(finalAmount);
                    }
                  }} 
                  className="regal-input w-full"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank Transfer</option>
                  <option value="Credit">Credit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Transfer Date</label>
                <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="regal-input w-full" />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={submitPayment}
                disabled={submitting}
                className="regal-btn bg-regal-yellow text-regal-black flex-1 hover:bg-yellow-600 shadow-md font-bold uppercase tracking-wider"
              >
                {submitting ? 'Transferring Stock...' : 'Confirm Transfer & Print'}
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

      {/* PDF Modal */}
      {showPdfModal && pdfUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setShowPdfModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[95vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{billType}</h2>
              <button onClick={() => setShowPdfModal(false)} className="text-gray-500 hover:text-gray-700 p-2">×</button>
            </div>
            <iframe src={pdfUrl} className="w-full h-[80vh] border-2 border-gray-300 rounded-lg" title={billType} />
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default WarehouseInvoicePage;
