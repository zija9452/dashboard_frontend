import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Changed to Inter for POS styling
import "./globals.css";
import { SessionProvider } from "@/auth/session-provider";
import Link from "next/link";
import { ToastProvider } from "@/components/ui/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "Regal POS Dashboard",
  description: "Production-ready POS frontend for FastAPI backend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <SessionProvider>
          <ToastProvider>
            <div className="flex h-screen bg-gray-50">
              {/* Sidebar */}
              <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
                <div className="flex flex-col flex-grow pt-5 bg-regal-black overflow-y-auto">
                  <div className="flex-shrink-0 px-4 flex items-center justify-center">
                    <span className="text-regal-yellow text-xl font-bold">REGAL POS</span>
                  </div>
                  <div className="mt-5 flex-1 flex flex-col">
                    <nav className="flex-1 px-2 pb-4 space-y-1">
                      <Link href="/dashboard" className="regal-btn bg-regal-yellow text-regal-black">Dashboard</Link>
                      <Link href="/administration" className="regal-btn text-regal-black hover:bg-yellow-200">Administration</Link>
                      <Link href="/products" className="regal-btn text-regal-black hover:bg-yellow-200">Products</Link>
                      <Link href="/customers" className="regal-btn text-regal-black hover:bg-yellow-200">Customers</Link>
                      <Link href="/vendors" className="regal-btn text-regal-black hover:bg-yellow-200">Vendors</Link>
                      <Link href="/salesman" className="regal-btn text-regal-black hover:bg-yellow-200">Salesman</Link>
                      <Link href="/stock" className="regal-btn text-regal-black hover:bg-yellow-200">Stock</Link>
                      <Link href="/expenses" className="regal-btn text-regal-black hover:bg-yellow-200">Expenses</Link>
                      <Link href="/customer-invoice" className="regal-btn text-regal-black hover:bg-yellow-200">Customer Invoice</Link>
                      <Link href="/view-customer-order" className="regal-btn text-regal-black hover:bg-yellow-200">View Customer Order</Link>
                      <Link href="/walkin-invoice" className="regal-btn text-regal-black hover:bg-yellow-200">Walk-in Invoice</Link>
                      <Link href="/sales-view" className="regal-btn text-regal-black hover:bg-yellow-200">Sales View</Link>
                      <Link href="/duplicate-bill" className="regal-btn text-regal-black hover:bg-yellow-200">Duplicate Bill</Link>
                      <Link href="/refund" className="regal-btn text-regal-black hover:bg-yellow-200">Refund</Link>
                      <Link href="/logout" className="regal-btn text-regal-black hover:bg-red-500">Logout</Link>
                    </nav>
                  </div>
                </div>
              </div>

              {/* Main content */}
              <div className="md:pl-64 flex flex-col flex-1">
                <header className="bg-white shadow-sm">
                  <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-xl font-semibold text-gray-900">Regal POS Dashboard</h1>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-700 mr-4">Welcome, User</span>
                      <button className="regal-btn">Profile</button>
                    </div>
                  </div>
                </header>
                <main className="flex-1">
                  {children}
                </main>
              </div>
            </div>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
