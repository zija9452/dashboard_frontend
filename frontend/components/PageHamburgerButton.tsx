'use client';

import { useState, useEffect } from 'react';

export default function PageHamburgerButton() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const sidebar = document.getElementById('desktop-sidebar');
    const mainContent = document.getElementById('main-content');
    
    if (sidebar && mainContent) {
      if (sidebarCollapsed) {
        sidebar.classList.remove('md:w-64');
        sidebar.classList.add('md:w-0');
        sidebar.classList.add('md:overflow-hidden');
        
        mainContent.classList.remove('md:ml-64');
        mainContent.classList.add('md:ml-0');
      } else {
        sidebar.classList.add('md:w-64');
        sidebar.classList.remove('md:w-0');
        sidebar.classList.remove('md:overflow-hidden');
        
        mainContent.classList.add('md:ml-64');
        mainContent.classList.remove('md:ml-0');
      }
    }
  }, [sidebarCollapsed]);

  return (
    <button
      id="page-hamburger-button"
      onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
      className={`fixed top-4 z-50 md:top-4 flex items-center justify-center p-2 rounded-full text-regal-black border border-regal-yellow bg-regal-yellow hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-regal-yellow w-10 h-10 ${
        sidebarCollapsed ? 'left-4' : 'left-[234px]'
      }`}
    >
      <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}