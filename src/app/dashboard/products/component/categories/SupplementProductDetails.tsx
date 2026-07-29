import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import api from '@/utils/api';
import { ProductMasterService } from '@/services/ProductMasterService';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';

export interface ProductDetailsRef {
  getFormData: () => any;
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
    ageGroup: "",
    gender: "",
    manufacturerName: "",
    fssaiLicense: "",
    gst: "",
    hsnCode: ""
  });

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

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useImperativeHandle(ref, () => ({
    getFormData: () => formData
  }));

  // Find the selected unit label for display
  const selectedUnitLabel = netQtyUnitOptions.find(opt => opt.value === formData.netQuantityUnit)?.label || "Select Unit";

  return (
    <>
      <Input label="Product Name" required placeholder="Placeholder" value={formData.productName} onChange={(e) => handleChange('productName', e.target.value)} />
      
      <Dropdown
        label="Therapeutic Category"
        required
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
        required
        placeholder="Select Subcategory"
        options={therapeuticSubcategoryOptions}
        value={formData.therapeuticSubcategory}
        onChange={(val) => handleChange('therapeuticSubcategory', val)}
        disabled={!formData.therapeuticCategory}
      />
      
      <Input label="Brand Name" required placeholder="Enter Brand Name" value={formData.brandName} onChange={(e) => handleChange('brandName', e.target.value)} />

      <Dropdown
        label="Flavor"
        required
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
      <Input label="Strength / Composition" required placeholder="Placeholder" value={formData.strength} onChange={(e) => handleChange('strength', e.target.value)} />
      
      <div className="flex flex-col gap-1 w-full">
        <label className="text-label-l4 font-medium text-pneutral-900">Net Quantity<span className="ml-2 text-warning-500 font-semibold">*</span></label>
        <div className="flex w-full">
          <div className="flex-1">
            <input 
              type="text" 
              placeholder="Placeholder" 
              value={formData.netQuantity}
              onChange={(e) => handleChange('netQuantity', e.target.value)}
              className="w-full h-12 rounded-l-md border border-r-0 border-pneutral-300 px-3 outline-none text-p4 text-pneutral-900 focus:border-pneutral-500" 
            />
          </div>
          <div className="relative w-[140px] shrink-0 border border-pneutral-300 rounded-r-md bg-gray-50 flex items-center px-3 cursor-pointer">
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
      </div>

      <Dropdown
        label="Age Group"
        required
        placeholder="Select Age Group"
        options={ageGroupOptions}
        value={formData.ageGroup}
        onChange={(val) => handleChange('ageGroup', val)}
      />
      
      <Input label="Gender" required placeholder="Placeholder" value={formData.gender} onChange={(e) => handleChange('gender', e.target.value)} />
      <Input label="Manufacturer Name" required placeholder="Placeholder" value={formData.manufacturerName} onChange={(e) => handleChange('manufacturerName', e.target.value)} />
      <Input label="FSSAI License number" required placeholder="Placeholder" value={formData.fssaiLicense} onChange={(e) => handleChange('fssaiLicense', e.target.value)} />

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

SupplementProductDetails.displayName = 'SupplementProductDetails';
export default SupplementProductDetails;
