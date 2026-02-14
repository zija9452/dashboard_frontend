'use client';

import { useState, useEffect } from 'react';
import SidebarLink from '@/components/SidebarLink';
import Image from 'next/image';

export default function SidebarClientWrapper() {
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
    // Add/remove class from mobile sidebar
    const sidebar = document.getElementById('mobile-sidebar');
    if (sidebar) {
      sidebar.classList.toggle('hidden');
      sidebar.classList.toggle('flex');
    }
  };

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('mobile-sidebar');
      const mobileButton = document.getElementById('mobile-menu-button');
      const desktopButton = document.getElementById('desktop-menu-button');
      
      if (sidebar && !sidebar.contains(event.target as Node) && 
          !((mobileButton && mobileButton.contains(event.target as Node)) || 
            (desktopButton && desktopButton.contains(event.target as Node))) && 
          !sidebar.classList.contains('hidden')) {
        sidebar.classList.add('hidden');
        sidebar.classList.remove('flex');
        setSidebarVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarVisible]);

  return (
    <>
      {/* Mobile menu button - shown on mobile screens only, positioned at top right */}
      <div className="fixed top-4 right-4 z-50 md:hidden">
        <button 
          id="mobile-menu-button"
          onClick={toggleSidebar}
          className="flex items-center justify-center p-2 rounded-md text-regal-black border border-regal-yellow bg-regal-yellow hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-regal-yellow"
        >
          <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Sidebar - Hidden by default, shown when hamburger is clicked */}
      <div id="mobile-sidebar" className="fixed inset-0 z-40 hidden bg-white shadow-lg w-64 transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full pt-16 pb-4">
          <div className="flex-shrink-0 px-4 flex items-center justify-start gap-2 pb-4 border-b border-gray-200">
            <Image width={40} height={40} src="/jns_logo.svg" alt="J&S Dashboard Logo" className="h-8 w-auto" />
            <span className="text-regal-black text-lg font-bold">J&S Dashboard</span>
          </div>
          <nav className="flex-1 px-2 space-y-1 overflow-y-auto pt-4">
            <SidebarLink href="/dashboard" className="text-base py-3 border-b border-gray-200">
              Dashboard
            </SidebarLink>
            <SidebarLink href="/administration" className="text-base py-3 border-b border-gray-200">
              Administration
            </SidebarLink>
            <SidebarLink href="/products" className="text-base py-3 border-b border-gray-200">
              Products
            </SidebarLink>
            <SidebarLink href="/customers" className="text-base py-3 border-b border-gray-200">
              Customers
            </SidebarLink>
            <SidebarLink href="/vendors" className="text-base py-3 border-b border-gray-200">
              Vendors
            </SidebarLink>
            <SidebarLink href="/salesman" className="text-base py-3 border-b border-gray-200">
              Salesman
            </SidebarLink>
            <SidebarLink href="/stock" className="text-base py-3 border-b border-gray-200">
              Stock
            </SidebarLink>
            <SidebarLink href="/expenses" className="text-base py-3 border-b border-gray-200">
              Expenses
            </SidebarLink>
            <SidebarLink href="/customer-invoice" className="text-base py-3 border-b border-gray-200">
              Customer Invoice
            </SidebarLink>
            <SidebarLink href="/view-customer-order" className="text-base py-3 border-b border-gray-200">
              View Customer Order
            </SidebarLink>
            <SidebarLink href="/walkin-invoice" className="text-base py-3 border-b border-gray-200">
              Walk-in Invoice
            </SidebarLink>
            <SidebarLink href="/sales-view" className="text-base py-3 border-b border-gray-200">
              Sales View
            </SidebarLink>
            <SidebarLink href="/duplicate-bill" className="text-base py-3 border-b border-gray-200">
              Duplicate Bill
            </SidebarLink>
            <SidebarLink href="/refund" className="text-base py-3 border-b border-gray-200">
              Refund
            </SidebarLink>
            <SidebarLink href="/logout" className="hover:bg-red-500 hover:text-white text-base py-3 border-b border-gray-200">
              Logout
            </SidebarLink>
          </nav>
        </div>
      </div>
    </>
  );
}