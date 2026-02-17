'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';

// Define TypeScript interface for admin user
interface AdminUser {
  id: string;
  full_name: string;
  role_id: string;
  phone?: string;
  address?: string;
  cnic?: string;
  branch?: string;
  password_hash?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  username?: string;
  company_id?: string | null;
  is_biometric_enabled?: boolean;
  original_password?: string;
  // Legacy fields for backward compatibility
  ad_id?: string;
  ad_name?: string;
  ad_role?: string;
  ad_phone?: string;
  ad_address?: string;
  ad_cnic?: string;
  ad_branch?: string;
  ad_password?: string;
}

const AdministrationPage: React.FC = () => {
  const { showToast } = useToast();
  
  // Function to map role UUIDs to role names
  const getRoleName = (roleId: string | undefined): string => {
    if (!roleId) return 'unknown';

    // Common role UUIDs based on the backend data
    if (roleId === '33128819-80ae-4a6a-9ab7-7eff272a81ff') return 'admin';
    if (roleId === '42a87026-09e0-40d2-8c21-23df1914e34d') return 'cashier';
    if (roleId === '66ab52f4-391d-43ba-b569-21ec43a74aac') return 'employee';

    // For other UUIDs, return as is or implement a lookup mechanism
    return roleId;
  };

  // Function to map role names to UUIDs
  const getRoleIdFromName = (roleName: string): string => {
    if (roleName === 'admin') return '33128819-80ae-4a6a-9ab7-7eff272a81ff';
    if (roleName === 'cashier') return '42a87026-09e0-40d2-8c21-23df1914e34d';
    if (roleName === 'employee') return '66ab52f4-391d-43ba-b569-21ec43a74aac';
    return '42a87026-09e0-40d2-8c21-23df1914e34d'; // default to cashier
  };
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [showFormPassword, setShowFormPassword] = useState(false);

  // State for form inputs
  const [formData, setFormData] = useState<AdminUser>({
    id: '',
    full_name: '',
    role_id: 'admin',
    phone: '',
    address: '',
    cnic: '',
    branch: '',
    password_hash: '',
    username: '',
    company_id: null,
    is_biometric_enabled: false,
    original_password: ''
  });


  // Fetch all users (not just admins)
  const fetchAdminUsers = async () => {
    try {
      setLoading(true);
      console.log('Fetching all users with search term:', searchTerm);

      const response = await fetch(`/api/users/?search_string=${encodeURIComponent(searchTerm)}&skip=0&limit=1000`, {
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
        
        // Map the API response to the modern format
        const mappedData = Array.isArray(data) ? data.map((user: any) => {
          const mappedUser: AdminUser = {
            id: user.id || '',
            full_name: user.full_name || 'N/A',
            role_id: user.role_id || 'N/A',
            phone: user.phone,
            address: user.address,
            cnic: user.cnic,
            branch: user.branch,
            password_hash: user.password_hash,
            is_active: user.is_active,
            created_at: user.created_at,
            updated_at: user.updated_at,
            username: user.username,
            company_id: user.company_id,
            is_biometric_enabled: user.is_biometric_enabled,
            original_password: user.original_password,
            // Legacy fields for backward compatibility (empty since users endpoint doesn't return them)
            ad_id: user.ad_id || user.id,
            ad_name: user.ad_name || user.full_name,
            ad_role: user.ad_role || getRoleName(user.role_id), // Store role name for compatibility
            ad_phone: user.ad_phone || user.phone,
            ad_address: user.ad_address || user.address,
            ad_cnic: user.ad_cnic || user.cnic,
            ad_branch: user.ad_branch || user.branch,
            ad_password: user.ad_password || user.password_hash
          };
          return mappedUser;
        }) : [];
        
        setAdminUsers(mappedData);
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
      id: '',
      full_name: '',
      role_id: 'admin',
      phone: '',
      address: '',
      cnic: '',
      branch: '',
      password_hash: '',
      username: '',
      company_id: null,
      is_biometric_enabled: false,
      original_password: ''
    });
    setEditingUser(null);
    setShowAddForm(false);
  };

  // Submit form (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingUser) {
        // Update existing user using /users/ endpoint
        console.log('Updating user with data:', formData);

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/users/${editingUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            full_name: formData.full_name || '',
            role_id: getRoleIdFromName(formData.role_id),
            phone: formData.phone || '',
            address: formData.address || '',
            cnic: formData.cnic || '',
            branch: formData.branch || '',
            password: formData.password_hash || undefined,
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

        // Update user in local state
        setAdminUsers(adminUsers.map(user => user.id === editingUser.id ? result : user));
        
        // Show success alert
        Swal.fire({
          title: 'Updated!',
          text: 'User has been updated successfully.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      } else {
        // Create new user using /users/ endpoint
        console.log('Creating user with data:', formData);

        const response = await fetch(`/api/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            full_name: formData.full_name || '',
            username: formData.username || '',
            role_id: getRoleIdFromName(formData.role_id),
            phone: formData.phone || '',
            address: formData.address || '',
            cnic: formData.cnic || '',
            branch: formData.branch || '',
            password: formData.password_hash || ''
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

        // Add new user to local state
        setAdminUsers([...adminUsers, result]);
        
        // Show success alert
        Swal.fire({
          title: 'Created!',
          text: 'User has been created successfully.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
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
    // Convert UUID to role name for dropdown
    const roleName = getRoleName(user.role_id);
    setFormData({
      id: user.id,
      full_name: user.full_name || '',
      role_id: roleName, // Use role name for dropdown
      phone: user.phone || '',
      address: user.address || '',
      cnic: user.cnic || '',
      branch: user.branch || '',
      password_hash: user.original_password || '', // Show original password if available
      username: user.username || '',
      company_id: user.company_id || null,
      is_biometric_enabled: user.is_biometric_enabled || false,
      original_password: user.original_password || ''
    });
    setShowAddForm(true);
  };

  // Delete user with SweetAlert2 confirmation
  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        console.log('Deleting user with id:', id);

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/users/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
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

        setAdminUsers(adminUsers.filter(user => user.id !== id));
        
        // Show success alert
        Swal.fire({
          title: 'Deleted!',
          text: result.message || 'User has been deleted.',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      } catch (error) {
        console.error('Error deleting user:', error);
        const errorMessage = (error as Error).message;

        // Check if it's an authentication issue
        if (errorMessage.includes('401') || errorMessage.toLowerCase().includes('unauthorized') || errorMessage.includes('session') || errorMessage.includes('auth')) {
          showToast('Authentication required. Please log in again.', 'error');
        } else {
          // Show error alert
          Swal.fire({
            title: 'Error!',
            text: error instanceof Error ? error.message : 'Failed to delete user',
            icon: 'error',
            timer: 3000,
            timerProgressBar: true,
            showConfirmButton: false
          });
        }
      }
    }
  };

  return (
    <div className="p-0">
      {/* Heading */}
      <h1 className="text-2xl font-medium text-center mb-6">View User</h1>

      {/* Controls Section - Single row with Add New and Search */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        {/* Left side - Add New button */}
        <button
          onClick={() => {
            resetForm();
            setShowAddForm(!showAddForm);
          }}
          className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
        >
          {showAddForm ? 'Cancel' : '+ Add New User'}
        </button>
        
        {/* Center - Search bar with Search button */}
        <div className="w-full sm:w-auto flex gap-2">
          <div className="relative">
            <input
              id="searchInput"
              type="text"
              placeholder="Search admins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="regal-input w-full pl-10 pr-4 py-2"
            />
            <svg 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap"
            onClick={() => {
              setSearchTerm('');
              document.getElementById('searchInput')?.focus();
            }}
          >
            Search
          </button>
        </div>
      </div>

      {/* Add/Edit Form - Collapsible */}
      {showAddForm && (
        <div className="border-0 p-0 mb-6 transition-all duration-300">
          <h3 className="text-lg font-semibold mb-4">
            {editingUser ? 'Edit Admin User' : 'Add New Admin User'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter full name (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Username *</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showFormPassword ? "text" : "password"}
                    name="password_hash"
                    value={formData.password_hash}
                    onChange={handleInputChange}
                    className="regal-input w-full pr-10"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                  >
                    {showFormPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  name="role_id"
                  value={formData.role_id}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    role_id: e.target.value
                  }))}
                  className="regal-select w-full regal-input"
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
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter phone"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CNIC</label>
                <input
                  type="text"
                  name="cnic"
                  value={formData.cnic}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter CNIC"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Branch</label>
                <input
                  type="text"
                  name="branch"
                  value={formData.branch}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter branch"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="regal-input w-full"
                  placeholder="Enter address"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                className="regal-btn bg-regal-yellow text-regal-black"
              >
                {editingUser ? 'Update User' : 'Add User'}
              </button>
             
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="regal-btn bg-gray-300 text-black"
              >
                Close
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="border-0 p-0">
         {loading ? (
          <div className="text-center py-4">
            <div className="animate-pulse">
              <div className="h-12 bg-gray-200 rounded mb-4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr className='text-black font-semibold text-xs uppercase'>
                  <th className="px-6 py-4 text-left tracking-wider">Username</th>
                  <th className="px-6 py-4 text-left tracking-wider">Password</th>
                  <th className="px-6 py-4 text-left tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left tracking-wider">Phone</th>
                  <th className="px-6 py-4 text-left tracking-wider">CNIC</th>
                  <th className="px-6 py-4 text-left tracking-wider">Address</th>
                  <th className="px-6 py-4 text-left tracking-wider">Branch</th>
                  <th className="px-6 py-4 text-left tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {adminUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {showPasswords[user.id] ? 
                        (user.original_password && user.original_password !== '' ? user.original_password : 
                         user.password_hash && user.password_hash !== '' ? user.password_hash : 'N/A') 
                        : '••••••••'}
                      <button
                        className="ml-2 text-xs text-blue-600 hover:text-blue-900"
                        onClick={() => setShowPasswords(prev => ({
                          ...prev,
                          [user.id]: !(prev[user.id])
                        }))}
                      >
                        {showPasswords[user.id] ? 'Hide' : 'Show'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-sm leading-5 font-medium `}>
                        {user.ad_role || getRoleName(user.role_id) || user.role_id}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.phone || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.cnic || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.address || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.branch || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
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