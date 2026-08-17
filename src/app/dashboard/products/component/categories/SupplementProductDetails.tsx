import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import api from '@/utils/api';
import { ProductMasterService } from '@/services/ProductMasterService';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';
import { SupplementProductSchema } from '@/app/schema/ProductSchemas';
import { collectErrors, hasErrors } from '@/utils/formValidation';
import { z } from 'zod';

export interface ProductDetailsRef {
  getFormData: () => any;
  validate: () => boolean;
}

const SupplementProductDetails = forwardRef<ProductDetailsRef>((props, ref) => {
  const [formData, setFormData] = useState({
    productName: "",
    brandName: "",
    therapeuticCategory: "",
    therapeuticSubcategory: "",
    flavor: "",
    dosageForm: "",
    strength: "",
    netQuantity: "",
    netQuantityUnit: "",
    ageGroup: [] as string[],
    gender: "",
    manufacturerName: "",
    fssaiLicense: "",
    gst: "",
    hsnCode: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [ageGroupOptions, setAgeGroupOptions] = useState<{label: string, value: string}[]>([]);
  const [flavorOptions, setFlavorOptions] = useState<{label: string, value: string}[]>([]);
  const [therapeuticCategoryOptions, setTherapeuticCategoryOptions] = useState<{label: string, value: string}[]>([]);
  const [therapeuticSubcategoryOptions, setTherapeuticSubcategoryOptions] = useState<{label: string, value: string}[]>([]);
  const [dosageFormOptions, setDosageFormOptions] = useState<{label: string, value: string}[]>([]);
  const [netQtyUnitOptions, setNetQtyUnitOptions] = useState<{label: string, value: string}[]>([]);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [ageRes, flavourRes, tcRes, unitRes, dosageRes] = await Promise.all([
          ProductMasterService.getAgeGroups(),
          ProductMasterService.getFlavours(),
          ProductMasterService.getTherapeuticCategories(),
          ProductMasterService.getSupplementNetQuantityUnits(),
          ProductMasterService.getDosageForms()
        ]);
        setAgeGroupOptions(ageRes.data.map((item: any) => ({ label: item.ageGroupName, value: String(item.ageGroupId) })));
        setFlavorOptions(flavourRes.data.map((item: any) => ({ label: item.flavourName, value: String(item.flavourId) })));
        setTherapeuticCategoryOptions(tcRes.data.map((item: any) => ({ label: item.therapeuticCategoryName, value: String(item.therapeuticCategoryId) })));
        setNetQtyUnitOptions(unitRes.data.map((item: any) => ({ label: item.netQuantityUnitName, value: String(item.netQuantityUnitId) })));
        setDosageFormOptions(dosageRes.data.map((item: any) => ({ label: item.dosageName, value: String(item.dosageId) })));
      } catch (error) {
        console.error("Error fetching master data:", error);
      }
    };
    fetchMasterData();
  }, []);

  useEffect(() => {
    if (formData.therapeuticCategory) {
      const fetchSubcategories = async () => {
        try {
          const res = await ProductMasterService.getTherapeuticSubCategories(formData.therapeuticCategory);
          setTherapeuticSubcategoryOptions(res.data.map((item: any) => ({ label: item.therapeuticSubcategoryName, value: String(item.therapeuticSubcategoryId) })));
        } catch (error) {
          console.error("Error fetching subcategories:", error);
        }
      };
      fetchSubcategories();
    } else {
      setTherapeuticSubcategoryOptions([]);
    }
  }, [formData.therapeuticCategory]);

  const validateField = (field: keyof typeof formData, value: any) => {
    try {
      SupplementProductSchema.pick({ [field]: true } as any).parse({ [field]: value });
      setErrors(prev => ({ ...prev, [field]: '' }));
    } catch (error) {
      if (error instanceof z.ZodError) {
        const zodError = error as z.ZodError;
        setErrors(prev => ({ ...prev, [field]: zodError.issues[0].message }));
      }
    }
  };

  // A multi-select hands over a string[], the rest a string.
  const handleChange = (field: keyof typeof formData, value: string | string[]) => {
    if (
      field === 'netQuantity' &&
      typeof value === 'string' &&
      value !== '' &&
      !/^\d*\.?\d*$/.test(value)
    ) {
      return;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  useImperativeHandle(ref, () => ({
    getFormData: () => formData,
    validate: () => {
      const nextErrors = collectErrors(SupplementProductSchema, formData, {
        dosageForm: 'Dosage Form is required',
        ageGroup: 'Age Group is required',
        netQuantityUnit: 'Net Quantity Unit is required',
      });

      setErrors(nextErrors);
      return !hasErrors(nextErrors);
    }
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
      
      <Dropdown
        label="Therapeutic Category"
        placeholder="Select Category"
        options={therapeuticCategoryOptions}
        value={formData.therapeuticCategory}
        onChange={(val) => {
          handleChange('therapeuticCategory', val);
          handleChange('therapeuticSubcategory', ""); // Reset subcategory when category changes
        }}
      />

      <Dropdown
        label="Therapeutic Subcategory"
        placeholder="Select Subcategory"
        options={therapeuticSubcategoryOptions}
        value={formData.therapeuticSubcategory}
        onChange={(val) => handleChange('therapeuticSubcategory', val)}
        disabled={!formData.therapeuticCategory}
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
        label="Flavor"
        placeholder="Select Flavor"
        options={flavorOptions}
        value={formData.flavor}
        onChange={(val) => handleChange('flavor', val)}
      />
      
      <Dropdown
        label="Dosage Form"
        required
        placeholder="Select Dosage Form"
        options={dosageFormOptions}
        value={formData.dosageForm}
        onChange={(val) => handleChange('dosageForm', val)}
      />
      <Input 
        label="Strength / Composition" 
        required 
        placeholder="Enter Strength" 
        value={formData.strength} 
        onChange={(e) => handleChange('strength', e.target.value)} 
        error={errors.strength}
        maxLength={30}
      />
      
      <div className="flex flex-col gap-1 w-full">
        <label className="mb-1 block text-label-l4 font-medium text-pneutral-900 justify-center">
          Net Quantity<span className="ml-2 text-warning-500 font-semibold text-label-l2">*</span>
        </label>
        <div className="flex w-full">
          <div className="flex-1">
            <input 
              type="text" 
              placeholder="Enter Quantity" 
              value={formData.netQuantity}
              onChange={(e) => handleChange('netQuantity', e.target.value)}
              className={`w-full h-12 rounded-l-md border border-r-0 px-3 outline-none text-p4 text-pneutral-900 focus:border-pneutral-500 ${
                errors.netQuantity ? "border-warning-500" : "border-pneutral-300"
              }`} 
            />
          </div>
          <div className={`relative w-[140px] shrink-0 border rounded-r-md bg-gray-50 flex items-center px-3 cursor-pointer ${
            errors.netQuantity || errors.netQuantityUnit ? "border-warning-500 border-l-pneutral-300" : "border-pneutral-300"
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
        {(errors.netQuantity || errors.netQuantityUnit) && (
          <p className="mt-1 text-p2 text-warning-500">{errors.netQuantity || errors.netQuantityUnit}</p>
        )}
      </div>

      <Dropdown
        label="Age Group"
        required
        placeholder="Select Age Group"
        options={ageGroupOptions}
        value={formData.ageGroup}
        onChange={(val) => handleChange('ageGroup', val)}
        multiple
        error={errors.ageGroup}
      />
      
      <Dropdown
        label="Gender"
        required
        placeholder="Select Gender"
        options={[
          { label: 'Unisex', value: 'unisex' },
          { label: 'Male', value: 'male' },
          { label: 'Female', value: 'female' }
        ]}
        value={formData.gender}
        onChange={(val) => handleChange('gender', val)}
        error={errors.gender}
      />
      <Input 
        label="Manufacturer Name" 
        required 
        placeholder="Enter Manufacturer Name" 
        value={formData.manufacturerName} 
        onChange={(e) => handleChange('manufacturerName', e.target.value)} 
        error={errors.manufacturerName}
        maxLength={60}
      />
      <Input 
        label="FSSAI License number"
        placeholder="Enter License Number"
        value={formData.fssaiLicense} 
        onChange={(e) => handleChange('fssaiLicense', e.target.value)} 
        error={errors.fssaiLicense}
        maxLength={14}
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

SupplementProductDetails.displayName = 'SupplementProductDetails';
export default SupplementProductDetails;
