'use client';

import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import ReportModal from '@/components/ui/ReportModal';

interface DashboardStats {
  totalWarehouseProducts: number;
  shortInventory: number;
  lowWarehouseStock: number;
  userRole: string;
}

const WarehouseDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalWarehouseProducts: 0,
    shortInventory: 0,
    lowWarehouseStock: 0,
    userRole: 'Warehouse',
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const [showShopReportModal, setShowShopReportModal] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // Fetch all warehouse products (is_warehouse_product = true)
      const warehouseResponse = await fetch('/api/products/viewproduct?warehouse=true&page=1&limit=1000', {
        credentials: 'include',
      });

      let totalWarehouse = 0;
      let shortInventory = 0;
      let lowWarehouseStock = 0;

      if (warehouseResponse.ok) {
        const warehouseData = await warehouseResponse.json();
        const products = warehouseData.data || [];
        totalWarehouse = warehouseData.total || 0;

        // Short Inventory: warehouse products where stock_level is 0 OR < limited_qty
        shortInventory = products.filter((p: any) => 
          (p.stock_level || 0) === 0 || (p.stock_level || 0) < (p.limited_qty || 0)
        ).length;

        // Low Warehouse Stock: warehouse products where warehouse_stock < warehouse_limited_qty
        lowWarehouseStock = products.filter((p: any) => 
          (p.warehouse_stock || 0) < (p.warehouse_limited_qty || 0)
        ).length;
      }

      setStats({
        totalWarehouseProducts: totalWarehouse,
        shortInventory: shortInventory,
        lowWarehouseStock: lowWarehouseStock,
        userRole: 'Warehouse',
      });
    } catch (error) {
      console.error('Error fetching warehouse dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-2 py-5 pt-16 sm:pt-4">
        <PageHeader title="Warehouse Dashboard" />

        <div className="max-w-[100%] md:max-w-[85%] mx-auto">
          {/* Loading Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="regal-card p-3 md:p-4" style={{ minHeight: '80px' }}>
                <div className="animate-pulse flex items-center justify-between h-full">
                  <div className="flex-1">
                    <div className="h-3 md:h-4 bg-gray-200 rounded w-20 md:w-24 mb-2"></div>
                    <div className="h-6 md:h-8 bg-gray-200 rounded w-24 md:w-32 mb-2"></div>
                  </div>
                  <div className="h-8 md:h-10 w-8 md:w-10 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 py-5 pt-16 sm:pt-4">
      <PageHeader title="Warehouse Dashboard" />

      {/* Main Content - Same width as shop dashboard */}
      <div className="max-w-[100%] md:max-w-[85%] mx-auto">
        {/* Top Row - 3 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
          {/* Warehouse Products */}
          <div className="regal-card p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Warehouse Products</p>
                <p className="text-xl md:text-2xl font-semibold text-gray-900">
                  {stats.totalWarehouseProducts}
                </p>
              </div>
              <div className="text-3xl md:text-4xl">🏪</div>
            </div>
          </div>

          {/* Short Inventory */}
          <div className="regal-card p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Short Shop Stock</p>
                <p className="text-xl md:text-2xl font-semibold text-red-600">
                  {stats.shortInventory}
                </p>
              </div>
              <div className="text-3xl md:text-4xl">📦</div>
            </div>
          </div>

          {/* Low Warehouse Stock */}
          <div className="regal-card p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Short Warehouse Stock</p>
                <p className="text-xl md:text-2xl font-semibold text-orange-600">
                  {stats.lowWarehouseStock}
                </p>
              </div>
              <div className="text-3xl md:text-4xl">⚠️</div>
            </div>
          </div>

        </div>

        {/* Middle Row - User Card & Quick Actions */}
        <div className="grid grid-cols-1 gap-4 md:gap-6 mb-4 md:mb-6">
          {/* User */}
          <div className="regal-card p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">User</p>
                <p className="text-lg md:text-xl font-semibold text-gray-900">Warehouse User</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.userRole}
                </p>
              </div>
              <div className="text-3xl md:text-4xl">👤</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="regal-card p-3 md:p-4">
            <p className="text-xs md:text-sm font-medium text-gray-600 mb-3">Quick Actions</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowReportModal(true)}
                className="regal-btn bg-regal-yellow text-regal-black text-sm md:text-base w-full sm:w-auto py-4"
              >
                Warehouse Requirement Report
              </button>
              <button
                onClick={() => setShowShopReportModal(true)}
                className="regal-btn bg-regal-yellow text-regal-black text-sm md:text-base w-full sm:w-auto py-4"
              >
                Shop Requirement Report
              </button>
            </div>
          </div>
        </div>
      </div>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Warehouse Requirement Report"
        reportUrl="/api/warehouse-stock/requirement-report"
      />

      <ReportModal
        isOpen={showShopReportModal}
        onClose={() => setShowShopReportModal(false)}
        title="Shop Requirement Report"
        reportUrl="/api/warehouse-stock/shop-requirement-report"
      />
    </div>
  );
};

export default WarehouseDashboardPage;
