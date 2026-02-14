'use client';

import React from 'react';

const DashboardPage: React.FC = () => {
  // Mock data for dashboard
  const kpiData = [
    { title: 'Total Sales', value: '$12,480.00', change: '+12.5%', icon: '💰' },
    { title: 'Products', value: '1,248', change: '+3.2%', icon: '📦' },
    { title: 'Customers', value: '562', change: '+5.7%', icon: '👥' },
    { title: 'Pending Orders', value: '12', change: '-2.1%', icon: '📝' },
  ];

  const recentActivity = [
    { id: 1, action: 'New order created', details: 'Order #CIV-001 by John Doe', time: '2 mins ago' },
    { id: 2, action: 'Product stock updated', details: 'T-Shirt stock increased to 45', time: '15 mins ago' },
    { id: 3, action: 'New customer added', details: 'Jane Smith registered', time: '1 hour ago' },
    { id: 4, action: 'Refund processed', details: 'Refund for order #WIV-002', time: '3 hours ago' },
    { id: 5, action: 'Expense recorded', details: 'Office supplies $150.00', time: '5 hours ago' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Regal POS Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpiData.map((kpi, index) => (
          <div key={index} className="regal-card">
            <div className="flex items-center">
              <div className="text-3xl mr-4">{kpi.icon}</div>
              <div>
                <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className={`text-sm ${kpi.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {kpi.change} from last week
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Sales Chart */}
        <div className="lg:col-span-2 regal-card">
          <h2 className="text-xl font-semibold mb-4">Sales Overview</h2>
          <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
            <p className="text-gray-500">Sales chart visualization</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="regal-card">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="regal-btn w-full bg-regal-yellow text-regal-black flex items-center justify-center">
              <span className="mr-2">+</span> Add Product
            </button>
            <button className="regal-btn w-full bg-regal-yellow text-regal-black flex items-center justify-center">
              <span className="mr-2">+</span> Create Invoice
            </button>
            <button className="regal-btn w-full bg-regal-yellow text-regal-black flex items-center justify-center">
              <span className="mr-2">+</span> Add Customer
            </button>
            <button className="regal-btn w-full bg-regal-yellow text-regal-black flex items-center justify-center">
              <span className="mr-2">🖨️</span> Print Labels
            </button>
            <button className="regal-btn w-full bg-regal-yellow text-regal-black flex items-center justify-center">
              <span className="mr-2">📊</span> View Reports
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="regal-card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Activity</h2>
          <a href="/admin/activity-log" className="text-blue-600 hover:underline text-sm">View All</a>
        </div>

        <div className="overflow-x-auto">
          <table className="regal-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentActivity.map((activity) => (
                <tr key={activity.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{activity.action}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{activity.details}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{activity.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;