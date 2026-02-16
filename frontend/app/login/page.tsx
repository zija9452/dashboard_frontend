'use client';

import React, { useState } from 'react';
import { useSession } from '@/auth/session-provider';
import { useRouter } from 'next/navigation';
import { EyeIcon, EyeSlashIcon, LockClosedIcon, UserCircleIcon, UserGroupIcon } from '@heroicons/react/24/outline';

const LoginPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'cashier' | 'employee'>('admin'); // Default to admin
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useSession();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Additional security: Clear any potential URL parameters that might contain credentials
    if (typeof window !== 'undefined' && window.location.search) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('username') || urlParams.has('password')) {
        // Remove credentials from URL if they somehow got there
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }

    try {
      // Prevent credentials from being passed in URL by ensuring they're only in request body
      await signIn({ username, password, role: selectedRole });

      // Clear form fields after successful login
      setUsername('');
      setPassword('');

      router.push('/dashboard'); // Redirect to dashboard after successful login
      router.refresh(); // Refresh the page to update session context
    } catch (err) {
      setError('Invalid credentials. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-regal-yellow/10 via-white to-regal-black/10 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-r from-regal-yellow to-regal-black flex items-center justify-center">
            <LockClosedIcon className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold bg-gradient-to-r from-regal-yellow to-regal-black bg-clip-text text-transparent">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access your J&S dashboard
          </p>
        </div>

        {/* Login Form */}
        <div className="mt-8 bg-white shadow-xl rounded-2xl p-8 border border-regal-yellow/20">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            {/* Role Selection Field */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                User Type
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserGroupIcon className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="role"
                  name="role"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-regal-yellow/30 rounded-lg shadow-sm focus:ring-2 focus:ring-regal-yellow focus:border-regal-yellow bg-white"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as 'admin' | 'cashier' | 'employee')}
                  disabled={loading}
                >
                  <option value="admin">Admin</option>
                  <option value="cashier">Cashier</option>
                  <option value="employee">Employee</option>
                </select>
              </div>
            </div>

            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserCircleIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-regal-yellow/30 rounded-lg shadow-sm focus:ring-2 focus:ring-regal-yellow focus:border-regal-yellow placeholder-gray-400"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="block w-full pl-10 pr-10 py-3 border border-regal-yellow/30 rounded-lg shadow-sm focus:ring-2 focus:ring-regal-yellow focus:border-regal-yellow placeholder-gray-400"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-regal-yellow" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400 hover:text-regal-yellow" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg shadow-sm text-white ${
                  loading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-regal-yellow to-regal-black hover:from-regal-yellow/90 hover:to-regal-black/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-regal-yellow'
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign in to your account'
                )}
              </button>
            </div>
          </form>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-regal-yellow/10 rounded-lg border border-regal-yellow/20">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-regal-yellow" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-xs text-regal-black">
                  Your credentials are securely transmitted using HTTPS encryption and never stored in browser URL.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-8">
          <p>© {new Date().getFullYear()} J&S. All rights reserved.</p>
          <div className="mt-1 space-x-4">
            <a href="#" className="hover:text-regal-yellow">Privacy Policy</a>
            <span>|</span>
            <a href="#" className="hover:text-regal-yellow">Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;