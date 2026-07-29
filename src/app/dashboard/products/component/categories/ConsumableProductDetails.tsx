import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';
import { ProductMasterService } from '@/services/ProductMasterService';

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

  const [deviceCategoryOptions, setDeviceCategoryOptions] = useState<{label: string, value: string}[]>([]);
  const [deviceSubCategoryOptions, setDeviceSubCategoryOptions] = useState<{label: string, value: string}[]>([]);
  const [materialTypeOptions, setMaterialTypeOptions] = useState<{label: string, value: string}[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [deviceCatRes, materialTypeRes] = await Promise.all([
          ProductMasterService.getDeviceCategories(5), // Consumables category ID is 5
          ProductMasterService.getMaterialTypes(5)
        ]);
        setDeviceCategoryOptions(deviceCatRes.data.map((item: any) => ({ label: item.deviceCategoryName, value: String(item.deviceCategoryId) })));
        setMaterialTypeOptions(materialTypeRes.data.map((item: any) => ({ label: item.materialTypeName, value: String(item.materialTypeId) })));
      } catch (error) {
        console.error("Error fetching consumable master data:", error);
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
      <Input label="Brand Name" required placeholder="Enter Brand Name" value={formData.brandName} onChange={(e) => handleChange('brandName', e.target.value)} />
      
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
      
      <Dropdown
        label="Material Type"
        placeholder="Select Material Type"
        options={materialTypeOptions}
        value={formData.materialType}
        onChange={(val) => handleChange('materialType', val)}
      />
      <Input label="Size / Dimension / Gauge" required placeholder="Enter Size/Dimension/Gauge" value={formData.sizeDimensionGauge} onChange={(e) => handleChange('sizeDimensionGauge', e.target.value)} />
      
      <div className="flex flex-col gap-1 w-full">
        <label className="text-label-l4 font-medium text-pneutral-900">
          Sterility Classification <span className="ml-1 text-warning-500 font-semibold">*</span>
        </label>
        <div className="flex gap-6 mt-1 h-12 items-center">
          <label className="flex items-center gap-2 cursor-pointer text-p4 text-pneutral-900">
            <input type="radio" name="sterile" value="Sterile" checked={formData.sterile === "Sterile"} onChange={(e) => handleChange('sterile', e.target.value)} className="w-5 h-5 accent-secondary-600 cursor-pointer" />
            Sterile
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-p4 text-pneutral-900">
            <input type="radio" name="sterile" value="Non-Sterile" checked={formData.sterile === "Non-Sterile"} onChange={(e) => handleChange('sterile', e.target.value)} className="w-5 h-5 accent-secondary-600 cursor-pointer" />
            Non-Sterile
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-1 w-full">
        <label className="text-label-l4 font-medium text-pneutral-900">
          Usage Type <span className="ml-1 text-warning-500 font-semibold">*</span>
        </label>
        <div className="flex gap-6 mt-1 h-12 items-center">
          <label className="flex items-center gap-2 cursor-pointer text-p4 text-pneutral-900">
            <input type="radio" name="disposable" value="Disposable" checked={formData.disposable === "Disposable"} onChange={(e) => handleChange('disposable', e.target.value)} className="w-5 h-5 accent-secondary-600 cursor-pointer" />
            Disposable
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-p4 text-pneutral-900">
            <input type="radio" name="disposable" value="Reusable" checked={formData.disposable === "Reusable"} onChange={(e) => handleChange('disposable', e.target.value)} className="w-5 h-5 accent-secondary-600 cursor-pointer" />
            Reusable
          </label>
        </div>
      </div>
      
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
