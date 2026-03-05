'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';

interface WalkinInvoice {
  invoice_id: string;
  invoice_no: string;
  customer_name: string;
  team_name?: string;
  quantity: number;
  total_amount: number;
  amount_paid: number;
  balance: number;
  date: string;
  items: Array<{
    product_name: string;
    product_id?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    discount?: number;
  }>;
  status: string;
  payment_status?: string;
  created_at: string;
  updated_at?: string;
}

interface RefundItem {
  product_name: string;
  product_id?: string;
  quantity_returned: number;
  unit_price: number;
  total_amount: number;
}

interface SelectedItem {
  product_name: string;
  product_id?: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
}

interface RefundRecord {
  refund_id: string;
  invoice_id: string;
  invoice_no: string;
  product_name: string;
  quantity_returned: number;
  refund_amount: number;
  reason: string;
  created_at: string;
  updated_at: string;
}

const RefundPage: React.FC = () => {
  const { showToast } = useToast();

  // State for invoices
  const [invoices, setInvoices] = useState<WalkinInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'invoices' | 'refunded'>('invoices');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  const [totalItems, setTotalItems] = useState(0);

  // Modal state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<WalkinInvoice | null>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [refundQuantity, setRefundQuantity] = useState<string>('');
  const [refundAmountPaid, setRefundAmountPaid] = useState<string>('');
  const [refundDate, setRefundDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());

  // View Refunded modal state
  const [showRefundedModal, setShowRefundedModal] = useState(false);
  const [refundedRecords, setRefundedRecords] = useState<RefundRecord[]>([]);
  const [loadingRefunded, setLoadingRefunded] = useState(false);
  const [editingRefund, setEditingRefund] = useState<RefundRecord | null>(null);
  const [editDate, setEditDate] = useState<string>('');

  // Fetch today's refunded items
  const fetchRefundedItems = async () => {
    try {
      setLoading(true);
      const today = getTodayDate();
      
      const response = await fetch(`/api/refunds/walkin-invoice?date=${today}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        
        // Transform data to WalkinInvoice format for display
        const refundInvoices: WalkinInvoice[] = await Promise.all(
          data.map(async (refund: any) => {
            try {
              // Parse refund items
              const refundItems = refund.refunded_items || [];
              const productName = refundItems[0]?.product_name || 'N/A';
              const quantityReturned = refundItems[0]?.quantity_returned || 0;
              const unitPrice = refundItems[0]?.unit_price || 0;
              
              return {
                invoice_id: refund.refund_id,
                invoice_no: refund.invoice_id || 'N/A',
                customer_name: 'Refunded',
                quantity: quantityReturned,
                total_amount: refund.refund_amount,
                amount_paid: refund.refund_amount,
                balance: 0,
                date: refund.created_at.split('T')[0],
                items: [{
                  product_name: productName,
                  quantity: quantityReturned,
                  unit_price: unitPrice,
                  total_price: quantityReturned * unitPrice
                }],
                status: 'refunded',
                payment_status: 'refunded',
                created_at: refund.created_at,
                updated_at: refund.updated_at
              };
            } catch {
              return null;
            }
          })
        );
        
        setInvoices(refundInvoices.filter(i => i !== null) as WalkinInvoice[]);
        setViewMode('refunded');
        showToast(`Found ${refundInvoices.length} refunded items for today`, 'success');
      } else {
        showToast('Failed to fetch refunded items', 'error');
      }
    } catch (error) {
      console.error('Error fetching refunded items:', error);
      showToast('Error fetching refunded items', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update refund date
  const handleUpdateRefundDate = async () => {
    if (!editingRefund || !editDate) {
      showToast('Please select a date', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/refunds/walkin-invoice/${editingRefund.refund_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          created_at: new Date(editDate).toISOString()
        }),
      });

      if (response.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: 'Refund date updated successfully',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });

        setEditingRefund(null);
        fetchRefundedItems(); // Refresh list
      } else {
        const errorData = await response.json();
        showToast(errorData.detail || errorData.error || 'Failed to update refund date', 'error');
      }
    } catch (error) {
      console.error('Error updating refund date:', error);
      showToast('Error updating refund date', 'error');
    }
  };

  // Fetch walk-in invoices
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      
      let url = `/api/walkin-invoices?limit=${pageSize}&skip=${(currentPage - 1) * pageSize}`;
      
      if (searchTerm) {
        // Search by invoice number or customer name - no date filter
        url += `&customer_id=${encodeURIComponent(searchTerm)}`;
      } else {
        // Filter by selected date (default: today)
        url += `&date=${selectedDate}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setInvoices(data);
        setTotalItems(data.length);
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to fetch invoices', 'error');
        setInvoices([]);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      showToast('Error fetching invoices', 'error');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [currentPage, searchTerm, selectedDate]);

  // Handle refund button click
  const handleRefundClick = (invoice: WalkinInvoice, item: SelectedItem) => {
    // Check if invoice is already fully refunded
    if (invoice.payment_status === 'refunded') {
      Swal.fire({
        icon: 'error',
        title: 'Already Refunded',
        text: 'This invoice has already been fully refunded.',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false
      });
      return;
    }

    setSelectedInvoice(invoice);
    setSelectedItem(item);
    setRefundQuantity('');
    setRefundAmountPaid('');
    setRefundDate(new Date().toISOString().split('T')[0]);
    setShowRefundModal(true);
  };

  // Calculate per unit price from selected item
  const getPerUnitPrice = () => {
    if (!selectedItem) return 0;
    return selectedItem.unit_price || ((selectedItem.total_price || 0) / selectedItem.quantity);
  };

  // Calculate refund amount based on quantity
  const getRefundAmount = () => {
    const qty = parseInt(refundQuantity) || 0;
    return qty * getPerUnitPrice();
  };

  // Handle refund quantity change with validation
  const handleRefundQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = parseInt(value) || 0;
    
    if (selectedItem) {
      if (value === '') {
        setRefundQuantity('');
      } else if (numValue > selectedItem.quantity) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Quantity',
          text: `You only have ${selectedItem.quantity} quantity of this product. You cannot refund more than that.`,
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false
        });
        setRefundQuantity(selectedItem.quantity.toString());
      } else if (numValue < 1) {
        setRefundQuantity('');
      } else {
        setRefundQuantity(value);
      }
    }
  };

  // Handle refund amount paid change with validation
  const handleRefundAmountPaidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = parseFloat(value) || 0;
    const maxAmount = getRefundAmount();
    
    if (value === '') {
      setRefundAmountPaid('');
    } else if (numValue > maxAmount) {
      // Don't allow amount greater than calculated refund amount
      setRefundAmountPaid(maxAmount.toFixed(2));
      Swal.fire({
        icon: 'warning',
        title: 'Amount Exceeds Limit',
        text: `Maximum refund amount is Rs. ${maxAmount.toFixed(2)}`,
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false
      });
    } else {
      setRefundAmountPaid(value);
    }
  };

  // Submit refund
  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInvoice || !selectedItem) return;

    const qty = parseInt(refundQuantity) || 0;
    
    if (!refundQuantity || qty < 1) {
      showToast('Refund quantity must be at least 1', 'error');
      return;
    }

    if (!refundAmountPaid || parseFloat(refundAmountPaid) <= 0) {
      showToast('Please enter a valid refund amount', 'error');
      return;
    }

    const perUnitPrice = getPerUnitPrice();
    const maxRefundAmount = qty * perUnitPrice;

    if (parseFloat(refundAmountPaid) > maxRefundAmount) {
      showToast(`Refund amount cannot exceed ${maxRefundAmount.toFixed(2)} for ${qty} items`, 'error');
      return;
    }

    setSubmitting(true);

    try {
      // Refund only the selected product
      const refundItems: RefundItem[] = [{
        product_name: selectedItem.product_name,
        product_id: selectedItem.product_id,
        quantity_returned: qty,
        unit_price: perUnitPrice,
        total_amount: qty * perUnitPrice
      }];

      const refundData = {
        invoice_id: selectedInvoice.invoice_id,
        refunded_items: refundItems,
        amount: parseFloat(refundAmountPaid),
        reason: 'Customer return',
        customer_id: null
      };

      const response = await fetch('/api/refunds/walkin-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(refundData),
      });

      if (response.ok) {
        await Swal.fire({
          title: 'Refund Processed!',
          text: 'Refund has been processed successfully and stock has been updated.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });

        setShowRefundModal(false);
        setSelectedInvoice(null);
        setSelectedItem(null);
        setRefundQuantity('');
        setRefundAmountPaid('');
        fetchInvoices();
      } else {
        const errorData = await response.json();
        console.error('Refund error response:', errorData);
        
        // Backend error format: { error: { message: "...", type: "...", ... } }
        const errorMessage = 
          errorData?.error?.message ||  // From error handler
          errorData?.detail || 
          errorData?.error || 
          errorData?.message ||
          (typeof errorData === 'string' ? errorData : 'Backend request failed');
        
        console.log('Extracted error message:', errorMessage);
        
        // Check if it's an already refunded error
        if (errorMessage.includes('Already refunded') || errorMessage.includes('already been fully refunded')) {
          Swal.fire({
            icon: 'error',
            title: 'Already Refunded!',
            html: `This product has already been fully refunded.<br/><br/><strong>${errorMessage}</strong>`,
            timer: 5000,
            timerProgressBar: true,
            showConfirmButton: false
          });
        } else if (errorMessage.includes('Cannot refund')) {
          Swal.fire({
            icon: 'error',
            title: 'Invalid Quantity!',
            html: `Cannot process refund.<br/><br/><strong>${errorMessage}</strong>`,
            timer: 5000,
            timerProgressBar: true,
            showConfirmButton: false
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Refund Failed!',
            html: `<strong>${errorMessage}</strong>`,
            timer: 5000,
            timerProgressBar: true,
            showConfirmButton: false
          });
        }
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      showToast('Error processing refund', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-4">
      <PageHeader title="Refund" />

      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        {/* Left side - Search by Order ID */}
        <div className="w-full sm:w-auto flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Search by Order ID
          </label>
          <div className="relative">
            <input
              id="searchInput"
              type="text"
              placeholder="Search by invoice number..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setCurrentPage(1);
                }
              }}
              className="regal-input w-64 pl-10 pr-4 py-2"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
            onClick={() => {
              setSearchTerm('');
              setCurrentPage(1);
              document.getElementById('searchInput')?.focus();
            }}
          >
            Clear
          </button>
        </div>

        {/* Right side - Date filter and View Refunded button */}
        <div className="w-full sm:w-auto flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Date:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setCurrentPage(1);
            }}
            className="regal-input w-40"
          />
          <a
            href="/refund-records"
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
          >
            Refunds Record
          </a>
        </div>
      </div>

      {/* Walk-in Invoices Table */}
      <div className="border-0 p-0">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-pulse">
              <div className="h-12 bg-gray-200 rounded mb-4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2 text-gray-500">No {viewMode === 'refunded' ? 'refunded items' : 'walk-in invoices'} found for {selectedDate}</p>
            {viewMode === 'refunded' && (
              <button
                onClick={() => {
                  setViewMode('invoices');
                  fetchInvoices();
                }}
                className="mt-4 regal-btn bg-regal-yellow text-regal-black"
              >
                Show Invoices
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-100">
                <tr className="text-xs text-gray-900 uppercase tracking-wider font-semibold">
                  <th className="px-3 py-5 text-left w-28">Order ID</th>
                  <th className="px-3 py-5 text-left w-40">Product</th>
                  <th className="px-3 py-5 text-left w-28">Total Price</th>
                  <th className="px-3 py-5 text-left w-28">Amount Paid</th>
                  <th className="px-3 py-5 text-left w-20">Quantity</th>
                  <th className="px-3 py-5 text-left w-28">Balance</th>
                  <th className="px-3 py-5 text-left w-32">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice, invoiceIndex) => 
                  invoice.items.map((item, itemIndex) => {
                    const showPayment = itemIndex === 0;
                    const amountPaidToShow = showPayment ? invoice.amount_paid : 0;
                    const balanceToShow = showPayment ? (invoice.total_amount - invoice.amount_paid) : 0;
                    
                    return (
                      <tr 
                        key={`${invoice.invoice_id}-${itemIndex}`} 
                        className="hover:bg-gray-50 text-sm text-gray-900 transition-colors"
                      >
                        <td className="px-3 py-4 text-sm font-medium text-gray-900">
                          {invoice.invoice_no}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-900">
                          <span className="font-medium">{item.product_name}</span>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-900">
                          Rs. {item.total_price?.toFixed(2) || (item.quantity * item.unit_price).toFixed(2)}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-900">
                          Rs. {amountPaidToShow.toFixed(2)}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-900">
                          Rs. {balanceToShow.toFixed(2)}
                        </td>
                        <td className="px-3 py-4">
                          {viewMode === 'refunded' ? (
                            <button
                              onClick={() => handleEditRefundDate(invoice)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs font-medium transition-colors mr-2"
                            >
                              Edit
                            </button>
                          ) : showPayment && invoice.payment_status === 'refunded' ? (
                            <button
                              disabled
                              className="bg-gray-400 text-gray-200 px-4 py-2 rounded text-xs font-medium cursor-not-allowed mr-2"
                            >
                              Refunded
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRefundClick(invoice, item)}
                              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-xs font-medium transition-colors mr-2"
                            >
                              Refund
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {invoices.length > 0 && (
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / pageSize)}
            totalItems={totalItems}
            pageSize={pageSize}
            baseUrl="/refund"
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedInvoice && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Process Refund</h3>

              <form onSubmit={handleSubmitRefund}>
                {/* Order ID and Product - Side by side */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Order ID
                    </label>
                    <input
                      type="text"
                      value={selectedInvoice.invoice_no}
                      disabled
                      className="regal-input w-full bg-gray-100 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product
                    </label>
                    <input
                      type="text"
                      value={selectedItem.product_name}
                      disabled
                      className="regal-input w-full bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Price and Original Quantity - Side by side */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (Per Unit)
                    </label>
                    <input
                      type="text"
                      value={`Rs. ${getPerUnitPrice()}`}
                      disabled
                      className="regal-input w-full bg-gray-100 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Original Quantity
                    </label>
                    <input
                      type="text"
                      value={selectedItem.quantity}
                      disabled
                      className="regal-input w-full bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Refund Quantity and Amount - Row 1 */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Refund Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedItem.quantity}
                      value={refundQuantity}
                      onChange={handleRefundQuantityChange}
                      className="regal-input w-full"
                      placeholder="Enter quantity"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Max: {selectedItem.quantity}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount
                    </label>
                    <input
                      type="text"
                      value={`Rs. ${getRefundAmount().toFixed(2)}`}
                      disabled
                      className="regal-input w-full bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Amount Paid and Balance - Row 2 */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount Paid <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={refundQuantity * getPerUnitPrice()}
                      value={refundAmountPaid}
                      onChange={handleRefundAmountPaidChange}
                      className="regal-input w-full"
                      placeholder="Enter amount"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Max: Rs. {getRefundAmount()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Balance
                    </label>
                    <input
                      type="text"
                      value={`Rs. ${(getRefundAmount() - (parseFloat(refundAmountPaid) || 0))}`}
                      disabled
                      className="regal-input w-full bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Date - Full width */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Refund Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={refundDate}
                    onChange={(e) => setRefundDate(e.target.value)}
                    className="regal-input w-1/4"
                    required
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRefundModal(false);
                      setSelectedInvoice(null);
                      setSelectedItem(null);
                      setRefundQuantity('');
                      setRefundAmountPaid('');
                    }}
                    disabled={submitting}
                    className={`regal-btn bg-gray-300 text-black ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`regal-btn bg-regal-yellow text-regal-black ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      'Process Refund'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundPage;
