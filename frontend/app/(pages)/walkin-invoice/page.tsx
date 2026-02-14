'use client';

import React, { useState, useEffect } from 'react';

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

const WalkinInvoicePage: React.FC = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [customerName, setCustomerName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Simulated data fetch
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mock data
        const mockProducts: Product[] = [
          { id: '1', name: 'T-Shirt', price: 25.00, stock: 50 },
          { id: '2', name: 'Jeans', price: 75.00, stock: 30 },
          { id: '3', name: 'Sneakers', price: 120.00, stock: 20 },
          { id: '4', name: 'Watch', price: 200.00, stock: 15 },
          { id: '5', name: 'Backpack', price: 60.00, stock: 25 },
          { id: '6', name: 'Sunglasses', price: 45.00, stock: 40 },
          { id: '7', name: 'Hat', price: 25.00, stock: 35 },
          { id: '8', name: 'Belt', price: 35.00, stock: 30 },
        ];

        setProducts(mockProducts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Add product to cart
  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.productId === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        alert(`Only ${product.stock} units available`);
        return;
      }

      setCart(cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      if (1 > product.stock) {
        alert(`Only ${product.stock} units available`);
        return;
      }

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

    const item = cart.find(item => item.id === id);
    if (item) {
      const product = products.find(p => p.id === item.productId);
      if (product && quantity > product.stock) {
        alert(`Only ${product.stock} units available`);
        return;
      }

      setCart(cart.map(item =>
        item.id === id ? { ...item, quantity } : item
      ));
    }
  };

  // Remove item from cart
  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  // Update discount in cart
  const updateDiscount = (id: string, discount: number) => {
    setCart(cart.map(item =>
      item.id === id ? { ...item, discount: Math.min(discount, 100) } : item
    ));
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => {
    const itemTotal = item.quantity * item.unitPrice;
    const discountAmount = (itemTotal * item.discount) / 100;
    return sum + (itemTotal - discountAmount);
  }, 0);

  const tax = subtotal * 0.05; // 5% tax
  const total = subtotal + tax;

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      alert('Please add items to the cart');
      return;
    }

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
      customer_name: customerName || 'Walk-in Customer',
      payment_method: paymentMethod,
      notes,
      total_amount: total,
      subtotal,
      tax
    };

    try {
      // In a real app, this would be an API call to create the walk-in invoice
      console.log('Creating walk-in invoice:', invoiceData);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      alert('Walk-in invoice created successfully!');

      // Reset form
      setCart([]);
      setCustomerName('');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    }
  };

  if (loading) {
    return (
      <div className="regal-card m-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="regal-card m-6">
        <div className="text-red-600 p-4">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="regal-card m-6">
      <h1 className="text-2xl font-bold mb-6">Walk-in Invoice</h1>

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
              <div className="overflow-y-auto max-h-96">
                <table className="regal-table">
                  <thead className="bg-gray-50 sticky top-0">
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
                            disabled={product.stock <= 0}
                            className={`regal-btn ${product.stock <= 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
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
                <div className="overflow-y-auto max-h-96">
                  <table className="regal-table">
                    <thead className="bg-gray-50 sticky top-0">
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
                        const itemSubtotal = item.quantity * item.unitPrice;
                        const discountAmount = (itemSubtotal * item.discount) / 100;
                        const itemTotal = itemSubtotal - discountAmount;

                        return (
                          <tr key={item.id}>
                            <td className="px-4 py-2">{item.productName}</td>
                            <td className="px-4 py-2 text-right">${item.unitPrice.toFixed(2)}</td>
                            <td className="px-4 py-2 text-center">
                              <div className="flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  className="regal-btn bg-gray-200 hover:bg-gray-300 w-8 h-8 p-0"
                                  disabled={item.quantity <= 1}
                                >
                                  -
                                </button>
                                <span className="mx-2 w-8 text-center">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="regal-btn bg-gray-200 hover:bg-gray-300 w-8 h-8 p-0"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={item.discount}
                                onChange={(e) => updateDiscount(item.id, parseFloat(e.target.value) || 0)}
                                className="regal-input w-20 text-right"
                              />
                            </td>
                            <td className="px-4 py-2 text-right font-medium">${itemTotal.toFixed(2)}</td>
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
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Invoice Details */}
          <div className="space-y-6">
            {/* Customer Information */}
            <div className="regal-card">
              <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name (Optional)</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Walk-in Customer"
                  className="regal-input w-full"
                />
              </div>
            </div>

            {/* Invoice Totals */}
            <div className="regal-card">
              <h2 className="text-lg font-semibold mb-4">Invoice Summary</h2>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (5%):</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes..."
                    className="regal-input w-full"
                    rows={3}
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="regal-card">
              <button
                type="submit"
                disabled={cart.length === 0}
                className={`regal-btn w-full ${cart.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Create Walk-in Invoice
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default WalkinInvoicePage;