'use client';

import React from 'react';

const AdministrationPage: React.FC = () => {
  return (
    <div className="regal-card m-6">
      <h1 className="text-2xl font-bold mb-6">Administration</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* User Management */}
        <div className="regal-card">
          <h2 className="text-lg font-semibold mb-4">User Management</h2>
          <ul className="space-y-2">
            <li><a href="/admin/users" className="text-blue-600 hover:underline">Manage Users</a></li>
            <li><a href="/admin/roles" className="text-blue-600 hover:underline">Manage Roles</a></li>
            <li><a href="/admin/permissions" className="text-blue-600 hover:underline">Manage Permissions</a></li>
          </ul>
        </div>

        {/* System Settings */}
        <div className="regal-card">
          <h2 className="text-lg font-semibold mb-4">System Settings</h2>
          <ul className="space-y-2">
            <li><a href="/admin/settings" className="text-blue-600 hover:underline">General Settings</a></li>
            <li><a href="/admin/branches" className="text-blue-600 hover:underline">Branch Management</a></li>
            <li><a href="/admin/backup" className="text-blue-600 hover:underline">Backup & Restore</a></li>
          </ul>
        </div>

        {/* Reports & Analytics */}
        <div className="regal-card">
          <h2 className="text-lg font-semibold mb-4">Reports & Analytics</h2>
          <ul className="space-y-2">
            <li><a href="/admin/system-logs" className="text-blue-600 hover:underline">System Logs</a></li>
            <li><a href="/admin/audit-trail" className="text-blue-600 hover:underline">Audit Trail</a></li>
            <li><a href="/admin/performance" className="text-blue-600 hover:underline">Performance Metrics</a></li>
          </ul>
        </div>

        {/* Financial Management */}
        <div className="regal-card">
          <h2 className="text-lg font-semibold mb-4">Financial Management</h2>
          <ul className="space-y-2">
            <li><a href="/admin/taxes" className="text-blue-600 hover:underline">Tax Settings</a></li>
            <li><a href="/admin/discounts" className="text-blue-600 hover:underline">Discount Management</a></li>
            <li><a href="/admin/payment-methods" className="text-blue-600 hover:underline">Payment Methods</a></li>
          </ul>
        </div>

        {/* Inventory Settings */}
        <div className="regal-card">
          <h2 className="text-lg font-semibold mb-4">Inventory Settings</h2>
          <ul className="space-y-2">
            <li><a href="/admin/categories" className="text-blue-600 hover:underline">Categories</a></li>
            <li><a href="/admin/brands" className="text-blue-600 hover:underline">Brands</a></li>
            <li><a href="/admin/units" className="text-blue-600 hover:underline">Units of Measure</a></li>
          </ul>
        </div>

        {/* Integrations */}
        <div className="regal-card">
          <h2 className="text-lg font-semibold mb-4">Integrations</h2>
          <ul className="space-y-2">
            <li><a href="/admin/printers" className="text-blue-600 hover:underline">Printer Settings</a></li>
            <li><a href="/admin/payments" className="text-blue-600 hover:underline">Payment Gateways</a></li>
            <li><a href="/admin/api" className="text-blue-600 hover:underline">API Management</a></li>
          </ul>
        </div>
      </div>

      <div className="mt-8 regal-card">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="regal-btn bg-regal-yellow text-regal-black">Add New User</button>
          <button className="regal-btn bg-regal-yellow text-regal-black">Update System</button>
          <button className="regal-btn bg-regal-yellow text-regal-black">Run Backup</button>
          <button className="regal-btn bg-regal-yellow text-regal-black">View Logs</button>
        </div>
      </div>
    </div>
  );
};

export default AdministrationPage;