'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import ReportModal from '@/components/ui/ReportModal';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
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

interface Demand {
  id: string;
  demand_text: string;
  demand_item_id: string | null;
  category: string;
  customer_name: string;
  customer_phone: string;
  created_at: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface DemandItemOption {
  id: string;
  name: string;
  category: string;
  demand_count: number;
}

interface TopDemandItem {
  id: string;
  name: string;
  category: string;
  count: number;
}

interface DemandStats {
  chartData: { dates: string[]; counts: number[] };
  topItems: TopDemandItem[];
}

interface Customer {
  cus_id: string;
  cus_name: string;
  cus_phone: string;
}

interface NewCustomerType {
  cus_name: string;
  cus_phone: string;
  cus_cnic: string;
  cus_address: string;
  cus_sal_id_fk: string;
  branch: string;
}

interface Salesman {
  sal_id: string;
  sal_name: string;
}

const formatDate = (value: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const DemandPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [userRole, setUserRole] = useState<string | null>(null);

  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPagesFromApi, setTotalPagesFromApi] = useState(0);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesmans, setSalesmans] = useState<Salesman[]>([]);

  // ---- Demand intelligence: date range, trend chart, top items ----
  // Format as local YYYY-MM-DD (not toISOString, which converts to UTC first
  // and shifts the date in timezones ahead of UTC, e.g. Pakistan/UTC+5).
  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = toLocalDateStr(new Date());
  const firstDayOfMonth = toLocalDateStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [fromDate, setFromDate] = useState<string>(firstDayOfMonth);
  const [toDate, setToDate] = useState<string>(today);
  const [stats, setStats] = useState<DemandStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [itemFilter, setItemFilter] = useState<TopDemandItem | null>(null);
  const hasAutoSelectedTopItem = React.useRef(false);

  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingExcel, setGeneratingExcel] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportPdfData, setReportPdfData] = useState('');

  // Add Demand form
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    demand_text: '',
    demand_item_id: '',
    category: '',
    customer_id: '',
  });

  // Demand-item autocomplete (Add form) - lets staff pick a previously
  // recorded item instead of retyping it, so repeat demands count correctly
  const [itemQuery, setItemQuery] = useState('');
  const [itemSuggestions, setItemSuggestions] = useState<DemandItemOption[]>([]);
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);

  // Search any demanded article to graph (independent of the Top 8 ranking,
  // which only surfaces the most-demanded ones in the current date range)
  const [chartItemQuery, setChartItemQuery] = useState('');
  const [chartItemSuggestions, setChartItemSuggestions] = useState<DemandItemOption[]>([]);
  const [showChartItemSuggestions, setShowChartItemSuggestions] = useState(false);

  // Right-side details/edit panel
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editDraft, setEditDraft] = useState({
    demand_text: '',
    category: '',
    customer_id: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Add Customer modal (shared between Add Demand form and edit panel, same logic as Customer Invoice)
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [addCustomerTarget, setAddCustomerTarget] = useState<'add' | 'edit' | null>(null);
  const [newCustomer, setNewCustomer] = useState<NewCustomerType>({
    cus_name: '',
    cus_phone: '',
    cus_cnic: '',
    cus_address: '',
    cus_sal_id_fk: '',
    branch: 'European Sports Light House',
  });
  const [addingCustomer, setAddingCustomer] = useState(false);

  // Add Category modal (shared between Add Demand form and edit panel, same pattern as Add Customer)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [addCategoryTarget, setAddCategoryTarget] = useState<'add' | 'edit' | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const response = await fetch('/api/auth/session', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.user?.role || null);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };
    fetchRole();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/demand-category/?page=1&limit=1000', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setCategories(data?.data || []);
      }
    } catch (error) {
      console.error('Error fetching demand categories:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers/viewcustomer?page=1&limit=1000', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setCustomers(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchSalesmans = async () => {
    try {
      const response = await fetch('/api/admin/getcustomervendorbybranch', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setSalesmans(data.salesmans || []);
      }
    } catch (error) {
      console.error('Error fetching salesmen:', error);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchSalesmans();
  }, []);

  // Search previously recorded demand items (typeahead for the Add form and
  // the chart's "search any article" box)
  const searchDemandItems = async (query: string, onResult: (items: DemandItemOption[]) => void) => {
    try {
      const params = new URLSearchParams({ limit: '8' });
      if (query.trim()) params.append('search', query.trim());
      const response = await fetch(`/api/demand-item?${params.toString()}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        onResult(data.data || []);
      }
    } catch (error) {
      console.error('Error searching demand items:', error);
    }
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      if (showItemSuggestions) searchDemandItems(itemQuery, setItemSuggestions);
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemQuery, showItemSuggestions]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (showChartItemSuggestions) searchDemandItems(chartItemQuery, setChartItemSuggestions);
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartItemQuery, showChartItemSuggestions]);

  const handlePickChartItem = (item: DemandItemOption) => {
    setItemFilter({ id: item.id, name: item.name, category: item.category, count: item.demand_count });
    setChartItemQuery(item.name);
    setShowChartItemSuggestions(false);
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const isFilteredRequest = !!itemFilter;
      const params = new URLSearchParams({ from_date: fromDate, to_date: toDate });
      if (itemFilter) params.append('demand_item_id', itemFilter.id);

      const response = await fetch(`/api/demand/stats?${params.toString()}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setStats(data);

        // First unfiltered load: default the graph to the highest-volume
        // article instead of the "everything combined" total.
        if (!isFilteredRequest && !hasAutoSelectedTopItem.current && data.topItems?.length > 0) {
          hasAutoSelectedTopItem.current = true;
          const top = data.topItems[0];
          setItemFilter({ id: top.id, name: top.name, category: top.category, count: top.count });
          setChartItemQuery(top.name);
        }
      } else {
        showToast('Failed to fetch demand trends', 'error');
      }
    } catch (error) {
      console.error('Error fetching demand stats:', error);
      showToast('Error fetching demand trends', 'error');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchDemands = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      if (searchTerm) params.append('search_string', searchTerm);

      const response = await fetch(`/api/demand/list?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setDemands(data.data || []);
        setTotalItems(data.total || 0);
        setTotalPagesFromApi(data.total_pages || 0);
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to fetch demands', 'error');
      }
    } catch (error) {
      console.error('Error fetching demands:', error);
      showToast('Error fetching demands', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm]);

  const resetAddForm = () => {
    setFormData({ demand_text: '', demand_item_id: '', category: '', customer_id: '' });
    setItemQuery('');
    setShowItemSuggestions(false);
    setShowAddForm(false);
  };

  const handlePickItem = (item: DemandItemOption) => {
    setFormData((prev) => ({
      ...prev,
      demand_text: item.name,
      demand_item_id: item.id,
      // Auto-fill category from the item when the category isn't set yet
      category: prev.category || item.category || prev.category,
    }));
    setItemQuery(item.name);
    setShowItemSuggestions(false);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!formData.demand_text.trim()) {
      showToast('Please enter what the customer demanded', 'error');
      return;
    }

    if (!formData.category) {
      showToast('Please select a category', 'error');
      return;
    }

    const pickedCustomer = customers.find((c) => c.cus_id === formData.customer_id);

    setSubmitting(true);
    try {
      const response = await fetch('/api/demand/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          demand_text: formData.demand_text.trim(),
          demand_item_id: formData.demand_item_id || null,
          category: formData.category,
          customer_name: pickedCustomer?.cus_name || null,
          customer_phone: pickedCustomer?.cus_phone || null,
        }),
      });

      if (response.ok) {
        showToast('Demand recorded successfully', 'success');
        resetAddForm();
        fetchStats();
        if (currentPage !== 1) {
          setCurrentPage(1);
        } else {
          fetchDemands();
        }
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to record demand', 'error');
      }
    } catch (error) {
      console.error('Error creating demand:', error);
      showToast('Error recording demand', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openDemandDetails = (demand: Demand) => {
    setSelectedDemand(demand);
    setEditDraft({
      demand_text: demand.demand_text,
      category: demand.category || '',
      // No customer_id snapshot is stored on the demand record itself (only a name/phone
      // snapshot), so the picker starts unselected; the recorded name/phone is kept as-is
      // on save unless a new customer is explicitly picked here.
      customer_id: '',
    });
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    // Fully unmount the overlay after the slide-out transition finishes,
    // otherwise the fullscreen wrapper stays mounted (invisible) and blocks
    // clicks on the rest of the page until a refresh.
    setTimeout(() => setSelectedDemand(null), 300);
  };

  const handleSaveEdit = async () => {
    if (!selectedDemand) return;
    if (!editDraft.demand_text.trim()) {
      showToast('Demand text cannot be empty', 'error');
      return;
    }

    if (!editDraft.category) {
      showToast('Please select a category', 'error');
      return;
    }

    const pickedCustomer = customers.find((c) => c.cus_id === editDraft.customer_id);

    setSavingEdit(true);
    try {
      const response = await fetch(`/api/demand/update/${selectedDemand.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          demand_text: editDraft.demand_text.trim(),
          category: editDraft.category,
          // Only overwrite the recorded customer if a new one was actually picked;
          // otherwise keep whatever was already saved on this demand.
          customer_name: pickedCustomer ? pickedCustomer.cus_name : selectedDemand.customer_name || null,
          customer_phone: pickedCustomer ? pickedCustomer.cus_phone : selectedDemand.customer_phone || null,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSelectedDemand({
          ...selectedDemand,
          demand_text: result.demand_text,
          category: result.category,
          customer_name: result.customer_name,
          customer_phone: result.customer_phone,
        });
        showToast('Demand updated successfully', 'success');
        fetchDemands();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to update demand', 'error');
      }
    } catch (error) {
      console.error('Error updating demand:', error);
      showToast('Error updating demand', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDemand) return;

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This demand record will be permanently deleted.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/demand/${selectedDemand.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        showToast('Demand deleted successfully', 'success');
        closePanel();
        fetchDemands();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to delete demand', 'error');
      }
    } catch (error) {
      console.error('Error deleting demand:', error);
      showToast('Error deleting demand', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const validateNewCustomerForm = (customer: NewCustomerType) => {
    const requiredFields: { key: keyof NewCustomerType; label: string }[] = [
      { key: 'cus_name', label: 'Customer Name' },
      { key: 'cus_phone', label: 'Phone' },
      { key: 'cus_cnic', label: 'CNIC' },
      { key: 'cus_address', label: 'Address' },
      { key: 'cus_sal_id_fk', label: 'Salesman' },
    ];
    return requiredFields.filter((field) => !customer[field.key]?.trim());
  };

  const resetNewCustomerForm = () => {
    setNewCustomer({
      cus_name: '',
      cus_phone: '',
      cus_cnic: '',
      cus_address: '',
      cus_sal_id_fk: '',
      branch: 'European Sports Light House',
    });
  };

  const handleAddCustomer = async () => {
    const missingFields = validateNewCustomerForm(newCustomer);
    if (missingFields.length > 0) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setAddingCustomer(true);
    try {
      const response = await fetch('/api/customerinvoice/Customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newCustomer),
      });

      if (response.ok) {
        const addedCustomer = await response.json();
        await fetchCustomers();
        const newCustomerId = addedCustomer.cus_id || addedCustomer.id;

        if (addCustomerTarget === 'edit') {
          setEditDraft((prev) => ({ ...prev, customer_id: newCustomerId }));
        } else {
          setFormData((prev) => ({ ...prev, customer_id: newCustomerId }));
        }

        setShowAddCustomerModal(false);
        setAddCustomerTarget(null);
        resetNewCustomerForm();
        showToast('Customer added successfully', 'success');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || errorData.detail || 'Failed to add customer', 'error');
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      showToast('Failed to add customer', 'error');
    } finally {
      setAddingCustomer(false);
    }
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      showToast('Please enter a category name', 'error');
      return;
    }

    setAddingCategory(true);
    try {
      const response = await fetch('/api/demand-category/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        const addedCategory = await response.json();
        await fetchCategories();

        if (addCategoryTarget === 'edit') {
          setEditDraft((prev) => ({ ...prev, category: addedCategory.name }));
        } else {
          setFormData((prev) => ({ ...prev, category: addedCategory.name }));
        }

        setShowAddCategoryModal(false);
        setAddCategoryTarget(null);
        setNewCategoryName('');
        showToast('Category added successfully', 'success');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || errorData.detail || 'Failed to add category', 'error');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      showToast('Failed to add category', 'error');
    } finally {
      setAddingCategory(false);
    }
  };

  const handleFetchTrends = () => {
    if (fromDate && toDate) {
      fetchStats();
    }
  };

  const handleSelectTopItem = (item: TopDemandItem) => {
    setItemFilter((prev) => {
      const next = prev?.id === item.id ? null : item;
      setChartItemQuery(next ? next.name : '');
      return next;
    });
  };

  // Cashiers get a fast, entry-focused page - no trend/analytics fetch for them
  const showAnalytics = userRole === 'admin' || userRole === 'employee';

  useEffect(() => {
    if (showAnalytics) fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemFilter, userRole]);

  const viewReport = async () => {
    try {
      setGeneratingPdf(true);
      const params = new URLSearchParams({ from_date: fromDate, to_date: toDate });

      const response = await fetch(`/api/demand/list/pdf?${params.toString()}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.pdf) {
          setReportPdfData(data.pdf);
          setIsReportModalOpen(true);
        } else {
          showToast('No data available for report', 'warning');
        }
      } else {
        showToast('Failed to generate report', 'error');
      }
    } catch (error) {
      console.error('Error generating demand report:', error);
      showToast('Error generating report', 'error');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const exportToExcel = async () => {
    try {
      setGeneratingExcel(true);
      const params = new URLSearchParams({ from_date: fromDate, to_date: toDate });

      const response = await fetch(`/api/demand/list/excel?${params.toString()}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.excel) {
          const excelContent = atob(data.excel);
          const byteNumbers = new Array(excelContent.length);
          for (let i = 0; i < excelContent.length; i++) {
            byteNumbers[i] = excelContent.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', data.filename || `Demand_Report_${fromDate}_to_${toDate}.xlsx`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showToast('Demand Excel report downloaded successfully!', 'success');
        } else {
          showToast('No data available for export', 'warning');
        }
      } else {
        showToast('Failed to generate Excel report', 'error');
      }
    } catch (error) {
      console.error('Error exporting demand report to Excel:', error);
      showToast('Error exporting to Excel', 'error');
    } finally {
      setGeneratingExcel(false);
    }
  };

  // ---- Trend chart bucketing: same daily -> weekly/monthly rollup logic as
  // the main Dashboard, so both pages behave identically for the same range ----
  const monthAbbrs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const isSameMonth = fromDate && toDate &&
    new Date(fromDate).getMonth() === new Date(toDate).getMonth() &&
    new Date(fromDate).getFullYear() === new Date(toDate).getFullYear();
  const isSameYear = fromDate && toDate &&
    new Date(fromDate).getFullYear() === new Date(toDate).getFullYear();

  const buildChartData = () => {
    if (!stats || !stats.chartData || stats.chartData.dates.length === 0) return null;
    const { dates, counts } = stats.chartData;

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

    return {
      labels,
      datasets: [
        {
          label: itemFilter ? itemFilter.name : 'Demand count',
          data: values,
          borderColor: 'rgb(15, 157, 142)',
          backgroundColor: 'rgba(15, 157, 142, 0.2)',
          fill: true,
          tension: 0,
        },
      ],
    };
  };

  const chartData = buildChartData();
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function (context: any) {
            return `${context.parsed.y} demand(s)`;
          },
        },
      },
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
      x: { ticks: { maxRotation: 45, minRotation: 45, autoSkip: false } },
    },
  };

  const maxTopItemCount = Math.max(1, ...(stats?.topItems.map((i) => i.count) || [1]));

  const isDirty = selectedDemand
    ? editDraft.demand_text !== selectedDemand.demand_text ||
      editDraft.category !== (selectedDemand.category || '') ||
      editDraft.customer_id !== ''
    : false;

  return (
    <div className="p-2 py-5 bg-white pt-14 md:pt-0">
      <PageHeader title="Demand" />

      {/* Primary toolbar - the action cashiers/employees use many times a day,
          so it sits above the analytics block, not below it */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
          }}
          className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap px-4 py-2 flex items-center gap-2"
        >
          {showAddForm ? 'Cancel' : '+ Add Demand'}
        </button>
        {showAnalytics && (
          <button
            onClick={() => router.push('/demand-category')}
            className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap px-4 py-2 flex items-center gap-2"
          >
            Demand Category
          </button>
        )}
      </div>

      {/* Add Demand Form - opens right under the toolbar, not below the analytics block */}
      {showAddForm && (
        <div className="border-0 p-0 mb-6 transition-all duration-300">
          <h3 className="text-lg font-semibold mb-4">Add New Demand</h3>
          <form onSubmit={handleAddSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium mb-1">Demand *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={itemQuery || formData.demand_text}
                    onChange={(e) => {
                      const value = e.target.value;
                      setItemQuery(value);
                      setFormData({ ...formData, demand_text: value, demand_item_id: '' });
                      setShowItemSuggestions(true);
                    }}
                    onFocus={() => setShowItemSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowItemSuggestions(false), 150)}
                    className="regal-input w-full"
                    placeholder="Search or type what the customer asked for..."
                    autoComplete="off"
                    required
                  />
                </div>
                {showItemSuggestions && itemSuggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {itemSuggestions.map((item) => (
                      <div
                        key={item.id}
                        onMouseDown={() => handlePickItem(item)}
                        className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <span className="truncate">{item.name}</span>
                        <span className="text-xs text-gray-400 shrink-0 ml-2">{item.demand_count}x</span>
                      </div>
                    ))}
                  </div>
                )}
                {formData.demand_item_id && (
                  <p className="text-[11px] text-green-700 mt-1">Linked to an existing item — will count toward its demand trend.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category *</label>
                <div className="flex gap-2">
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="regal-input w-full"
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setAddCategoryTarget('add');
                      setShowAddCategoryModal(true);
                    }}
                    className="regal-btn bg-regal-yellow text-regal-black px-5"
                    title="Add New Category"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Customer <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="regal-input w-full"
                  >
                    <option value="">Select Customer</option>
                    {customers.map((customer) => (
                      <option key={customer.cus_id} value={customer.cus_id}>
                        {customer.cus_name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setAddCustomerTarget('add');
                      setShowAddCustomerModal(true);
                    }}
                    className="regal-btn bg-regal-yellow text-regal-black px-5"
                    title="Add New Customer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : 'Add Demand'}
              </button>
              <button
                type="button"
                onClick={resetAddForm}
                className="regal-btn bg-gray-300 text-black"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* While we don't yet know the role, show a matching-shape skeleton
          instead of leaving this whole section blank until it resolves -
          otherwise it just "pops in" with no loading treatment at all. */}
      {userRole === null && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 animate-pulse">
          <div className="lg:col-span-2 regal-card p-3 md:p-6">
            <div className="h-5 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="h-64 md:h-80 bg-gray-100 rounded"></div>
          </div>
          <div className="regal-card p-3 md:p-6">
            <div className="h-5 bg-gray-200 rounded w-40 mb-4"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded"></div>)}
            </div>
          </div>
        </div>
      )}

      {/* Analytics - admin/employee only; cashiers get a fast, entry-focused page */}
      {showAnalytics && (
        <>
          {/* Date range + report actions */}
          <div className="regal-card p-4 mb-4 flex flex-wrap items-end gap-3">
            <div className="relative">
              <label className="block text-xs font-medium text-gray-600 mb-1">Graph a specific article</label>
              <input
                type="text"
                value={chartItemQuery}
                onChange={(e) => {
                  setChartItemQuery(e.target.value);
                  setShowChartItemSuggestions(true);
                  if (itemFilter) setItemFilter(null);
                }}
                onFocus={() => setShowChartItemSuggestions(true)}
                onBlur={() => setTimeout(() => setShowChartItemSuggestions(false), 150)}
                className="regal-input text-sm w-56"
                placeholder="Search any demanded article..."
                autoComplete="off"
              />
              {showChartItemSuggestions && chartItemSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {chartItemSuggestions.map((item) => (
                    <div
                      key={item.id}
                      onMouseDown={() => handlePickChartItem(item)}
                      className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <span className="truncate">{item.name}</span>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">{item.demand_count}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="regal-input text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="regal-input text-sm" />
            </div>
            <button
              onClick={handleFetchTrends}
              disabled={statsLoading}
              className="bg-regal-yellow text-regal-black px-4 py-3 rounded-md text-sm font-semibold hover:bg-yellow-400 transition disabled:opacity-50"
            >
              {statsLoading ? 'Fetching...' : 'Fetch'}
            </button>

            <div className="flex-1"></div>
            <button
              onClick={viewReport}
              disabled={generatingPdf}
              className="bg-regal-yellow text-regal-black px-3 py-3 rounded-md text-sm font-semibold hover:bg-yellow-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingPdf ? 'Generating...' : 'View Report'}
            </button>
            <button
              onClick={exportToExcel}
              disabled={generatingExcel}
              className="bg-green-600 text-white px-3 py-3 rounded-md text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingExcel ? 'Generating...' : 'Excel Report'}
            </button>
          </div>

          {/* Trend chart + Top Demanded Items */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2 regal-card p-3 md:p-6">
              <h3 className="text-base md:text-lg font-semibold text-gray-700 mb-2">
                Demand Volume{itemFilter ? ` — ${itemFilter.name}` : ''}
              </h3>
              {statsLoading ? (
                <div className="h-64 md:h-80 flex items-center justify-center">
                  <div className="h-8 w-8 border-4 border-regal-yellow border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : chartData ? (
                <>
                  <div className="h-64 md:h-80">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                  <p className="text-xs md:text-sm text-gray-500 mt-3 text-center">
                    {isSameMonth
                      ? `Daily trend from ${fromDate} to ${toDate}`
                      : isSameYear
                      ? `Weekly trend from ${fromDate} to ${toDate}`
                      : `Monthly trend from ${fromDate} to ${toDate}`}
                  </p>
                </>
              ) : (
                <div className="h-64 md:h-80 flex items-center justify-center">
                  <p className="text-gray-500 text-sm">No demand data for the selected period</p>
                </div>
              )}
            </div>

            <div className="regal-card p-3 md:p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base md:text-lg font-semibold text-gray-700">Top Demanded Items</h3>
              </div>
              {statsLoading ? (
                <div className="animate-pulse space-y-2">
                  {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded"></div>)}
                </div>
              ) : stats && stats.topItems.length > 0 ? (
                <div className="space-y-1 max-h-[340px] overflow-y-auto pr-1">
                  {stats.topItems.map((item, idx) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectTopItem(item)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-colors ${
                        itemFilter?.id === item.id ? 'border-regal-yellow bg-yellow-50' : 'border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${
                        itemFilter?.id === item.id ? 'bg-regal-yellow text-regal-black' : 'bg-gray-100 text-gray-500'
                      }`}>{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-[11px] text-gray-400">{item.category || 'Uncategorized'}</p>
                        <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-[rgb(15,157,142)] rounded-full" style={{ width: `${(item.count / maxTopItemCount) * 100}%` }}></div>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-8 text-center">No demand items recorded in this range yet</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Search - sits right above the table it filters, not up with Add Demand */}
      <div className="flex justify-start mb-2">
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="regal-btn bg-regal-yellow text-regal-black whitespace-nowrap px-4 py-2 flex items-center gap-2"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search
        </button>
      </div>

      {showSearch && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1 sm:flex-none">
            <input
              type="text"
              placeholder="Search by demand, customer, category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setCurrentPage(1);
                }
              }}
              className="regal-input w-full sm:w-72 pl-10 pr-4 py-4"
              autoFocus
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      )}

      {loading ? (
        <div className="border-0 p-0">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-100">
                <tr className="text-xs text-gray-900 uppercase tracking-wider font-semibold">
                  <th className="px-3 py-5 text-left w-16">S.No</th>
                  <th className="px-3 py-5 text-left w-64">Demand</th>
                  <th className="px-3 py-5 text-left w-28">Category</th>
                  <th className="px-3 py-5 text-left w-40">Customer</th>
                  <th className="px-3 py-5 text-left w-32">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 animate-pulse">
                {[...Array(pageSize)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-6"></div></td>
                    <td className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-40"></div></td>
                    <td className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-28"></div></td>
                    <td className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="border-0 p-0">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-100">
                <tr className="text-xs text-gray-900 uppercase tracking-wider font-semibold">
                  <th className="px-3 py-5 text-left w-16">S.No</th>
                  <th className="px-3 py-5 text-left w-64">Demand</th>
                  <th className="px-3 py-5 text-left w-28">Category</th>
                  <th className="px-3 py-5 text-left w-40">Customer</th>
                  <th className="px-3 py-5 text-left w-32">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {demands.map((demand, index) => (
                  <tr
                    key={demand.id}
                    onClick={() => openDemandDetails(demand)}
                    className="text-sm text-gray-900 transition-colors cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-3 py-4">{(currentPage - 1) * pageSize + index + 1}</td>
                    <td className="px-3 py-4 font-medium truncate">{demand.demand_text}</td>
                    <td className="px-3 py-4">{demand.category || 'N/A'}</td>
                    <td className="px-3 py-4">{demand.customer_name || '-'}</td>
                    <td className="px-3 py-4">{formatDate(demand.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {demands.length === 0 && (
              <p className="text-center py-12 text-gray-500">No demands found</p>
            )}
          </div>

          {totalPagesFromApi > 1 && (
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPagesFromApi}
                totalItems={totalItems}
                pageSize={pageSize}
                baseUrl="/demand"
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      )}

      {/* Right-side demand details/edit panel */}
      {selectedDemand && (
        <div
          className={`fixed inset-0 z-50 flex justify-end ${
            isPanelOpen ? '' : 'pointer-events-none'
          }`}
        >
          <div
            className={`fixed inset-0 bg-black transition-opacity duration-300 ${
              isPanelOpen ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'
            }`}
            onClick={closePanel}
          ></div>

          <div
            className={`relative w-full sm:w-2/5 h-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out overflow-y-auto ${
              isPanelOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900">Demand Details</h2>
              <button
                onClick={closePanel}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Demand</label>
                <input
                  type="text"
                  value={editDraft.demand_text}
                  onChange={(e) => setEditDraft({ ...editDraft, demand_text: e.target.value })}
                  className="regal-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Category *</label>
                <div className="flex gap-2">
                  <select
                    value={editDraft.category}
                    onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}
                    className="regal-input w-full"
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setAddCategoryTarget('edit');
                      setShowAddCategoryModal(true);
                    }}
                    className="regal-btn bg-regal-yellow text-regal-black px-4"
                    title="Add New Category"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  Customer <span className="text-gray-400">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={editDraft.customer_id}
                    onChange={(e) => setEditDraft({ ...editDraft, customer_id: e.target.value })}
                    className="regal-input w-full"
                  >
                    <option value="">
                      {selectedDemand.customer_name
                        ? `Keep recorded: ${selectedDemand.customer_name}`
                        : 'No customer selected'}
                    </option>
                    {customers.map((customer) => (
                      <option key={customer.cus_id} value={customer.cus_id}>
                        {customer.cus_name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setAddCustomerTarget('edit');
                      setShowAddCustomerModal(true);
                    }}
                    className="regal-btn bg-regal-yellow text-regal-black px-4"
                    title="Add New Customer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex justify-between border-b border-gray-100 pb-3 pt-2">
                <span className="text-sm text-gray-500">Recorded Date</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(selectedDemand.created_at)}</span>
              </div>

              <div className="pt-4 flex flex-wrap gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit || !isDirty}
                  className={`regal-btn px-4 py-2 ${
                    savingEdit || !isDirty
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-regal-yellow text-regal-black'
                  }`}
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>

                {userRole === 'admin' && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className={`regal-btn px-4 py-2 ${
                      deleting ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-600 text-white'
                    }`}
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal - same logic as Customer Invoice's Add Customer flow */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="regal-card bg-white p-3 md:p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Add New Customer</h3>

            <form onSubmit={(e) => { e.preventDefault(); handleAddCustomer(); }} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Customer Name *</label>
                <input
                  type="text"
                  value={newCustomer.cus_name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, cus_name: e.target.value })}
                  className="regal-input w-full"
                  placeholder="Enter customer name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="text"
                  value={newCustomer.cus_phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, cus_phone: e.target.value })}
                  className="regal-input w-full"
                  placeholder="Enter phone number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">CNIC</label>
                <input
                  type="text"
                  value={newCustomer.cus_cnic}
                  onChange={(e) => setNewCustomer({ ...newCustomer, cus_cnic: e.target.value })}
                  className="regal-input w-full"
                  placeholder="Enter CNIC"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <textarea
                  value={newCustomer.cus_address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, cus_address: e.target.value })}
                  className="regal-input w-full"
                  placeholder="Enter address"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Salesman</label>
                <select
                  value={newCustomer.cus_sal_id_fk}
                  onChange={(e) => setNewCustomer({ ...newCustomer, cus_sal_id_fk: e.target.value })}
                  className="regal-input w-full"
                >
                  <option value="">Select Salesman</option>
                  {salesmans.map((salesman) => (
                    <option key={salesman.sal_id} value={salesman.sal_id}>
                      {salesman.sal_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Branch</label>
                <select
                  value={newCustomer.branch}
                  onChange={(e) => setNewCustomer({ ...newCustomer, branch: e.target.value })}
                  className="regal-input w-full"
                >
                  <option value="European Sports Light House">European Sports Light House</option>
                </select>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  disabled={addingCustomer}
                  className={`regal-btn bg-regal-yellow text-regal-black flex-1 ${addingCustomer ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {addingCustomer ? 'Adding...' : 'Add Customer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCustomerModal(false);
                    setAddCustomerTarget(null);
                    resetNewCustomerForm();
                  }}
                  disabled={addingCustomer}
                  className="regal-btn bg-gray-300 text-black flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal - lets a category be added on the spot from the demand form/edit panel */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="regal-card bg-white p-3 md:p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Add New Category</h3>

            <form onSubmit={(e) => { e.preventDefault(); handleAddCategory(); }} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Category Name *</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="regal-input w-full"
                  placeholder="Enter category name"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  disabled={addingCategory}
                  className={`regal-btn bg-regal-yellow text-regal-black flex-1 ${addingCategory ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {addingCategory ? 'Adding...' : 'Add Category'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCategoryModal(false);
                    setAddCategoryTarget(null);
                    setNewCategoryName('');
                  }}
                  disabled={addingCategory}
                  className="regal-btn bg-gray-300 text-black flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setReportPdfData('');
        }}
        title="Demand Report"
        pdfData={reportPdfData}
      />
    </div>
  );
};

export default DemandPage;
