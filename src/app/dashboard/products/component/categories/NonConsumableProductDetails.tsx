import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';
import { ProductMasterService } from '@/services/ProductMasterService';
import { NonConsumableProductSchema } from '@/app/schema/ProductSchemas';
import { collectErrors, hasErrors } from '@/utils/formValidation';
import { z } from 'zod';

export interface ProductDetailsRef {
  getFormData: () => any;
  validate: () => boolean;
}


/**
 * The form opens blank for a new product. `initialData` is the wizard's own
 * snapshot of this form (its `getFormData()` result) handed back so an already
 * onboarded product can be edited from what was saved, rather than re-typed.
 */
export interface NonConsumableProductDetailsProps {
  initialData?: Record<string, any>;
}

const NonConsumableProductDetails = forwardRef<ProductDetailsRef, NonConsumableProductDetailsProps>(({ initialData }, ref) => {
  const [formData, setFormData] = useState(() => {
    const blank = {
      productName: "",
      brandName: "",
      deviceCategory: "",
      deviceSubCategory: "",
      modelName: "",
      deviceClassification: "",
      intendedUse: "",
      technicalDimensions: "",
      materialBuildType: "",
      powerSource: "",
      warrantyPeriod: "",
      amcServiceAvailability: "",
      manufacturerName: "",
      countryOfOrigin: "",
      gst: "",
      hsnCode: ""
    };
    // An edit opens on the wizard's own snapshot of this form; a new
    // product opens blank.
    return { ...blank, ...(initialData as Partial<typeof blank> | undefined) };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [deviceCategoryOptions, setDeviceCategoryOptions] = useState<{label: string, value: string}[]>([]);
  const [deviceSubCategoryOptions, setDeviceSubCategoryOptions] = useState<{label: string, value: string}[]>([]);
  const [materialTypeOptions, setMaterialTypeOptions] = useState<{label: string, value: string}[]>([]);
  const [powerSourceOptions, setPowerSourceOptions] = useState<{label: string, value: string}[]>([]);
  const [countryOptions, setCountryOptions] = useState<{label: string, value: string}[]>([]);
  const [gstOptions, setGstOptions] = useState<{label: string, value: string}[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [deviceCatRes, materialTypeRes, powerRes, countryRes, gstRes] = await Promise.all([
          ProductMasterService.getDeviceCategories(6), // Non-Consumables category ID is 6
          ProductMasterService.getMaterialTypes(6),
          ProductMasterService.getPowerSources(),
          ProductMasterService.getCountries(),
          ProductMasterService.getGstRates()
        ]);
        setDeviceCategoryOptions(deviceCatRes.data.map((item: any) => ({ label: item.deviceCategoryName, value: String(item.deviceCategoryId) })));
        setMaterialTypeOptions(materialTypeRes.data.map((item: any) => ({ label: item.materialTypeName, value: String(item.materialTypeId) })));
        setPowerSourceOptions(powerRes.data.map((item: any) => ({ label: item.powerSourceName, value: String(item.powerSourceId) })));
        setCountryOptions(countryRes.data.map((item: any) => ({ label: item.countryName, value: String(item.countryId) })));
        setGstOptions(gstRes.data.map((item: any) => ({ label: String(item.gstPercentage), value: String(item.gstPercentage) })));
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

  const validateField = (field: keyof typeof formData, value: any) => {
    try {
      NonConsumableProductSchema.pick({ [field]: true } as any).parse({ [field]: value });
      setErrors(prev => ({ ...prev, [field]: '' }));
    } catch (error) {
      if (error instanceof z.ZodError) {
        const zodError = error as z.ZodError;
        setErrors(prev => ({ ...prev, [field]: zodError.issues[0].message }));
      }
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    if (field === 'warrantyPeriod' && value !== '' && !/^\d*$/.test(value)) {
      return;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  useImperativeHandle(ref, () => ({
    getFormData: () => formData,
    validate: () => {
      const nextErrors = collectErrors(NonConsumableProductSchema, formData, {
        deviceCategory: 'Device Category is required',
      });

      setErrors(nextErrors);
      return !hasErrors(nextErrors);
    }
  }));

  return (
    <>
      <Input label="Product Name" required placeholder="Enter Product Name" value={formData.productName} onChange={(e) => handleChange('productName', e.target.value)} error={errors.productName} maxLength={60} />
      <Input label="Brand name" required placeholder="Enter Brand Name" value={formData.brandName} onChange={(e) => handleChange('brandName', e.target.value)} error={errors.brandName} maxLength={60} />
      
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
        error={errors.deviceCategory}
      />
      
      <Dropdown
        label="Device Sub - Category"
        placeholder="Select Sub Category"
        options={deviceSubCategoryOptions}
        value={formData.deviceSubCategory}
        onChange={(val) => handleChange('deviceSubCategory', val)}
        disabled={!formData.deviceCategory}
        error={errors.deviceSubCategory}
      />
      
      <Input label="Model Name" placeholder="Enter Model Name" value={formData.modelName} onChange={(e) => handleChange('modelName', e.target.value)} error={errors.modelName} maxLength={60} />
      
      <Dropdown
        label="Device Classification (Class A/B/C/D)"
        required
        placeholder="Select Classification"
        options={[
          { label: 'Class A', value: 'Class A' },
          { label: 'Class B', value: 'Class B' },
          { label: 'Class C', value: 'Class C' },
          { label: 'Class D', value: 'Class D' }
        ]}
        value={formData.deviceClassification}
        onChange={(val) => handleChange('deviceClassification', val)}
        error={errors.deviceClassification}
      />
      
      <Input label="Intended Use / Purpose" placeholder="Enter Intended Use" value={formData.intendedUse} onChange={(e) => handleChange('intendedUse', e.target.value)} error={errors.intendedUse} maxLength={100} />
      <Input label="Technical Dimensions / Capacity / Configuration" placeholder="Enter Dimension/Capacity" value={formData.technicalDimensions} onChange={(e) => handleChange('technicalDimensions', e.target.value)} error={errors.technicalDimensions} maxLength={30} />
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
      
      <Input label="Warranty Period (in months)" required placeholder="Enter Warranty" value={formData.warrantyPeriod} onChange={(e) => handleChange('warrantyPeriod', e.target.value)} error={errors.warrantyPeriod} maxLength={3} />
      
      <Dropdown
        label="AMC / Service Availability"
        required
        placeholder="Select Availability"
        options={[
          { label: 'Yes', value: 'Yes' },
          { label: 'No', value: 'No' }
        ]}
        value={formData.amcServiceAvailability}
        onChange={(val) => handleChange('amcServiceAvailability', val)}
        error={errors.amcServiceAvailability}
      />
      
      <Input label="Manufacturer Name" required placeholder="Enter Manufacturer Name" value={formData.manufacturerName} onChange={(e) => handleChange('manufacturerName', e.target.value)} error={errors.manufacturerName} maxLength={60} />
      
      {/* Searchable: the country master is the full ~200-entry list, which is
          far too long to find an entry in by scrolling. */}
      <Dropdown
        label="Country of Origin"
        searchable
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
        options={gstOptions}
        value={formData.gst}
        onChange={(val) => handleChange('gst', val)}
        menuPlacement="top"
        error={errors.gst}
      />
      
      <Input label="Hsn code" required placeholder="Enter HSN Code" value={formData.hsnCode} onChange={(e) => handleChange('hsnCode', e.target.value)} error={errors.hsnCode} />
    </>
  );
});

NonConsumableProductDetails.displayName = 'NonConsumableProductDetails';
export default NonConsumableProductDetails;
