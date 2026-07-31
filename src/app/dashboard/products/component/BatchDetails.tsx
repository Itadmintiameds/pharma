import React, { useState, forwardRef, useImperativeHandle } from 'react';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';
import { BatchSchema } from '@/app/schema/BatchSchema';
import { collectErrors, hasErrors } from '@/utils/formValidation';
import { z } from 'zod';

const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-pneutral-500">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

export interface BatchDetailsRef {
  getFormData: () => any;
  validate: () => boolean;
}

const BatchDetails = forwardRef<BatchDetailsRef>((props, ref) => {
  const [formData, setFormData] = useState({
    batchNumber: '',
    manufacturingDate: '',
    expiryDate: '',
    purchaseUnit: '',
    purchaseQuantity: '',
    freeUnit: '',
    freeQuantity: '',
    purchasePricePerBox: '',
    mrpPerBox: '',
    sellingPricePerBox: '',
    purchasePricePerSmallestUnit: '',
    mrpPerSmallestUnit: '',
    sellingPricePerSmallestUnit: '',
    rackLocation: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (field: keyof typeof formData, value: string) => {
    try {
      const newData = { ...formData, [field]: value };
      BatchSchema.parse(newData);
      setErrors(prev => ({ ...prev, [field]: '' }));
    } catch (error) {
      if (error instanceof z.ZodError) {
        const zodError = error as z.ZodError;
        setErrors(prev => ({ ...prev, [field]: '' }));
        const fieldError = zodError.issues.find((err: z.ZodIssue) => err.path.includes(field));
        if (fieldError) {
          setErrors(prev => ({ ...prev, [field]: fieldError.message }));
        }
      }
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  useImperativeHandle(ref, () => ({
    getFormData: () => formData,
    validate: () => {
      // z.coerce.number() turns "" into 0, so the numeric fields need an
      // explicit presence check on top of the schema.
      const nextErrors = collectErrors(BatchSchema, formData, {
        purchaseUnit: 'Purchase Unit is required',
        purchaseQuantity: 'Purchase Quantity is required',
        freeUnit: 'Free Unit is required',
        freeQuantity: 'Free Quantity is required',
        purchasePricePerBox: 'Purchase Price (per Box) is required',
        mrpPerBox: 'MRP (per Box) is required',
        sellingPricePerBox: 'Selling Price (per Box) is required',
        purchasePricePerSmallestUnit: 'Purchase Price (per Smallest Unit) is required',
        mrpPerSmallestUnit: 'MRP (per Smallest Unit) is required',
        sellingPricePerSmallestUnit: 'Selling Price (per Smallest Unit) is required',
        rackLocation: 'Rack / Location is required',
      });

      setErrors(nextErrors);
      return !hasErrors(nextErrors);
    }
  }));

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-sm">
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <div className="flex w-full flex-1 flex-col gap-xlg overflow-y-auto rounded-[12px] border border-pneutral-100 bg-base-white p-[14px] shadow-sm">
          <h3 className="shrink-0 text-h6 font-semibo ld text-pneutral-900">
            Batch Details
          </h3>

          <div className="grid grid-cols-2 items-start gap-x-xlg gap-y-sm">
            <Input 
              label="Batch Number" 
              required 
              placeholder="Enter Batch Number" 
              value={formData.batchNumber}
              onChange={(e) => handleChange('batchNumber', e.target.value)}
              error={errors.batchNumber}
            />

            <Input
              label="Manufacturing Date"
              type="date"
              required
              placeholder="Enter Manufacturing Date"
              leftIcon={<CalendarIcon />}
              value={formData.manufacturingDate}
              onChange={(e) => handleChange('manufacturingDate', e.target.value)}
              error={errors.manufacturingDate}
            />

            <Input
              label="Expiry Date"
              type="date"
              required
              placeholder="Enter Expiry Date"
              leftIcon={<CalendarIcon />}
              value={formData.expiryDate}
              onChange={(e) => handleChange('expiryDate', e.target.value)}
              error={errors.expiryDate}
            />

            <Dropdown 
              label="Purchase Unit" 
              required 
              placeholder="Select Unit" 
              options={[{ label: 'Box', value: 'BOX' }, { label: 'Strip', value: 'STRIP' }, { label: 'Bottle', value: 'BOTTLE' }]}
              value={formData.purchaseUnit}
              onChange={(val) => handleChange('purchaseUnit', val)}
              error={errors.purchaseUnit}
            />
            <Input 
              label="Purchase Quantity" 
              required 
              type="number"
              placeholder="0" 
              value={formData.purchaseQuantity}
              onChange={(e) => handleChange('purchaseQuantity', e.target.value)}
              error={errors.purchaseQuantity}
            />
            <Dropdown 
              label="Free Unit" 
              required 
              placeholder="Select Unit"
              options={[{ label: 'Box', value: 'BOX' }, { label: 'Strip', value: 'STRIP' }, { label: 'Bottle', value: 'BOTTLE' }]}
              value={formData.freeUnit}
              onChange={(val) => handleChange('freeUnit', val)}
              error={errors.freeUnit}
            />
            <Input 
              label="Free Quantity" 
              required 
              type="number"
              placeholder="0" 
              value={formData.freeQuantity}
              onChange={(e) => handleChange('freeQuantity', e.target.value)}
              error={errors.freeQuantity}
            />

            <Input 
              label="Purchase Price (per Box)" 
              required 
              type="number"
              placeholder="₹ 0.00" 
              value={formData.purchasePricePerBox}
              onChange={(e) => handleChange('purchasePricePerBox', e.target.value)}
              error={errors.purchasePricePerBox}
            />
            <Input 
              label="MRP (per Box)" 
              required 
              type="number"
              placeholder="₹ 0.00" 
              value={formData.mrpPerBox}
              onChange={(e) => handleChange('mrpPerBox', e.target.value)}
              error={errors.mrpPerBox}
            />
            <Input 
              label="Selling Price (per Box)" 
              required 
              type="number"
              placeholder="₹ 0.00" 
              value={formData.sellingPricePerBox}
              onChange={(e) => handleChange('sellingPricePerBox', e.target.value)}
              error={errors.sellingPricePerBox}
            />

            <Input 
              label="Purchase Price (per Smallest Unit)" 
              required 
              type="number"
              placeholder="₹ 0.00" 
              value={formData.purchasePricePerSmallestUnit}
              onChange={(e) => handleChange('purchasePricePerSmallestUnit', e.target.value)}
              error={errors.purchasePricePerSmallestUnit}
            />
            <Input 
              label="MRP (per Smallest Unit)" 
              required 
              type="number"
              placeholder="₹ 0.00" 
              value={formData.mrpPerSmallestUnit}
              onChange={(e) => handleChange('mrpPerSmallestUnit', e.target.value)}
              error={errors.mrpPerSmallestUnit}
            />
            <Input 
              label="Selling Price (per Smallest Unit)" 
              required 
              type="number"
              placeholder="₹ 0.00" 
              value={formData.sellingPricePerSmallestUnit}
              onChange={(e) => handleChange('sellingPricePerSmallestUnit', e.target.value)}
              error={errors.sellingPricePerSmallestUnit}
            />

            <Input 
              label="Rack / Location" 
              required 
              placeholder="Enter Rack / Location" 
              value={formData.rackLocation}
              onChange={(e) => handleChange('rackLocation', e.target.value)}
              error={errors.rackLocation}
            />
          </div>
        </div>
      </div>
    </div>
  )
});

BatchDetails.displayName = 'BatchDetails';
export default BatchDetails;