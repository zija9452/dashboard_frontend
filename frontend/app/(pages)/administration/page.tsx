'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';

// Define TypeScript interface for admin user
interface AdminUser {
  ad_id: string;
  ad_name: string;
  ad_role: string;
  ad_phone?: string;
  ad_address?: string;
  ad_cnic?: string;
  ad_branch?: string;
  ad_password?: string;
  is_active?: boolean;
  created_at?: string;
}

const AdministrationPage: React.FC = () => {
  const { showToast } = useToast();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // State for form inputs
  const [formData, setFormData] = useState<Omit<AdminUser, 'ad_id' | 'is_active' | 'created_at'>>({ 
    ad_name: '', 
    ad_role: 'cashier', 
    ad_phone: '', 
    ad_address: '', 
    ad_cnic: '', 
    ad_branch: '',
    ad_password: ''
  });


  // Fetch admin users
  const fetchAdminUsers = async () => {
    try {
      setLoading(true);
      console.log('Fetching admin users with search term:', searchTerm);
      
      const response = await fetch(`/api/admin/viewadmins?search_string=${encodeURIComponent(searchTerm)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      const contentType = response.headers.get('content-type');
      console.log('Response content-type:', contentType);
      
      if (!response.ok) {
        // Try to get error details from response
        let errorDetails = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          // Handle the case where errorData might be an object
          if (typeof errorData === 'object' && errorData !== null) {
            errorDetails = errorData.detail || errorData.error || JSON.stringify(errorData) || errorDetails;
          } else {
            errorDetails = errorData || errorDetails;
          }
        } catch (e) {
          // If response is not JSON, get text
          try {
            const errorText = await response.text();
            errorDetails = errorText || errorDetails;
          } catch (textError) {
            // Use default error message
          }
        }
        throw new Error(errorDetails);
      }

      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('Fetched data:', data);
        setAdminUsers(Array.isArray(data) ? data : []);
      } else {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Expected JSON response but got: ${text.substring(0, 200)}...`);
      }
    } catch (error) {
      console.error('Error fetching admin users:', error);
      const errorMessage = (error as Error).message;
      
      // Check if it's an authentication issue
      if (errorMessage.includes('401') || errorMessage.toLowerCase().includes('unauthorized') || errorMessage.includes('session') || errorMessage.includes('auth')) {
        showToast('Authentication required. Please log in again.', 'error');
      } else {
        showToast('Failed to fetch admin users: ' + errorMessage, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount and when search term changes
  useEffect(() => {
    fetchAdminUsers();
  }, [searchTerm]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({ 
      ad_name: '', 
      ad_role: 'cashier', 
      ad_phone: '', 
      ad_address: '', 
      ad_cnic: '', 
      ad_branch: '',
      ad_password: ''
    });
    setEditingUser(null);
    setShowAddForm(false);
  };

  // Submit form (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingUser) {
        // Update existing user
        console.log('Updating user with data:', formData);

        const response = await fetch(`/api/admin/updateadmin/${editingUser.ad_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ad_name: formData.ad_name || '',
            ad_role: formData.ad_role || '',
            ad_phone: formData.ad_phone || '',
            ad_address: formData.ad_address || '',
            ad_cnic: formData.ad_cnic || '',
            ad_branch: formData.ad_branch || '',
            ad_password: formData.ad_password || ''
          }),
        });

        if (!response.ok) {
          // Try to get error details from response
          let errorDetails = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            // Handle the case where errorData might be an object
            if (typeof errorData === 'object' && errorData !== null) {
              errorDetails = errorData.detail || errorData.error || JSON.stringify(errorData) || errorDetails;
            } else {
              errorDetails = errorData || errorDetails;
            }
          } catch (e) {
            // If response is not JSON, get text
            try {
              const errorText = await response.text();
              errorDetails = errorText || errorDetails;
            } catch (textError) {
              // Use default error message
            }
          }
          throw new Error(errorDetails);
        }

        const result = await response.json();
        console.log('Update result:', result);

        setAdminUsers(adminUsers.map(user => user.ad_id === editingUser.ad_id ? result : user));
        showToast('User updated successfully', 'success');
      } else {
        // Create new user
        console.log('Creating user with data:', formData);

        const response = await fetch(`/api/admin/createadmin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ad_name: formData.ad_name || '',
            ad_role: formData.ad_role || 'cashier',
            ad_phone: formData.ad_phone || '',
            ad_address: formData.ad_address || '',
            ad_cnic: formData.ad_cnic || '',
            ad_branch: formData.ad_branch || '',
            ad_password: formData.ad_password || ''
          }),
        });

        if (!response.ok) {
          // Try to get error details from response
          let errorDetails = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            // Handle the case where errorData might be an object
            if (typeof errorData === 'object' && errorData !== null) {
              errorDetails = errorData.detail || errorData.error || JSON.stringify(errorData) || errorDetails;
            } else {
              errorDetails = errorData || errorDetails;
            }
          } catch (e) {
            // If response is not JSON, get text
            try {
              const errorText = await response.text();
              errorDetails = errorText || errorDetails;
            } catch (textError) {
              // Use default error message
            }
          }
          throw new Error(errorDetails);
        }

        const result = await response.json();
        console.log('Create result:', result);

        setAdminUsers([...adminUsers, result]);
        showToast('User created successfully', 'success');
      }

      resetForm();
      fetchAdminUsers(); // Refresh the list
    } catch (error) {
      console.error('Error saving user:', error);
      const errorMessage = (error as Error).message;

      // Check if it's an authentication issue
      if (errorMessage.includes('401') || errorMessage.toLowerCase().includes('unauthorized') || errorMessage.includes('session') || errorMessage.includes('auth')) {
        showToast('Authentication required. Please log in again.', 'error');
      } else {
        showToast(error instanceof Error ? error.message : 'Failed to save user', 'error');
      }
    }
  };

  // Edit user
  const handleEdit = (user: AdminUser) => {
    setEditingUser(user);
    setFormData({
      ad_name: user.ad_name,
      ad_role: user.ad_role,
      ad_phone: user.ad_phone || '',
      ad_address: user.ad_address || '',
      ad_cnic: user.ad_cnic || '',
      ad_branch: user.ad_branch || '',
      ad_password: user.ad_password || ''
    });
    setShowAddForm(true);
  };

  // Delete user
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      console.log('Deleting user with id:', id);
      
      const response = await fetch(`/api/admin/deleteadmin/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Try to get error details from response
        let errorDetails = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          // Handle the case where errorData might be an object
          if (typeof errorData === 'object' && errorData !== null) {
            errorDetails = errorData.detail || errorData.error || JSON.stringify(errorData) || errorDetails;
          } else {
            errorDetails = errorData || errorDetails;
          }
        } catch (e) {
          // If response is not JSON, get text
          try {
            const errorText = await response.text();
            errorDetails = errorText || errorDetails;
          } catch (textError) {
            // Use default error message
          }
        }
        throw new Error(errorDetails);
      }

      const result = await response.json();
      console.log('Delete result:', result);

      setAdminUsers(adminUsers.filter(user => user.ad_id !== id));
      showToast(result.message || 'User deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting user:', error);
      const errorMessage = (error as Error).message;
      
      // Check if it's an authentication issue
      if (errorMessage.includes('401') || errorMessage.toLowerCase().includes('unauthorized') || errorMessage.includes('session') || errorMessage.includes('auth')) {
        showToast('Authentication required. Please log in again.', 'error');
      } else {
        showToast(error instanceof Error ? error.message : 'Failed to delete user', 'error');
      }
    }
  };

  return (
    <div className="p-6">
      {/* Heading */}
      <h1 className="text-2xl font-bold text-center mb-6">Administration</h1>

      {/* Buttons */}
      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={() => {
            resetForm();
            setShowAddForm(!showAddForm);
          }}
          className="regal-btn bg-regal-yellow text-regal-black"
        >
          {showAddForm ? 'Cancel' : 'Add New'}
        </button>
        <button
          className="regal-btn bg-regal-yellow text-regal-black"
          onClick={() => {
            setSearchTerm('');
            document.getElementById('searchInput')?.focus();
          }}
        >
          Search
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="regal-card p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingUser ? 'Edit User' : 'Add New User'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  name="ad_name"
                  value={formData.ad_name}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="ad_password"
                    value={formData.ad_password}
                    onChange={handleInputChange}
                    className="regal-input w-full pr-10"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  name="ad_role"
                  value={formData.ad_role}
                  onChange={handleInputChange}
                  className="regal-select w-full"
                >
                  <option value="admin">Admin</option>
                  <option value="cashier">Cashier</option>
                  <option value="employee">Employee</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="text"
                  name="ad_phone"
                  value={formData.ad_phone}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter phone"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CNIC</label>
                <input
                  type="text"
                  name="ad_cnic"
                  value={formData.ad_cnic}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter CNIC"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Branch</label>
                <input
                  type="text"
                  name="ad_branch"
                  value={formData.ad_branch}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter branch"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Address</label>
                <input
                  type="text"
                  name="ad_address"
                  value={formData.ad_address}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter address"
                />
              </div>
            </div>
            <div className="mt-4">
              <button 
                type="submit"
                className="regal-btn bg-regal-yellow text-regal-black"
              >
                {editingUser ? 'Update User' : 'Add User'}
              </button>
              {editingUser && (
                <button 
                  type="button"
                  onClick={resetForm}
                  className="regal-btn ml-2"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Search Input */}
      <div className="mb-4">
        <input
          id="searchInput"
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="regal-input w-full max-w-md mx-auto block"
        />
      </div>

      {/* Users Table */}
      <div className="regal-card">
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="regal-table w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Password</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CNIC</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {adminUsers.map((user) => (
                  <tr key={user.ad_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.ad_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {showPassword ? (user.ad_password || 'N/A') : '••••••••'}
                      <button
                        className="ml-2 text-xs text-blue-600 hover:text-blue-900"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.ad_role === 'admin' ? 'bg-yellow-100 text-regal-black' : 
                        user.ad_role === 'cashier' ? 'bg-blue-100 text-blue-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.ad_role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.ad_phone || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.ad_cnic || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.ad_address || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.ad_branch || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => handleEdit(user)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(user.ad_id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdministrationPage;