'use client';

import { useState, useEffect } from 'react';

export default function MobileMenuButton() {
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
    // Add/remove class from mobile sidebar
    const sidebar = document.getElementById('mobile-sidebar');
    if (sidebar) {
      if (sidebarVisible) {
        sidebar.classList.add('hidden');
        sidebar.classList.remove('flex');
      } else {
        sidebar.classList.remove('hidden');
        sidebar.classList.add('flex');
      }
    }
  };

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('mobile-sidebar');
      const button = document.getElementById('mobile-menu-button');
      
      if (sidebar && !sidebar.contains(event.target as Node) && 
          button && !button.contains(event.target as Node) && 
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
  }, []);

  return (
    <button
      id="mobile-menu-button"
      onClick={toggleSidebar}
      className="flex items-center justify-center p-2 rounded-md text-regal-black border border-regal-yellow bg-regal-yellow hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-regal-yellow"
    >
      <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}