import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';
import { ProductMasterService } from '@/services/ProductMasterService';

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

  const [deviceCategoryOptions, setDeviceCategoryOptions] = useState<{label: string, value: string}[]>([]);
  const [deviceSubCategoryOptions, setDeviceSubCategoryOptions] = useState<{label: string, value: string}[]>([]);
  const [materialTypeOptions, setMaterialTypeOptions] = useState<{label: string, value: string}[]>([]);
  const [powerSourceOptions, setPowerSourceOptions] = useState<{label: string, value: string}[]>([]);
  const [countryOptions, setCountryOptions] = useState<{label: string, value: string}[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [deviceCatRes, materialTypeRes, powerRes, countryRes] = await Promise.all([
          ProductMasterService.getDeviceCategories(6), // Non-Consumables category ID is 6
          ProductMasterService.getMaterialTypes(6),
          ProductMasterService.getPowerSources(),
          ProductMasterService.getCountries()
        ]);
        setDeviceCategoryOptions(deviceCatRes.data.map((item: any) => ({ label: item.deviceCategoryName, value: String(item.deviceCategoryId) })));
        setMaterialTypeOptions(materialTypeRes.data.map((item: any) => ({ label: item.materialTypeName, value: String(item.materialTypeId) })));
        setPowerSourceOptions(powerRes.data.map((item: any) => ({ label: item.powerSourceName, value: String(item.powerSourceId) })));
        setCountryOptions(countryRes.data.map((item: any) => ({ label: item.countryName, value: String(item.countryId) })));
      } catch (error) {
        console.error("Error fetching non-consumable master data:", error);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (formData.deviceCategory) {
      const fetchSubcategories = async () => {
        try {
          const res = await ProductMasterService.getDeviceSubCategories(formData.deviceCategory);
          setDeviceSubCategoryOptions(res.data.map((item: any) => ({ label: item.deviceSubCategoryName, value: String(item.deviceSubCategoryId) })));
        } catch (error) {
          console.error("Error fetching device sub categories:", error);
        }
      };
      fetchSubcategories();
    } else {
      setDeviceSubCategoryOptions([]);
    }
  }, [formData.deviceCategory]);

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
        options={deviceCategoryOptions}
        value={formData.deviceCategory}
        onChange={(val) => {
          handleChange('deviceCategory', val);
          handleChange('deviceSubCategory', ""); // Reset subcategory when category changes
        }}
      />
      
      <Dropdown
        label="Device Sub - Category"
        required
        placeholder="Select Sub Category"
        options={deviceSubCategoryOptions}
        value={formData.deviceSubCategory}
        onChange={(val) => handleChange('deviceSubCategory', val)}
        disabled={!formData.deviceCategory}
      />
      
      <Input label="Model Name" placeholder="Enter Model Name" value={formData.modelName} onChange={(e) => handleChange('modelName', e.target.value)} />
      <Input label="Device Classification" required placeholder="Enter Classification (e.g. Class I)" value={formData.deviceClassification} onChange={(e) => handleChange('deviceClassification', e.target.value)} />
      <Input label="Intended Use / Purpose" required placeholder="Enter Intended Use" value={formData.intendedUse} onChange={(e) => handleChange('intendedUse', e.target.value)} />
      <Input label="Technical Dimension / Capacity / Caonfiguration" required placeholder="Enter Dimension/Capacity" value={formData.technicalDimension} onChange={(e) => handleChange('technicalDimension', e.target.value)} />
      <Dropdown
        label="Material / Build Type"
        placeholder="Select Material/Build Type"
        options={materialTypeOptions}
        value={formData.materialBuildType}
        onChange={(val) => handleChange('materialBuildType', val)}
      />
      
      <Dropdown
        label="Power Source"
        placeholder="Select Power Source"
        options={powerSourceOptions}
        value={formData.powerSource}
        onChange={(val) => handleChange('powerSource', val)}
      />
      
      <Input label="Warranty" required placeholder="Enter Warranty" value={formData.warranty} onChange={(e) => handleChange('warranty', e.target.value)} />
      <Input label="AMC / Service Avaliability" placeholder="Enter AMC/Service Availability" value={formData.amcServiceAvailability} onChange={(e) => handleChange('amcServiceAvailability', e.target.value)} />
      <Input label="Manufacture Name" required placeholder="Enter Manufacturer Name" value={formData.manufacturerName} onChange={(e) => handleChange('manufacturerName', e.target.value)} />
      
      <Dropdown
        label="Country of Origin"
        placeholder="Select Country of Origin"
        options={countryOptions}
        value={formData.countryOfOrigin}
        onChange={(val) => handleChange('countryOfOrigin', val)}
        menuPlacement="top"

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

NonConsumableProductDetails.displayName = 'NonConsumableProductDetails';
export default NonConsumableProductDetails;
