'use client';

import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type TooltipItem,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export interface DemandTopItem {
  id: string;
  name: string;
  category: string;
  count: number;
}

export interface DemandSeries {
  id: string;
  name: string;
  counts: number[];
}

export interface DemandStatsResponse {
  topItems: DemandTopItem[];
  seriesChartData?: { dates: string[]; series: DemandSeries[] };
  dateRange?: { from: string; to: string };
}

export const MAX_COMPARE_ITEMS = 8; // matches SERIES_COLORS.length
export const DEFAULT_TOP_N = 5; // how many articles the default (no selection) chart shows

// Fixed categorical palette (dataviz-skill validated default: adjacent pairs
// clear the colorblind-safety and contrast gates for up to 8 series) - color
// identifies the article, never its rank.
export const SERIES_COLORS = [
  'rgb(42, 120, 214)',  // blue
  'rgb(235, 104, 52)',  // orange
  'rgb(27, 175, 122)',  // aqua
  'rgb(237, 161, 0)',   // yellow
  'rgb(232, 123, 164)', // magenta
  'rgb(0, 131, 0)',     // green
  'rgb(74, 58, 167)',   // violet
  'rgb(227, 73, 72)',   // red
];

const monthAbbrs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Buckets one raw daily series into daily/weekly/monthly labels depending on
// the date range span - same rollup used across the demand & sales charts.
function bucketSeries(dates: string[], counts: number[], isSameMonth: boolean, isSameYear: boolean) {
  let labels: string[];
  let values: number[];

  if (isSameMonth) {
    labels = dates.map((d) => {
      const date = new Date(d);
      return `${date.getDate()}-${monthAbbrs[date.getMonth()]}`;
    });
    values = counts;
  } else if (isSameYear) {
    const weeks: { [key: string]: number } = {};
    const weekLabels: string[] = [];
    dates.forEach((d, idx) => {
      const date = new Date(d);
      const monthAbbr = monthAbbrs[date.getMonth()];
      const dayOfMonth = date.getDate();
      const monthLastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      let weekStart = 22, weekEnd = monthLastDay;
      if (dayOfMonth <= 7) { weekStart = 1; weekEnd = 7; }
      else if (dayOfMonth <= 14) { weekStart = 8; weekEnd = 14; }
      else if (dayOfMonth <= 21) { weekStart = 15; weekEnd = 21; }
      const key = `${monthAbbr} ${weekStart}-${weekEnd}`;
      if (!(key in weeks)) { weeks[key] = 0; weekLabels.push(key); }
      weeks[key] += counts[idx];
    });
    labels = weekLabels;
    values = weekLabels.map((k) => weeks[k]);
  } else {
    const months: { [key: string]: number } = {};
    const monthLabels: string[] = [];
    dates.forEach((d, idx) => {
      const key = monthAbbrs[new Date(d).getMonth()];
      if (!(key in months)) { months[key] = 0; monthLabels.push(key); }
      months[key] += counts[idx];
    });
    labels = monthLabels;
    values = monthLabels.map((k) => months[k]);
  }

  return { labels, values };
}

interface DemandTrendPanelProps {
  stats: DemandStatsResponse | null;
  loading: boolean;
  fromDate: string;
  toDate: string;
  /** Click-to-compare on the Top Demanded Items list. Off = static top-N summary. */
  interactive?: boolean;
  selectedItems?: DemandTopItem[];
  onToggleItem?: (item: DemandTopItem) => void;
  onClearSelection?: () => void;
  /** Shown as a link next to the list header when not interactive (e.g. dashboard -> full /demand page). */
  viewAllHref?: string;
}

export default function DemandTrendPanel({
  stats,
  loading,
  fromDate,
  toDate,
  interactive = false,
  selectedItems = [],
  onToggleItem,
  onClearSelection,
  viewAllHref,
}: DemandTrendPanelProps) {
  // Bucketing/caption reflect the range the chart data actually came from
  // (stats.dateRange), not the live date-picker props - those change the
  // instant the user edits a date, before Fetch is clicked.
  const chartFromDate = stats?.dateRange?.from || fromDate;
  const chartToDate = stats?.dateRange?.to || toDate;

  const isSameMonth = !!(chartFromDate && chartToDate &&
    new Date(chartFromDate).getMonth() === new Date(chartToDate).getMonth() &&
    new Date(chartFromDate).getFullYear() === new Date(chartToDate).getFullYear());
  const isSameYear = !!(chartFromDate && chartToDate &&
    new Date(chartFromDate).getFullYear() === new Date(chartToDate).getFullYear());

  const seriesList = stats?.seriesChartData?.series || [];
  const dates = stats?.seriesChartData?.dates || [];
  const isSingle = seriesList.length === 1;

  const chartData = seriesList.length === 0 ? null : {
    labels: bucketSeries(dates, seriesList[0].counts, isSameMonth, isSameYear).labels,
    datasets: seriesList.map((series, idx) => ({
      label: series.name,
      data: bucketSeries(dates, series.counts, isSameMonth, isSameYear).values,
      backgroundColor: isSingle ? 'rgb(15, 157, 142)' : SERIES_COLORS[idx % SERIES_COLORS.length],
      borderRadius: 3,
      borderSkipped: false as const,
      maxBarThickness: isSingle ? 28 : 16,
    })),
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: (chartData?.datasets.length || 0) > 1,
        position: 'bottom' as const,
        labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'circle' as const },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: TooltipItem<'bar'>) => `${context.dataset.label}: ${context.parsed.y} demand(s)`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
        grid: { color: 'rgba(0, 0, 0, 0.08)' },
        border: { display: false },
      },
      x: {
        ticks: { maxRotation: 45, minRotation: 45, autoSkip: false },
        grid: { color: 'rgba(0, 0, 0, 0.08)' },
        border: { display: false },
        categoryPercentage: 0.8,
        barPercentage: 0.9,
      },
    },
  };

  const maxTopItemCount = Math.max(1, ...(stats?.topItems.map((i) => i.count) || [1]));

  const heading = selectedItems.length === 0
    ? `Top ${DEFAULT_TOP_N} Articles`
    : selectedItems.length === 1
    ? selectedItems[0].name
    : `Comparing ${selectedItems.length} Articles`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 regal-card p-3 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-700 mb-2">
          Demand Volume - {heading}
        </h3>
        {loading ? (
          <div className="h-64 md:h-80 flex items-center justify-center">
            <div className="h-8 w-8 border-4 border-regal-yellow border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : chartData ? (
          <>
            <div className="h-64 md:h-80">
              <Bar data={chartData} options={chartOptions} />
            </div>
            <p className="text-xs md:text-sm text-gray-500 mt-3 text-center">
              {isSameMonth
                ? `Daily trend from ${chartFromDate} to ${chartToDate}`
                : isSameYear
                ? `Weekly trend from ${chartFromDate} to ${chartToDate}`
                : `Monthly trend from ${chartFromDate} to ${chartToDate}`}
            </p>
          </>
        ) : (
          <div className="h-64 md:h-80 flex items-center justify-center">
            <p className="text-gray-500 text-sm">No demand data for the selected period</p>
          </div>
        )}
      </div>

      <div className="regal-card p-3 md:p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base md:text-lg font-semibold text-gray-700">Top Demanded Items</h3>
          {interactive && selectedItems.length > 0 && (
            <button onClick={onClearSelection} className="text-xs font-medium text-regal-black underline underline-offset-2">
              Clear ({selectedItems.length})
            </button>
          )}
          {!interactive && viewAllHref && (
            <a href={viewAllHref} className="text-xs font-medium text-regal-black underline underline-offset-2">
              View Full Page
            </a>
          )}
        </div>
        {interactive && (
          <p className="text-[11px] text-gray-400 mb-2">Click up to {MAX_COMPARE_ITEMS} to compare their graphs</p>
        )}
        {loading ? (
          <div className="animate-pulse space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded"></div>)}
          </div>
        ) : stats && stats.topItems.length > 0 ? (
          <div className="space-y-1 max-h-[340px] overflow-y-auto pr-1">
            {stats.topItems.map((item, idx) => {
              const selectedIdx = selectedItems.findIndex((i) => i.id === item.id);
              const isSelected = selectedIdx !== -1;
              const colorIdx = selectedItems.length > 0 ? selectedIdx : idx;
              const showColor = selectedItems.length > 0 ? isSelected : idx < DEFAULT_TOP_N;
              return (
                <div
                  key={item.id}
                  onClick={interactive ? () => onToggleItem?.(item) : undefined}
                  className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${interactive ? 'cursor-pointer' : ''} ${
                    isSelected ? 'border-regal-yellow bg-yellow-50' : 'border-transparent hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${
                    isSelected ? 'bg-regal-yellow text-regal-black' : 'bg-gray-100 text-gray-500'
                  }`}>{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {showColor && (
                        <span
                          className="inline-block w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: SERIES_COLORS[colorIdx] }}
                          title="Bar color in the graph above"
                        ></span>
                      )}
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    </div>
                    <p className="text-[11px] text-gray-400">{item.category || 'Uncategorized'}</p>
                    <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(item.count / maxTopItemCount) * 100}%`,
                          backgroundColor: showColor ? SERIES_COLORS[colorIdx] : 'rgb(15,157,142)',
                        }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{item.count}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 py-8 text-center">No demand items recorded in this range yet</p>
        )}
      </div>
    </div>
  );
}
