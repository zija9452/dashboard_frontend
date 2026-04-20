'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';

interface InvoiceItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  category: string;
}

interface Invoice {
  id: string;
  invoice_no: string;
  customer_name: string;
  team_name?: string;
  type: 'walkin' | 'customer';
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  discount: number;
  payment_status: string;
  payment_method: string;
  payment_date: string;
  created_at: string;
  items: InvoiceItem[];
}

interface SearchResponse {
  invoices: Invoice[];
  total: number;
  search_query: string | null;
  time_range: string;
}

const DuplicateBillPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  const [totalItems, setTotalItems] = useState(0);

  // PDF modal
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [pdfFilename, setPdfFilename] = useState<string>('');
  const [billType, setBillType] = useState<string>('DUPLICATE BILL');
  const [printingInvoice, setPrintingInvoice] = useState<{id: string, type: string} | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch invoices
  useEffect(() => {
    fetchInvoices();
  }, [debouncedSearch, currentPage]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (debouncedSearch) {
        params.append('search_query', debouncedSearch);
      }
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());

      const response = await fetch(`/api/duplicatebill/search?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.status === 401) {
        showToast('Session expired. Please login again.', 'error');
        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }

      const data: SearchResponse = await response.json();
      setInvoices(data.invoices);
      setTotalItems(data.total);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      showToast(error.message || 'Failed to fetch invoices', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Print invoice
  const handlePrintInvoice = async (invoice: Invoice) => {
    try {
      setPrintingInvoice({ id: invoice.id, type: invoice.type });

      const response = await fetch(
        `/api/duplicatebill/${invoice.id}/duplicate?invoice_type=${invoice.type}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const data = await response.json();
      const pdfBase64 = data.pdf;

      // Convert base64 to blob
      const pdfBlob = base64ToBlob(pdfBase64, 'application/pdf');
      const pdfObjectUrl = URL.createObjectURL(pdfBlob);

      // Set PDF state
      setPdfUrl(pdfObjectUrl);
      setPdfFilename(`Duplicate_${invoice.invoice_no}.pdf`);
      setBillType('DUPLICATE BILL');

      // Show PDF modal
      setShowPdfModal(true);

      // Show cache source
      // if (data.source === 'cache') {
      //   console.log('PDF loaded from Redis cache');
      // } else {
      //   console.log('PDF generated fresh and cached for 7 days');
      // }
    } catch (error: any) {
      console.error('Error printing invoice:', error);
      showToast(error.message || 'Failed to print invoice', 'error');
    } finally {
      setPrintingInvoice(null);
    }
  };

  // Helper: Convert base64 to blob
  const base64ToBlob = (base64: string, mimeType: string) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toFixed(2)}`;
  };

  return (
    <div className="p-2 py-5 bg-white min-h-screen">
      <PageHeader title="Duplicate Bill" />

      {/* Search Bar */}
      <div className="mb-6 max-w-sm">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Search by Order ID:
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder=""
            className="regal-input flex-1 w-1/4"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="">
       {loading ? (
          <div className="text-center py-4">
            <div className="animate-pulse">
              <div className="h-12 bg-gray-200 rounded mb-4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="regal-table">
                <thead className="bg-gray-50">
                  <tr className='text-black font-semibold text-xs uppercase'>
                    <th className="px-6 py-5 text-left tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-5 text-left tracking-wider">
                      Total Price
                    </th>
                    <th className="px-6 py-5 text-left tracking-wider">
                      Amount Paid
                    </th>
                    <th className="px-6 py-5 text-left tracking-wider">
                      Discount
                    </th>
                    <th className="px-6 py-5 text-left tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-5 text-left tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-gray-900">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium">
                          {invoice.invoice_no}
                        </div>
                        <div className="text-sm">
                          {invoice.customer_name}
                          {invoice.team_name && ` (${invoice.team_name})`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatCurrency(invoice.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatCurrency(invoice.amount_paid)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatCurrency(invoice.discount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatDate(invoice.payment_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handlePrintInvoice(invoice)}
                          disabled={printingInvoice?.id === invoice.id}
                          className={`regal-btn bg-regal-yellow text-regal-black ${
                            printingInvoice?.id === invoice.id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {printingInvoice?.id === invoice.id ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Print
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                              Print
                            </span>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {invoices.length === 0 && !loading && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {debouncedSearch
                    ? `No results found for "${debouncedSearch}"`
                    : 'No invoices in the last 24 hours'}
                </p>
              </div>
            )}

            {/* Pagination */}
            {totalItems > 0 && (
              <div className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(totalItems / pageSize)}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  baseUrl="/duplicate-bill"
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* PDF Modal */}
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
              <h2 className="text-xl font-semibold">{billType}</h2>
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

export default DuplicateBillPage;
