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
  openingBalance: number;
  chartData: {
    dates: string[];
    sales: number[];
    expenses: number[];
  };
}

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalSales: 0,
    totalExpense: 0,
    totalPurchase: 0,
    outOfStock: 0,
    shortStock: 0,
    adminUser: 'Admin',
    openingBalance: 0,
    chartData: {
      dates: [],
      sales: [],
      expenses: [],
    },
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch sales data (you may need to create this API endpoint)
      const salesResponse = await fetch('/api/dashboard/stats', {
        credentials: 'include',
      });

      if (salesResponse.ok) {
        const data = await salesResponse.json();
        setDashboardData(data);
      } else {
        // Mock data for now
        setDashboardData({
          totalSales: 11950.00,
          totalExpense: 0,
          totalPurchase: 0,
          outOfStock: 542,
          shortStock: 1626,
          adminUser: 'Admin',
          openingBalance: 5000,
          chartData: {
            dates: ['01', '05', '10', '15', '20', '25'],
            sales: [2000, 3500, 2800, 4200, 3100, 4500],
            expenses: [500, 800, 600, 1200, 700, 900],
          },
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
    labels: dashboardData.chartData.dates,
    datasets: [
      {
        label: 'Sales',
        data: dashboardData.chartData.sales,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Expenses',
        data: dashboardData.chartData.expenses,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

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
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-6 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <PageHeader title="Dashboard" />

      {/* Main Content - 85% width, centered */}
      <div className="max-w-[85%] mx-auto">
        {/* Top Row - 4 KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Sale */}
          <div className="regal-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Sale</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {Math.round(dashboardData.totalSales)}
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
                  {Math.round(dashboardData.totalExpense)}
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
                  {Math.round(dashboardData.totalPurchase)}
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
                <p className="text-2xl font-semibold text-gray-900">
                  {dashboardData.adminUser}
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
                  {Math.round(dashboardData.openingBalance)}
                </p>
              </div>
              <div className="text-4xl">💵</div>
            </div>
          </div>
        </div>

        {/* Chart - Sales & Expenses */}
        <div className="regal-card">
          <h2 className="text-xl font-semibold mb-4">Monthly Sales & Expenses</h2>
          <div className="h-96">
            <Line data={chartData} options={chartOptions} />
          </div>
          <p className="text-sm text-gray-500 mt-4 text-center">
            Hover over the chart to see detailed values for each date
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
