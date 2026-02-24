'use client';

import React, { useState, useEffect } from 'react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  reportUrl: string;
}

const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  title,
  reportUrl
}) => {
  const [reportData, setReportData] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchReport();
    }
  }, [isOpen]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await fetch(reportUrl, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setReportData(data.pdf || data);
      } else {
        console.error('Failed to fetch report');
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto"
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
        
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-regal-yellow mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading report...</p>
          </div>
        ) : reportData ? (
          <div>
            <iframe
              src={`data:application/pdf;base64,${reportData}`}
              className="w-full h-[70vh] border rounded"
              title={title}
            />
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No report available
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportModal;
