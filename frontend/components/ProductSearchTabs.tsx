'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';

// "Scan Barcode" / "Search by Name" product search (same look as Stock In and
// Transfer Stock). The picked product is passed to onSelect; the page decides
// what to do with it.

export interface SearchProduct {
  pro_id: string;
  pro_name: string;
  pro_barcode: string;
  pro_price: number;
  pro_cost?: number;
  stock: number;
  warehouse_stock?: number;
  is_warehouse_product?: boolean;
}

type SearchMode = 'barcode' | 'name';

interface ProductSearchTabsProps {
  onSelect: (product: SearchProduct) => void;
  warehouseOnly?: boolean; // Name search lists warehouse products only, showing warehouse stock
}

const ProductSearchTabs: React.FC<ProductSearchTabsProps> = ({ onSelect, warehouseOnly = false }) => {
  const { showToast } = useToast();
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const nameSearchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [searchMode, setSearchMode] = useState<SearchMode>('barcode');
  const [barcode, setBarcode] = useState('');
  const [searching, setSearching] = useState(false);
  const [nameSearch, setNameSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [nameSearching, setNameSearching] = useState(false);

  useEffect(() => {
    if (searchMode === 'barcode') barcodeInputRef.current?.focus();
    else nameSearchRef.current?.focus();
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

  const performNameSearch = async (query: string) => {
    setNameSearching(true);
    try {
      const response = await fetch(
        `/api/products?search_string=${encodeURIComponent(query)}&page=1&limit=${warehouseOnly ? 20 : 10}`,
        { method: 'GET', credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        let products: SearchProduct[] = data.data || [];
        if (warehouseOnly) products = products.filter(p => p.is_warehouse_product);
        setSearchResults(products);
        setShowDropdown(true);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setNameSearching(false);
    }
  };

  const handleSelectFromDropdown = (product: SearchProduct) => {
    onSelect(product);
    setNameSearch('');
    setSearchResults([]);
    setShowDropdown(false);
    nameSearchRef.current?.focus();
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
        if (product && product.pro_id) onSelect(product);
        else showToast('Product not found', 'error');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Error fetching product', 'error');
      }
    } catch {
      showToast('Error fetching product', 'error');
    } finally {
      setSearching(false);
      setBarcode('');
      barcodeInputRef.current?.focus();
    }
  };

  const tabClass = (mode: SearchMode) =>
    `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
      searchMode === mode ? 'bg-regal-yellow text-regal-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
    }`;

  return (
    <div className="regal-card md:p-4 p-2 mb-6">
      {/* Mode Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        <button type="button" onClick={() => setSearchMode('barcode')} className={tabClass('barcode')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          Scan Barcode
        </button>
        <button type="button" onClick={() => setSearchMode('name')} className={tabClass('name')}>
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
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Scan or enter barcode..."
              className="regal-input flex-grow min-w-0"
              autoFocus
            />
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
          <p className="text-sm text-gray-500 mb-3">
            Type at least 2 characters to search {warehouseOnly ? 'warehouse products' : 'products'} by name
          </p>
          <div className="relative">
            <input
              ref={nameSearchRef}
              type="text"
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
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
                {searchResults.length === 0 ? (
                  <div className="px-4 py-6 text-center text-gray-500 text-sm">No products found</div>
                ) : searchResults.map((product) => {
                  const stock = warehouseOnly ? (product.warehouse_stock || 0) : product.stock;
                  return (
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
                        <span className="text-xs text-gray-500">
                          {warehouseOnly ? 'Warehouse Stock' : 'Stock'}: <span className={`font-medium ${stock <= 0 ? 'text-red-500' : 'text-green-600'}`}>{stock}</span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSearchTabs;
