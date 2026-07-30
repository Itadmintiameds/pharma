"use client";

import React, { useMemo, useState } from "react";
import DataTable from "@/app/components/common/table/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import ConfirmationPopup from "@/app/components/common/ConfirmationPopup";

interface InvoiceSummaryProps {
  onCancel?: () => void;
  onSubmit?: () => void;
  mode?: 'create' | 'view' | 'download';
  data?: any; // To receive data from API easily later
}

const dummyData = [
  { id: 1, brand: 'Micro Labs', qty: 12, free: 5, variant: '10x15', name: 'Dolo 650', hsn: '3152', batch: '323332', expiry: '01/28', mrp: 25.01, value: 5465.55, dis: 25, gst: 12.00, amount: 56662.25 },
  { id: 2, brand: 'Cipla Ltd.', qty: 10, free: 8, variant: '10x15', name: 'Paracetamol', hsn: '3131', batch: '464664', expiry: '01/28', mrp: 25.21, value: 232.555, dis: 30, gst: 12.00, amount: 64646.25 },
  { id: 3, brand: 'Reddy Labs', qty: 18, free: 20, variant: '10x15', name: 'Crocin Advance', hsn: '1333', batch: '666653', expiry: '01/28', mrp: 135.25, value: 46464.23, dis: 66, gst: 12.00, amount: 56646.225 }
];

const InvoiceSummary: React.FC<InvoiceSummaryProps> = ({ onCancel, onSubmit, mode = 'create', data }) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const columns = useMemo<ColumnDef<any, any>[]>(() => [
    { accessorKey: 'id', header: '#' },
    { accessorKey: 'brand', header: 'Brand Name' },
    { accessorKey: 'qty', header: 'QTY' },
    { accessorKey: 'free', header: 'Free' },
    { accessorKey: 'variant', header: 'Variant' },
    { accessorKey: 'name', header: 'Product Name', cell: (info) => <span className="font-bold text-pneutral-900">{info.getValue()}</span> },
    { accessorKey: 'hsn', header: 'HSN' },
    { accessorKey: 'batch', header: 'Batch' },
    { accessorKey: 'expiry', header: 'Expiry' },
    { accessorKey: 'mrp', header: 'MRP', cell: (info) => info.getValue().toFixed(2) },
    { accessorKey: 'value', header: 'VALUE', cell: (info) => info.getValue().toFixed(2) },
    { accessorKey: 'dis', header: 'DIS%' },
    { accessorKey: 'gst', header: 'GST%' },
    { accessorKey: 'amount', header: 'Amount (₹)', cell: (info) => info.getValue().toFixed(2) },
  ], []);

  return (
    <div className="flex flex-col gap-6 w-full h-full bg-transparent">
      {/* Title Header */}
      <div className="w-full h-[70px] p-4 flex items-center bg-secondary-600 border-t border-secondary-50 rounded-xl shadow-sm">
        <h1 className="text-white font-semibold text-[24px] leading-[32px]">Invoice Summary</h1>
      </div>

      {/* Supplier Info Wrapper */}
      <div className="w-full h-[166px] p-4 bg-white border border-pneutral-200 rounded-xl">
        {/* Inner Box */}
        <div className="w-full h-full px-4 py-3 bg-secondary-50 border border-pneutral-200 rounded-lg flex items-start">
          <div className="flex-1 flex flex-col gap-3 text-[14px]">
            <div className="flex items-center"><span className="w-[120px] text-pneutral-600">Supplier</span><span className="w-4">:</span><span className="font-medium text-pneutral-900">ABC Pharma Distributor</span></div>
            <div className="flex items-center"><span className="w-[120px] text-pneutral-600">Invoice No</span><span className="w-4">:</span><span className="font-medium text-pneutral-900">MLPh/2026-27/00847</span></div>
            <div className="flex items-center"><span className="w-[120px] text-pneutral-600">Invoice Date</span><span className="w-4">:</span><span className="font-medium text-pneutral-900">22 Jul 2026</span></div>
            <div className="flex items-center"><span className="w-[120px] text-pneutral-600">GRN</span><span className="w-4">:</span><span className="font-medium text-pneutral-900">GRN240087</span></div>
          </div>
          <div className="flex-1 flex flex-col gap-3 text-[14px]">
            <div className="flex items-center"><span className="w-[120px] text-pneutral-600">Payment Type</span><span className="w-4">:</span><span className="font-medium text-pneutral-900">Credit</span></div>
            <div className="flex items-center"><span className="w-[120px] text-pneutral-600">Credit Days</span><span className="w-4">:</span><span className="font-medium text-pneutral-900">30 Days</span></div>
            <div className="flex items-center"><span className="w-[120px] text-pneutral-600">Due Date</span><span className="w-4">:</span><span className="font-medium text-pneutral-900">21 Aug 2026</span></div>
          </div>
        </div>
      </div>

      {/* Bill To Info Wrapper */}
      <div className="w-full h-[188px] p-4 bg-white border border-pneutral-200 rounded-xl">
        {/* Inner Box */}
        <div className="w-full h-full p-4 bg-secondary-50 border border-pneutral-200 rounded-lg flex flex-col gap-3 text-[14px]">
          <div className="font-bold text-pneutral-900">Bill To</div>
          <div className="font-bold text-pneutral-900 mt-1">Sai Medical & General Store</div>
          <div className="text-pneutral-700 mt-1">Shop No. 7, Shivaji Nagar, Thane West - 400601</div>
          <div className="flex gap-8 text-pneutral-700 mt-2">
            <div>GSTIN: 27BCDSA5678G2H3</div>
            <div>Drug License No: MH-THN-789012</div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={dummyData} />

      {/* Bottom Section */}
      <div className={`flex gap-4 w-full items-start ${mode === 'create' ? 'bg-white border border-pneutral-200 rounded-xl p-4' : ''}`}>
        
        {/* Left Side: Tax and Bank Details */}
        <div className="flex-[2.5] p-4 flex flex-col justify-between gap-[16px] bg-secondary-50 border border-pneutral-200 rounded-xl">
          
          {/* Tax Breakdown */}
          <div className="w-full bg-white border border-pneutral-200 rounded-lg p-3 flex gap-4 text-[13px] items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-pneutral-600">Taxable</span>
              <span className="font-semibold text-pneutral-900">₹ 54,330.40</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-pneutral-600">CGST (%)</span>
              <span className="font-semibold text-pneutral-900">6.00</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-pneutral-600">CGST Amt</span>
              <span className="font-semibold text-pneutral-900">₹ 3,113.72</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-pneutral-600">SGST (%)</span>
              <span className="font-semibold text-pneutral-900">6.00</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-pneutral-600">SGST Amt</span>
              <span className="font-semibold text-pneutral-900">₹ 3544.00</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-pneutral-600">Exempted</span>
              <span className="font-semibold text-pneutral-900"></span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-pneutral-600">Free GST</span>
              <span className="font-semibold text-pneutral-900">₹ 0.00</span>
            </div>
          </div>

          {/* Bank Details */}
          <div className="w-full bg-white border border-pneutral-200 rounded-lg p-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] items-center">
            <div className="flex items-center"><span className="w-24 text-pneutral-600">Bank Name</span><span className="w-2">:</span><span className="font-medium text-pneutral-900"></span></div>
            <div className="flex items-center"><span className="w-24 text-pneutral-600">Branch</span><span className="w-2">:</span><span className="font-medium text-pneutral-900"></span></div>
            <div className="flex items-center"><span className="w-24 text-pneutral-600">A/C No</span><span className="w-2">:</span><span className="font-medium text-pneutral-900"></span></div>
            <div className="flex items-center"><span className="w-24 text-pneutral-600">IFSC</span><span className="w-2">:</span><span className="font-medium text-pneutral-900"></span></div>
          </div>
          
        </div>

        {/* Middle: Items/Qty Summary */}
        <div className="flex-1 p-4 flex flex-col gap-[16px] bg-secondary-50 border border-pneutral-200 rounded-xl text-[14px]">
          <div className="w-full h-[40px] bg-white border border-pneutral-200 rounded-lg px-4 flex justify-between items-center">
            <span className="text-pneutral-600">Items</span><span className="w-2">:</span>
            <span className="font-bold text-pneutral-900 text-right flex-1">26</span>
          </div>
          <div className="w-full h-[40px] bg-white border border-pneutral-200 rounded-lg px-4 flex justify-between items-center">
            <span className="text-pneutral-600">QTY</span><span className="w-2">:</span>
            <span className="font-bold text-pneutral-900 text-right flex-1">9469</span>
          </div>
          <div className="w-full h-[40px] bg-white border border-pneutral-200 rounded-lg px-4 flex justify-between items-center text-[13px]">
            <span className="text-pneutral-600 leading-tight">CR/DB<br/>Round</span><span className="w-2 ml-1">:</span>
            <span className="font-bold text-pneutral-900 text-right flex-1">₹ 0.84</span>
          </div>
        </div>

        {/* Right Side: Totals Block */}
        <div className="flex-[1.5] p-5 flex flex-col justify-between bg-secondary-50 border border-pneutral-200 rounded-xl text-[14px]">
          <div className="flex justify-between items-center">
            <span className="text-pneutral-600 text-[14px]">Gross AMT</span>
            <span className="font-semibold text-[14px] text-pneutral-900">₹ 54,330.40</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-pneutral-600 text-[14px]">DIS.AMT</span>
            {mode === 'create' ? (
              <input type="text" className="w-20 h-7 border border-pneutral-200 rounded bg-secondary-50 text-right px-2 text-pneutral-500 text-[12px]" placeholder="0.00" />
            ) : (
              <span className="font-medium text-[14px] text-pneutral-900">0.00</span>
            )}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-pneutral-600 text-[14px]">Taxable Amt</span>
            <span className="font-semibold text-[14px] text-pneutral-900">₹ 3,113.72</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-pneutral-600 text-[14px]">SGST AMT</span>
            <span className="font-semibold text-[14px] text-pneutral-900">₹3,115.78</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-pneutral-600 text-[14px]">CGST AMT</span>
            <span className="font-semibold text-[14px] text-pneutral-900">₹3,115.78</span>
          </div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-pneutral-600 text-[14px]">IGST AMT</span>
            <span className="font-semibold text-[14px] text-pneutral-900">₹3,115.78</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-pneutral-200">
            <span className="font-semibold text-[18px] text-pneutral-900 leading-[24px]">NET PAYABLE</span>
            <span className="font-semibold text-[18px] text-pneutral-900 leading-[24px]">₹ 60,557.00</span>
          </div>
        </div>

      </div>

      {/* Amount in words */}
      <div className="w-full bg-white border border-pneutral-200 rounded-xl p-4 flex items-center text-[14px]">
        <span className="text-pneutral-600 mr-2">Amount in words</span><span className="mr-2">:</span>
        <span className="font-bold text-pneutral-900">Rupees Sixty Thousand Five Hundred Fifty Seven Only</span>
      </div>

      {/* Bottom Actions based on mode */}
      {mode !== 'download' && (
        <div className="flex justify-between items-center w-full mt-4 pb-8">
          <button 
            onClick={onCancel} 
            className="w-[120px] h-[44px] border border-pneutral-200 bg-white rounded-lg text-[16px] font-medium text-pneutral-900 hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          
          {mode === 'create' && (
            <button 
              onClick={() => setShowConfirmation(true)} 
              className="w-[180px] h-[44px] bg-secondary-700 hover:bg-secondary-800 text-white rounded-lg text-[16px] font-medium transition-colors shadow-sm"
            >
              Save TAX Invoice
            </button>
          )}
        </div>
      )}

      {/* Confirmation Popup */}
      <ConfirmationPopup 
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onViewTaxInvoice={() => {
          setShowConfirmation(false);
          if (onSubmit) onSubmit(); // Could trigger moving to view mode or calling parent logic
        }}
        onGoToPurchase={() => {
          setShowConfirmation(false);
          // Assuming we navigate back or call cancel to go back to list
          if (onCancel) onCancel();
        }}
      />
    </div>
  );
};

export default InvoiceSummary;