'use client';

import React, { useState, useEffect } from 'react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  reportUrl?: string;  // Optional - for fetching PDF from API
  pdfData?: string;    // Optional - for direct PDF data
}

const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  title,
  reportUrl,
  pdfData
}) => {
  const [reportData, setReportData] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('ReportModal useEffect triggered');
    console.log('isOpen:', isOpen);
    console.log('reportUrl:', reportUrl);
    console.log('pdfData:', pdfData);
    
    if (isOpen) {
      // If pdfData is provided directly, use it immediately
      if (pdfData) {
        console.log('Using pdfData directly');
        setReportData(pdfData);
        setLoading(false);
      } else if (reportUrl) {
        console.log('Fetching from reportUrl:', reportUrl);
        fetchReport();
      } else {
        // No data source, clear reportData
        console.log('No data source');
        setReportData('');
      }
    } else {
      // Modal closed, clear data
      console.log('Modal closed, clearing data');
      setReportData('');
      setLoading(false);
    }
  }, [isOpen, pdfData, reportUrl]);

  const fetchReport = async () => {
    console.log('fetchReport called with URL:', reportUrl);
    try {
      setLoading(true);
      const response = await fetch(reportUrl!, {
        method: 'POST',
        credentials: 'include',
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers.get('content-type'));

      const text = await response.text();
      console.log('Response text length:', text.length);
      console.log('Response text first 100 chars:', text.substring(0, 100));

      if (response.ok) {
        let data;
        try {
          data = JSON.parse(text);
          console.log('Parsed JSON data:', data);
          console.log('Data type:', typeof data);
          console.log('Is data a string?', typeof data === 'string');
          
          // Backend returns raw string (base64), not JSON object
          if (typeof data === 'string') {
            setReportData(data);
            console.log('Setting reportData as string, length:', data.length);
          } else {
            setReportData(data.pdf || data);
            console.log('Setting reportData from object');
          }
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          // If response is already a string (not JSON), use it directly
          setReportData(text);
          console.log('Setting reportData as raw text');
        }
      } else {
        console.error('Failed to fetch report, status:', response.status);
        console.error('Error text:', text);
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
