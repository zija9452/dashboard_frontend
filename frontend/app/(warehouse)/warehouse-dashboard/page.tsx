'use client';

import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import PageHeader from '@/components/ui/PageHeader';
import ReportModal from '@/components/ui/ReportModal';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardData {
  totalSales: number;
  totalExpense: number;
  totalPurchase: number;
  outOfStock: number;
  shortStock: number;
  totalProducts: number;
  shortShopStock: number;
  urgentBuy: number;
  adminUser: string;
  userRole: string;
  openingBalance: number;
  chartData?: {
    dates: string[];
    sales: number[];
    purchases: number[];
  };
  dateRange?: {
    from: string;
    to: string;
  };
}

const WarehouseDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>('Warehouse');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showShopReportModal, setShowShopReportModal] = useState(false);
  const [showUrgentBuyModal, setShowUrgentBuyModal] = useState(false);

  // Single Date Range defaults to TODAY (daily view)
  const todayStr = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState<string>(todayStr);
  const [toDate, setToDate] = useState<string>(todayStr);

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalSales: 0,
    totalExpense: 0,
    totalPurchase: 0,
    outOfStock: 0,
    shortStock: 0,
    totalProducts: 0,
    shortShopStock: 0,
    urgentBuy: 0,
    adminUser: 'Warehouse User',
    userRole: 'Warehouse',
    openingBalance: 0,
    chartData: {
      dates: [],
      sales: [],
      purchases: [],
    },
  });

  useEffect(() => {
    fetchDashboardData(todayStr, todayStr);
  }, []);

  const fetchDashboardData = async (kpiFrom: string, kpiTo: string) => {
    try {
      setLoading(true);
      setChartLoading(true);

      const response = await fetch(`/api/dashboard/warehouse-stats?from_date=${kpiFrom}&to_date=${kpiTo}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
        if (data.userRole) {
          const capitalizedRole = data.userRole.charAt(0).toUpperCase() + data.userRole.slice(1);
          setUserRole(capitalizedRole);
        }
      }
    } catch (error) {
      console.error('Error fetching warehouse dashboard data:', error);
    } finally {
      setLoading(false);
      setChartLoading(false);
    }
  };

  const handleFetchClick = () => {
    if (fromDate && toDate) {
      fetchDashboardData(fromDate, toDate);
    }
  };

  const hasChartData = dashboardData.chartData && 
                       dashboardData.chartData.dates && 
                       dashboardData.chartData.dates.length > 0;

  const chartData = hasChartData ? {
    labels: dashboardData.chartData!.dates.map(dateStr => {
      const date = new Date(dateStr);
      return `${date.getDate()}-${date.toLocaleString('default', { month: 'short' })}`;
    }),
    datasets: [
      {
        label: 'Transfers (Sales)',
        data: dashboardData.chartData!.sales,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Stock In (Purchases)',
        data: dashboardData.chartData!.purchases,
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
        fill: true,
        tension: 0.4,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      tooltip: { mode: 'index' as const, intersect: false },
    },
    scales: {
      y: { beginAtZero: true, ticks: { callback: (value: any) => 'Rs. ' + value.toLocaleString() } },
    },
  };

  if (loading && !dashboardData.totalSales && !dashboardData.totalProducts) {
    return (
      <div className="p-2 py-5 pt-14 sm:pt-4">
        <PageHeader title="Warehouse Dashboard" />

        {/* Main Content - 85% width, centered */}
        <div className="max-w-[100%] md:max-w-[85%] mx-auto">
          {/* Loading Skeleton for KPI Cards - Row 1 (4 cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-4 md:mb-6">
            {[...Array(4)].map((_, i) => (
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

          {/* Loading Skeleton for KPI Cards - Row 2 (4 cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-4 md:mb-6">
            {[...Array(4)].map((_, i) => (
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
    <div className="p-4 pt-16 sm:pt-4">
      <PageHeader title="Warehouse Dashboard" />

      {/* Main Content - Wider on mobile */}
      <div className="max-w-[100%] md:max-w-[85%] mx-auto">
        {/* Date Range Picker */}
        <div className="mb-4 md:mb-6 bg-white p-3 md:p-4">
          <div className="hidden md:flex md:flex-col md:items-end">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 w-full md:w-auto">
              <div className="w-full sm:w-auto">
                <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="regal-input text-sm w-full"
                />
              </div>
              <div className="w-full sm:w-auto">
                <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="regal-input text-sm w-full"
                />
              </div>
              <button
                onClick={handleFetchClick}
                disabled={loading}
                className="bg-regal-yellow text-regal-black px-4 py-2 rounded-md text-sm font-semibold hover:bg-yellow-400 transition disabled:opacity-50 w-full sm:w-auto"
              >
                {loading ? 'Fetching...' : 'Fetch'}
              </button>
            </div>
          </div>
          {/* Mobile Date Picker */}
          <div className="md:hidden">
            <div className="flex gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="regal-input text-sm w-full"
                />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="regal-input text-sm w-full"
                />
              </div>
            </div>
            <button
              onClick={handleFetchClick}
              disabled={loading}
              className="bg-regal-yellow text-regal-black px-4 py-4 rounded-md text-sm font-semibold hover:bg-yellow-400 transition disabled:opacity-50 w-full"
            >
              {loading ? 'Fetching...' : 'Fetch'}
            </button>
          </div>
        </div>

        {/* Top Row - 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-4 md:mb-6">
          {/* Sale (Transfers) */}
          <div className="regal-card p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Total Transfers (Sale)</p>
                <p className="text-xl md:text-2xl font-semibold text-gray-900">
                  Rs. {Math.round(dashboardData.totalSales).toLocaleString()}
                </p>
              </div>
              <div className="text-3xl md:text-4xl">🚚</div>
            </div>
          </div>

          {/* Purchase (Stock In) */}
          <div className="regal-card p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Stock In (Purchase)</p>
                <p className="text-xl md:text-2xl font-semibold text-gray-900">
                  Rs. {Math.round(dashboardData.totalPurchase).toLocaleString()}
                </p>
              </div>
              <div className="text-3xl md:text-4xl">📥</div>
            </div>
          </div>

          {/* Warehouse Products */}
          <div className="regal-card p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Warehouse Products</p>
                <p className="text-xl md:text-2xl font-semibold text-gray-900">
                  {dashboardData.totalProducts}
                </p>
                <p className="text-[10px] md:text-xs font-medium text-gray-600 mb-1">Items in warehouse.</p>
              </div>
              <div className="text-3xl md:text-4xl">🏪</div>
            </div>
          </div>

          {/* Urgent Buy Card */}
          <div className="regal-card p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Warehouse Urgent Buy</p>
                <p className="text-xl md:text-2xl font-semibold text-red-600">
                  {dashboardData.urgentBuy}
                </p>
                <p className="text-[10px] md:text-xs font-medium text-gray-600 mb-1">Orders needed urgently.</p>
              </div>
              <div className="text-3xl md:text-4xl">🚨</div>
            </div>
          </div>
        </div>

        {/* Middle Row - 4 Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-4 md:mb-6">
          {/* Short Warehouse Stock */}
          <div className="regal-card p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Short Warehouse Stock</p>
                <p className="text-xl md:text-2xl font-semibold text-orange-600">
                  {dashboardData.shortStock}
                </p>
                <p className="text-[10px] md:text-xs font-medium text-gray-600 mb-1">Low warehouse inventory.</p>
              </div>
              <div className="text-3xl md:text-4xl">📦</div>
            </div>
          </div>

          {/* Short Shop Stock */}
          <div className="regal-card p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Short Shop Stock</p>
                <p className="text-xl md:text-2xl font-semibold text-gray-900">
                  {dashboardData.shortShopStock}
                </p>
                <p className="text-[10px] md:text-xs font-medium text-gray-600 mb-1">Low shop inventory.</p>
              </div>
              <div className="text-3xl md:text-4xl">🛒</div>
            </div>
          </div>

          {/* User */}
          <div className="regal-card p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">User</p>
                <p className="text-lg md:text-xl font-semibold text-gray-900">
                  {dashboardData.adminUser}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {userRole}
                </p>
              </div>
              <div className="text-3xl md:text-4xl">👤</div>
            </div>
          </div>

          {/* Placeholder/Extra space to maintain 4-column grid balance */}
          <div className="hidden lg:block"></div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4 md:gap-6 mb-4 md:mb-6">
          <div className="regal-card p-3 md:p-4">
            <p className="text-xs md:text-sm font-medium text-gray-600 mb-3">Quick Actions</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowUrgentBuyModal(true)}
                className="regal-btn bg-regal-yellow text-regal-black text-sm md:text-base px-6 py-4 w-full md:w-auto"
              >
                Warehouse Urgent Buy Report
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="regal-btn bg-regal-yellow text-regal-black text-sm md:text-base px-6 py-4 w-full md:w-auto"
              >
                Warehouse Requirement Report
              </button>
              <button
                onClick={() => setShowShopReportModal(true)}
                className="regal-btn bg-regal-yellow text-regal-black text-sm md:text-base px-6 py-4 w-full md:w-auto"
              >
                Shop Requirement Report
              </button>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="mt-4 md:mt-8 regal-card p-3 md:p-6 bg-white">
          <h3 className="text-base md:text-lg font-semibold text-gray-700 mb-4">WAREHOUSE TRENDS</h3>
          {chartLoading ? (
            <div className="h-64 md:h-96 flex items-center justify-center">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-8 w-8 border-4 border-regal-yellow border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 text-sm">Loading chart data...</p>
              </div>
            </div>
          ) : hasChartData ? (
            <div className="h-64 md:h-96">
              <Line data={chartData!} options={chartOptions} />
            </div>
          ) : (
            <div className="h-64 md:h-96 flex items-center justify-center">
              <p className="text-gray-500 text-sm">No data available for selected period</p>
            </div>
          )}
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

      <ReportModal
        isOpen={showUrgentBuyModal}
        onClose={() => setShowUrgentBuyModal(false)}
        title="Warehouse Urgent Buy Report"
        reportUrl="/api/warehouse-stock/urgent-buy-report"
      />
    </div>
  );
};

export default WarehouseDashboardPage;
