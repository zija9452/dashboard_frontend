'use client';

import "../globals.css"
import Link from "next/link";
import { ToastProvider } from "@/components/ui/Toast";
import SidebarLink from "@/components/SidebarLink";
import SidebarClientWrapper from "@/components/SidebarClientWrapper";
import PageHamburgerButton from "@/components/PageHamburgerButton";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import Image from "next/image";
import { useEffect, useState } from "react";

function WarehouseSidebarLayoutContent({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const { sidebarOpen, toggleSidebar } = useSidebar();

  useEffect(() => {
    // Fetch user role from session
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.user?.role || null);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    fetchUserRole();
  }, []);

  return (
    <ToastProvider>
      <div className="flex  bg-white">
        <PageHamburgerButton sidebarOpen={sidebarOpen} onToggle={toggleSidebar} />
        <SidebarClientWrapper />

          {/* Desktop Sidebar */}
          <div
            id="desktop-sidebar"
            className={`fixed inset-y-0 z-30 border-r border-gray-200 border-b bg-white shadow-lg w-64 flex flex-col transition-transform duration-300 ease-in-out ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex flex-col flex-grow pt-5 pb-3">
              <Link href={"/warehouse-dashboard"}>
              <div className="flex-shrink-0 px-6">
                <Image width={240} height={240} src="/european-logo.svg" alt="European Sports Warehouse Logo" className="h-28 w-auto" />

              </div></Link>

              <div className="mt-5 flex-1 flex flex-col overflow-hidden">
                <nav className="h-[70%] overflow-y-auto px-2">
                  <SidebarLink href="/warehouse-dashboard" className="text-base py-3 border-b border-gray-200">
                    Warehouse Dashboard
                  </SidebarLink>
                  <SidebarLink href="/warehouse-customers" className="text-base py-3 border-b border-gray-200">
                    Warehouse Customers
                  </SidebarLink>
                  <SidebarLink href="/warehouse-products" className="text-base py-3 border-b border-gray-200">
                    Warehouse Products
                  </SidebarLink>
                  <SidebarLink href="/warehouse-stock" className="text-base py-3 border-b border-gray-200">
                    Warehouse Stock
                  </SidebarLink>
                  <SidebarLink href="/warehouse-vendors" className="text-base py-3 border-b border-gray-200">
                    Warehouse Vendors
                  </SidebarLink>
                  <SidebarLink href="/logout" className="text-base py-3">
                    Logout
                  </SidebarLink>
                </nav>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div
            id="main-content"
            className={`flex flex-col flex-1 transition-all duration-300 ease-in-out bg-white overflow-hidden ${
              sidebarOpen ? 'md:ml-64' : 'ml-0'
            }`}
          >
            <header className="bg-white shadow-sm sticky top-0 z-20">

            </header>
            <main className="flex-1 md:p-6 bg-white">
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
  );
}

export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <WarehouseSidebarLayoutContent>{children}</WarehouseSidebarLayoutContent>
    </SidebarProvider>
  );
}
