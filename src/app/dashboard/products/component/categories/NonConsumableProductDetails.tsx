import React, { useState, forwardRef, useImperativeHandle } from 'react';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';

export interface ProductDetailsRef {
  getFormData: () => any;
}

const NonConsumableProductDetails = forwardRef<ProductDetailsRef>((props, ref) => {
  const [formData, setFormData] = useState({
    productName: "",
    brandName: "",
    deviceCategory: "",
    deviceSubCategory: "",
    modelName: "",
    deviceClassification: "",
    intendedUse: "",
    technicalDimension: "",
    materialBuildType: "",
    powerSource: "",
    warranty: "",
    amcServiceAvailability: "",
    manufacturerName: "",
    countryOfOrigin: "",
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
      <Input label="Brand name" required placeholder="Enter Brand Name" value={formData.brandName} onChange={(e) => handleChange('brandName', e.target.value)} />
      
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
      
      <Input label="Model Name" placeholder="Enter Model Name" value={formData.modelName} onChange={(e) => handleChange('modelName', e.target.value)} />
      <Input label="Device Classification" required placeholder="Enter Classification (e.g. Class I)" value={formData.deviceClassification} onChange={(e) => handleChange('deviceClassification', e.target.value)} />
      <Input label="Intended Use / Purpose" required placeholder="Enter Intended Use" value={formData.intendedUse} onChange={(e) => handleChange('intendedUse', e.target.value)} />
      <Input label="Technical Dimension / Capacity / Caonfiguration" required placeholder="Enter Dimension/Capacity" value={formData.technicalDimension} onChange={(e) => handleChange('technicalDimension', e.target.value)} />
      <Input label="Material / Build Type" placeholder="Enter Material/Build Type" value={formData.materialBuildType} onChange={(e) => handleChange('materialBuildType', e.target.value)} />
      <Input label="Power Source" placeholder="Enter Power Source" value={formData.powerSource} onChange={(e) => handleChange('powerSource', e.target.value)} />
      <Input label="Warranty" required placeholder="Enter Warranty" value={formData.warranty} onChange={(e) => handleChange('warranty', e.target.value)} />
      <Input label="AMC / Service Avaliability" placeholder="Enter AMC/Service Availability" value={formData.amcServiceAvailability} onChange={(e) => handleChange('amcServiceAvailability', e.target.value)} />
      <Input label="Manufacture Name" required placeholder="Enter Manufacturer Name" value={formData.manufacturerName} onChange={(e) => handleChange('manufacturerName', e.target.value)} />
      <Input label="Country of Origin" placeholder="Enter Country of Origin" value={formData.countryOfOrigin} onChange={(e) => handleChange('countryOfOrigin', e.target.value)} />

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

NonConsumableProductDetails.displayName = 'NonConsumableProductDetails';
export default NonConsumableProductDetails;
