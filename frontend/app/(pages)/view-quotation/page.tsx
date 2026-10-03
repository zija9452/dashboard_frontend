'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiErrorMessage } from '@/lib/apiError';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import PageHeader from '@/components/ui/PageHeader';
import ReportModal from '@/components/ui/ReportModal';

interface QuotationListItem {
  id: string;
  quotation_no: string;
  customer_name: string | null;
  team_name: string | null;
  total_amount: number;
  discounts: number;
  is_rush: boolean;
  required_by_date: string | null;
  valid_until: string | null;
  status: string;
  revision: number;
  converted_invoice_id: string | null;
  created_at: string;
  // Older revisions of this quotation (REVISED, read-only), newest first
  old_revisions: { id: string; revision: number; total_amount: number; status: string; created_at: string }[];
}

// DRAFT / SENT / REJECTED can be revised; APPROVED and CONVERTED are locked (backend checks too).
const REVISABLE = ['DRAFT', 'SENT', 'REJECTED'];

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CONVERTED: 'bg-purple-100 text-purple-800',
  REVISED: 'bg-gray-100 text-gray-500',
};

const ViewQuotationPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [actioningId, setActioningId] = useState<string | null>(null);

  // PDF modal
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [pdfFilename, setPdfFilename] = useState<string>('');

  // Invoice receipt for the order a convert just created - same receipt (and same
  // recovery logic) as Customer Invoice, so it can be handed to the customer.
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptPdfData, setReceiptPdfData] = useState('');
  // True while fetchAndShowReceipt() is in flight - full-screen loading overlay.
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  // Remembers "order X was created but its receipt hasn't been shown yet", so a
  // refresh or a dropped connection can quietly recover it (the order already exists,
  // so this is a plain re-fetch with no duplicate risk).
  const CONVERT_LAST_CREATED_STORAGE = 'quotation-convert-last-created';

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const query = statusFilter ? `?status=${statusFilter}&limit=200` : '?limit=200';
      const response = await fetch(`/api/quotation/${query}`, { method: 'GET', credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setQuotations(data.data || []);
      } else {
        showToast('Failed to fetch quotations', 'error');
      }
    } catch (error) {
      console.error('Error fetching quotations:', error);
      showToast('Failed to fetch quotations', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch the receipt PDF for an already-created invoice and show it. A plain read,
  // so always safe to retry. Returns whether it was actually shown.
  const fetchAndShowReceipt = async (invoiceId: string): Promise<boolean> => {
    setLoadingReceipt(true);
    try {
      const res = await fetch(`/api/customerinvoice/receipt/${invoiceId}`, {
        method: 'POST',
        credentials: 'include',
        // A stalled connection would otherwise hang (and the overlay with it) forever.
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) return false;
      const data = await res.json();
      const pdf = typeof data === 'string' ? data : data.pdf;
      if (!pdf) return false;
      setReceiptPdfData(pdf);
      setShowReceiptModal(true);
      return true;
    } catch {
      return false;
    } finally {
      setLoadingReceipt(false);
    }
  };

  // Recover a receipt that never got shown. Runs on mount and again whenever the
  // browser comes back online, so no manual refresh is needed.
  const recoverLastCreatedReceipt = async () => {
    let stored: { invoiceId: string; invoiceNo: string } | null = null;
    try {
      stored = JSON.parse(localStorage.getItem(CONVERT_LAST_CREATED_STORAGE) || 'null');
    } catch {
      stored = null;
    }
    if (!stored) return;

    const shown = await fetchAndShowReceipt(stored.invoiceId);
    if (shown) {
      try { localStorage.removeItem(CONVERT_LAST_CREATED_STORAGE); } catch { /* ignore */ }
      showToast(`Recovered receipt for order ${stored.invoiceNo}`, 'success');
    }
    // Still failing (net still down) - leave it for the 'online' event, next mount,
    // or Duplicate Bill. No retry loop.
  };

  useEffect(() => {
    recoverLastCreatedReceipt();
    window.addEventListener('online', recoverLastCreatedReceipt);
    return () => window.removeEventListener('online', recoverLastCreatedReceipt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchQuotations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setActioningId(id);
    try {
      const response = await fetch(`/api/quotation/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await response.json();
      if (response.ok) {
        showToast(`Status updated to ${newStatus}`, 'success');
        fetchQuotations();
      } else {
        showToast(apiErrorMessage(result, 'Failed to update status'), 'error');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Failed to update status', 'error');
    } finally {
      setActioningId(null);
    }
  };

  const handleConvert = async (id: string, quotationNo: string) => {
    const confirm = await Swal.fire({
      title: `Convert ${quotationNo} to a real order?`,
      text: 'This will create a real Customer Order (invoice). This cannot be undone.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, convert',
      cancelButtonText: 'Cancel',
    });
    if (!confirm.isConfirmed) return;

    setActioningId(id);
    try {
      const response = await fetch(`/api/quotation/${id}/convert`, { method: 'POST', credentials: 'include' });
      const result = await response.json();
      if (response.ok && result.success) {
        Swal.fire({
          title: 'Converted!',
          text: `Order ${result.invoice_no} has been created.`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
        });
        fetchQuotations();

        // Remember it until the receipt is actually shown, so a failed fetch or a
        // refresh can be recovered (see recoverLastCreatedReceipt).
        try {
          localStorage.setItem(CONVERT_LAST_CREATED_STORAGE, JSON.stringify({
            invoiceId: result.invoice_id,
            invoiceNo: result.invoice_no,
          }));
        } catch { /* ignore */ }

        const shown = await fetchAndShowReceipt(result.invoice_id);
        if (shown) {
          try { localStorage.removeItem(CONVERT_LAST_CREATED_STORAGE); } catch { /* ignore */ }
        } else {
          showToast(
            `Order ${result.invoice_no} was created, but the receipt could not be loaded. Check your internet connection and reopen it from Duplicate Bill.`,
            'error'
          );
        }
      } else {
        showToast(apiErrorMessage(result, 'Failed to convert'), 'error');
      }
    } catch (error) {
      console.error('Error converting quotation:', error);
      const isNetworkError = error instanceof TypeError && /fetch/i.test((error as Error).message || '');
      showToast(
        isNetworkError ? 'Internet connection problem. Please check your connection and try again.' : 'Failed to convert',
        'error'
      );
    } finally {
      setActioningId(null);
    }
  };

  const handleDelete = async (id: string, quotationNo: string, revision: number) => {
    const confirm = await Swal.fire({
      title: `Delete ${quotationNo}${revision > 1 ? ` Rev.${revision}` : ''}?`,
      // Deleting a revision re-opens the one it replaced (backend puts its old status back)
      text: revision > 1 ? `Rev.${revision - 1} will become the active quotation again.` : undefined,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, delete',
    });
    if (!confirm.isConfirmed) return;

    setActioningId(id);
    try {
      const response = await fetch(`/api/quotation/${id}`, { method: 'DELETE', credentials: 'include' });
      if (response.ok) {
        showToast('Quotation deleted', 'success');
        fetchQuotations();
      } else {
        const result = await response.json();
        showToast(apiErrorMessage(result, 'Failed to delete'), 'error');
      }
    } catch (error) {
      console.error('Error deleting quotation:', error);
      showToast('Failed to delete', 'error');
    } finally {
      setActioningId(null);
    }
  };

  const handleViewPdf = async (id: string) => {
    setActioningId(id);
    try {
      const response = await fetch(`/api/quotation/${id}/pdf`, { method: 'GET', credentials: 'include' });
      const result = await response.json();
      if (response.ok && result.pdf_base64) {
        const byteChars = atob(result.pdf_base64);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
        const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setPdfFilename(result.filename || 'quotation.pdf');
        setShowPdfModal(true);
      } else {
        showToast(apiErrorMessage(result, 'Failed to load PDF'), 'error');
      }
    } catch (error) {
      console.error('Error loading PDF:', error);
      showToast('Failed to load PDF', 'error');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="p-2 py-5">
      <PageHeader title="Quotations" />

      <div className="flex flex-wrap justify-between gap-4 mb-6">
        <button onClick={() => router.push('/quotation')} className="regal-btn bg-regal-yellow text-regal-black">
          + New Quotation
        </button>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="regal-input w-48">
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CONVERTED">Converted</option>
        </select>
      </div>

      {loading ? (
        <div className="animate-pulse h-40 bg-gray-100 rounded"></div>
      ) : quotations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No quotations found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-100">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-3">Quotation No</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3">Rush</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {quotations.map((q) => (
                <React.Fragment key={q.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{q.quotation_no} <span className="text-xs text-gray-400">(Rev.{q.revision})</span></td>
                  <td className="px-4 py-3">{q.customer_name || '-'}{q.team_name ? ` / ${q.team_name}` : ''}</td>
                  <td className="px-4 py-3">{q.required_by_date || '-'}</td>
                  <td className="px-4 py-3">
                    {q.is_rush ? <span className="inline-flex px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">RUSH</span> : <span className="text-gray-400 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    {q.discounts > 0 ? <span className="text-green-700">- Rs. {q.discounts}</span> : <span className="text-gray-400 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3">Rs. {q.total_amount}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[q.status] || 'bg-gray-100 text-gray-700'}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        disabled={actioningId === q.id}
                        onClick={() => handleViewPdf(q.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        📄 PDF
                      </button>

                      {q.status === 'DRAFT' && (
                        <button
                          disabled={actioningId === q.id}
                          onClick={() => handleStatusChange(q.id, 'SENT')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Mark Sent
                        </button>
                      )}

                      {q.status === 'SENT' && (
                        <>
                          <button
                            disabled={actioningId === q.id}
                            onClick={() => handleStatusChange(q.id, 'APPROVED')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            ✓ Approve
                          </button>
                          <button
                            disabled={actioningId === q.id}
                            onClick={() => handleStatusChange(q.id, 'REJECTED')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            ✕ Reject
                          </button>
                        </>
                      )}

                      {q.status === 'APPROVED' && (
                        <button
                          disabled={actioningId === q.id}
                          onClick={() => handleConvert(q.id, q.quotation_no)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-purple-700 text-white hover:bg-purple-800 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          → Convert to Order
                        </button>
                      )}

                      {REVISABLE.includes(q.status) && (
                        <button
                          disabled={actioningId === q.id}
                          onClick={() => router.push(`/quotation?revise=${q.id}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-gray-300 text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          ✎ Revise
                        </button>
                      )}

                      {q.status === 'DRAFT' && (
                        <button
                          disabled={actioningId === q.id}
                          onClick={() => handleDelete(q.id, q.quotation_no, q.revision)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          🗑 Delete
                        </button>
                      )}

                      {q.status === 'CONVERTED' && q.converted_invoice_id && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700">
                          ✓ Order created
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
                {/* Older revisions, grey under the latest one - read-only, PDF only */}
                {q.old_revisions.map((old) => (
                  <tr key={old.id} className="bg-gray-50 text-gray-400 text-sm">
                    <td className="px-4 py-2 pl-8">
                      ↳ {q.quotation_no} <span className="text-xs">(Rev.{old.revision})</span>
                    </td>
                    <td className="px-4 py-2" colSpan={4}>
                      <span className="text-xs">Replaced by Rev.{old.revision + 1}</span>
                    </td>
                    <td className="px-4 py-2">Rs. {old.total_amount}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES.REVISED}`}>REVISED</span>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        disabled={actioningId === old.id}
                        onClick={() => handleViewPdf(old.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        📄 PDF
                      </button>
                    </td>
                  </tr>
                ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

      {/* Invoice receipt of the converted order - same ReportModal as Customer Invoice */}
      <ReportModal
        isOpen={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          setReceiptPdfData('');
        }}
        title="Invoice Receipt"
        pdfData={receiptPdfData}
      />
    </div>
  );
};

export default ViewQuotationPage;
