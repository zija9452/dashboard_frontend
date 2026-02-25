'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';

interface Customer {
  cus_id: string;
  cus_name: string;
  cus_phone: string;
}

interface Salesman {
  sal_id: string;
  sal_name: string;
}

interface CartItem {
  id: string;
  category: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  image1: string | null;
  image2: string | null;
  image3: string | null;
  // Category-specific fields
  tshirt_neckstyle?: string;
  tshirt_sleeve?: string;
  tshirt_bottom?: string;
  tshirt_fabric?: string;
  trouser_style1?: string;
  trouser_style2?: string;
  trouser_bottom?: string;
  trouser_pocket?: string;
  trouser_fabric?: string;
  football_neckstyle?: string;
  football_sleeve?: string;
  football_fabric?: string;
  football_style?: string;
  football_pocket?: string;
  footballshort_fabric?: string;
  tracktshirt_style?: string;
  tracktshirt_waist?: string;
  tracktshirt_pocket?: string;
  tracktshirt_bottom?: string;
  tracktshirt_fabric?: string;
  tracktrouser_style?: string;
  tracktrouser_pocket?: string;
  tracktrouser_bottom?: string;
  tracktrouser_fabric?: string;
}

const CustomerInvoicePage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  // Form state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesmans, setSalesmans] = useState<Salesman[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [price, setPrice] = useState<number>(0);
  const [image1, setImage1] = useState<File | null>(null);
  const [image2, setImage2] = useState<File | null>(null);
  const [image3, setImage3] = useState<File | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [teamName, setTeamName] = useState('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Credit');
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

  // Category-specific fields state
  const [tshirt_neckstyle, setTshirt_neckstyle] = useState('');
  const [tshirt_sleeve, setTshirt_sleeve] = useState('');
  const [tshirt_bottom, setTshirt_bottom] = useState('');
  const [tshirt_fabric, setTshirt_fabric] = useState('');
  const [trouser_style1, setTrouser_style1] = useState('');
  const [trouser_style2, setTrouser_style2] = useState('');
  const [trouser_bottom, setTrouser_bottom] = useState('');
  const [trouser_pocket, setTrouser_pocket] = useState('');
  const [trouser_fabric, setTrouser_fabric] = useState('');
  const [football_neckstyle, setFootball_neckstyle] = useState('');
  const [football_sleeve, setFootball_sleeve] = useState('');
  const [football_fabric, setFootball_fabric] = useState('');
  const [football_style, setFootball_style] = useState('');
  const [football_pocket, setFootball_pocket] = useState('');
  const [footballshort_fabric, setFootballshort_fabric] = useState('');
  const [tracktshirt_style, setTracktshirt_style] = useState('');
  const [tracktshirt_waist, setTracktshirt_waist] = useState('');
  const [tracktshirt_pocket, setTracktshirt_pocket] = useState('');
  const [tracktshirt_bottom, setTracktshirt_bottom] = useState('');
  const [tracktshirt_fabric, setTracktshirt_fabric] = useState('');
  const [tracktrouser_style, setTracktrouser_style] = useState('');
  const [tracktrouser_pocket, setTracktrouser_pocket] = useState('');
  const [tracktrouser_bottom, setTracktrouser_bottom] = useState('');
  const [tracktrouser_fabric, setTracktrouser_fabric] = useState('');

  // Fetch customers and salesmans
  useEffect(() => {
    fetchCustomers();
    fetchSalesmans();
  }, []);

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
    setBalance(total - amountPaid);
  }, [cart, amountPaid]);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Add item to cart
  const addToCart = async () => {
    if (!selectedCategory) {
      showToast('Please select a category', 'error');
      return;
    }
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
      image1: image1 ? await fileToBase64(image1) : null,
      image2: image2 ? await fileToBase64(image2) : null,
      image3: image3 ? await fileToBase64(image3) : null,
      // Category-specific fields
      tshirt_neckstyle: selectedCategory === 'Cricket T-Shirt' || selectedCategory === 'Football T-Shirt' ? tshirt_neckstyle : undefined,
      tshirt_sleeve: selectedCategory === 'Cricket T-Shirt' || selectedCategory === 'Football T-Shirt' ? tshirt_sleeve : undefined,
      tshirt_bottom: selectedCategory === 'Cricket T-Shirt' ? tshirt_bottom : undefined,
      tshirt_fabric: selectedCategory === 'Cricket T-Shirt' || selectedCategory === 'Football T-Shirt' ? tshirt_fabric : undefined,
      trouser_style1: selectedCategory === 'Cricket Trouser' ? trouser_style1 : undefined,
      trouser_style2: selectedCategory === 'Cricket Trouser' ? trouser_style2 : undefined,
      trouser_bottom: selectedCategory === 'Cricket Trouser' ? trouser_bottom : undefined,
      trouser_pocket: selectedCategory === 'Cricket Trouser' ? trouser_pocket : undefined,
      trouser_fabric: selectedCategory === 'Cricket Trouser' ? trouser_fabric : undefined,
      football_neckstyle: selectedCategory === 'Football T-Shirt' ? football_neckstyle : undefined,
      football_sleeve: selectedCategory === 'Football T-Shirt' ? football_sleeve : undefined,
      football_fabric: selectedCategory === 'Football T-Shirt' || selectedCategory === 'Football Short' ? football_fabric : undefined,
      football_style: selectedCategory === 'Football Short' ? football_style : undefined,
      football_pocket: selectedCategory === 'Football Short' ? football_pocket : undefined,
      footballshort_fabric: selectedCategory === 'Football Short' ? footballshort_fabric : undefined,
      tracktshirt_style: selectedCategory === 'Track Jacket' ? tracktshirt_style : undefined,
      tracktshirt_waist: selectedCategory === 'Track Jacket' ? tracktshirt_waist : undefined,
      tracktshirt_pocket: selectedCategory === 'Track Jacket' ? tracktshirt_pocket : undefined,
      tracktshirt_bottom: selectedCategory === 'Track Jacket' ? tracktshirt_bottom : undefined,
      tracktshirt_fabric: selectedCategory === 'Track Jacket' ? tracktshirt_fabric : undefined,
      tracktrouser_style: selectedCategory === 'Track Trouser' ? tracktrouser_style : undefined,
      tracktrouser_pocket: selectedCategory === 'Track Trouser' ? tracktrouser_pocket : undefined,
      tracktrouser_bottom: selectedCategory === 'Track Trouser' ? tracktrouser_bottom : undefined,
      tracktrouser_fabric: selectedCategory === 'Track Trouser' ? tracktrouser_fabric : undefined,
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
    setImage1(null);
    setImage2(null);
    setImage3(null);
    // Clear category-specific fields
    setTshirt_neckstyle('');
    setTshirt_sleeve('');
    setTshirt_bottom('');
    setTshirt_fabric('');
    setTrouser_style1('');
    setTrouser_style2('');
    setTrouser_bottom('');
    setTrouser_pocket('');
    setTrouser_fabric('');
    setFootball_neckstyle('');
    setFootball_sleeve('');
    setFootball_fabric('');
    setFootball_style('');
    setFootball_pocket('');
    setFootballshort_fabric('');
    setTracktshirt_style('');
    setTracktshirt_waist('');
    setTracktshirt_pocket('');
    setTracktshirt_bottom('');
    setTracktshirt_fabric('');
    setTracktrouser_style('');
    setTracktrouser_pocket('');
    setTracktrouser_bottom('');
    setTracktrouser_fabric('');
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
      const items = cart.map(item => ({
        pro_name: item.category,
        cat_name: item.category,
        unit_price: item.unitPrice,
        pro_quantity: item.quantity,
        total_price: item.totalPrice,
        imgfile: item.image1 || '',
        imgfile2: item.image2 || '',
        imgfile3: item.image3 || '',
        // Category-specific fields
        cricktshirt_Neckstyle: item.tshirt_neckstyle || '',
        cricktshirt_sleeve: item.tshirt_sleeve || '',
        cricktshirt_bottom: item.tshirt_bottom || '',
        cricktshirt_fabric: item.tshirt_fabric || '',
        cricktrouser_style: item.trouser_style1 || '',
        cricktrouser_style2: item.trouser_style2 || '',
        cricktrouser_bottom: item.trouser_bottom || '',
        cricktrouser_pocket: item.trouser_pocket || '',
        cricktrouser_fabric: item.trouser_fabric || '',
        foottshirt_neckstyle: item.football_neckstyle || '',
        foottshirt_sleeves: item.football_sleeve || '',
        football_fabric: item.football_fabric || '',
        footshorts_style: item.football_style || '',
        footshorts_pocket: item.football_pocket || '',
        footballshort_fabric: item.footballshort_fabric || '',
        trackjack_style: item.tracktshirt_style || '',
        trackjack_waist: item.tracktshirt_waist || '',
        trackjack_pocket: item.tracktshirt_pocket || '',
        trackjack_bottom: item.tracktshirt_bottom || '',
        trackjack_fabric: item.tracktshirt_fabric || '',
        tracktrous_style: item.tracktrouser_style || '',
        tracktrous_bottom: item.tracktrouser_bottom || '',
        tracktrous_pocket: item.tracktrouser_pocket || '',
        tracktrous_fabric: item.tracktrouser_fabric || '',
      }));

      // Get customer details
      const customer = customers.find(c => c.cus_id === selectedCustomer);

      const payload = {
        items,
        customer_id: selectedCustomer,
        customer_name: customer?.cus_name || '',
        team_name: teamName,
        payment_method: paymentMethod.toLowerCase(),
        initial_paid_amount: amountPaid,
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
        Swal.fire({
          title: 'Success!',
          text: 'Customer invoice created successfully!',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        });

        // Reset form
        setCart([]);
        setSelectedCustomer('');
        setTeamName('');
        setAmountPaid(0);
        setPaymentMethod('Credit');
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
    <div className="p-4 bg-white min-h-screen">
      <PageHeader title="Customer Invoice" />

      <div className="max-w-[95%] mx-auto">
        {/* Top Section - Add Items (Left) + Items Table (Right Top) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Left Side - Add Items Form */}
          <div className="lg:col-span-1">
            <div className="regal-card sticky top-16">
              <h2 className="text-xl font-semibold mb-4">Add Item</h2>

              <div className="space-y-4">
                {/* Category */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="regal-input w-full"
                  >
                    <option value="" disabled>Select Category</option>
                    <option value="Cricket T-Shirt">Cricket T-Shirt</option>
                    <option value="Cricket Trouser">Cricket Trouser</option>
                    <option value="Football T-Shirt">Football T-Shirt</option>
                    <option value="Football Short">Football Short</option>
                    <option value="Track Jacket">Track Jacket</option>
                    <option value="Track Trouser">Track Trouser</option>
                  </select>
                </div>

                {/* Cricket T-Shirt Fields */}
                {selectedCategory === 'Cricket T-Shirt' && (
                  <div className="space-y-3 p-3 bg-regal-yellow rounded">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium mb-1">Neck Style</label>
                        <select value={tshirt_neckstyle} onChange={(e) => setTshirt_neckstyle(e.target.value)} className="regal-input w-full">
                          <option value="">Select</option>
                          <option value="Round">Round</option>
                          <option value="V-Neck">V-Neck</option>
                          <option value="Sherwani">Sherwani</option>
                          <option value="Polo +V">Polo +V</option>
                          <option value="Polo">Polo</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Sleeve</label>
                        <select value={tshirt_sleeve} onChange={(e) => setTshirt_sleeve(e.target.value)} className="regal-input w-full">
                          <option value="">Select</option>
                          <option value="Full">Full</option>
                          <option value="Half">Half</option>
                          <option value="Without">Without</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium mb-1">Bottom</label>
                        <select value={tshirt_bottom} onChange={(e) => setTshirt_bottom(e.target.value)} className="regal-input w-full">
                          <option value="">Select</option>
                          <option value="Cuff">Cuff</option>
                          <option value="Self">Self</option>
                          <option value="None">None</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Fabric</label>
                        <select value={tshirt_fabric} onChange={(e) => setTshirt_fabric(e.target.value)} className="regal-input w-full">
                          <option value="">Select</option>
                          <option value="Polyzone">Polyzone</option>
                          <option value="Mesh">Mesh</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cricket Trouser Fields */}
                {selectedCategory === 'Cricket Trouser' && (
                  <div className="space-y-3 p-3 bg-regal-yellow rounded">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium mb-1">Style</label>
                        <select value={trouser_style1} onChange={(e) => setTrouser_style1(e.target.value)} className="regal-input w-full">
                          <option value="">Select</option>
                          <option value="Full Sub">Full Sub</option>
                          <option value="Half Sub">Half Sub</option>
                          <option value="Dye">Dye</option>
                          <option value="Dye pipin">Dye pipin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Cut</label>
                        <select value={trouser_style2} onChange={(e) => setTrouser_style2(e.target.value)} className="regal-input w-full">
                          <option value="">Select</option>
                          <option value="Baggy">Baggy</option>
                          <option value="Narrow">Narrow</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium mb-1">Bottom</label>
                        <select value={trouser_bottom} onChange={(e) => setTrouser_bottom(e.target.value)} className="regal-input w-full">
                          <option value="">Select</option>
                          <option value="Open">Open</option>
                          <option value="Cuff">Cuff</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Pocket</label>
                        <select value={trouser_pocket} onChange={(e) => setTrouser_pocket(e.target.value)} className="regal-input w-full">
                          <option value="">Select</option>
                          <option value="Zipp">Zipp</option>
                          <option value="None">None</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Fabric</label>
                      <select value={trouser_fabric} onChange={(e) => setTrouser_fabric(e.target.value)} className="regal-input w-full">
                        <option value="">Select</option>
                        <option value="Speedo">Speedo</option>
                        <option value="Dull Speedo">Dull Speedo</option>
                        <option value="Mesh">Mesh</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Football T-Shirt Fields */}
                {selectedCategory === 'Football T-Shirt' && (
                  <div className="space-y-3 p-3 bg-regal-yellow rounded">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium mb-1">Neck Style</label>
                        <select value={football_neckstyle} onChange={(e) => setFootball_neckstyle(e.target.value)} className="regal-input w-full">
                          <option value="">Select</option>
                          <option value="Round">Round</option>
                          <option value="V-Neck">V-Neck</option>
                          <option value="Sherwani">Sherwani</option>
                          <option value="Polo +V">Polo +V</option>
                          <option value="Polo">Polo</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Sleeve</label>
                        <select value={football_sleeve} onChange={(e) => setFootball_sleeve(e.target.value)} className="regal-input w-full">
                          <option value="">Select</option>
                          <option value="Full">Full</option>
                          <option value="Half">Half</option>
                          <option value="Without">Without</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Fabric</label>
                      <select value={football_fabric} onChange={(e) => setFootball_fabric(e.target.value)} className="regal-input w-full">
                        <option value="">Select</option>
                        <option value="Polyzone">Polyzone</option>
                        <option value="Mesh">Mesh</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Football Short Fields */}
                {selectedCategory === 'Football Short' && (
                  <div className="space-y-3 p-3 bg-regal-yellow rounded">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium mb-1">Style</label>
                        <select value={football_style} onChange={(e) => setFootball_style(e.target.value)} className="regal-input w-full">
                          <option value="">Select</option>
                          <option value="Full Sub">Full Sub</option>
                          <option value="Half Sub">Half Sub</option>
                          <option value="Dye">Dye</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Pocket</label>
                        <select value={football_pocket} onChange={(e) => setFootball_pocket(e.target.value)} className="regal-input w-full">
                          <option value="">Select</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Fabric</label>
                      <select value={footballshort_fabric} onChange={(e) => setFootballshort_fabric(e.target.value)} className="regal-input w-full">
                        <option value="">Select</option>
                        <option value="Polyzone">Polyzone</option>
                        <option value="Mesh">Mesh</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Track Jacket Fields */}
                {selectedCategory === 'Track Jacket' && (
                  <div className="space-y-3 p-3 bg-regal-yellow rounded">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium mb-1">Style</label>
                        <select value={tracktshirt_style} onChange={(e) => setTracktshirt_style(e.target.value)} className="regal-input w-full">
                          <option value="">Select</option>
                          <option value="Full Sub">Full Sub</option>
                          <option value="Dye">Dye</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Waist</label>
                        <select value={tracktshirt_waist} onChange={(e) => setTracktshirt_waist(e.target.value)} className="regal-input w-full">
                          <option value="">Select</option>
                          <option value="Kansai">Kansai</option>
                          <option value="Belt">Belt</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium mb-1">Pocket</label>
                        <select value={tracktshirt_pocket} onChange={(e) => setTracktshirt_pocket(e.target.value)} className="regal-input w-full">
                          <option value="">Select</option>
                          <option value="Kangro">Kangro</option>
                          <option value="Hamer Pocket">Hamer Pocket</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Bottom</label>
                        <select value={tracktshirt_bottom} onChange={(e) => setTracktshirt_bottom(e.target.value)} className="regal-input w-full">
                          <option value="">Select</option>
                          <option value="Ris">Ris</option>
                          <option value="Self">Self</option>
                          <option value="Hem">Hem</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Fabric</label>
                      <select value={tracktshirt_fabric} onChange={(e) => setTracktshirt_fabric(e.target.value)} className="regal-input w-full">
                        <option value="">Select</option>
                        <option value="Polyzone">Polyzone</option>
                        <option value="Speedo">Speedo</option>
                        <option value="Fleere">Fleere</option>
                        <option value="Dull Speedo">Dull Speedo</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Track Trouser Fields */}
                {selectedCategory === 'Track Trouser' && (
                  <div className="space-y-3 p-3 bg-regal-yellow rounded">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium mb-1">Style</label>
                        <select value={tracktrouser_style} onChange={(e) => setTracktrouser_style(e.target.value)} className="regal-input w-full">
                          <option value="">Select</option>
                          <option value="Full Sub">Full Sub</option>
                          <option value="Dye">Dye</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Pocket</label>
                        <select value={tracktrouser_pocket} onChange={(e) => setTracktrouser_pocket(e.target.value)} className="regal-input w-full">
                          <option value="">Select</option>
                          <option value="Zip">Zip</option>
                          <option value="None">None</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium mb-1">Bottom</label>
                        <select value={tracktrouser_bottom} onChange={(e) => setTracktrouser_bottom(e.target.value)} className="regal-input w-full">
                          <option value="">Select</option>
                          <option value="Open">Open</option>
                          <option value="Cuff">Cuff</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Fabric</label>
                        <select value={tracktrouser_fabric} onChange={(e) => setTracktrouser_fabric(e.target.value)} className="regal-input w-full">
                          <option value="">Select</option>
                          <option value="Polyzone">Polyzone</option>
                          <option value="Speedo">Speedo</option>
                          <option value="Fleere">Fleere</option>
                          <option value="Dull Speedo">Dull Speedo</option>
                        </select>
                      </div>
                    </div>
                  </div>
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
                    step="0.01"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
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

                {/* Image Uploads */}
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">Image 1</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImage1(e.target.files?.[0] || null)}
                      className="regal-input w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Image 2</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImage2(e.target.files?.[0] || null)}
                      className="regal-input w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Image 3</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImage3(e.target.files?.[0] || null)}
                      className="regal-input w-full text-sm"
                    />
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
          <div className="lg:col-span-2 space-y-6">
            
            {/* Items Table (Right Top) */}
            <div className="regal-card">
              <h2 className="text-xl font-semibold mb-4">Items ({cart.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
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
                    {cart.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm text-gray-900">{index + 1}</td>
                        <td className="px-4 py-4 text-sm font-medium text-gray-900">{item.category}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{item.unitPrice.toFixed(2)}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-4 text-sm font-semibold text-gray-900">{item.totalPrice.toFixed(2)}</td>
                        <td className="px-4 py-4 text-sm">
                          <div className="flex gap-1">
                            {item.image1 && <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">1</span>}
                            {item.image2 && <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">2</span>}
                            {item.image3 && <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">3</span>}
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
            <div className="regal-card">
              <h2 className="text-xl font-semibold mb-4">Customer Details</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
                    value={amountPaid || ''}
                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                    className="regal-input w-full"
                    placeholder="Amount Paid"
                    min="0"
                    step="0.01"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="regal-card bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Add New Customer</h3>
            
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
    </div>
  );
};

export default CustomerInvoicePage;
