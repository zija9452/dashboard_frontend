'use client';

import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { useToast } from '@/components/ui/Toast';
import { useBranch } from '@/lib/branch';

interface Salesman {
  sal_id: string;
  sal_name: string;
}

interface NewCustomer {
  cus_name: string;
  cus_phone: string;
  cus_cnic: string;
  cus_address: string;
  cus_sal_id_fk: string;
  branch: string;
}

const EMPTY_CUSTOMER: NewCustomer = { cus_name: '', cus_phone: '', cus_cnic: '', cus_address: '', cus_sal_id_fk: '', branch: '' };

const REQUIRED_FIELDS: { key: keyof NewCustomer; label: string }[] = [
  { key: 'cus_name', label: 'Customer Name' },
  { key: 'cus_phone', label: 'Phone' },
  { key: 'cus_cnic', label: 'CNIC' },
  { key: 'cus_address', label: 'Address' },
  { key: 'cus_sal_id_fk', label: 'Salesman' },
];

// "+" next to the Customer dropdown (Customer Invoice, Quotation): adds a customer to
// the logged-in branch and hands its id back so the page can select it.
const AddCustomerModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onAdded: (customerId: string) => void | Promise<void>;
}> = ({ open, onClose, onAdded }) => {
  const { showToast } = useToast();
  const currentBranch = useBranch();
  const [salesmans, setSalesmans] = useState<Salesman[]>([]);
  const [customer, setCustomer] = useState<NewCustomer>(EMPTY_CUSTOMER);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!open || salesmans.length > 0) return;
    const fetchSalesmans = async () => {
      try {
        const response = await fetch('/api/admin/getcustomervendorbybranch', { method: 'GET', credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setSalesmans(data.salesmans || []);
        }
      } catch (error) {
        console.error('Error fetching salesmans:', error);
      }
    };
    fetchSalesmans();
  }, [open, salesmans.length]);

  if (!open) return null;

  const close = () => {
    setCustomer(EMPTY_CUSTOMER);
    onClose();
  };

  const handleAdd = async () => {
    if (adding) return;
    const missing = REQUIRED_FIELDS.filter(f => !customer[f.key].trim());
    if (missing.length > 0) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setAdding(true);
    try {
      const response = await fetch('/api/customerinvoice/Customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          cus_name: customer.cus_name,
          cus_phone: customer.cus_phone,
          cus_cnic: customer.cus_cnic,
          cus_address: customer.cus_address,
          branch: customer.branch || currentBranch?.name || '',
          cus_sal_id_fk: customer.cus_sal_id_fk,
        }),
      });

      if (response.ok) {
        const added = await response.json();
        await onAdded(added.cus_id || added.id);
        close();
        Swal.fire({
          title: 'Success!',
          text: 'Customer added successfully!',
          icon: 'success',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
      } else {
        const errorData = await response.json();
        console.error('Add customer error:', errorData.error);
        showToast(errorData.error || errorData.detail || 'Failed to add customer', 'error');
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      showToast('Failed to add customer', 'error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="regal-card bg-white p-3 md:p-6 rounded-lg max-w-md w-full">
        <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Add New Customer</h3>

        {/* Submit only through the form (Enter or the button) - one request per click */}
        <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }} className="space-y-3">
          <div>
            <label htmlFor="new-customer-name" className="block text-sm font-medium mb-1">Customer Name *</label>
            <input
              id="new-customer-name"
              type="text"
              value={customer.cus_name}
              onChange={(e) => setCustomer({ ...customer, cus_name: e.target.value })}
              className="regal-input w-full"
              placeholder="Enter customer name"
              required
            />
          </div>

          <div>
            <label htmlFor="new-customer-phone" className="block text-sm font-medium mb-1">Phone</label>
            <input
              id="new-customer-phone"
              type="text"
              value={customer.cus_phone}
              onChange={(e) => setCustomer({ ...customer, cus_phone: e.target.value })}
              className="regal-input w-full"
              placeholder="Enter phone number"
              required
            />
          </div>

          <div>
            <label htmlFor="new-customer-cnic" className="block text-sm font-medium mb-1">CNIC</label>
            <input
              id="new-customer-cnic"
              type="text"
              value={customer.cus_cnic}
              onChange={(e) => setCustomer({ ...customer, cus_cnic: e.target.value })}
              className="regal-input w-full"
              placeholder="Enter CNIC"
              required
            />
          </div>

          <div>
            <label htmlFor="new-customer-address" className="block text-sm font-medium mb-1">Address</label>
            <textarea
              id="new-customer-address"
              value={customer.cus_address}
              onChange={(e) => setCustomer({ ...customer, cus_address: e.target.value })}
              className="regal-input w-full"
              placeholder="Enter address"
              rows={3}
              required
            />
          </div>

          <div>
            <label htmlFor="new-customer-salesman" className="block text-sm font-medium mb-1">Salesman</label>
            <select
              id="new-customer-salesman"
              value={customer.cus_sal_id_fk}
              onChange={(e) => setCustomer({ ...customer, cus_sal_id_fk: e.target.value })}
              className="regal-input w-full"
            >
              <option value="">Select Salesman</option>
              {salesmans.map(salesman => (
                <option key={salesman.sal_id} value={salesman.sal_id}>{salesman.sal_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="new-customer-branch" className="block text-sm font-medium mb-1">Branch</label>
            <select
              id="new-customer-branch"
              value={customer.branch || currentBranch?.name || ''}
              onChange={(e) => setCustomer({ ...customer, branch: e.target.value })}
              className="regal-input w-full"
            >
              {currentBranch && <option value={currentBranch.name}>{currentBranch.name}</option>}
            </select>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              type="submit"
              disabled={adding}
              className={`regal-btn bg-regal-yellow text-regal-black flex-1 ${adding ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {adding ? 'Adding...' : 'Add Customer'}
            </button>
            <button type="button" onClick={close} disabled={adding} className="regal-btn bg-gray-300 text-black flex-1">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCustomerModal;
