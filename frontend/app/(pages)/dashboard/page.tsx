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
  adminUser: string;
  userRole: string;
  openingBalance: number;
  chartData?: {
    dates: string[];
    sales: number[];
    expenses: number[];
  };
  month?: number;
  year?: number;
  monthName?: string;
  dateRange?: {
    from: string;
    to: string;
  };
}

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>('Admin');

  // Single Date Range for both KPI cards and Chart - defaults to TODAY (daily view)
  const today = new Date();
  const todayStr = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState<string>(todayStr);
  const [toDate, setToDate] = useState<string>(todayStr);

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalSales: 0,
    totalExpense: 0,
    totalPurchase: 0,
    outOfStock: 0,
    shortStock: 0,
    adminUser: 'Admin',
    userRole: 'Admin',
    openingBalance: 0,
    chartData: {
      dates: [],
      sales: [],
      expenses: [],
    },
    dateRange: {
      from: new Date().toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0],
    },
  });

  // Fetch current user role on mount
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.user?.role) {
            const role = data.user.role;
            const capitalizedRole = role.charAt(0).toUpperCase() + role.slice(1);
            setUserRole(capitalizedRole);

            // CASHIER: Auto-fetch today's data only, no chart shown
            if (role === 'cashier') {
              const todayStr = new Date().toISOString().split('T')[0];
              setFromDate(todayStr);
              setToDate(todayStr);
              fetchDashboardData(todayStr, todayStr, false);
            } else {
              // ADMIN/EMPLOYEE: Auto-fetch TODAY's data with chart on mount
              const todayStr = new Date().toISOString().split('T')[0];
              setFromDate(todayStr);
              setToDate(todayStr);
              fetchDashboardData(todayStr, todayStr, true);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  const fetchDashboardData = async (kpiFrom: string, kpiTo: string, fetchChart: boolean) => {
    try {
      setLoading(true);

      // Fetch chart data first if needed (for Admin/Employee)
      if (fetchChart && userRole !== 'Cashier') {
        setChartLoading(true);
        const chartResponse = await fetch(`/api/dashboard/stats?from_date=${kpiFrom}&to_date=${kpiTo}`, {
          credentials: 'include',
        });

        if (chartResponse.ok) {
          const chartDataResult = await chartResponse.json();
          setDashboardData(chartDataResult);
        }
        setChartLoading(false);
      } else {
        // Fetch only KPI data (for Cashier)
        const kpiResponse = await fetch(`/api/dashboard/stats?from_date=${kpiFrom}&to_date=${kpiTo}`, {
          credentials: 'include',
        });

        if (kpiResponse.ok) {
          const kpiData = await kpiResponse.json();
          setDashboardData(kpiData);
        } else {
          console.error('Failed to fetch KPI data');
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchClick = () => {
    if (fromDate && toDate) {
      fetchDashboardData(fromDate, toDate, userRole !== 'Cashier');
    }
  };

  const isSameMonth = fromDate && toDate &&
    new Date(fromDate).getMonth() === new Date(toDate).getMonth() &&
    new Date(fromDate).getFullYear() === new Date(toDate).getFullYear();
  const isSameYear = fromDate && toDate &&
    new Date(fromDate).getFullYear() === new Date(toDate).getFullYear();
  const monthAbbrs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Check if chart data exists (for Admin/Employee only)
  const hasChartData = userRole !== 'Cashier' &&
                       dashboardData.chartData &&
                       dashboardData.chartData.dates &&
                       dashboardData.chartData.dates.length > 0;

  // Process chart data based on selection
  const processChartData = () => {
    if (!hasChartData) return null;
    
    // SAME MONTH: Show daily data (1-March, 2-March... 31-March)
    if (isSameMonth) {
      return {
        labels: dashboardData.chartData!.dates.map(dateStr => {
          const date = new Date(dateStr);
          return `${date.getDate()}-${monthAbbrs[date.getMonth()]}`;
        }),
        datasets: [
          {
            label: 'Sales',
            data: dashboardData.chartData!.sales,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            fill: true,
            tension: 0.4,
          },
          {
            label: 'Expenses',
            data: dashboardData.chartData!.expenses,
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            fill: true,
            tension: 0.4,
          },
        ],
      };
    }
    
    // DIFFERENT MONTHS, SAME YEAR: Show weekly data with date ranges (Jan 1-7, Jan 8-14...)
    if (isSameYear) {
      const weeks: { [key: string]: { sales: number; expenses: number; startDate: Date; endDate: Date } } = {};
      const labels: string[] = [];

      // Pre-calculate week ranges for each month in the data
      const monthWeekRanges: { [key: string]: [number, number][] } = {};

      dashboardData.chartData!.dates.forEach((dateStr) => {
        const date = new Date(dateStr);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        const monthLastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

        if (!monthWeekRanges[monthKey]) {
          // Calculate 4 weeks for each month: [1-7], [8-14], [15-21], [22-lastDay]
          monthWeekRanges[monthKey] = [
            [1, 7],
            [8, 14],
            [15, 21],
            [22, monthLastDay]
          ];
        }
      });

      dashboardData.chartData!.dates.forEach((dateStr, index) => {
        const date = new Date(dateStr);
        const monthAbbr = monthAbbrs[date.getMonth()];
        const dayOfMonth = date.getDate();
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

        // Determine which week this date belongs to
        let weekIndex = 3; // Default to last week (22-lastDay)
        if (dayOfMonth <= 7) weekIndex = 0;
        else if (dayOfMonth <= 14) weekIndex = 1;
        else if (dayOfMonth <= 21) weekIndex = 2;

        const weekRange = monthWeekRanges[monthKey][weekIndex];
        const weekStart = weekRange[0];
        const weekEnd = weekRange[1];
        const weekKey = `${monthAbbr} ${weekStart}-${weekEnd}`;

        if (!weeks[weekKey]) {
          weeks[weekKey] = {
            sales: 0,
            expenses: 0,
            startDate: new Date(date.getFullYear(), date.getMonth(), weekStart),
            endDate: new Date(date.getFullYear(), date.getMonth(), weekEnd)
          };
          labels.push(weekKey);
        }

        weeks[weekKey].sales += dashboardData.chartData!.sales[index];
        weeks[weekKey].expenses += dashboardData.chartData!.expenses[index];
      });

      return {
        labels,
        datasets: [
          {
            label: 'Sales',
            data: labels.map(label => weeks[label].sales),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            fill: true,
            tension: 0.4,
          },
          {
            label: 'Expenses',
            data: labels.map(label => weeks[label].expenses),
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            fill: true,
            tension: 0.4,
          },
        ],
      };
    }
    
    // DIFFERENT YEARS: Show monthly data (Jan, Feb, Mar... Dec)
    const months: { [key: string]: { sales: number; expenses: number } } = {};
    const labels: string[] = [];
    
    dashboardData.chartData!.dates.forEach((dateStr, index) => {
      const date = new Date(dateStr);
      const monthKey = monthAbbrs[date.getMonth()];
      
      if (!months[monthKey]) {
        months[monthKey] = { sales: 0, expenses: 0 };
        labels.push(monthKey);
      }
      
      months[monthKey].sales += dashboardData.chartData!.sales[index];
      months[monthKey].expenses += dashboardData.chartData!.expenses[index];
    });
    
    return {
      labels,
      datasets: [
        {
          label: 'Sales',
          data: labels.map(label => months[label]?.sales || 0),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Expenses',
          data: labels.map(label => months[label]?.expenses || 0),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          fill: true,
          tension: 0.4,
        },
      ],
    };
  };

  const chartData = processChartData();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function (context: any) {
            return `${context.dataset.label}: Rs. ${context.parsed.y.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value: any) {
            return 'Rs. ' + value.toLocaleString();
          },
        },
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          autoSkip: false,
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="p-4">
        <PageHeader title="Dashboard" />

        {/* Main Content - 85% width, centered */}
        <div className="max-w-[85%] mx-auto">
          {/* NO Date Range Picker during loading - prevents UX flicker for Cashier */}

          {/* Loading Skeleton for KPI Cards - Row 1 (4 cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="regal-card" style={{ minHeight: '80px' }}>
                <div className="animate-pulse flex items-center justify-between h-full p-1">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
                  </div>
                  <div className="h-10 w-10 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Loading Skeleton for KPI Cards - Row 2 (3 cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="regal-card" style={{ minHeight: '80px' }}>
                <div className="animate-pulse flex items-center justify-between h-full p-1">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
                  </div>
                  <div className="h-10 w-10 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>

          {/* NO Chart Skeleton for Cashier - prevents UX flicker */}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <PageHeader title="Dashboard" />

      {/* Main Content - 85% width, centered */}
      <div className="max-w-[85%] mx-auto">
        {/* Date Range Picker - Hide for Cashier */}
        {userRole !== 'Cashier' && (
          <div className="mb-6 bg-white p-4">
            <div className="flex items-center justify-end">

              <div className="flex items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="regal-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="regal-input text-sm"
                  />
                </div>
                <button
                  onClick={handleFetchClick}
                  disabled={loading || !fromDate || !toDate}
                  className="bg-regal-yellow text-regal-black px-4 py-2 rounded-md text-sm font-semibold hover:bg-yellow-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Fetching...' : 'Fetch'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top Row - 4 KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Sale */}
          <div className="regal-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Sale</p>
                <p className="text-2xl font-semibold text-gray-900">
                  Rs. {Math.round(dashboardData.totalSales).toLocaleString()}
                </p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </div>

          {/* Expense */}
          <div className="regal-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Expense</p>
                <p className="text-2xl font-semibold text-gray-900">
                  Rs. {Math.round(dashboardData.totalExpense).toLocaleString()}
                </p>
              </div>
              <div className="text-4xl">💸</div>
            </div>
          </div>

          {/* Purchase */}
          <div className="regal-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Purchase</p>
                <p className="text-2xl font-semibold text-gray-900">
                  Rs. {Math.round(dashboardData.totalPurchase).toLocaleString()}
                </p>
              </div>
              <div className="text-4xl">🛒</div>
            </div>
          </div>

          {/* Out Of Stock */}
          <div className="regal-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Out Of Stock</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {dashboardData.outOfStock}
                </p>
              </div>
              <div className="text-4xl">📦</div>
            </div>
          </div>
        </div>

        {/* Middle Row - 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Short Stock */}
          <div className="regal-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Short Stock</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {dashboardData.shortStock}
                </p>
              </div>
              <div className="text-4xl">⚠️</div>
            </div>
          </div>

          {/* User */}
          <div className="regal-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">User</p>
                <p className="text-xl font-semibold text-gray-900">
                  {dashboardData.adminUser}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {dashboardData.userRole}
                </p>
              </div>
              <div className="text-4xl">👤</div>
            </div>
          </div>

          {/* Opening Balance */}
          <div className="regal-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Opening</p>
                <p className="text-2xl font-semibold text-gray-900">
                  Rs. {Math.round(dashboardData.openingBalance).toLocaleString()}
                </p>
              </div>
              <div className="text-4xl">💵</div>
            </div>
          </div>
        </div>

        {/* Chart Section - Only for Admin/Employee */}
        {userRole !== 'Cashier' && (
          <div className="mt-8 regal-card">
            {/* Chart Header */}
            <div className="p-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-700">GRAPH</h3>
              
                </div>
              </div>
            </div>

            {/* Chart Loading State */}
            {chartLoading ? (
              <div className="h-96 flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                  <div className="h-8 w-8 border-4 border-regal-yellow border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-500 text-sm">Loading chart data...</p>
                </div>
              </div>
            ) : hasChartData ? (
              <>
                {/* Chart */}
                <div className="h-96">
                  <Line data={chartData!} options={chartOptions} />
                </div>
                <p className="text-sm text-gray-500 mt-4 text-center">
                  {isSameMonth
                    ? `Daily trend from ${fromDate} to ${toDate}`
                    : isSameYear
                    ? `Weekly trend from ${fromDate} to ${toDate}`
                    : `Monthly trend from ${fromDate} to ${toDate}`
                  }
                </p>
              </>
            ) : (
              <div className="h-96 flex items-center justify-center">
                <p className="text-gray-500 text-sm">No data available for selected period</p>
              </div>
            )}
          </div>
        )}

        {/* Cashier Info - Only for Cashier */}
        
      </div>
    </div>
  );
};

export default DashboardPage;