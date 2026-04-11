'use client';

import React, { useState, useEffect } from 'react';
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

interface Salesman {
  sal_id: string;
  sal_name: string;
}

interface SubCategoryOption {
  sub_category: string;
  options: string[];
}

interface CustomerCategoryGrouped {
  id: string;
  main_category: string;
  sub_categories: SubCategoryOption[];
  ideal_prices?: Record<string, number>;
}

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
  onIdealPriceChange?: (price: number) => void;
}> = ({ selectedCategory, customerCategories, dynamicCategoryFields, setDynamicCategoryFields, onIdealPriceChange }) => {
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

  // Calculate ideal price based on selected options
  const calculateIdealPrice = (): number | null => {
    if (!categoryData.ideal_prices || Object.keys(categoryData.ideal_prices).length === 0) {
      return null;
    }

    // Build combination key from selected options
    // Order must match sub_categories order
    const selectedOptions = categoryData.sub_categories.map(subCat => 
      dynamicCategoryFields[subCat.sub_category] || ''
    );

    // Check if all sub-categories have been selected
    if (selectedOptions.some(opt => opt === '')) {
      return null;
    }

    // Build combination key
    const combinationKey = selectedOptions.join('|');
    
    // Lookup price
    const price = categoryData.ideal_prices[combinationKey];
    return price || null;
  };

  const idealPrice = calculateIdealPrice();

  // Notify parent of ideal price change
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

      {/* Ideal Price Display */}
      {idealPrice !== null && (
        <div className="mt-4 p-4 bg-regal-yellow rounded border-2 border-regal-black">
          <label className="block text-sm font-semibold text-regal-black mb-2">
            Ideal Unit Price
          </label>
          <input
            type="text"
            value={`${idealPrice.toFixed(0)}`}
            disabled
            className="w-full px-4 py-3 bg-white border-2 border-regal-black rounded text-regal-black text-lg font-bold cursor-not-allowed"
          />
        </div>
      )}
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
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [balance, setBalance] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [submitting, setSubmitting] = useState(false);

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

  // Customer categories state (dynamic)
  const [customerCategories, setCustomerCategories] = useState<CustomerCategoryGrouped[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  // Dynamic category fields state - stores selected option for each sub-category
  // Example: { "Neck Style": "Round", "Sleeve": "Full" }
  const [dynamicCategoryFields, setDynamicCategoryFields] = useState<Record<string, string>>({});

  // Ideal price state - shows when all category fields are selected
  const [idealPrice, setIdealPrice] = useState<number | null>(null);

  // Fetch customers, salesmans and customer categories
  useEffect(() => {
    fetchCustomers();
    fetchSalesmans();
    fetchCustomerCategories();
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
        console.log('Customers API Response:', data);
        // Backend returns: { data: [...] }
        const customerList = Array.isArray(data.data) ? data.data : [];
        console.log('Customers:', customerList);
        setCustomers(customerList);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
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
        console.log('Salesmans:', data.salesmans);
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

  // Calculate total and balance
  useEffect(() => {
    const total = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    setTotalAmount(total);
    const paidAmount = amountPaid === '' ? 0 : Number(amountPaid);
    setBalance(total - paidAmount);
  }, [cart, amountPaid]);

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

  // Add new customer
  const handleAddCustomer = async () => {
    if (!newCustomer.cus_name) {
      showToast('Please enter customer name', 'error');
      return;
    }

    setAddingCustomer(true);

    try {
      const payload = {
        cus_name: newCustomer.cus_name,
        cus_phone: newCustomer.cus_phone || '',
        cus_cnic: newCustomer.cus_cnic || '',
        cus_address: newCustomer.cus_address || '',
        branch: newCustomer.branch,
        cus_sal_id_fk: newCustomer.cus_sal_id_fk || '',
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
        console.log('Customer added:', addedCustomer);
        
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
        console.error('Add customer error:', errorData);
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

    setSubmitting(true);

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
        console.log('Invoice created:', result);
        console.log('Invoice ID:', result.invoice_id);

        // Reset form
        setCart([]);
        setSelectedCustomer('');
        setTeamName('');
        setAmountPaid('');
        setPaymentMethod('Cash');

        // Show receipt modal using report URL (consistent with customer details)
        if (result.invoice_id) {
          console.log('Setting invoice ID for receipt:', result.invoice_id);
          setInvoiceIdForReceipt(result.invoice_id);
          console.log('Opening modal...');
          setShowReceiptModal(true);
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
    } catch (error) {
      console.error('Error creating invoice:', error);
      showToast('Failed to create invoice', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className=" bg-white min-h-screen">
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
                      onChange={(e) => setSelectedCategory(e.target.value)}
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
                    onIdealPriceChange={setIdealPrice}
                  />
                )}

                {/* Rate (Unit Price) */}
                <div>
                  <label className="block text-sm font-medium mb-1">Rate (Unit Price)</label>
                  <input
                    type="number"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="regal-input w-full"
                    placeholder="Unit Price"
                    min="0"
                    step="1"
                  />
                </div>

                {/* Quantity */}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4">
                {/* Customer Name */}
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Name</label>
                  <div className="flex gap-2">
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
                    <button
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
                  />
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
                    placeholder="Enter amount (0 for credit)"
                    min="0"
                    step="1"
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
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Pay and Bill Button */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`regal-btn bg-regal-yellow text-regal-black w-full py-3 text-lg font-semibold ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Pay and Bill'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="regal-card bg-white p-3 md:p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Add New Customer</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Customer Name *</label>
                <input
                  type="text"
                  value={newCustomer.cus_name}
                  onChange={(e) => setNewCustomer({...newCustomer, cus_name: e.target.value})}
                  className="regal-input w-full"
                  placeholder="Enter customer name"
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
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleAddCustomer}
                disabled={addingCustomer}
                className={`regal-btn bg-regal-yellow text-regal-black flex-1 ${addingCustomer ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {addingCustomer ? 'Adding...' : 'Add Customer'}
              </button>
              <button
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
          </div>
        </div>
      )}

      {/* Receipt Modal - Using shared ReportModal component with report URL (consistent with customer details) */}
      <ReportModal
        isOpen={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          setInvoiceIdForReceipt('');
        }}
        title="Invoice Receipt"
        reportUrl={`/api/customerinvoice/receipt/${invoiceIdForReceipt}`}
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
