'use client';

import React, { useState } from 'react';

// Define interfaces
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

const CustomInvoicePage: React.FC = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedSalesman, setSelectedSalesman] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [initialPaid, setInitialPaid] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Mock products data
  const [products] = useState<Product[]>([
    { id: '1', name: 'T-Shirt', price: 25.00, stock: 50 },
    { id: '2', name: 'Jeans', price: 50.00, stock: 30 },
    { id: '3', name: 'Sneakers', price: 80.00, stock: 20 },
    { id: '4', name: 'Watch', price: 150.00, stock: 15 },
    { id: '5', name: 'Backpack', price: 40.00, stock: 25 },
    { id: '6', name: 'Sunglasses', price: 30.00, stock: 40 },
    { id: '7', name: 'Hat', price: 20.00, stock: 35 },
    { id: '8', name: 'Belt', price: 25.00, stock: 30 },
  ]);

  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Add product to cart
  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.productId === product.id);

    if (existingItem) {
      setCart(cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([
        ...cart,
        {
          id: Date.now().toString(),
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.price,
          discount: 0
        }
      ]);
    }
  };

  // Update quantity in cart
  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }

    setCart(cart.map(item =>
      item.id === id ? { ...item, quantity } : item
    ));
  };

  // Remove item from cart
  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  // Update discount in cart
  const updateDiscount = (id: string, discount: number) => {
    setCart(cart.map(item =>
      item.id === id ? { ...item, discount } : item
    ));
  };

  // Calculate subtotal
  const subtotal = cart.reduce((sum, item) => {
    const itemTotal = item.quantity * item.unitPrice;
    const discountAmount = (itemTotal * item.discount) / 100;
    return sum + (itemTotal - discountAmount);
  }, 0);

  // Calculate total with taxes if applicable
  const total = subtotal; // Simplified - in real app, taxes might apply

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare invoice data
    const invoiceData = {
      items: cart.map(item => ({
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_percentage: item.discount,
        total_price: (item.quantity * item.unitPrice) * (1 - item.discount / 100)
      })),
      customer_id: selectedCustomer,
      salesman_id: selectedSalesman,
      payment_method: paymentMethod,
      initial_paid_amount: parseFloat(initialPaid) || 0,
      notes,
      total_amount: total
    };

    try {
      // In a real app, this would be an API call
      console.log('Submitting invoice:', invoiceData);

      // Reset form after submission
      setCart([]);
      setSelectedCustomer('');
      setSelectedSalesman('');
      setPaymentMethod('cash');
      setInitialPaid('');
      setNotes('');

      alert('Invoice created successfully!');
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice');
    }
  };

  return (
    <div className="regal-card m-6">
      <h1 className="text-2xl font-bold mb-6">Create Custom Invoice</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Product Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Search */}
            <div className="regal-card">
              <h2 className="text-lg font-semibold mb-4">Add Products</h2>
              <div className="mb-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="regal-input w-full"
                />
              </div>

              {/* Product List */}
              <div className="overflow-y-auto max-h-60">
                <table className="regal-table">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-right">Price</th>
                      <th className="px-4 py-2 text-right">Stock</th>
                      <th className="px-4 py-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredProducts.map((product) => (
                      <tr key={product.id}>
                        <td className="px-4 py-2">{product.name}</td>
                        <td className="px-4 py-2 text-right">${product.price.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">{product.stock}</td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => addToCart(product)}
                            className="regal-btn bg-green-600 hover:bg-green-700"
                          >
                            Add
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cart */}
            <div className="regal-card">
              <h2 className="text-lg font-semibold mb-4">Cart</h2>

              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Cart is empty. Add some products.</p>
              ) : (
                <div className="overflow-y-auto max-h-80">
                  <table className="regal-table">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Product</th>
                        <th className="px-4 py-2 text-right">Price</th>
                        <th className="px-4 py-2 text-center">Qty</th>
                        <th className="px-4 py-2 text-right">Discount (%)</th>
                        <th className="px-4 py-2 text-right">Total</th>
                        <th className="px-4 py-2 text-center">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {cart.map((item) => {
                        const itemTotal = item.quantity * item.unitPrice;
                        const discountAmount = (itemTotal * item.discount) / 100;
                        const finalPrice = itemTotal - discountAmount;

                        return (
                          <tr key={item.id}>
                            <td className="px-4 py-2">{item.productName}</td>
                            <td className="px-4 py-2 text-right">${item.unitPrice.toFixed(2)}</td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                                className="regal-input w-20 text-center"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={item.discount}
                                onChange={(e) => updateDiscount(item.id, parseFloat(e.target.value) || 0)}
                                className="regal-input w-20 text-center"
                              />
                            </td>
                            <td className="px-4 py-2 text-right">${finalPrice.toFixed(2)}</td>
                            <td className="px-4 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.id)}
                                className="regal-btn bg-red-600 hover:bg-red-700"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Subtotal:</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total:</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Invoice Details */}
          <div className="space-y-6">
            {/* Customer and Salesman Selection */}
            <div className="regal-card">
              <h2 className="text-lg font-semibold mb-4">Customer & Salesman</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <select
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    className="regal-input w-full"
                    required
                  >
                    <option value="">Select Customer</option>
                    <option value="cust-1">John Doe</option>
                    <option value="cust-2">Jane Smith</option>
                    <option value="cust-3">Bob Johnson</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salesman</label>
                  <select
                    value={selectedSalesman}
                    onChange={(e) => setSelectedSalesman(e.target.value)}
                    className="regal-input w-full"
                    required
                  >
                    <option value="">Select Salesman</option>
                    <option value="sm-1">John Smith</option>
                    <option value="sm-2">Jane Doe</option>
                    <option value="sm-3">Bob Wilson</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="regal-card">
              <h2 className="text-lg font-semibold mb-4">Payment Details</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="regal-input w-full"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mobile_payment">Mobile Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Paid Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={initialPaid}
                    onChange={(e) => setInitialPaid(e.target.value)}
                    className="regal-input w-full"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="regal-input w-full"
                    rows={3}
                    placeholder="Additional notes..."
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Invoice Summary and Submit */}
            <div className="regal-card">
              <h2 className="text-lg font-semibold mb-4">Summary</h2>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Items:</span>
                  <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={cart.length === 0 || !selectedCustomer}
                className={`regal-btn w-full ${cart.length === 0 || !selectedCustomer ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CustomInvoicePage;