'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import PageHeader from '@/components/ui/PageHeader';

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
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CONVERTED: 'bg-purple-100 text-purple-800',
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
        showToast(result.detail || result.error || 'Failed to update status', 'error');
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
        await Swal.fire({
          title: 'Converted!',
          text: `Order ${result.invoice_no} has been created.`,
          icon: 'success',
        });
        fetchQuotations();
      } else {
        showToast(result.detail || result.error || 'Failed to convert', 'error');
      }
    } catch (error) {
      console.error('Error converting quotation:', error);
      showToast('Failed to convert', 'error');
    } finally {
      setActioningId(null);
    }
  };

  const handleDelete = async (id: string, quotationNo: string) => {
    const confirm = await Swal.fire({
      title: `Delete ${quotationNo}?`,
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
        showToast(result.detail || result.error || 'Failed to delete', 'error');
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
        showToast(result.detail || result.error || 'Failed to load PDF', 'error');
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
                <tr key={q.id} className="hover:bg-gray-50">
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

                      {q.status === 'DRAFT' && (
                        <button
                          disabled={actioningId === q.id}
                          onClick={() => handleDelete(q.id, q.quotation_no)}
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
    </div>
  );
};

export default ViewQuotationPage;
