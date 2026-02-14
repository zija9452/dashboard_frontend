import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css"
import Link from "next/link";
import { ToastProvider } from "@/components/ui/Toast";
import SidebarLink from "@/components/SidebarLink";
import SidebarClientWrapper from "@/components/SidebarClientWrapper";
import PageHamburgerButton from "@/components/PageHamburgerButton";
import Image from "next/image";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function PagesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <ToastProvider>
        <div className="flex h-screen bg-white">
          <PageHamburgerButton />
          <SidebarClientWrapper />

          {/* Desktop Sidebar */}
          <div id="desktop-sidebar" className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 border-r border-gray-200 border-b border-gray-200 bg-white shadow-lg transition-all duration-300">
            <div className="flex flex-col flex-grow pt-8 pb-3">
              <div className="flex-shrink-0 px-4 flex items-center justify-start pb-4">
                <Image width={180} height={180} src="/jns_logo.svg" alt="J&S Dashboard Logo" className="h-20 w-auto" />
                <span className="text-regal-black text-2xl font-semibold">J&S Dashboard</span>
              </div>

              <div className="mt-5 flex-1 flex flex-col overflow-hidden">
                <nav className="h-[70%] overflow-y-auto px-2">
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
                  <SidebarLink href="/logout" className="hover:bg-red-500 hover:text-white text-base py-3">
                    Logout
                  </SidebarLink>
                </nav>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div id="main-content" className="md:ml-64 flex flex-col flex-1 pt-16 md:pt-0 transition-all duration-300 bg-white">
            <header className="bg-white shadow-sm sticky top-0 z-20">

            </header>
            <main className="flex-1 p-6 bg-white">
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
    </>
  );
}
