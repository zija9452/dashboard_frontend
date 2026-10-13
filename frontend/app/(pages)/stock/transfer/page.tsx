'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import PageHeader from '@/components/ui/PageHeader';

// Shop -> shop stock transfer (STOCK_TRANSFER_PLAN.md). Works like Stock In:
// stock goes down in this branch and up in the other branch. Products are
// matched by barcode; a product missing there is blocked, never auto-created.

type CheckStatus = 'checking' | 'ok' | 'warning' | 'error';

interface TransferItem {
  product_id: string;
  product_name: string;
  barcode: string;
  my_stock: number;
  quantity: number;
  status: CheckStatus;
  message: string;
  dest_stock: number | null;
}

interface ItemCheck {
  product_id: string;
  my_stock: number;
  dest_stock: number | null;
  status: CheckStatus;
  message: string;
}

interface Target {
  from_branch: string;
  to_branch_code: string;
  to_branch: string;
  connected: boolean;
}

interface Product {
  pro_id: string;
  pro_name: string;
  pro_barcode: string;
  pro_price: number;
  stock: number;
}

type SearchMode = 'barcode' | 'name';

const STATUS_STYLE: Record<CheckStatus, string> = {
  checking: 'bg-gray-100 text-gray-600',
  ok: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-800',
  error: 'bg-red-100 text-red-700',
};

const StockTransferPage: React.FC = () => {
  const { showToast } = useToast();
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const nameSearchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const checkSeq = useRef(0);

  const [target, setTarget] = useState<Target | null>(null);
  const [targetError, setTargetError] = useState('');

  const [searchMode, setSearchMode] = useState<SearchMode>('barcode');
  const [barcode, setBarcode] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [nameSearching, setNameSearching] = useState(false);
  const [searching, setSearching] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');

  const [items, setItems] = useState<TransferItem[]>([]);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchTarget(); }, []);

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

  const fetchTarget = async () => {
    setTargetError('');
    try {
      const response = await fetch('/api/stock/transfer/target', { credentials: 'include' });
      const data = await response.json();
      if (response.ok) setTarget(data);
      else setTargetError(data.error || 'Could not load the transfer branch');
    } catch {
      setTargetError('Could not load the transfer branch');
    }
  };

  // Apply backend check results to the list (by product)
  const applyChecks = (checks: ItemCheck[]) => {
    const byId = new Map(checks.map(c => [c.product_id, c]));
    setItems(prev => prev.map(item => {
      const check = byId.get(item.product_id);
      return check
        ? { ...item, my_stock: check.my_stock, dest_stock: check.dest_stock, status: check.status, message: check.message }
        : item;
    }));
  };

  // Re-check the whole list against the other branch whenever it changes
  const runCheck = async (list: TransferItem[]) => {
    if (list.length === 0) return;
    const seq = ++checkSeq.current;
    setChecking(true);
    try {
      const response = await fetch('/api/stock/transfer/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items: list.map(i => ({ product_id: i.product_id, quantity: i.quantity })) }),
      });
      const data = await response.json();
      if (seq !== checkSeq.current) return; // a newer check is running
      if (response.ok) {
        applyChecks(data.items || []);
      } else {
        const message = data.error || 'Could not check this item';
        setItems(prev => prev.map(i => ({ ...i, status: 'error', message })));
      }
    } catch {
      if (seq !== checkSeq.current) return;
      setItems(prev => prev.map(i => ({ ...i, status: 'error', message: 'Could not check this item' })));
    } finally {
      if (seq === checkSeq.current) setChecking(false);
    }
  };

  // Only the added/edited item shows "Checking..."; the others keep their status
  // while the whole list is re-checked in the background (Save stays disabled meanwhile)
  const updateList = (list: TransferItem[], changedId?: string) => {
    const marked = list.map(i => i.product_id === changedId
      ? { ...i, status: 'checking' as CheckStatus, message: 'Checking...' }
      : i);
    setItems(marked);
    runCheck(marked);
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

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setQuantity('');
    showToast(`Product found: ${product.pro_name}`, 'success');
    setTimeout(() => document.getElementById('transfer-qty')?.focus(), 100);
  };

  const handleSelectFromDropdown = (product: Product) => {
    setNameSearch(product.pro_name);
    setShowDropdown(false);
    selectProduct(product);
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
          selectProduct(product);
        } else {
          showToast('Product not found', 'error');
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

  const resetSelection = () => {
    setSelectedProduct(null);
    setBarcode('');
    setNameSearch('');
    setQuantity('');
    setTimeout(() => {
      if (searchMode === 'barcode') barcodeInputRef.current?.focus();
      else nameSearchRef.current?.focus();
    }, 100);
  };

  const handleAddItem = () => {
    if (!selectedProduct) { showToast('Please select a product first', 'error'); return; }
    const qty = parseInt(quantity) || 0;
    if (qty <= 0) { showToast('Quantity must be greater than 0', 'error'); return; }

    // Same product added again: add to its qty instead of a second row
    const existing = items.find(i => i.product_id === selectedProduct.pro_id);
    const list = existing
      ? items.map(i => i.product_id === selectedProduct.pro_id ? { ...i, quantity: i.quantity + qty } : i)
      : [...items, {
          product_id: selectedProduct.pro_id,
          product_name: selectedProduct.pro_name,
          barcode: selectedProduct.pro_barcode,
          my_stock: selectedProduct.stock,
          quantity: qty,
          status: 'checking' as CheckStatus,
          message: 'Checking...',
          dest_stock: null,
        }];
    updateList(list, selectedProduct.pro_id);
    resetSelection();
    showToast('Item added to list', 'success');
  };

  const handleQtyChange = (index: number, value: string) => {
    const qty = parseInt(value) || 0;
    updateList(items.map((item, i) => i === index ? { ...item, quantity: qty } : item), items[index].product_id);
  };

  const handleRemoveItem = (index: number) => {
    const list = items.filter((_, i) => i !== index);
    if (list.length === 0) {
      checkSeq.current++;
      setChecking(false);
      setItems([]);
    } else {
      updateList(list);
    }
  };

  const hasErrors = items.some(i => i.status === 'error');
  const hasWarnings = items.some(i => i.status === 'warning');
  const canSave = !!target?.connected && items.length > 0 && !hasErrors && !checking && !submitting;

  const handleSave = async () => {
    if (!target || !canSave) return;
    const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0);
    const confirm = await Swal.fire({
      title: 'Transfer Stock?',
      html: `<p><b>${items.length}</b> product(s), <b>${totalUnits}</b> units</p><p class="mt-2">${target.from_branch} → <b>${target.to_branch}</b></p>${hasWarnings ? '<p class="mt-2 text-amber-600 text-sm">Some product names differ in the other branch.</p>' : ''}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Send',
      cancelButtonText: 'Cancel',
    });
    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/stock/transfer/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          to_branch: target.to_branch_code,
          items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        }),
      });
      const data = await response.json();
      if (response.ok) {
        Swal.fire({ title: 'Success!', text: data.message || `Stock transferred to ${target.to_branch}`, icon: 'success', timer: 2500, timerProgressBar: true, showConfirmButton: false });
        setItems([]);
        resetSelection();
      } else {
        if (Array.isArray(data.items)) applyChecks(data.items);
        Swal.fire({ title: 'Transfer Failed', text: data.error || 'Transfer failed', icon: 'error', confirmButtonText: 'OK' });
      }
    } catch {
      Swal.fire({ title: 'Transfer Failed', text: 'Network error. Please try again.', icon: 'error', confirmButtonText: 'OK' });
    } finally {
      setSubmitting(false);
    }
  };

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="p-2 py-5">
      <PageHeader title="Transfer Stock" />

      {/* From -> To */}
      <div className="mb-4">
        {targetError ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between gap-3">
            <span>{targetError}</span>
            <button onClick={fetchTarget} className="regal-btn bg-white border border-red-200 text-red-700 text-xs">Retry</button>
          </div>
        ) : !target ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
            <span className="w-2 h-2 rounded-full bg-gray-500 animate-pulse"></span>
            Checking branch...
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="inline-flex flex-wrap items-center gap-2 text-sm">
              <span className="px-3 py-1.5 rounded-lg bg-gray-100 font-medium text-gray-700">From: {target.from_branch}</span>
              <svg className="w-4 h-4 text-regal-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span className="px-3 py-1.5 rounded-lg bg-regal-yellow/30 font-semibold text-regal-black">To: {target.to_branch}</span>
            </div>
            {!target.connected && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between gap-3">
                <span>Cannot connect to {target.to_branch}. Transfers are unavailable right now.</span>
                <button onClick={fetchTarget} className="regal-btn bg-white border border-red-200 text-red-700 text-xs">Retry</button>
              </div>
            )}
          </div>
        )}
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
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan or enter barcode..."
                  className="regal-input w-full"
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
              <input
                ref={nameSearchRef}
                type="text"
                value={nameSearch}
                onChange={(e) => { setNameSearch(e.target.value); if (selectedProduct) setSelectedProduct(null); }}
                onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                placeholder="Type product name to search..."
                className="regal-input w-full pr-10"
                autoFocus
                autoComplete="off"
              />
              {nameSearching && (
                <div className="absolute inset-y-0 right-3 flex items-center">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-regal-black rounded-full animate-spin"></div>
                </div>
              )}

              {/* Dropdown Results */}
              {showDropdown && (
                <div
                  ref={dropdownRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-72 overflow-y-auto"
                >
                  {searchResults.map((product) => (
                    <button
                      key={product.pro_id}
                      type="button"
                      onClick={() => handleSelectFromDropdown(product)}
                      className="w-full px-4 py-3 text-left hover:bg-amber-50 border-b border-gray-50 last:border-0 transition-colors"
                    >
                      <div className="font-medium text-gray-900 truncate text-sm">{product.pro_name}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400">#{product.pro_barcode}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">Stock: <span className={`font-medium ${product.stock <= 0 ? 'text-red-500' : 'text-green-600'}`}>{product.stock}</span></span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Product Details Form */}
      {selectedProduct && (
        <div className="regal-card mb-6 !p-2 md:!p-6">
          <h3 className="text-lg font-semibold mb-4">Product Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Product</label>
              <input type="text" value={selectedProduct.pro_name} disabled className="regal-input w-full bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">My Stock</label>
              <input type="text" value={selectedProduct.stock} disabled className="regal-input w-full bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quantity *</label>
              <input
                id="transfer-qty"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem(); }}
                className="regal-input w-full"
                min="1"
                required
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={handleAddItem} className="regal-btn bg-regal-yellow text-regal-black flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add to List
            </button>
            <button onClick={resetSelection} className="regal-btn bg-gray-200 text-gray-700 hover:bg-gray-300">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Items Table */}
      {items.length > 0 && (
        <div className="regal-card mb-6 !p-2 md:!p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Items to Transfer</h3>
            <div className="text-sm text-gray-500">
              <span className="font-semibold text-regal-black">{items.length}</span> item{items.length !== 1 ? 's' : ''}
              <span className="mx-1.5 text-gray-300">|</span>
              <span className="font-semibold text-regal-black">{totalUnits}</span> units
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-center">My Stock</th>
                  <th className="px-4 py-3 text-center">{target ? `${target.to_branch} Stock` : 'Their Stock'}</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, index) => (
                  <tr key={item.product_id} className={`text-sm transition-colors ${item.status === 'error' ? 'bg-red-50/60' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3 text-gray-400 text-xs">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.product_name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{item.barcode || 'No barcode'}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">{item.my_stock}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{item.dest_stock ?? '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        value={item.quantity}
                        min="1"
                        onChange={(e) => handleQtyChange(index, e.target.value)}
                        disabled={submitting}
                        className="regal-input w-20 text-center"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${STATUS_STYLE[item.status]}`}>
                        {item.status === 'ok' ? '✓ ' : item.status === 'warning' ? '⚠ ' : item.status === 'error' ? '✕ ' : ''}{item.message}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleRemoveItem(index)}
                        disabled={submitting}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasErrors && (
            <p className="mt-4 text-sm text-red-600">
              Items marked ✕ cannot be transferred. Remove them or fix the issue, then save.
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="regal-btn bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-full sm:w-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              {submitting ? 'Sending...' : checking ? 'Checking...' : `Save Transfer${target ? ` → ${target.to_branch}` : ''}`}
            </button>
            <button
              onClick={() => { checkSeq.current++; setChecking(false); setItems([]); }}
              disabled={submitting}
              className="regal-btn bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 w-full sm:w-auto"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && !selectedProduct && (
        <div className="regal-card p-8 text-center">
          <p className="text-gray-500 text-sm">No items added yet.</p>
          <p className="text-gray-400 text-xs mt-1">
            {searchMode === 'barcode' ? 'Scan a barcode above to add products.' : 'Search by product name above to get started.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default StockTransferPage;
