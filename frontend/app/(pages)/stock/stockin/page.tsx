'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';

// QZ Tray type declaration
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
  stock: number;
}

const StockInPage: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // State
  const [barcode, setBarcode] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Temporary table for multi-product stock in
  const [stockInItems, setStockInItems] = useState<StockInItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [qzStatus, setQzStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  // Fetch vendors on mount
  useEffect(() => {
    fetchVendors();
  }, []);

  // Focus barcode input on mount
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Check QZ Tray status on mount
  useEffect(() => {
    const checkQZTray = async () => {
      setQzStatus('checking');
      
      // Wait for QZ script to load (with longer timeout)
      const waitForQZ = () => {
        return new Promise<void>((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = 50; // Increased from 10 to 50 (10 seconds total)
          
          const check = () => {
            if (typeof qz !== 'undefined') {
              console.log('✓ QZ script loaded after', attempts, 'attempts');
              resolve();
            } else if (attempts >= maxAttempts) {
              console.error('✗ QZ script failed to load after', maxAttempts, 'attempts');
              reject(new Error('QZ Tray script failed to load'));
            } else {
              attempts++;
              setTimeout(check, 200); // Check every 200ms
            }
          };
          
          check();
        });
      };

      try {
        // Wait for QZ script
        await waitForQZ();
        
        // Try to connect
        if (!qz.websocket.isActive()) {
          await qz.websocket.connect();
        }
        
        console.log('✓ QZ Tray connected successfully');
        setQzStatus('connected');
        
        // Get available printers
        const printers = await qz.printers.find();
        console.log('Available printers:', printers);
        
        // Check if our target printer is available
        const hasTargetPrinter = printers.some((p: string) => p.includes('ZDesigner') || p.includes('GX420'));
        if (!hasTargetPrinter) {
          console.warn('⚠️ ZDesigner GX420d printer not found. Available:', printers);
        }
      } catch (error) {
        console.warn('⚠️ QZ Tray connection failed:', error);
        setQzStatus('error');
      }
    };

    checkQZTray();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors/?skip=0&limit=1000', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Vendors API response:', data);
        
        // Handle both array response and object with vendors property
        const vendorList = Array.isArray(data) ? data : (data.vendors || []);
        console.log('Vendor list:', vendorList);
        
        // Map backend fields (id, name) to frontend fields (ven_id, ven_name)
        const mappedVendors: Vendor[] = vendorList.map((v: VendorAPI) => ({
          ven_id: v.id,
          ven_name: v.name,
        }));
        
        console.log('Mapped vendors:', mappedVendors);
        setVendors(mappedVendors);
        
        if (mappedVendors.length === 0) {
          showToast('No vendors found. Please add vendors first.', 'error');
        }
      } else {
        console.error('Failed to fetch vendors:', response.status);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      showToast('Error loading vendors', 'error');
    }
  };

  // Handle barcode scan/enter
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!barcode.trim()) {
      showToast('Please enter a barcode', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/products/searchbybarcode?barcode=${encodeURIComponent(barcode)}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const product = await response.json();
        if (product && product.pro_id) {
          setSelectedProduct(product);
          setCostPrice(product.pro_cost || 0);
          setSellingPrice(product.pro_price || 0);
          setQuantity('');
          showToast(`Product found: ${product.pro_name}`, 'success');

          // Focus vendor select
          setTimeout(() => {
            document.getElementById('vendor-select')?.focus();
          }, 100);
        } else {
          showToast('Product not found. Please add product first.', 'error');
          setSelectedProduct(null);
        }
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Error fetching product', 'error');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      showToast('Error fetching product', 'error');
    }

    setBarcode('');
  };

  // Add item to temporary table
  const handleAddItem = () => {
    if (!selectedProduct) {
      showToast('Please select a product first', 'error');
      return;
    }

    if (!selectedVendor) {
      showToast('Please select a vendor', 'error');
      return;
    }

    if (!quantity || parseInt(quantity) <= 0) {
      showToast('Quantity must be greater than 0', 'error');
      return;
    }

    const vendor = vendors.find(v => v.ven_id === selectedVendor);
    if (!vendor) {
      showToast('Invalid vendor selected', 'error');
      return;
    }

    const qty = parseInt(quantity) || 0;
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

    // Reset form
    setSelectedProduct(null);
    setBarcode('');
    setQuantity('');
    setCostPrice(0);
    setSellingPrice(0);
    setSelectedVendor('');
    
    // Focus barcode input for next scan
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);

    showToast('Item added to list', 'success');
  };

  // Remove item from list
  const handleRemoveItem = (index: number) => {
    const newItems = stockInItems.filter((_, i) => i !== index);
    setStockInItems(newItems);
  };

  // Print barcodes only (without stock-in)
  const handlePrintBarcodesOnly = async () => {
    if (stockInItems.length === 0) {
      showToast('Please add at least one item', 'error');
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      const payload = stockInItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        barcode: item.barcode,
        price: item.selling_price,
      }));

      const response = await fetch('/api/stock/generatebarcodesonly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const apiResult = await response.json();

        // Print barcodes
        if (apiResult.zpl_commands && apiResult.zpl_commands.length > 0) {
          printBarcodes(apiResult.zpl_commands);
        }
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to generate barcodes', 'error');
      }
    } catch (error) {
      console.error('Error generating barcodes:', error);
      showToast('Error generating barcodes', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle stock in
  const handleStockIn = async () => {
    if (stockInItems.length === 0) {
      showToast('Please add at least one item', 'error');
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      const payload = stockInItems.map(item => ({
        product_id: item.product_id,
        vendor_id: item.vendor_id,
        quantity: item.quantity,
        cost_price: item.cost_price,
        date: item.date,
      }));

      const response = await fetch('/api/stock/savestockin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        
        Swal.fire({
          title: 'Success!',
          text: `Stock in completed for ${result.results?.length || 0} products.`,
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        });

        // Reset
        setStockInItems([]);
        router.push('/stock');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to save stock in', 'error');
      }
    } catch (error) {
      console.error('Error saving stock in:', error);
      showToast('Error saving stock in', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle stock in with barcode printing
  const handleStockInWithBarcode = async () => {
    if (stockInItems.length === 0) {
      showToast('Please add at least one item', 'error');
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      const payload = stockInItems.map(item => ({
        product_id: item.product_id,
        vendor_id: item.vendor_id,
        quantity: item.quantity,
        cost_price: item.cost_price,
        selling_price: item.selling_price,
        date: item.date,
      }));

      const response = await fetch('/api/stock/savestockinwithbarcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const apiResult = await response.json();

        // Show success with barcode info
        Swal.fire({
          title: 'Success!',
          html: `
            <p>Stock in completed for ${apiResult.results?.length || 0} products.</p>
            <p>Barcodes generated: ${apiResult.zpl_commands?.length || 0}</p>
          `,
          icon: 'success',
          showCancelButton: true,
          confirmButtonText: 'Print Barcodes',
          cancelButtonText: 'Close',
        }).then((swalResult) => {
          if (swalResult.isConfirmed && apiResult.zpl_commands && apiResult.zpl_commands.length > 0) {
            // Send ZPL commands to printer
            printBarcodes(apiResult.zpl_commands);
          }
        });

        // Reset
        setStockInItems([]);
        router.push('/stock');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to save stock in', 'error');
      }
    } catch (error) {
      console.error('Error saving stock in with barcode:', error);
      showToast('Error saving stock in with barcode', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Print barcodes using QZ Tray
  const printBarcodes = async (zplCommands: any[]) => {
    try {
      // Step 1: Check if QZ Tray is installed
      if (typeof qz === 'undefined') {
        Swal.fire({
          title: 'QZ Tray Not Installed',
          html: `
            <p>QZ Tray is required for barcode printing.</p>
            <p class="mt-2">Please install it from:</p>
            <a href="https://qz.io" target="_blank" class="text-blue-600 underline">https://qz.io</a>
          `,
          icon: 'error',
          confirmButtonText: 'I\'ve Installed It',
          showCancelButton: true,
          cancelButtonText: 'Close',
        });
        return;
      }

      // Step 2: Extract ZPL strings
      const zplData = zplCommands.map((cmd: any) => {
        const zpl = typeof cmd === 'string' ? cmd : cmd.zpl;
        return zpl;
      });

      // Step 3: Connect to QZ Tray
      try {
        if (!qz.websocket.isActive()) {
          await qz.websocket.connect();
        }
      } catch (connectError) {
        Swal.fire({
          title: 'QZ Tray Connection Failed',
          html: `
            <p>Cannot connect to QZ Tray application.</p>
            <p class="mt-2 text-sm text-gray-600">Possible reasons:</p>
            <ul class="text-left text-sm mt-1 space-y-1">
              <li>• QZ Tray is not running (check system tray)</li>
              <li>• Browser blocked the connection</li>
              <li>• Firewall is blocking port 8181</li>
            </ul>
            <p class="mt-3 text-sm">Try: Restart QZ Tray or refresh the page.</p>
          `,
          icon: 'error',
          confirmButtonText: 'Retry',
          showCancelButton: true,
          cancelButtonText: 'Close',
        }).then((result) => {
          if (result.isConfirmed) {
            printBarcodes(zplCommands);
          }
        });
        return;
      }

      // Step 4: Find printer
      let printer;
      try {
        printer = await qz.printers.find('ZDesigner GX420d');

        // If specific printer not found, try to get any available printer
        if (!printer) {
          const allPrinters = await qz.printers.find();

          if (allPrinters.length === 0) {
            throw new Error('No printers found');
          }

          // Show printer selection dialog
          const { value: selectedPrinter } = await Swal.fire({
            title: 'Select Printer',
            html: `
              <p>ZDesigner GX420d not found. Please select a printer:</p>
              <select id="printer-select" class="swal2-input">
                ${allPrinters.map((p: any) => `<option value="${p}">${p}</option>`).join('')}
              </select>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Print',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
              const selectElement = document.getElementById('printer-select') as HTMLSelectElement;
              return selectElement?.value;
            }
          });

          if (selectedPrinter) {
            printer = selectedPrinter;
          } else {
            return; // User cancelled - don't retry
          }
        }
      } catch (printerError) {
        Swal.fire({
          title: 'Printer Error',
          html: `
            <p>Cannot access printers.</p>
            <p class="mt-2 text-sm text-gray-600">Error: ${(printerError as Error).message}</p>
            <p class="mt-2 text-sm">Make sure:</p>
            <ul class="text-left text-sm mt-1 space-y-1">
              <li>• Printer is connected via USB</li>
              <li>• Printer is powered on</li>
              <li>• Printer drivers are installed</li>
            </ul>
          `,
          icon: 'error',
          confirmButtonText: 'OK',
        });
        return; // Don't retry on printer error
      }

      // Step 5: Filter and validate ZPL commands BEFORE printing
      // Remove any empty or invalid ZPL commands to prevent empty labels
      const validZplData = zplData.filter((zpl: string) => {
        if (!zpl || zpl.trim().length === 0) {
          console.warn('⚠️ Skipping empty ZPL command');
          return false;
        }
        if (!zpl.includes('^XA') || !zpl.includes('^XZ')) {
          console.warn('⚠️ Skipping invalid ZPL command (missing ^XA or ^XZ)');
          return false;
        }
        return true;
      });

      console.log('📊 Valid ZPL commands:', validZplData.length, 'out of', zplData.length);

      if (validZplData.length === 0) {
        Swal.fire({
          title: 'No Valid Barcodes',
          html: `<p>All ZPL commands were empty or invalid.</p><p class="mt-2 text-sm text-gray-600">Check browser console for details.</p>`,
          icon: 'warning',
          confirmButtonText: 'OK',
        });
        return;
      }

      // Step 6: Print ZPL commands
      try {
        console.log('🖨️ Starting print job to:', printer);
        console.log('📄 Valid ZPL data count:', validZplData.length);

        // Create print config for raw ZPL printing
        const config = qz.configs.create(printer, {
          forceRaw: true,  // Force raw printing for ZPL
          encoding: 'UTF-8'
        });

        console.log('⚙️ Print config created:', config);

        // Print each ZPL command individually
        for (let i = 0; i < validZplData.length; i++) {
          const zpl = validZplData[i];
          console.log(`📄 Printing barcode ${i + 1}/${validZplData.length}`);
          console.log(`📝 ZPL length: ${zpl.length} chars`);
          console.log(`📝 ZPL preview: ${zpl.substring(0, 50)}...`);

          // QZ Tray print API - pass config and data array
          await qz.print(config, [zpl]);

          console.log(`✓ Barcode ${i + 1} sent to printer`);
          
          // Add small delay between prints to ensure printer processes each label
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        showToast('✓ Barcodes printed successfully!', 'success');
      } catch (printError) {
        const errorMsg = (printError as Error).message;

        // Check for specific error types
        if (errorMsg.includes('offline') || errorMsg.includes('not ready')) {
          Swal.fire({
            title: 'Printer Offline',
            html: `
              <p>The printer appears to be offline.</p>
              <p class="mt-2 text-sm text-gray-600">Check:</p>
              <ul class="text-left text-sm mt-1 space-y-1">
                <li>• Printer power cable</li>
                <li>• USB connection</li>
                <li>• Printer has paper and ribbon</li>
                <li>• Printer cover is closed properly</li>
              </ul>
            `,
            icon: 'warning',
            confirmButtonText: 'Retry',
            showCancelButton: true,
            cancelButtonText: 'Cancel',
          }).then((result) => {
            if (result.isConfirmed) {
              // Pass original zplCommands, not filtered - will be filtered again in retry
              printBarcodes(zplCommands);
            }
          });
          return;
        }

        throw printError;
      }

      // Success!
      showToast('✓ Barcodes printed successfully!', 'success');
      
    } catch (error) {
      console.error('❌ Print failed:', error);
      console.error('Error details:', {
        message: (error as Error).message,
        name: (error as Error).name,
        stack: (error as Error).stack
      });

      // Generic error handler
      Swal.fire({
        title: 'Print Failed',
        html: `
          <p>Could not print barcodes.</p>
          <p class="mt-2 text-sm text-gray-600">Error: ${(error as Error).message}</p>
          <p class="mt-3 text-sm">Please check:</p>
          <ul class="text-left text-sm mt-1 space-y-1">
            <li>• QZ Tray is installed and running (check system tray)</li>
            <li>• Printer "ZDesigner GX420d" is connected and online</li>
            <li>• USB cable is properly connected</li>
            <li>• Printer has paper and ribbon</li>
            <li>• Browser console for detailed logs (press F12)</li>
          </ul>
        `,
        icon: 'error',
        confirmButtonText: 'OK',
      });
    }
  };

  const totalItems = stockInItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalCost = stockInItems.reduce((sum, item) => sum + item.total_cost, 0);

  return (
    <div className="p-6">
      <PageHeader title="Stock In" />

      {/* QZ Tray Status Indicator */}
      <div className="mb-4">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
          qzStatus === 'connected' 
            ? 'bg-green-100 text-green-700' 
            : qzStatus === 'error'
            ? 'bg-red-100 text-red-700'
            : 'bg-gray-100 text-gray-700'
        }`}>
          {qzStatus === 'connected' && (
            <>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>✓ QZ Tray Ready</span>
            </>
          )}
          {qzStatus === 'error' && (
            <>
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              <span>⚠ QZ Tray Not Connected</span>
            </>
          )}
          {qzStatus === 'checking' && (
            <>
              <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></span>
              <span>Checking QZ Tray...</span>
            </>
          )}
        </div>
        {qzStatus === 'error' && (
          <p className="text-xs text-red-600 mt-1">
            Install QZ Tray from <a href="https://qz.io" target="_blank" className="underline">qz.io</a>
          </p>
        )}
      </div>

      {/* Barcode Scanner Input */}
      <div className="regal-card mb-6">
        <h3 className="text-lg font-semibold mb-4">Scan Product Barcode</h3>
        <form onSubmit={handleBarcodeSubmit} className="flex gap-4">
          <input
            ref={barcodeInputRef}
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Scan or enter barcode..."
            className="regal-input flex-grow"
            autoFocus
          />
          <button
            type="submit"
            className="regal-btn bg-regal-yellow text-regal-black"
          >
            Search
          </button>
        </form>
      </div>

      {/* Product Details Form */}
      {selectedProduct && (
        <div className="regal-card mb-6">
          <h3 className="text-lg font-semibold mb-4">Product Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Product</label>
              <input
                type="text"
                value={selectedProduct.pro_name}
                disabled
                className="regal-input w-full bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Current Stock</label>
              <input
                type="text"
                value={selectedProduct.stock}
                disabled
                className="regal-input w-full bg-gray-100"
              />
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
                {vendors.length === 0 && (
                  <option value="" disabled>No vendors available</option>
                )}
                {vendors.map((vendor) => (
                  <option key={vendor.ven_id} value={vendor.ven_id}>
                    {vendor.ven_name}
                  </option>
                ))}
              </select>
              {vendors.length === 0 && (
                <p className="text-xs text-red-600 mt-1">No vendors found. Please add vendors first.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Quantity *</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="regal-input w-full"
                min="1"
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

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAddItem}
              className="regal-btn bg-regal-yellow text-regal-black"
            >
              + Add Item
            </button>
            <button
              onClick={() => {
                setSelectedProduct(null);
                setBarcode('');
                setQuantity('');
                setCostPrice(0);
                setSellingPrice(0);
                setSelectedVendor('');
                barcodeInputRef.current?.focus();
              }}
              className="regal-btn bg-gray-300 text-black"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Temporary Items Table */}
      {stockInItems.length > 0 && (
        <div className="regal-card mb-6">
          <h3 className="text-lg font-semibold mb-4">Items to Stock In ({stockInItems.length})</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr className="text-xs text-gray-900 uppercase tracking-wider font-semibold">
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left">Vendor</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Cost Price</th>
                  <th className="px-4 py-3 text-right">Selling Price</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stockInItems.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 text-sm">
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.product_name}</div>
                      <div className="text-xs text-gray-500">{item.barcode}</div>
                    </td>
                    <td className="px-4 py-3">{item.vendor_name}</td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">Rs. {item.cost_price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">Rs. {item.selling_price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">Rs. {item.total_cost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-semibold">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right">Total:</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right">Rs. {totalCost.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handlePrintBarcodesOnly}
              disabled={submitting || stockInItems.length === 0}
              className="regal-btn bg-orange text-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Processing...' : 'Print Barcodes'}
            </button>
            <button
              onClick={handleStockInWithBarcode}
              disabled={submitting || stockInItems.length === 0}
              className="regal-btn bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Processing...' : 'Stock In + Print Barcodes'}
            </button>
            <button
              onClick={() => setStockInItems([])}
              className="regal-btn bg-gray-300 text-black"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockInPage;
