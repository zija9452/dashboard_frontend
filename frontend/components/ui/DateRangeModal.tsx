'use client';

import React, { useState } from 'react';

interface DateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dateFrom: string, dateTo: string) => void;
  title: string;
}

const DateRangeModal: React.FC<DateRangeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title
}) => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dateFrom || !dateTo) {
      alert('Please select both dates');
      return;
    }

    if (new Date(dateFrom) > new Date(dateTo)) {
      alert('From date must be before To date');
      return;
    }

    setLoading(true);
    await onSubmit(dateFrom, dateTo);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">From Date *</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="regal-input w-full"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">To Date *</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="regal-input w-full"
              required
            />
          </div>

          <div className="flex gap-2 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="regal-btn bg-regal-yellow text-regal-black flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="regal-btn bg-gray-300 text-black flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DateRangeModal;
