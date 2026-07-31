import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import api from '@/utils/api';
import { ProductMasterService } from '@/services/ProductMasterService';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';
import { FoodInfantProductSchema } from '@/app/schema/ProductSchemas';
import { z } from 'zod';

export interface ProductDetailsRef {
  getFormData: () => any;
}

const FoodInfantProductDetails = forwardRef<ProductDetailsRef>((props, ref) => {
  const [formData, setFormData] = useState({
    productName: "",
    brandName: "",
    productCategory: "",
    productSubCategory: "",
    variantName: "",
    productForm: "",
    ageGroup: [] as string[],
    netQuantity: "",
    netQuantityUnit: "",
    manufacturerName: "",
    gst: "",
    hsnCode: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [ageGroupOptions, setAgeGroupOptions] = useState<{label: string, value: string}[]>([]);
  const [productCategoryOptions, setProductCategoryOptions] = useState<{label: string, value: string}[]>([]);
  const [productSubCategoryOptions, setProductSubCategoryOptions] = useState<{label: string, value: string}[]>([]);
  const [productFormOptions, setProductFormOptions] = useState<{label: string, value: string}[]>([]);
  const [netQtyUnitOptions, setNetQtyUnitOptions] = useState<{label: string, value: string}[]>([]);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [ageRes, typeRes, formRes, unitRes] = await Promise.all([
          ProductMasterService.getAgeGroups(),
          ProductMasterService.getFoodProductTypes(),
          ProductMasterService.getFoodProductForms(),
          ProductMasterService.getFoodNetQuantityUnits()
        ]);
        setAgeGroupOptions(ageRes.data.map((item: any) => ({ label: item.ageGroupName, value: String(item.ageGroupId) })));
        setProductCategoryOptions(typeRes.data.map((item: any) => ({ label: item.productTypeName, value: String(item.productTypeId) })));
        setProductFormOptions(formRes.data.map((item: any) => ({ label: item.productFormName, value: String(item.productFormId) })));
        setNetQtyUnitOptions(unitRes.data.map((item: any) => ({ label: item.netQuantityUnitName, value: String(item.netQuantityUnitId) })));
      } catch (error) {
        console.error("Error fetching master data:", error);
      }
    };
    fetchMasterData();
  }, []);

  useEffect(() => {
    if (formData.productCategory) {
      const fetchSubCategories = async () => {
        try {
          const res = await ProductMasterService.getFoodProductSubTypes(formData.productCategory);
          setProductSubCategoryOptions(res.data.map((item: any) => ({ label: item.productSubTypeName, value: String(item.productSubTypeId) })));
        } catch (error) {
          console.error("Error fetching sub categories:", error);
        }
      };
      fetchSubCategories();
    } else {
      setProductSubCategoryOptions([]);
    }
  }, [formData.productCategory]);

  const validateField = (field: keyof typeof formData, value: any) => {
    try {
      FoodInfantProductSchema.pick({ [field]: true } as any).parse({ [field]: value });
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
        label="Product Category"
        required
        placeholder="Select Category"
        options={productCategoryOptions}
        value={formData.productCategory}
        onChange={(val) => {
          handleChange('productCategory', val);
          handleChange('productSubCategory', ""); // Reset sub-category when category changes
        }}
      />
      
      <Dropdown
        label="Product Sub Category"
        required
        placeholder="Select Sub Category"
        options={productSubCategoryOptions}
        value={formData.productSubCategory}
        onChange={(val) => handleChange('productSubCategory', val)}
        disabled={!formData.productCategory}
      />

      <Input 
        label="Variant Name" 
        placeholder="Enter Variant Name" 
        value={formData.variantName} 
        onChange={(e) => handleChange('variantName', e.target.value)} 
        error={errors.variantName}
      />
      
      <Dropdown
        label="Product Form"
        required
        placeholder="Select Product Form"
        options={productFormOptions}
        value={formData.productForm}
        onChange={(val) => handleChange('productForm', val)}
      />
      
      <Dropdown
        label="Age Group"
        required
        placeholder="Select Age Group"
        options={ageGroupOptions}
        value={formData.ageGroup}
        onChange={(val) => handleChange('ageGroup', val)}
        multiple
      />
      
      <div className="flex flex-col gap-1 w-full">
        <label className="mb-1 block text-label-l4 font-medium text-pneutral-900 justify-center">
          Net Quantity<span className="ml-2 text-warning-500 font-semibold text-label-l2">*</span>
        </label>
        <div className="flex w-full">
          <div className="flex-1">
            <input 
              type="text" 
              placeholder="e.g. 500" 
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
      />
      
      <Input label="Hsn code" required placeholder="Enter HSN Code" value={formData.hsnCode} onChange={(e) => handleChange('hsnCode', e.target.value)} />
    </>
  );
});

FoodInfantProductDetails.displayName = 'FoodInfantProductDetails';
export default FoodInfantProductDetails;
