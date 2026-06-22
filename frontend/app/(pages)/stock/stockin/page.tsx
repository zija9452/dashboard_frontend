'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';

declare const qz: any;

interface StockInItem {
  product_id: string;
  product_name: string;
  barcode: string;
  vendor_id: string;
  vendor_name: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  total_cost: number;
  date: string;
}

interface Vendor {
  ven_id: string;
  ven_name: string;
}

interface VendorAPI {
  id: string;
  name: string;
}

interface Product {
  pro_id: string;
  pro_name: string;
  pro_barcode: string;
  pro_price: number;
  pro_cost: number;
  stock: number;
  warehouse_stock: number;
  is_warehouse_product: boolean;
}

type SearchMode = 'barcode' | 'name';

const StockInPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const nameSearchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [searchMode, setSearchMode] = useState<SearchMode>('barcode');
  const [barcode, setBarcode] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [nameSearching, setNameSearching] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [stockInItems, setStockInItems] = useState<StockInItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [qzStatus, setQzStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => { fetchVendors(); }, []);

  useEffect(() => {
    if (searchMode === 'barcode') barcodeInputRef.current?.focus();
    else nameSearchRef.current?.focus();
    setSelectedProduct(null);
    setBarcode('');
    setNameSearch('');
    setSearchResults([]);
    setShowDropdown(false);
  }, [searchMode]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          nameSearchRef.current && !nameSearchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced name search
  useEffect(() => {
    if (!nameSearch.trim() || nameSearch.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(() => { performNameSearch(nameSearch); }, 300);
    return () => clearTimeout(timer);
  }, [nameSearch]);

  useEffect(() => {
    const checkQZTray = async () => {
      setQzStatus('checking');
      const waitForQZ = () => new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const check = () => {
          if (typeof qz !== 'undefined') resolve();
          else if (attempts >= 50) reject(new Error('QZ Tray script failed to load'));
          else { attempts++; setTimeout(check, 200); }
        };
        check();
      });
      try {
        await waitForQZ();
        if (!qz.websocket.isActive()) await qz.websocket.connect();
        setQzStatus('connected');
      } catch {
        setQzStatus('error');
      }
    };
    checkQZTray();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors/?skip=0&limit=1000', { method: 'GET', credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const vendorList = Array.isArray(data) ? data : (data.vendors || []);
        setVendors(vendorList.map((v: VendorAPI) => ({ ven_id: v.id, ven_name: v.name })));
      }
    } catch (error) {
      showToast('Error loading vendors', 'error');
    }
  };

  const performNameSearch = async (query: string) => {
    setNameSearching(true);
    try {
      const response = await fetch(
        `/api/products?search_string=${encodeURIComponent(query)}&page=1&limit=10`,
        { method: 'GET', credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        const products: Product[] = (data.data || []);
        setSearchResults(products);
        setShowDropdown(products.length > 0);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setNameSearching(false);
    }
  };

  const handleSelectFromDropdown = (product: Product) => {
    setSelectedProduct(product);
    setCostPrice(product.pro_cost || 0);
    setSellingPrice(product.pro_price || 0);
    setQuantity('');
    setNameSearch(product.pro_name);
    setShowDropdown(false);
    showToast(`Product found: ${product.pro_name}`, 'success');
    setTimeout(() => document.getElementById('vendor-select')?.focus(), 100);
  };

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) { showToast('Please enter a barcode', 'error'); return; }
    if (searching) return;
    setSearching(true);
    try {
      const response = await fetch(`/api/products/searchbybarcode?barcode=${encodeURIComponent(barcode)}`, {
        method: 'GET', credentials: 'include',
      });
      if (response.ok) {
        const product = await response.json();
        if (product && product.pro_id) {
          setSelectedProduct(product);
          setCostPrice(product.pro_cost || 0);
          setSellingPrice(product.pro_price || 0);
          setQuantity('');
          showToast(`Product found: ${product.pro_name}`, 'success');
          setTimeout(() => document.getElementById('vendor-select')?.focus(), 100);
        } else {
          showToast('Product not found. Please add product first.', 'error');
          setSelectedProduct(null);
        }
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Error fetching product', 'error');
      }
    } catch {
      showToast('Error fetching product', 'error');
    } finally {
      setSearching(false);
      setBarcode('');
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct) { showToast('Please select a product first', 'error'); return; }
    if (!selectedVendor) { showToast('Please select a vendor', 'error'); return; }
    if (!quantity || parseInt(quantity) <= 0) { showToast('Quantity must be greater than 0', 'error'); return; }

    const vendor = vendors.find(v => v.ven_id === selectedVendor);
    if (!vendor) { showToast('Invalid vendor selected', 'error'); return; }

    const qty = parseInt(quantity) || 0;

    if (selectedProduct.is_warehouse_product) {
      const warehouseStock = selectedProduct.warehouse_stock || 0;
      if (warehouseStock < qty) {
        Swal.fire({
          title: 'Insufficient Warehouse Stock',
          html: `<p>This is a warehouse product.</p><p class="mt-2 text-red-600">Available in warehouse: <strong>${warehouseStock}</strong></p><p class="mt-1">Requested quantity: <strong>${qty}</strong></p>`,
          icon: 'error',
          confirmButtonText: 'OK',
        });
        return;
      }
    }

    const newItem: StockInItem = {
      product_id: selectedProduct.pro_id,
      product_name: selectedProduct.pro_name,
      barcode: selectedProduct.pro_barcode,
      vendor_id: selectedVendor,
      vendor_name: vendor.ven_name,
      quantity: qty,
      cost_price: costPrice,
      selling_price: sellingPrice,
      total_cost: qty * costPrice,
      date: date,
    };

    setStockInItems([...stockInItems, newItem]);
    setSelectedProduct(null);
    setBarcode('');
    setNameSearch('');
    setQuantity('');
    setCostPrice(0);
    setSellingPrice(0);
    setSelectedVendor('');

    setTimeout(() => {
      if (searchMode === 'barcode') barcodeInputRef.current?.focus();
      else nameSearchRef.current?.focus();
    }, 100);

    showToast('Item added to list', 'success');
  };

  const handleRemoveItem = (index: number) => {
    setStockInItems(stockInItems.filter((_, i) => i !== index));
  };

  const handlePrintBarcodesOnly = async () => {
    if (stockInItems.length === 0) { showToast('Please add at least one item', 'error'); return; }
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = stockInItems.map(item => ({
        product_id: item.product_id, quantity: item.quantity, barcode: item.barcode, price: item.selling_price,
      }));
      const response = await fetch('/api/stock/generatebarcodesonly', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload),
      });
      if (response.ok) {
        const apiResult = await response.json();
        if (apiResult.zpl_commands?.length > 0) printBarcodes(apiResult.zpl_commands);
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to generate barcodes', 'error');
      }
    } catch { showToast('Error generating barcodes', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleStockIn = async () => {
    if (stockInItems.length === 0) { showToast('Please add at least one item', 'error'); return; }
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = stockInItems.map(item => ({
        product_id: item.product_id, vendor_id: item.vendor_id, quantity: item.quantity,
        cost_price: item.cost_price, date: item.date,
      }));
      const response = await fetch('/api/stock/savestockin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload),
      });
      if (response.ok) {
        const result = await response.json();
        const errors = result.results?.filter((r: any) => r.status === 'error') || [];
        const successes = result.results?.filter((r: any) => r.status === 'success') || [];
        if (errors.length > 0) {
          Swal.fire({
            title: 'Stock In Partially Failed',
            html: `<p>Successfully added: ${successes.length} product(s)</p><p class="mt-2 text-red-600">Failed: ${errors.length} product(s)</p><div class="mt-2 text-left text-sm">${errors.map((e: any) => `<p class="mt-1">• ${e.message || e.product_name}</p>`).join('')}</div>`,
            icon: 'warning', confirmButtonText: 'OK',
          });
          const successIds = successes.map((s: any) => s.product_id);
          setStockInItems(prev => prev.filter(item => successIds.includes(item.product_id)));
        } else if (successes.length > 0) {
          Swal.fire({ title: 'Success!', text: `Stock in completed for ${successes.length} products.`, icon: 'success', timer: 2000, timerProgressBar: true, showConfirmButton: false });
          setStockInItems([]);
          router.push('/stock');
        }
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to save stock in', 'error');
      }
    } catch { showToast('Error saving stock in', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleStockInWithBarcode = async () => {
    if (stockInItems.length === 0) { showToast('Please add at least one item', 'error'); return; }
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = stockInItems.map(item => ({
        product_id: item.product_id, vendor_id: item.vendor_id, quantity: item.quantity,
        cost_price: item.cost_price, selling_price: item.selling_price, date: item.date,
      }));
      const response = await fetch('/api/stock/savestockinwithbarcode', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload),
      });
      if (response.ok) {
        const apiResult = await response.json();
        const errors = apiResult.results?.filter((r: any) => r.status === 'error') || [];
        const successes = apiResult.results?.filter((r: any) => r.status === 'success') || [];
        if (errors.length > 0) {
          Swal.fire({
            title: 'Stock In Partially Failed',
            html: `<p>Successfully added: ${successes.length} product(s)</p><p class="mt-2 text-red-600">Failed: ${errors.length} product(s)</p><div class="mt-2 text-left text-sm">${errors.map((e: any) => `<p class="mt-1">• ${e.message || e.product_name}</p>`).join('')}</div>`,
            icon: 'warning', confirmButtonText: 'OK',
          });
          const successIds = successes.map((s: any) => s.product_id);
          setStockInItems(prev => prev.filter(item => successIds.includes(item.product_id)));
        } else if (successes.length > 0) {
          Swal.fire({
            title: 'Success!',
            html: `<p>Stock in completed for ${successes.length} products.</p><p>Barcodes generated: ${apiResult.zpl_commands?.length || 0}</p>`,
            icon: 'success', showCancelButton: true, confirmButtonText: 'Print Barcodes', cancelButtonText: 'Close',
          }).then((swalResult) => {
            if (swalResult.isConfirmed && apiResult.zpl_commands?.length > 0) printBarcodes(apiResult.zpl_commands);
          });
          setStockInItems([]);
          router.push('/stock');
        }
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to save stock in', 'error');
      }
    } catch { showToast('Error saving stock in with barcode', 'error'); }
    finally { setSubmitting(false); }
  };

  const printBarcodes = async (zplCommands: any[]) => {
    try {
      if (typeof qz === 'undefined') {
        Swal.fire({ title: 'QZ Tray Not Installed', html: `<p>QZ Tray is required for barcode printing.</p><p class="mt-2">Please install it from:</p><a href="https://qz.io" target="_blank" class="text-blue-600 underline">https://qz.io</a>`, icon: 'error', confirmButtonText: "I've Installed It", showCancelButton: true, cancelButtonText: 'Close' });
        return;
      }
      const zplData = zplCommands.map((cmd: any) => typeof cmd === 'string' ? cmd : cmd.zpl);
      try {
        if (!qz.websocket.isActive()) await qz.websocket.connect();
      } catch {
        Swal.fire({ title: 'QZ Tray Connection Failed', html: `<p>Cannot connect to QZ Tray application.</p>`, icon: 'error', confirmButtonText: 'Retry', showCancelButton: true, cancelButtonText: 'Close' }).then((r) => { if (r.isConfirmed) printBarcodes(zplCommands); });
        return;
      }
      let printer;
      try {
        printer = await qz.printers.find('ZDesigner GX420d');
        if (!printer) {
          const allPrinters = await qz.printers.find();
          if (allPrinters.length === 0) throw new Error('No printers found');
          const { value: selectedPrinter } = await Swal.fire({ title: 'Select Printer', html: `<p>ZDesigner GX420d not found. Please select a printer:</p><select id="printer-select" class="swal2-input">${allPrinters.map((p: any) => `<option value="${p}">${p}</option>`).join('')}</select>`, focusConfirm: false, showCancelButton: true, confirmButtonText: 'Print', cancelButtonText: 'Cancel', preConfirm: () => (document.getElementById('printer-select') as HTMLSelectElement)?.value });
          if (selectedPrinter) printer = selectedPrinter; else return;
        }
      } catch (printerError) {
        Swal.fire({ title: 'Printer Error', html: `<p>Cannot access printers. Error: ${(printerError as Error).message}</p>`, icon: 'error', confirmButtonText: 'OK' });
        return;
      }
      const validZplData = zplData.filter((zpl: string) => zpl?.trim().length > 0 && zpl.includes('^XA') && zpl.includes('^XZ'));
      if (validZplData.length === 0) { Swal.fire({ title: 'No Valid Barcodes', html: `<p>All ZPL commands were empty or invalid.</p>`, icon: 'warning', confirmButtonText: 'OK' }); return; }
      const config = qz.configs.create(printer, { forceRaw: true, encoding: 'UTF-8' });
      for (let i = 0; i < validZplData.length; i++) {
        await qz.print(config, [validZplData[i]]);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      showToast('Barcodes printed successfully!', 'success');
    } catch (error) {
      Swal.fire({ title: 'Print Failed', html: `<p>Could not print barcodes. Error: ${(error as Error).message}</p>`, icon: 'error', confirmButtonText: 'OK' });
    }
  };

  const totalItems = stockInItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalCost = stockInItems.reduce((sum, item) => sum + item.total_cost, 0);

  return (
    <div className="p-2 py-5">
      <PageHeader title="Stock In" />

      {/* QZ Tray Status */}
      <div className="mb-4">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
          qzStatus === 'connected' ? 'bg-green-100 text-green-700' : qzStatus === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
        }`}>
          <span className={`w-2 h-2 rounded-full ${qzStatus === 'connected' ? 'bg-green-500 animate-pulse' : qzStatus === 'error' ? 'bg-red-500' : 'bg-gray-500 animate-pulse'}`}></span>
          {qzStatus === 'connected' ? 'QZ Tray Ready' : qzStatus === 'error' ? 'QZ Tray Not Connected' : 'Checking QZ Tray...'}
        </div>
      </div>

      {/* Search Section */}
      <div className="regal-card md:p-4 p-2 mb-6">
        {/* Mode Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setSearchMode('barcode')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              searchMode === 'barcode'
                ? 'bg-regal-yellow text-regal-black shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Scan Barcode
          </button>
          <button
            onClick={() => setSearchMode('name')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              searchMode === 'name'
                ? 'bg-regal-yellow text-regal-black shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search by Name
          </button>
        </div>

        {/* Barcode Mode */}
        {searchMode === 'barcode' && (
          <div>
            <p className="text-sm text-gray-500 mb-3">Scan or type barcode and press Enter / Search</p>
            <form onSubmit={handleBarcodeSubmit} className="flex gap-3">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan or enter barcode..."
                  className="regal-input w-full pl-10"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className={`regal-btn flex items-center justify-center min-w-[120px] transition-all ${
                  searching ? 'bg-regal-yellow/50 cursor-not-allowed text-regal-black/60' : 'bg-regal-yellow text-regal-black'
                }`}
              >
                {searching ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-regal-black/30 border-t-regal-black rounded-full animate-spin"></div>
                    <span>Searching</span>
                  </div>
                ) : 'Search'}
              </button>
            </form>
          </div>
        )}

        {/* Name Search Mode */}
        {searchMode === 'name' && (
          <div>
            <p className="text-sm text-gray-500 mb-3">Type at least 2 characters to search products by name</p>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none z-10">
                {nameSearching ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-regal-black rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </div>
              <input
                ref={nameSearchRef}
                type="text"
                value={nameSearch}
                onChange={(e) => { setNameSearch(e.target.value); if (selectedProduct) setSelectedProduct(null); }}
                onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                placeholder="Type product name to search..."
                className="regal-input w-full pl-10 pr-10"
                autoFocus
                autoComplete="off"
              />
              {nameSearch && (
                <button
                  type="button"
                  onClick={() => { setNameSearch(''); setSearchResults([]); setShowDropdown(false); setSelectedProduct(null); nameSearchRef.current?.focus(); }}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Dropdown Results */}
              {showDropdown && (
                <div
                  ref={dropdownRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-72 overflow-y-auto"
                >
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-500 text-sm">No products found</div>
                  ) : (
                    <>
                      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {searchResults.length} product{searchResults.length !== 1 ? 's' : ''} found
                        </span>
                      </div>
                      {searchResults.map((product) => (
                        <button
                          key={product.pro_id}
                          type="button"
                          onClick={() => handleSelectFromDropdown(product)}
                          className="w-full px-4 py-3 text-left hover:bg-amber-50 border-b border-gray-50 last:border-0 transition-colors group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 group-hover:text-regal-black truncate text-sm">
                                  {product.pro_name}
                                </span>
                                {product.is_warehouse_product && (
                                  <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                    Warehouse
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-gray-400">#{product.pro_barcode}</span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-500">Stock: <span className={`font-medium ${product.stock <= 0 ? 'text-red-500' : 'text-green-600'}`}>{product.stock}</span></span>
                                {product.is_warehouse_product && (
                                  <>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-gray-500">Warehouse: <span className="font-medium text-blue-600">{product.warehouse_stock || 0}</span></span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-sm font-semibold text-gray-800">Rs. {product.pro_price?.toLocaleString()}</div>
                              <div className="text-xs text-gray-400 mt-0.5">Cost: Rs. {product.pro_cost?.toLocaleString()}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {nameSearch.length > 0 && nameSearch.length < 2 && (
              <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Type at least 2 characters to search
              </p>
            )}
          </div>
        )}
      </div>

      {/* Product Details Form */}
      {selectedProduct && (
        <div className="regal-card mb-6 !p-2 md:!p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Product Details</h3>
            {selectedProduct.is_warehouse_product && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Warehouse Product — Stock transfers from warehouse
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Product</label>
              <input type="text" value={selectedProduct.pro_name} disabled className="regal-input w-full bg-gray-100" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Current Stock
                {selectedProduct.is_warehouse_product && (
                  <span className="ml-1 text-xs text-blue-600 font-normal">(Warehouse: {selectedProduct.warehouse_stock || 0})</span>
                )}
              </label>
              <input type="text" value={selectedProduct.stock} disabled className="regal-input w-full bg-gray-100" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Vendor *</label>
              <select
                id="vendor-select"
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="regal-input w-full"
                required
              >
                <option value="">Select Vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.ven_id} value={vendor.ven_id}>{vendor.ven_name}</option>
                ))}
              </select>
              {vendors.length === 0 && (
                <p className="text-xs text-red-600 mt-1">No vendors found. Please add vendors first.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Quantity *
                {selectedProduct.is_warehouse_product && (
                  <span className="ml-1 text-xs text-amber-600 font-normal">Max: {selectedProduct.warehouse_stock || 0}</span>
                )}
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="regal-input w-full"
                min="1"
                max={selectedProduct.is_warehouse_product ? (selectedProduct.warehouse_stock || undefined) : undefined}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Cost Price (Rs.) *</label>
              <input
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                className="regal-input w-full"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Selling Price (Rs.) *</label>
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                className="regal-input w-full"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="regal-input w-full"
              />
            </div>
          </div>

          {quantity && costPrice > 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M12 7h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-amber-800">
                Total Cost: <strong>Rs. {(parseInt(quantity || '0') * costPrice).toLocaleString()}</strong>
                <span className="mx-2 text-amber-400">|</span>
                {parseInt(quantity || '0')} units × Rs. {costPrice}
              </span>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button onClick={handleAddItem} className="regal-btn bg-regal-yellow text-regal-black flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add to List
            </button>
            <button
              onClick={() => {
                setSelectedProduct(null);
                setBarcode('');
                setNameSearch('');
                setQuantity('');
                setCostPrice(0);
                setSellingPrice(0);
                setSelectedVendor('');
                if (searchMode === 'barcode') barcodeInputRef.current?.focus();
                else nameSearchRef.current?.focus();
              }}
              className="regal-btn bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Items Table */}
      {stockInItems.length > 0 && (
        <div className="regal-card mb-6 !p-2 md:!p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Items to Stock In</h3>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500">
                <span className="font-semibold text-regal-black">{stockInItems.length}</span> item{stockInItems.length !== 1 ? 's' : ''}
                <span className="mx-1.5 text-gray-300">|</span>
                <span className="font-semibold text-regal-black">{totalItems}</span> units
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left">Vendor</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Cost Price</th>
                  <th className="px-4 py-3 text-right">Sell Price</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stockInItems.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 text-sm transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.product_name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{item.barcode}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.vendor_name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-semibold text-sm">
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">Rs. {item.cost_price.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-700">Rs. {item.selling_price.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">Rs. {item.total_cost.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-sm">
                  <td colSpan={6} className="px-4 py-3 text-right text-gray-600">Grand Total ({totalItems} units):</td>
                  <td className="px-4 py-3 text-right text-lg font-bold text-regal-black">Rs. {totalCost.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={handlePrintBarcodesOnly}
              disabled={submitting}
              className="regal-btn bg-orange-500 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-full sm:w-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              {submitting ? 'Processing...' : 'Print Barcodes Only'}
            </button>
            <button
              onClick={handleStockInWithBarcode}
              disabled={submitting}
              className="regal-btn bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-full sm:w-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {submitting ? 'Processing...' : 'Stock In + Print Barcodes'}
            </button>
            <button
              onClick={handleStockIn}
              disabled={submitting}
              className="regal-btn bg-regal-yellow text-regal-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-full sm:w-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {submitting ? 'Processing...' : 'Stock In Only'}
            </button>
            <button
              onClick={() => setStockInItems([])}
              disabled={submitting}
              className="regal-btn bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 w-full sm:w-auto"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {stockInItems.length === 0 && !selectedProduct && (
        <div className="regal-card p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No items added yet.</p>
          <p className="text-gray-400 text-xs mt-1">
            {searchMode === 'barcode' ? 'Scan a barcode above to add products.' : 'Search by product name above to get started.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default StockInPage;
