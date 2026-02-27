'use client';

import React from 'react';

interface PaymentHistoryPDFProps {
  invoiceNo: string;
  customerName: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: string;
  payments: Array<{
    date: string;
    amount: number;
    payment_method: string;
    description: string;
  }>;
}

const PaymentHistoryPDF: React.FC<PaymentHistoryPDFProps> = ({
  invoiceNo,
  customerName,
  totalAmount,
  amountPaid,
  balanceDue,
  paymentStatus,
  payments
}) => {
  return (
    <div className="p-8 font-sans" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
        <h1 className="text-2xl font-bold mb-2">PAYMENT HISTORY REPORT</h1>
        <p className="text-sm text-gray-600">Customer Invoice Payment Details</p>
      </div>

      {/* Invoice Details */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Invoice No:</p>
            <p className="font-bold text-lg">{invoiceNo}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Customer:</p>
            <p className="font-bold text-lg">{customerName || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Payment Status:</p>
            <p className="font-bold capitalize">{paymentStatus}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Report Date:</p>
            <p className="font-bold">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Financial Summary</h2>
        <table className="w-full border-collapse border border-gray-300">
          <tbody>
            <tr className="bg-gray-50">
              <td className="border border-gray-300 px-4 py-2 font-semibold">Total Amount</td>
              <td className="border border-gray-300 px-4 py-2 text-right">Rs. {totalAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2 font-semibold">Total Paid</td>
              <td className="border border-gray-300 px-4 py-2 text-right text-green-700">Rs. {amountPaid.toFixed(2)}</td>
            </tr>
            <tr className="bg-red-50">
              <td className="border border-gray-300 px-4 py-2 font-semibold">Balance Due</td>
              <td className="border border-gray-300 px-4 py-2 text-right text-red-700 font-bold">Rs. {balanceDue.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment History Table */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Payment Records</h2>
        {payments.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No payment history available</p>
        ) : (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 px-4 py-2 text-left">#</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Date</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Amount</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Method</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 px-4 py-2">{index + 1}</td>
                  <td className="border border-gray-300 px-4 py-2">{new Date(payment.date).toLocaleDateString()}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right text-green-700 font-medium">
                    Rs. {payment.amount.toFixed(2)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 capitalize">{payment.payment_method}</td>
                  <td className="border border-gray-300 px-4 py-2">{payment.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-600">
        <p>This is a computer-generated report. No signature required.</p>
        <p className="mt-1">Generated on {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
};

export default PaymentHistoryPDF;
