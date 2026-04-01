'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/ui/PageHeader';

interface InvoiceItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount: number;
  total_price: number;
  cat_name: string;
  category_fields?: string;
  custom_description?: string;
  imgfile?: string;
  imgfile2?: string;
  imgfile3?: string;
}

interface Invoice {
  id: string;
  invoice_no: string;
  customer_name: string;
  team_name?: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: string;
  payment_method: string;
  status: string;
  created_at: string;
  items: InvoiceItem[];
}

// Image Modal Component
const ImageModal: React.FC<{
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}> = ({ images, currentIndex, onClose, onPrevious, onNext }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
      >
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Previous Button */}
      {images.length > 1 && (
        <button
          onClick={onPrevious}
          className="absolute left-4 text-white hover:text-gray-300 z-10"
        >
          <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Main Image */}
      <div className="max-w-5xl max-h-screen flex items-center">
        <img
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1}`}
          className="max-h-[80vh] max-w-full object-contain rounded-lg"
        />
      </div>

      {/* Next Button */}
      {images.length > 1 && (
        <button
          onClick={onNext}
          className="absolute right-4 text-white hover:text-gray-300 z-10"
        >
          <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Image Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded-full text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
};

const ViewCustomerInvoicePage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [invoiceId, setInvoiceId] = useState<string>('');
  
  // Image modal state
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (params && params.id) {
      const id = Array.isArray(params.id) ? params.id[0] : params.id;
      setInvoiceId(id);
      fetchInvoiceDetails(id);
    }
  }, [params]);

  const fetchInvoiceDetails = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/customerinvoice/${id}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setInvoice(data);
      } else {
        showToast('Failed to fetch invoice details', 'error');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      showToast('Error fetching invoice details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const parseCategoryFields = (categoryFields?: string) => {
    if (!categoryFields) return {};
    try {
      return JSON.parse(categoryFields);
    } catch (e) {
      return {};
    }
  };

  // Open image modal
  const handleImageClick = (images: string[], index: number) => {
    const validImages = images.filter(img => img);
    if (validImages.length > 0) {
      setModalImages(validImages);
      setCurrentImageIndex(index);
      setShowImageModal(true);
    }
  };

  // Navigate images
  const handlePreviousImage = () => {
    setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : modalImages.length - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex(prev => (prev < modalImages.length - 1 ? prev + 1 : 0));
  };

  if (loading) {
    return (
      <div className="p-4">
        <PageHeader title="Invoice Details" />
        <div className="text-center py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-4">
        <PageHeader title="Invoice Details" />
        <div className="text-center py-12 text-gray-500">
          Invoice not found
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white">
      <PageHeader title="Invoice Details" />

      {/* Back Button and Order ID */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => router.push('/view-customer-order')}
          className="regal-btn bg-gray-900 text-white whitespace-nowrap"
        >
          ← Back to Orders
        </button>
        <div className="text-right">
          <h2 className="text-3xl font-bold text-gray-900">{invoice.invoice_no}</h2>
          <p className="text-sm text-gray-500">ORDER ID</p>
        </div>
      </div>

      {/* Invoice Items */}
      <div className="regal-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ORDER ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Details</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Images</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoice.items.map((item, index) => {
                const categoryFields = parseCategoryFields(item.category_fields);
                const itemImages: string[] = [item.imgfile, item.imgfile2, item.imgfile3].filter((img): img is string => !!img);
                
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm">
                      <div className="font-bold text-gray-900">{invoice.invoice_no}</div>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="font-medium text-gray-900">{item.product_name}</div>
                      {item.custom_description && (
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="font-medium">Custom:</span> {item.custom_description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="text-gray-900">{item.cat_name}</div>
                      {Object.keys(categoryFields).length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {Object.entries(categoryFields).map(([subCategory, option]) => (
                            <div key={subCategory} className="text-xs text-gray-600">
                              <span className="font-medium text-gray-700">{subCategory}:</span>
                              <span className="ml-1">{option as string}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {itemImages.length > 0 ? (
                        <div className="flex gap-2 flex-wrap">
                          {itemImages.map((img, imgIndex) => (
                            <button
                              key={imgIndex}
                              onClick={() => handleImageClick(itemImages, imgIndex)}
                              className="relative group"
                            >
                              <img
                                src={img}
                                alt={`Image ${imgIndex + 1}`}
                                className="h-16 w-16 object-cover rounded-lg border-2 border-gray-200 hover:border-regal-yellow transition-colors cursor-pointer"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-25 rounded-lg transition-all flex items-center justify-center">
                                <svg className="h-6 w-6 text-white opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs rounded-full">No Images</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">Rs. {item.unit_price.toFixed(2)}</td>
                    <td className="px-4 py-4 text-sm text-gray-900">{item.quantity}</td>
                    <td className="px-4 py-4 text-sm text-gray-900">Rs. {item.subtotal.toFixed(2)}</td>
                    <td className="px-4 py-4 text-sm text-gray-900">Rs. {item.discount.toFixed(2)}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-gray-900">Rs. {item.total_price.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <ImageModal
          images={modalImages}
          currentIndex={currentImageIndex}
          onClose={() => setShowImageModal(false)}
          onPrevious={handlePreviousImage}
          onNext={handleNextImage}
        />
      )}
    </div>
  );
};

export default ViewCustomerInvoicePage;
