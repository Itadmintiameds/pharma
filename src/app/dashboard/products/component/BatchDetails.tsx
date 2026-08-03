import React, { useState, forwardRef, useImperativeHandle } from 'react';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';
import { BatchSchema, MIN_EXPIRY_MONTHS } from '@/app/schema/BatchSchema';
import { collectErrors, hasErrors } from '@/utils/formValidation';
import type { ProductBatchDetails } from '@/types/ProductData';
import { daysUntil } from '@/utils/productStock';
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

export interface BatchDetailsProps {
  /**
   * "new" (default) is the product-onboarding flow: the batch is always created
   * from scratch. "existing" adds a batch picker, so stock can be booked
   * against a batch the selected package already has.
   */
  mode?: 'new' | 'existing';
  /** Batches of the selected package. Only read when mode is "existing". */
  batches?: ProductBatchDetails[];
}

const ADD_NEW_BATCH = 'ADD_NEW';

const EMPTY_FORM = {
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
};

/** "" for null/undefined, so a locked input shows blank rather than "null". */
const str = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value);

const UNIT_OPTIONS = [
  { label: 'Box', value: 'BOX' },
  { label: 'Strip', value: 'STRIP' },
  { label: 'Bottle', value: 'BOTTLE' }
];

const BatchDetails = forwardRef<BatchDetailsRef, BatchDetailsProps>((
  { mode = 'new', batches = [] },
  ref
) => {
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  // "" = nothing picked yet, ADD_NEW_BATCH = create one, otherwise a batchId.
  const [selectedBatch, setSelectedBatch] = useState('');

  const isExistingMode = mode === 'existing';
  // Batch master data mirrors a saved batch and must not be edited.
  const isLocked = isExistingMode && !!selectedBatch && selectedBatch !== ADD_NEW_BATCH;
  // Shown but inert until the user says which batch the stock belongs to.
  const awaitingBatchChoice = isExistingMode && !selectedBatch;

  const batchOptions = [
    ...batches.map((batch) => ({ label: batch.batchNumber, value: batch.batchId })),
    { label: '+ Add New Batch', value: ADD_NEW_BATCH }
  ];

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
    // A locked batch only accepts the three purchase fields, which the schema
    // can't check in isolation — validate() covers them on submit instead.
    if (!isLocked) validateField(field, value);
  };

  /**
   * Picking a saved batch copies its master data in; "Add New Batch" clears it.
   * Purchase / free quantities are always left blank — they belong to this
   * purchase, not to the batch.
   */
  const handleBatchChange = (value: string) => {
    setSelectedBatch(value);
    setErrors({});

    const batch = batches.find((b) => b.batchId === value);
    if (!batch) {
      setFormData({ ...EMPTY_FORM });
      return;
    }

    setFormData({
      ...EMPTY_FORM,
      batchNumber: str(batch.batchNumber),
      manufacturingDate: str(batch.manufacturingDate),
      expiryDate: str(batch.expiryDate),
      purchaseUnit: str(batch.purchaseUnit),
      purchasePricePerBox: str(batch.purchasePrice),
      mrpPerBox: str(batch.mrp),
      sellingPricePerBox: str(batch.sellingPrice),
      purchasePricePerSmallestUnit: str(batch.purchasePricePerUnit),
      mrpPerSmallestUnit: str(batch.mrpPerUnit),
      sellingPricePerSmallestUnit: str(batch.sellingPricePerUnit),
      rackLocation: str(batch.rackLocation)
    });
  };

  /**
   * For a saved batch only the purchase fields are user-supplied, and of those
   * just the quantity is mandatory — free goods are optional.
   */
  const validatePurchaseFields = (): Record<string, string> => {
    const next: Record<string, string> = {};

    if (String(formData.purchaseQuantity).trim() === '') {
      next.purchaseQuantity = 'Purchase Quantity is required';
    } else if (Number(formData.purchaseQuantity) <= 0) {
      next.purchaseQuantity = 'Must be greater than 0';
    }

    if (String(formData.freeQuantity).trim() !== '' && Number(formData.freeQuantity) < 0) {
      next.freeQuantity = 'Cannot be negative';
    }

    return next;
  };

  useImperativeHandle(ref, () => ({
    getFormData: () => ({
      ...formData,
      // Empty unless a saved batch was picked — that is what tells the caller
      // no batch needs creating.
      batchId: isLocked ? selectedBatch : ''
    }),
    validate: () => {
      if (isExistingMode && !selectedBatch) {
        setErrors({ selectedBatch: 'Please select a batch or add a new one' });
        return false;
      }

      if (isLocked) {
        const nextErrors = validatePurchaseFields();
        setErrors(nextErrors);
        return !hasErrors(nextErrors);
      }

      // z.coerce.number() turns "" into 0, so the numeric fields need an
      // explicit presence check on top of the schema.
      const nextErrors = collectErrors(BatchSchema, formData, {
        purchaseUnit: 'Purchase Unit is required',
        purchaseQuantity: 'Purchase Quantity is required',
        purchasePricePerBox: 'Purchase Price (per Box) is required',
        mrpPerBox: 'MRP (per Box) is required',
        sellingPricePerBox: 'Selling Price (per Box) is required',
        purchasePricePerSmallestUnit: 'Purchase Price (per Smallest Unit) is required',
        mrpPerSmallestUnit: 'MRP (per Smallest Unit) is required',
        sellingPricePerSmallestUnit: 'Selling Price (per Smallest Unit) is required',
      });

      setErrors(nextErrors);
      return !hasErrors(nextErrors);
    }
  }));

  // Master-data fields: read-only for a saved batch, inert until one is chosen.
  const masterProps = isLocked
    ? { readOnly: true, disabled: true, className: 'bg-gray-50' }
    : { disabled: awaitingBatchChoice };

  // A saved batch's dates can't be edited here, so the expiry rule can only
  // warn rather than block.
  const lockedExpiryDays = isLocked && formData.expiryDate ? daysUntil(formData.expiryDate) : null;
  const expiryWarning =
    lockedExpiryDays === null
      ? ''
      : lockedExpiryDays < 0
        ? 'This batch has already expired.'
        : lockedExpiryDays <= MIN_EXPIRY_MONTHS * 30
          ? `This batch expires in ${lockedExpiryDays} days — under the ${MIN_EXPIRY_MONTHS}-month shelf-life guideline.`
          : '';

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-sm">
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <div className="flex w-full flex-1 flex-col gap-xlg overflow-y-auto rounded-[12px] border border-pneutral-100 bg-base-white p-[14px] shadow-sm">
          <h3 className="shrink-0 text-h6 font-semibold text-pneutral-900">
            Batch Details
          </h3>

          {expiryWarning && (
            <div className="rounded-lg border border-warning-600 bg-warning-50 px-3 py-2 text-p3 font-medium text-warning-600">
              {expiryWarning}
            </div>
          )}

          <div className="grid grid-cols-2 items-start gap-x-xlg gap-y-sm">
            {isExistingMode && (
              <Dropdown
                label="Batch Number"
                required
                placeholder="Select Batch"
                options={batchOptions}
                value={selectedBatch}
                onChange={handleBatchChange}
                error={errors.selectedBatch}
              />
            )}

            {/* Omitted when locked — the dropdown above already names the batch. */}
            {!isLocked && (
              <Input
                label="Batch Number"
                required
                placeholder="Enter Batch Number"
                value={formData.batchNumber}
                onChange={(e) => handleChange('batchNumber', e.target.value)}
                error={errors.batchNumber}
                disabled={awaitingBatchChoice}
              />
            )}

            <Input
              label="Manufacturing Date"
              type={isLocked ? 'text' : 'date'}
              placeholder="Enter Manufacturing Date"
              leftIcon={<CalendarIcon />}
              value={formData.manufacturingDate}
              onChange={(e) => handleChange('manufacturingDate', e.target.value)}
              error={errors.manufacturingDate}
              {...masterProps}
            />

            <Input
              label="Expiry Date"
              type={isLocked ? 'text' : 'date'}
              required={!isLocked}
              placeholder="Enter Expiry Date"
              leftIcon={<CalendarIcon />}
              value={formData.expiryDate}
              onChange={(e) => handleChange('expiryDate', e.target.value)}
              error={errors.expiryDate}
              {...masterProps}
            />

            {isLocked ? (
              // A saved batch stores its unit as free text, which won't match an
              // option value — show the stored text instead.
              <Input label="Purchase Unit" value={formData.purchaseUnit} {...masterProps} />
            ) : (
              <Dropdown
                label="Purchase Unit"
                required
                placeholder="Select Unit"
                options={UNIT_OPTIONS}
                value={formData.purchaseUnit}
                onChange={(val) => handleChange('purchaseUnit', val)}
                error={errors.purchaseUnit}
                disabled={awaitingBatchChoice}
              />
            )}

            {/* The three purchase fields stay editable for a saved batch. */}
            <Input
              label="Purchase Quantity"
              required
              type="number"
              placeholder="0"
              value={formData.purchaseQuantity}
              onChange={(e) => handleChange('purchaseQuantity', e.target.value)}
              error={errors.purchaseQuantity}
              disabled={awaitingBatchChoice}
            />
            <Dropdown
              label="Free Unit"
              placeholder="Select Unit"
              options={UNIT_OPTIONS}
              value={formData.freeUnit}
              onChange={(val) => handleChange('freeUnit', val)}
              error={errors.freeUnit}
              disabled={awaitingBatchChoice}
            />
            <Input
              label="Free Quantity"
              type="number"
              placeholder="0"
              value={formData.freeQuantity}
              onChange={(e) => handleChange('freeQuantity', e.target.value)}
              error={errors.freeQuantity}
              disabled={awaitingBatchChoice}
            />

            <Input
              label="Purchase Price (per Box)"
              required={!isLocked}
              type="number"
              placeholder="₹ 0.00"
              value={formData.purchasePricePerBox}
              onChange={(e) => handleChange('purchasePricePerBox', e.target.value)}
              error={errors.purchasePricePerBox}
              {...masterProps}
            />
            <Input
              label="MRP (per Box)"
              required={!isLocked}
              type="number"
              placeholder="₹ 0.00"
              value={formData.mrpPerBox}
              onChange={(e) => handleChange('mrpPerBox', e.target.value)}
              error={errors.mrpPerBox}
              {...masterProps}
            />
            <Input
              label="Selling Price (per Box)"
              required={!isLocked}
              type="number"
              placeholder="₹ 0.00"
              value={formData.sellingPricePerBox}
              onChange={(e) => handleChange('sellingPricePerBox', e.target.value)}
              error={errors.sellingPricePerBox}
              {...masterProps}
            />

            <Input
              label="Purchase Price (per Smallest Unit)"
              required={!isLocked}
              type="number"
              placeholder="₹ 0.00"
              value={formData.purchasePricePerSmallestUnit}
              onChange={(e) => handleChange('purchasePricePerSmallestUnit', e.target.value)}
              error={errors.purchasePricePerSmallestUnit}
              {...masterProps}
            />
            <Input
              label="MRP (per Smallest Unit)"
              required={!isLocked}
              type="number"
              placeholder="₹ 0.00"
              value={formData.mrpPerSmallestUnit}
              onChange={(e) => handleChange('mrpPerSmallestUnit', e.target.value)}
              error={errors.mrpPerSmallestUnit}
              {...masterProps}
            />
            <Input
              label="Selling Price (per Smallest Unit)"
              required={!isLocked}
              type="number"
              placeholder="₹ 0.00"
              value={formData.sellingPricePerSmallestUnit}
              onChange={(e) => handleChange('sellingPricePerSmallestUnit', e.target.value)}
              error={errors.sellingPricePerSmallestUnit}
              {...masterProps}
            />

            <Input
              label="Rack / Location"
              placeholder="Enter Rack / Location"
              value={formData.rackLocation}
              onChange={(e) => handleChange('rackLocation', e.target.value)}
              error={errors.rackLocation}
              {...masterProps}
            />
          </div>
        </div>
      </div>
    </div>
  )
});

BatchDetails.displayName = 'BatchDetails';
export default BatchDetails;
