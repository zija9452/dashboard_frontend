'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

// Define interfaces
interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  category: string;
}

interface Order {
  id: string;
  order_no: string;
  customer_name: string;
  items: OrderItem[];
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: 'issued' | 'paid' | 'partial' | 'cancelled';
  payment_method: string;
  created_at: string;
  updated_at: string;
  remarks?: string;
}

const ViewCustomOrderPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Simulated data fetch
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mock data
        const mockOrders: Order[] = [
          { id: '1', order_no: 'CIV-001', customer_name: 'John Doe', items: [{ id: '1', product_name: 'T-Shirt', quantity: 2, unit_price: 25.00, discount: 0, category: 'Clothing' }], total_amount: 50.00, amount_paid: 50.00, balance_due: 0.00, payment_status: 'paid', payment_method: 'cash', created_at: '2026-02-01T10:30:00.000Z', updated_at: '2026-02-01T10:30:00.000Z', remarks: 'Regular order' },
          { id: '2', order_no: 'CIV-002', customer_name: 'Jane Smith', items: [{ id: '1', product_name: 'Jeans', quantity: 1, unit_price: 75.00, discount: 5.00, category: 'Clothing' }], total_amount: 70.00, amount_paid: 50.00, balance_due: 20.00, payment_status: 'partial', payment_method: 'card', created_at: '2026-02-02T14:20:00.000Z', updated_at: '2026-02-02T14:20:00.000Z', remarks: 'Partial payment' },
          { id: '3', order_no: 'CIV-003', customer_name: 'Bob Johnson', items: [{ id: '1', product_name: 'Sneakers', quantity: 1, unit_price: 120.00, discount: 0, category: 'Footwear' }], total_amount: 120.00, amount_paid: 0.00, balance_due: 120.00, payment_status: 'issued', payment_method: 'cash', created_at: '2026-02-03T09:15:00.000Z', updated_at: '2026-02-03T09:15:00.000Z', remarks: 'Pending payment' },
          { id: '4', order_no: 'CIV-004', customer_name: 'Alice Williams', items: [{ id: '1', product_name: 'Watch', quantity: 1, unit_price: 200.00, discount: 10.00, category: 'Accessories' }], total_amount: 190.00, amount_paid: 190.00, balance_due: 0.00, payment_status: 'paid', payment_method: 'card', created_at: '2026-02-03T16:45:00.000Z', updated_at: '2026-02-03T16:45:00.000Z', remarks: 'Full payment received' },
          { id: '5', order_no: 'CIV-005', customer_name: 'Charlie Brown', items: [{ id: '1', product_name: 'Backpack', quantity: 1, unit_price: 60.00, discount: 0, category: 'Accessories' }], total_amount: 60.00, amount_paid: 30.00, balance_due: 30.00, payment_status: 'partial', payment_method: 'cash', created_at: '2026-02-04T11:30:00.000Z', updated_at: '2026-02-04T11:30:00.000Z', remarks: 'Partial payment' },
          { id: '6', order_no: 'CIV-006', customer_name: 'Diana Miller', items: [{ id: '1', product_name: 'Sunglasses', quantity: 1, unit_price: 45.00, discount: 0, category: 'Accessories' }], total_amount: 45.00, amount_paid: 45.00, balance_due: 0.00, payment_status: 'paid', payment_method: 'cash', created_at: '2026-02-04T13:20:00.000Z', updated_at: '2026-02-04T13:20:00.000Z', remarks: 'Cash payment' },
          { id: '7', order_no: 'CIV-007', customer_name: 'Edward Davis', items: [{ id: '1', product_name: 'Hat', quantity: 2, unit_price: 25.00, discount: 2.00, category: 'Clothing' }], total_amount: 48.00, amount_paid: 0.00, balance_due: 48.00, payment_status: 'issued', payment_method: 'cash', created_at: '2026-02-05T10:10:00.000Z', updated_at: '2026-02-05T10:10:00.000Z', remarks: 'New order' },
          { id: '8', order_no: 'CIV-008', customer_name: 'Fiona Garcia', items: [{ id: '1', product_name: 'Belt', quantity: 1, unit_price: 35.00, discount: 0, category: 'Accessories' }], total_amount: 35.00, amount_paid: 35.00, balance_due: 0.00, payment_status: 'paid', payment_method: 'card', created_at: '2026-02-05T15:45:00.000Z', updated_at: '2026-02-05T15:45:00.000Z', remarks: 'Card payment' },
        ];

        setOrders(mockOrders);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Filter orders based on search term and status
  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm ||
                         order.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.payment_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="regal-card m-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
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
      <h1 className="text-2xl font-bold mb-6">View Customer Orders</h1>

      {/* Filters */}
      <div className="regal-card mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search orders (ID, customer)..."
              className="regal-input w-full"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="regal-input"
            >
              <option value="all">All Statuses</option>
              <option value="issued">Issued</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto">
        <table className="regal-table">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.order_no}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customer_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.total_amount.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.amount_paid.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.balance_due.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    order.payment_status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : order.payment_status === 'partial'
                        ? 'bg-yellow-100 text-yellow-800'
                        : order.payment_status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                  }`}>
                    {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(order.created_at), 'MMM dd, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                  >
                    View
                  </button>
                  <button className="text-green-600 hover:text-green-900 mr-3">Print</button>
                  <button className="text-red-600 hover:text-red-900">Refund</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center pb-3 border-b">
                <h3 className="text-lg font-semibold">Order Details: {selectedOrder.order_no}</h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Customer</p>
                    <p className="font-medium">{selectedOrder.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-medium">{format(new Date(selectedOrder.created_at), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-medium capitalize">{selectedOrder.payment_status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Method</p>
                    <p className="font-medium">{selectedOrder.payment_method}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium mb-2">Items:</h4>
                  <table className="regal-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Discount</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item) => {
                        const itemTotal = (item.quantity * item.unit_price) - item.discount;
                        return (
                          <tr key={item.id}>
                            <td>{item.product_name}</td>
                            <td>{item.quantity}</td>
                            <td>${item.unit_price.toFixed(2)}</td>
                            <td>${item.discount.toFixed(2)}</td>
                            <td>${itemTotal.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between mb-1">
                    <span>Subtotal:</span>
                    <span>${selectedOrder.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>Paid:</span>
                    <span>${selectedOrder.amount_paid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Balance Due:</span>
                    <span>${selectedOrder.balance_due.toFixed(2)}</span>
                  </div>
                </div>

                {selectedOrder.remarks && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600">Remarks:</p>
                    <p>{selectedOrder.remarks}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6 space-x-3">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="regal-btn bg-gray-500 hover:bg-gray-600"
                >
                  Close
                </button>
                <button className="regal-btn bg-green-600 hover:bg-green-700">Print Invoice</button>
                <button className="regal-btn bg-red-600 hover:bg-red-700">Process Refund</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No orders found matching your criteria.</p>
          {(searchTerm || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="regal-btn mt-4"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ViewCustomOrderPage;