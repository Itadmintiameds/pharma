import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import api from '@/utils/api';
import { ProductMasterService } from '@/services/ProductMasterService';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';
import { CosmeticProductSchema } from '@/app/schema/ProductSchemas';
import { z } from 'zod';

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

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [productTypeOptions, setProductTypeOptions] = useState<{label: string, value: string}[]>([]);
  const [productSubTypeOptions, setProductSubTypeOptions] = useState<{label: string, value: string}[]>([]);
  const [productFormOptions, setProductFormOptions] = useState<{label: string, value: string}[]>([]);
  const [intendedUseAreaOptions, setIntendedUseAreaOptions] = useState<{label: string, value: string}[]>([]);
  const [skinTypeOptions, setSkinTypeOptions] = useState<{label: string, value: string}[]>([]);
  const [hairTypeOptions, setHairTypeOptions] = useState<{label: string, value: string}[]>([]);
  const [ageGroupOptions, setAgeGroupOptions] = useState<{label: string, value: string}[]>([]);
  const [netQtyUnitOptions, setNetQtyUnitOptions] = useState<{label: string, value: string}[]>([]);

  // Fetch initial master data
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [ageRes, typeRes, formRes, intendedRes, skinRes, hairRes, unitRes] = await Promise.all([
          ProductMasterService.getAgeGroups(),
          ProductMasterService.getCosmeticProductTypes(),
          ProductMasterService.getCosmeticProductForms(),
          ProductMasterService.getIntendedUseAreas(),
          ProductMasterService.getSkinTypes(),
          ProductMasterService.getHairTypes(),
          ProductMasterService.getCosmeticNetQuantityUnits()
        ]);
        
        setAgeGroupOptions(ageRes.data.map((item: any) => ({ label: item.ageGroupName, value: String(item.ageGroupId) })));
        setProductTypeOptions(typeRes.data.map((item: any) => ({ label: item.productTypeName, value: String(item.productTypeId) })));
        setProductFormOptions(formRes.data.map((item: any) => ({ label: item.productFormName, value: String(item.productFormId) })));
        setIntendedUseAreaOptions(intendedRes.data.map((item: any) => ({ label: item.intendedUseAreaName, value: String(item.intendedUseAreaId) })));
        setSkinTypeOptions(skinRes.data.map((item: any) => ({ label: item.skinTypeName, value: String(item.skinTypeId) })));
        setHairTypeOptions(hairRes.data.map((item: any) => ({ label: item.hairTypeName, value: String(item.hairTypeId) })));
        setNetQtyUnitOptions(unitRes.data.map((item: any) => ({ label: item.netQuantityUnitName, value: String(item.netQuantityUnitId) })));
      } catch (error) {
        console.error("Error fetching master data:", error);
      }
    };
    fetchMasterData();
  }, []);

  // Fetch sub-types whenever productType changes
  useEffect(() => {
    if (formData.productType) {
      const fetchSubTypes = async () => {
        try {
          const res = await ProductMasterService.getCosmeticProductSubTypes(formData.productType);
          setProductSubTypeOptions(res.data.map((item: any) => ({ label: item.productSubTypeName, value: String(item.productSubTypeId) })));
        } catch (error) {
          console.error("Error fetching sub types:", error);
        }
      };
      fetchSubTypes();
    } else {
      setProductSubTypeOptions([]);
    }
  }, [formData.productType]);

  const validateField = (field: keyof typeof formData, value: any) => {
    try {
      CosmeticProductSchema.pick({ [field]: true } as any).parse({ [field]: value });
      setErrors(prev => ({ ...prev, [field]: '' }));
    } catch (error) {
      if (error instanceof z.ZodError) {
        const zodError = error as z.ZodError;
        setErrors(prev => ({ ...prev, [field]: zodError.issues[0].message }));
      }
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    if (field === 'netQuantity' && value !== '' && !/^\d*\.?\d*$/.test(value)) {
      return;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  useImperativeHandle(ref, () => ({
    getFormData: () => formData
  }));

  // Find the selected unit label for display
  const selectedUnitLabel = netQtyUnitOptions.find(opt => opt.value === formData.netQuantityUnit)?.label || "Select Unit";

  const selectedProductTypeName = productTypeOptions.find(opt => opt.value === formData.productType)?.label;

  let showSkinType = false;
  let skinTypeRequired = false;
  let showHairType = false;
  let hairTypeRequired = false;

  if (selectedProductTypeName) {
    switch (selectedProductTypeName) {
      case 'Hair Care':
        showHairType = true;
        hairTypeRequired = true;
        break;
      case 'Skin Care (Face)':
      case 'Body Care':
      case 'Lip Care':
      case 'Eye Care':
        showSkinType = true;
        skinTypeRequired = true;
        break;
      case 'Personal Hygiene':
      case 'Makeup / Color Cosmetics':
        showSkinType = true;
        skinTypeRequired = false;
        break;
      case 'Fragrance':
        break;
      case "Men's Grooming":
        showSkinType = true;
        skinTypeRequired = false;
        showHairType = true;
        hairTypeRequired = false;
        break;
    }
  }

  return (
    <>
      <Input 
        label="Product Name" 
        required 
        placeholder="Enter Product Name" 
        value={formData.productName} 
        onChange={(e) => handleChange('productName', e.target.value)} 
        error={errors.productName}
      />
      <Input 
        label="Brand Name" 
        required 
        placeholder="Enter Brand Name" 
        value={formData.brandName} 
        onChange={(e) => handleChange('brandName', e.target.value)} 
        error={errors.brandName}
      />
      
      <Dropdown
        label="Product Type"
        required
        placeholder="Select Product Type"
        options={productTypeOptions}
        value={formData.productType}
        onChange={(val) => {
          handleChange('productType', val);
          handleChange('productSubType', ""); // Reset sub-type when type changes
          handleChange('skinType', ""); // Reset skin type
          handleChange('hairType', ""); // Reset hair type
        }}
      />
      
      <Dropdown
        label="Product Sub Type"
        required
        placeholder="Select Product Sub Type"
        options={productSubTypeOptions}
        value={formData.productSubType}
        onChange={(val) => handleChange('productSubType', val)}
        disabled={!formData.productType}
      />
      
      <Dropdown
        label="Product Form"
        required
        placeholder="Select Product Form"
        options={productFormOptions}
        value={formData.productForm}
        onChange={(val) => handleChange('productForm', val)}
      />

      <Input 
        label="Variant" 
        placeholder="Enter Variant" 
        value={formData.variant} 
        onChange={(e) => handleChange('variant', e.target.value)} 
        error={errors.variant}
      />
      
      <Dropdown
        label="Intended Use Area"
        required
        placeholder="Select Intended Use Area"
        options={intendedUseAreaOptions}
        value={formData.intendedUseArea}
        onChange={(val) => handleChange('intendedUseArea', val)}
      />

      {showSkinType && (
        <Dropdown
          label="Skin Type"
          required={skinTypeRequired}
          placeholder="Select Skin Type"
          options={skinTypeOptions}
          value={formData.skinType}
          onChange={(val) => handleChange('skinType', val)}
        />
      )}

      {showHairType && (
        <Dropdown
          label="Hair Type"
          required={hairTypeRequired}
          placeholder="Select Hair Type"
          options={hairTypeOptions}
          value={formData.hairType}
          onChange={(val) => handleChange('hairType', val)}
        />
      )}
      
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
      
      <Input 
        label="Fragrance" 
        placeholder="Enter Fragrance" 
        value={formData.fragrance} 
        onChange={(e) => handleChange('fragrance', e.target.value)} 
        error={errors.fragrance}
      />
      
      <div className="flex flex-col gap-1 w-full">
        <label className="mb-1 block text-label-l4 font-medium text-pneutral-900 justify-center">
          Net Quantity<span className="ml-2 text-warning-500 font-semibold text-label-l2">*</span>
        </label>
        <div className="flex w-full">
          <div className="flex-1">
            <input 
              type="text" 
              placeholder="e.g. 100" 
              value={formData.netQuantity}
              onChange={(e) => handleChange('netQuantity', e.target.value)}
              className={`w-full h-12 rounded-l-md border border-r-0 px-3 outline-none text-p4 text-pneutral-900 focus:border-pneutral-500 ${
                errors.netQuantity ? "border-warning-500" : "border-pneutral-300"
              }`} 
            />
          </div>
          <div className={`relative w-[140px] shrink-0 border rounded-r-md bg-gray-50 flex items-center px-3 cursor-pointer ${
            errors.netQuantity ? "border-warning-500 border-l-pneutral-300" : "border-pneutral-300"
          }`}>
            <span className="text-p4 text-pneutral-500 flex-1 truncate pointer-events-none">{selectedUnitLabel}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-pneutral-500 shrink-0 pointer-events-none">
              <path d="M6 9l6 6 6-6" />
            </svg>
            <select
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              value={formData.netQuantityUnit}
              onChange={(e) => handleChange('netQuantityUnit', e.target.value)}
            >
              <option value="" disabled>Select Unit</option>
              {netQtyUnitOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        {errors.netQuantity && <p className="mt-1 text-p2 text-warning-500">{errors.netQuantity}</p>}
      </div>

      <Input 
        label="Manufacturer Name" 
        required 
        placeholder="Enter Manufacturer Name" 
        value={formData.manufacturerName} 
        onChange={(e) => handleChange('manufacturerName', e.target.value)} 
        error={errors.manufacturerName}
      />

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
        error={errors.gst}
      />
      
      <Input 
        label="Hsn code" 
        required 
        placeholder="Enter HSN Code" 
        value={formData.hsnCode} 
        onChange={(e) => handleChange('hsnCode', e.target.value)} 
        error={errors.hsnCode}
      />
    </>
  );
});

CosmeticProductDetails.displayName = 'CosmeticProductDetails';
export default CosmeticProductDetails;
