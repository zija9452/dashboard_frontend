'use client';

interface PageHamburgerButtonProps {
  sidebarOpen: boolean;
  onToggle: () => void;
}

export default function PageHamburgerButton({ sidebarOpen, onToggle }: PageHamburgerButtonProps) {
  return (
    <button
      id="page-hamburger-button"
      onClick={onToggle}
      className={`fixed top-4 z-50 flex items-center justify-center p-2 rounded-full text-regal-black border border-regal-yellow bg-regal-yellow hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-regal-yellow w-10 h-10 transition-all duration-300 shadow-lg ${
        sidebarOpen 
      ? 'left-[calc(16rem-20px)] md:left-[calc(16rem-20px)]'  // ✅ w-64 = 16rem, minus 4px
      : 'left-4'
  }`}
    >
      <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}
