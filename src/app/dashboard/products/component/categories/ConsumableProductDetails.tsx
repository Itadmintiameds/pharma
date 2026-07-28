import React, { useState, forwardRef, useImperativeHandle } from 'react';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';

export interface ProductDetailsRef {
  getFormData: () => any;
}

const ConsumableProductDetails = forwardRef<ProductDetailsRef>((props, ref) => {
  const [formData, setFormData] = useState({
    productName: "",
    brandName: "",
    deviceCategory: "",
    deviceSubCategory: "",
    materialType: "",
    sizeDimensionGauge: "",
    sterile: "",
    disposable: "",
    intendedUse: "",
    manufacturerName: "",
    manufacturerLicenseNumber: "",
    isIsoCertified: "",
    gst: "",
    hsnCode: ""
  });

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
        label="Device Category"
        required
        placeholder="Select Category"
        options={[{label: 'Category 1', value: 'Category 1'}, {label: 'Category 2', value: 'Category 2'}]}
        value={formData.deviceCategory}
        onChange={(val) => handleChange('deviceCategory', val)}
      />
      
      <Dropdown
        label="Device Sub - Category"
        required
        placeholder="Select Sub Category"
        options={[{label: 'Sub Category 1', value: 'Sub Category 1'}, {label: 'Sub Category 2', value: 'Sub Category 2'}]}
        value={formData.deviceSubCategory}
        onChange={(val) => handleChange('deviceSubCategory', val)}
      />
      
      <Input label="Material Type" placeholder="Enter Material Type" value={formData.materialType} onChange={(e) => handleChange('materialType', e.target.value)} />
      <Input label="Size / Dimension / Gauge" required placeholder="Enter Size/Dimension/Gauge" value={formData.sizeDimensionGauge} onChange={(e) => handleChange('sizeDimensionGauge', e.target.value)} />
      
      <Dropdown
        label="Sterile / Non Sterile"
        required
        placeholder="Select"
        options={[
          { label: 'Sterile', value: 'Sterile' },
          { label: 'Non Sterile', value: 'Non Sterile' }
        ]}
        value={formData.sterile}
        onChange={(val) => handleChange('sterile', val)}
      />

      <Dropdown
        label="Disposable / Non Disposable"
        required
        placeholder="Select"
        options={[
          { label: 'Disposable', value: 'Disposable' },
          { label: 'Non Disposable', value: 'Non Disposable' }
        ]}
        value={formData.disposable}
        onChange={(val) => handleChange('disposable', val)}
      />
      
      <Input label="Intended Use / Purpose" required placeholder="Enter Intended Use" value={formData.intendedUse} onChange={(e) => handleChange('intendedUse', e.target.value)} />
      <Input label="Manufacturer Name" required placeholder="Enter Manufacturer Name" value={formData.manufacturerName} onChange={(e) => handleChange('manufacturerName', e.target.value)} />
      <Input label="Manufacturer Licence Number" required placeholder="Enter Licence Number" value={formData.manufacturerLicenseNumber} onChange={(e) => handleChange('manufacturerLicenseNumber', e.target.value)} />

      <Dropdown
        label="Is ISO Certified?"
        placeholder="Select"
        options={[
          { label: 'Yes', value: 'Yes' },
          { label: 'No', value: 'No' }
        ]}
        value={formData.isIsoCertified}
        onChange={(val) => handleChange('isIsoCertified', val)}
      />

      <Dropdown
        label="GST%"
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
      
      <Input label="HSN" required placeholder="Enter HSN Code" value={formData.hsnCode} onChange={(e) => handleChange('hsnCode', e.target.value)} />
    </>
  );
});

ConsumableProductDetails.displayName = 'ConsumableProductDetails';
export default ConsumableProductDetails;
