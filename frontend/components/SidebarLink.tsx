'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

interface SidebarLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export default function SidebarLink({ href, children, className }: SidebarLinkProps) {
  const pathname = usePathname();
  
  const isActive = pathname === href || pathname.startsWith(href) && href !== '/';
  
  return (
    <Link
      href={href}
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