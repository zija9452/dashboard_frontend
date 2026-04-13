'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useEffect } from 'react';

interface SidebarLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  target?: string;
  rel?: string;
  onClick?: () => void;
}

export default function SidebarLink({ href, children, className, target, rel, onClick }: SidebarLinkProps) {
  const pathname = usePathname();

  const isActive = pathname === href || pathname.startsWith(href) && href !== '/';

  // Auto-close sidebar on mobile when link is clicked
  useEffect(() => {
    // Check if mobile view (window width < 768px)
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      const sidebar = document.getElementById('desktop-sidebar');
      const mainContent = document.getElementById('main-content');
      const hamburger = document.getElementById('page-hamburger-button');
      
      if (sidebar && mainContent) {
        sidebar.classList.add('hidden');
        sidebar.classList.remove('flex');
        mainContent.classList.remove('md:ml-64');
        mainContent.classList.add('md:ml-0');
        
        // Move hamburger button to closed position
        if (hamburger) {
          hamburger.style.left = '1rem';
        }
      }
    }
  }, [pathname]);

  return (
    <Link
      href={href}
      target={target}
      rel={rel}
      onClick={onClick}
      className={clsx(
        'flex items-center px-4 text-base font-medium rounded-lg transition-all duration-200',
        isActive
          ? 'bg-regal-yellow text-regal-black'
          : 'text-gray-700 hover:bg-yellow-200 hover:text-regal-black',
        className
      )}
    >
      <span className="truncate">{children}</span>
    </Link>
  );
}