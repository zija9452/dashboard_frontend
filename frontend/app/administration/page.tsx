'use client';

import React from 'react';

const AdministrationPage: React.FC = () => {
  return (
    <div className="regal-card m-6">
      <h1 className="text-2xl font-bold mb-6">Administration</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="regal-card">
          <h2 className="text-lg font-semibold mb-4">User Management</h2>
          <ul className="space-y-2">
            <li><a href="/admin/users" className="text-blue-600 hover:underline">Manage Users</a></li>
            <li><a href="/admin/roles" className="text-blue-600 hover:underline">Manage Roles</a></li>
            <li><a href="/admin/permissions" className="text-blue-600 hover:underline">Manage Permissions</a></li>
          </ul>
        </div>

        <div className="regal-card">
          <h2 className="text-lg font-semibold mb-4">System Settings</h2>
          <ul className="space-y-2">
            <li><a href="/admin/settings" className="text-blue-600 hover:underline">General Settings</a></li>
            <li><a href="/admin/branches" className="text-blue-600 hover:underline">Branch Management</a></li>
            <li><a href="/admin/backup" className="text-blue-600 hover:underline">Backup & Restore</a></li>
          </ul>
        </div>

        <div className="regal-card">
          <h2 className="text-lg font-semibold mb-4">Reports & Analytics</h2>
          <ul className="space-y-2">
            <li><a href="/admin/system-logs" className="text-blue-600 hover:underline">System Logs</a></li>
            <li><a href="/admin/audit-trail" className="text-blue-600 hover:underline">Audit Trail</a></li>
            <li><a href="/admin/performance" className="text-blue-600 hover:underline">Performance Metrics</a></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdministrationPage;