import React from 'react';

const DUMMY_PRODUCTS = [
  {
    id: 1,
    brandName: 'Micro Labs',
    qty: 12,
    free: 5,
    variant: '10x15',
    productName: 'Dolo 650',
    hsn: '3152',
    batch: '323332',
    expiry: '01/28',
    mrp: 25.01,
    value: 5465.55,
    dis: 25,
    gst: 12.00,
    amount: 56662.25
  }
];

const OnboardedProductsTable = () => {
  if (DUMMY_PRODUCTS.length === 0) return null;

  return (
    <div className="w-full rounded-[12px] border border-pneutral-200 overflow-hidden bg-white">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#9851f5] text-white">
            {[
              '#', 'Brand Name', 'QTY', 'Free', 'Variant', 'Product Name', 
              'HSN', 'Batch', 'Expiry', 'MRP', 'VALUE', 'DIS%', 'GST%', 'Amount (₹)'
            ].map((col, idx) => (
              <th 
                key={idx} 
                className="h-[72px] px-[8px] py-[16px] border-b border-r border-[#E1E1E1]/20 text-left text-[14px] font-medium last:border-r-0"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DUMMY_PRODUCTS.map((prod, idx) => (
            <tr key={prod.id} className="text-pneutral-900">
              <td className="h-[68px] px-[8px] py-[16px] border-b border-r border-[#E1E1E1] text-[14px] font-medium">{prod.id}</td>
              <td className="h-[68px] px-[8px] py-[16px] border-b border-r border-[#E1E1E1] text-[14px]">{prod.brandName}</td>
              <td className="h-[68px] px-[8px] py-[16px] border-b border-r border-[#E1E1E1] text-[14px]">{prod.qty}</td>
              <td className="h-[68px] px-[8px] py-[16px] border-b border-r border-[#E1E1E1] text-[14px]">{prod.free}</td>
              <td className="h-[68px] px-[8px] py-[16px] border-b border-r border-[#E1E1E1] text-[14px]">{prod.variant}</td>
              <td className="h-[68px] px-[8px] py-[16px] border-b border-r border-[#E1E1E1] text-[14px] font-semibold">{prod.productName}</td>
              <td className="h-[68px] px-[8px] py-[16px] border-b border-r border-[#E1E1E1] text-[14px]">{prod.hsn}</td>
              <td className="h-[68px] px-[8px] py-[16px] border-b border-r border-[#E1E1E1] text-[14px]">{prod.batch}</td>
              <td className="h-[68px] px-[8px] py-[16px] border-b border-r border-[#E1E1E1] text-[14px]">{prod.expiry}</td>
              <td className="h-[68px] px-[8px] py-[16px] border-b border-r border-[#E1E1E1] text-[14px]">{prod.mrp}</td>
              <td className="h-[68px] px-[8px] py-[16px] border-b border-r border-[#E1E1E1] text-[14px]">{prod.value}</td>
              <td className="h-[68px] px-[8px] py-[16px] border-b border-r border-[#E1E1E1] text-[14px]">{prod.dis}</td>
              <td className="h-[68px] px-[8px] py-[16px] border-b border-r border-[#E1E1E1] text-[14px]">{prod.gst.toFixed(2)}</td>
              <td className="h-[68px] px-[8px] py-[16px] border-b border-r border-[#E1E1E1] text-[14px]">{prod.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OnboardedProductsTable;
