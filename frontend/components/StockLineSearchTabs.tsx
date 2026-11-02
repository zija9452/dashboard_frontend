'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';

// Same "Scan Barcode" / "Search by Name" box as ProductSearchTabs, but every product comes
// line by line - "Old Stock" and each batch, with its own barcode / price / stock - in ONE
// request (/api/stock/lines), so the line is picked right in the list (Adjust / Transfer).
// A scanned batch barcode picks its line at once; a product barcode of a product with
// batches opens its lines under the box.

export interface SearchLine {
  key: string; // product + line
  product_id: string;
  product_batch_id: string | null; // none = Old Stock (or a product without batches)
  product_name: string;
  label: string | null; // "Old Stock" / "Batch 003" / "Shop Batch 001"; none = no batches
  barcode: string | null;
  cost: number;
  price: number;
  stock: number;
  is_warehouse_product: boolean;
  has_batches: boolean;
}

type SearchMode = 'barcode' | 'name';

interface StockLineSearchTabsProps {
  onSelect: (line: SearchLine) => void;
  warehouse?: boolean; // warehouse products / warehouse stock and batch lines
}

async function fetchLines(params: Record<string, string>, warehouse: boolean): Promise<SearchLine[]> {
  const query = new URLSearchParams({ ...params, warehouse: String(warehouse) });
  const response = await fetch(`/api/stock/lines?${query.toString()}`, { credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Search failed');
  return data.lines || [];
}

function LineRows({ lines, warehouse, onPick }: { lines: SearchLine[]; warehouse: boolean; onPick: (l: SearchLine) => void }) {
  return (
    <>
      {lines.map((line) => (
        <button
          key={line.key}
          type="button"
          onClick={() => onPick(line)}
          className="w-full px-4 py-3 text-left hover:bg-amber-50 border-b border-gray-50 last:border-0 transition-colors"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="font-medium text-gray-900 truncate text-sm">{line.product_name}</div>
            {line.label && (
              <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${line.product_batch_id ? 'bg-yellow-100 text-regal-black' : 'bg-gray-100 text-gray-600'}`}>
                {line.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-400">#{line.barcode}</span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500">Rs. {line.price.toLocaleString()}</span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500">
              {warehouse ? 'Warehouse Stock' : 'Stock'}: <span className={`font-medium ${line.stock <= 0 ? 'text-red-500' : 'text-green-600'}`}>{line.stock}</span>
            </span>
          </div>
        </button>
      ))}
    </>
  );
}

const StockLineSearchTabs: React.FC<StockLineSearchTabsProps> = ({ onSelect, warehouse = false }) => {
  const { showToast } = useToast();
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const nameSearchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [searchMode, setSearchMode] = useState<SearchMode>('barcode');
  const [barcode, setBarcode] = useState('');
  const [searching, setSearching] = useState(false);
  const [scanLines, setScanLines] = useState<SearchLine[]>([]); // a scanned product's lines, to pick one
  const [nameSearch, setNameSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchLine[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [nameSearching, setNameSearching] = useState(false);

  useEffect(() => {
    if (searchMode === 'barcode') barcodeInputRef.current?.focus();
    else nameSearchRef.current?.focus();
    setBarcode('');
    setScanLines([]);
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
      setSearchResults(await fetchLines({ search: query, limit: warehouse ? '20' : '10' }, warehouse));
      setShowDropdown(true);
    } catch {
      setSearchResults([]);
    } finally {
      setNameSearching(false);
    }
  };

  const pickFromName = (line: SearchLine) => {
    onSelect(line);
    setNameSearch('');
    setSearchResults([]);
    setShowDropdown(false);
    nameSearchRef.current?.focus();
  };

  const pickFromScan = (line: SearchLine) => {
    onSelect(line);
    setScanLines([]);
    barcodeInputRef.current?.focus();
  };

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcode.trim();
    if (!code) { showToast('Please enter a barcode', 'error'); return; }
    if (searching) return;
    setSearching(true);
    setScanLines([]);
    try {
      const lines = await fetchLines({ code }, warehouse);
      if (lines.length === 0) showToast(warehouse ? 'Warehouse product not found' : 'Product not found', 'error');
      else if (lines.length === 1) onSelect(lines[0]);
      else setScanLines(lines); // a product with batches: pick its line below
    } catch (error) {
      showToast((error as Error).message || 'Error fetching product', 'error');
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
          {/* A scanned product with batches: choose its stock */}
          {scanLines.length > 0 && (
            <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-72 overflow-y-auto">
              <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-b flex justify-between">
                <span>Choose the stock</span>
                <button type="button" onClick={() => setScanLines([])} className="text-gray-400 hover:text-gray-700">✕</button>
              </div>
              <LineRows lines={scanLines} warehouse={warehouse} onPick={pickFromScan} />
            </div>
          )}
        </div>
      )}

      {/* Name Search Mode */}
      {searchMode === 'name' && (
        <div>
          <p className="text-sm text-gray-500 mb-3">
            Type at least 2 characters to search {warehouse ? 'warehouse products' : 'products'} by name
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

            {/* Dropdown Results: one row per stock line */}
            {showDropdown && (
              <div
                ref={dropdownRef}
                className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-72 overflow-y-auto"
              >
                {searchResults.length === 0 ? (
                  <div className="px-4 py-6 text-center text-gray-500 text-sm">No products found</div>
                ) : (
                  <LineRows lines={searchResults} warehouse={warehouse} onPick={pickFromName} />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StockLineSearchTabs;
