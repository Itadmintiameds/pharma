import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import api from '@/utils/api';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';

export interface ProductDetailsRef {
  getFormData: () => any;
}

const CosmeticProductDetails = forwardRef<ProductDetailsRef>((props, ref) => {
  const [formData, setFormData] = useState({
    productName: "",
    brandName: "",
    productType: "",
    productSubType: "",
    productForm: "",
    variant: "",
    intendedUseArea: "",
    skinType: "",
    hairType: "",
    ageGroup: "",
    gender: "",
    fragrance: "",
    netQuantity: "",
    netQuantityUnit: "",
    manufacturerName: "",
    gst: "",
    hsnCode: ""
  });

  const [ageGroupOptions, setAgeGroupOptions] = useState<{label: string, value: string}[]>([]);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const ageRes = await api.get('master/age-groups');
        setAgeGroupOptions(ageRes.data.map((item: any) => ({ label: item.ageGroupName, value: String(item.ageGroupId) })));
      } catch (error) {
        console.error("Error fetching master data:", error);
      }
    };
    fetchMasterData();
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useImperativeHandle(ref, () => ({
    getFormData: () => formData
  }));

  return (
    <>
      <Input label="Product Name" required placeholder="Enter Product Name" value={formData.productName} onChange={(e) => handleChange('productName', e.target.value)} />
      <Input label="Brand Name" required placeholder="Enter Brand Name" value={formData.brandName} onChange={(e) => handleChange('brandName', e.target.value)} />
      
      <Dropdown
        label="Product Type"
        required
        placeholder="Select Product Type"
        options={[{label: 'Type 1', value: 'Type 1'}, {label: 'Type 2', value: 'Type 2'}]}
        value={formData.productType}
        onChange={(val) => handleChange('productType', val)}
      />
      
      <Input label="Product Sub Type" required placeholder="Enter Product Sub Type" value={formData.productSubType} onChange={(e) => handleChange('productSubType', e.target.value)} />
      <Input label="Product Form" required placeholder="Eg., Cream, Lotion" value={formData.productForm} onChange={(e) => handleChange('productForm', e.target.value)} />
      <Input label="Variant" placeholder="Enter Variant" value={formData.variant} onChange={(e) => handleChange('variant', e.target.value)} />
      <Input label="Intended Use Area" required placeholder="Enter Intended Use Area" value={formData.intendedUseArea} onChange={(e) => handleChange('intendedUseArea', e.target.value)} />
      <Input label="Skin Type" placeholder="Enter Skin Type" value={formData.skinType} onChange={(e) => handleChange('skinType', e.target.value)} />
      <Input label="Hair Type" required placeholder="Enter Hair Type" value={formData.hairType} onChange={(e) => handleChange('hairType', e.target.value)} />
      
      <Dropdown
        label="Age Group"
        required
        placeholder="Select Age Group"
        options={ageGroupOptions}
        value={formData.ageGroup}
        onChange={(val) => handleChange('ageGroup', val)}
      />
      
      <Dropdown
        label="Gender"
        required
        placeholder="Select Gender"
        options={[
          { label: 'Male', value: 'Male' },
          { label: 'Female', value: 'Female' },
          { label: 'Unisex', value: 'Unisex' }
        ]}
        value={formData.gender}
        onChange={(val) => handleChange('gender', val)}
      />
      
      <Input label="Fragrance" placeholder="Enter Fragrance" value={formData.fragrance} onChange={(e) => handleChange('fragrance', e.target.value)} />
      
      <div className="flex flex-col gap-1 w-full">
        <label className="text-label-l4 font-medium text-pneutral-900">Net Quantity<span className="ml-2 text-warning-500 font-semibold">*</span></label>
        <div className="flex w-full">
          <div className="flex-1">
            <input 
              type="text" 
              placeholder="e.g. 100" 
              value={formData.netQuantity}
              onChange={(e) => handleChange('netQuantity', e.target.value)}
              className="w-full h-12 rounded-l-md border border-r-0 border-pneutral-300 px-3 outline-none text-p4 text-pneutral-900 focus:border-pneutral-500" 
            />
          </div>
          <div className="w-[140px] shrink-0 border border-pneutral-300 rounded-r-md bg-gray-50 flex items-center px-3 cursor-pointer">
            <span className="text-p4 text-pneutral-500 flex-1 truncate">{formData.netQuantityUnit || "Select Unit"}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-pneutral-500 shrink-0">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
      </div>

      <Input label="Manufacturer Name" required placeholder="Enter Manufacturer Name" value={formData.manufacturerName} onChange={(e) => handleChange('manufacturerName', e.target.value)} />

      <Dropdown
        label="GST"
        required
        placeholder="Select GST"
        options={[
          { label: '5%', value: '5' },
          { label: '12%', value: '12' },
          { label: '18%', value: '18' },
          { label: '28%', value: '28' }
        ]}
        value={formData.gst}
        onChange={(val) => handleChange('gst', val)}
        menuPlacement="top"
      />
      
      <Input label="Hsn code" required placeholder="Enter HSN Code" value={formData.hsnCode} onChange={(e) => handleChange('hsnCode', e.target.value)} />
    </>
  );
});

CosmeticProductDetails.displayName = 'CosmeticProductDetails';
export default CosmeticProductDetails;
