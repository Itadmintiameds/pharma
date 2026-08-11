import React, { useMemo, useState, forwardRef, useImperativeHandle } from 'react';
import { X } from 'lucide-react';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';
import { BatchSchema, MIN_EXPIRY_MONTHS } from '@/app/schema/BatchSchema';
import { collectErrors, hasErrors } from '@/utils/formValidation';
import type { ProductBatchDetails } from '@/types/ProductData';
import { daysUntil } from '@/utils/productStock';
import { ProductService } from '@/services/ProductService';
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
  /**
   * Purchase unit of the selected package. A batch is always bought in its
   * package's unit, so the field is read-only and mirrors this.
   */
  purchaseUnit?: string;
  /** Smallest unit of the selected package — labels the per-unit price fields. */
  smallestUnit?: string;
  /**
   * How many smallest units one purchase unit holds, from the packaging step.
   * The per-unit prices are divided down by this.
   */
  unitContains?: string;
  /** Product the batch is being added under — needed to check for duplicate batch numbers. */
  productId?: string;
  /** Package the batch is being added under — needed to check for duplicate batch numbers. */
  packagingId?: string;
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

/**
 * Each price is entered per purchase unit and derived per smallest unit, so the
 * two are always in step.
 */
const PER_UNIT_FIELD = {
  purchasePricePerBox: 'purchasePricePerSmallestUnit',
  mrpPerBox: 'mrpPerSmallestUnit',
  sellingPricePerBox: 'sellingPricePerSmallestUnit',
} as const;

type PerBoxField = keyof typeof PER_UNIT_FIELD;

/** Money, so two decimals — and no trailing zeros on a value that divides evenly. */
const divideToUnit = (perBox: string, unitCount: number): string => {
  if (perBox.trim() === '' || !Number.isFinite(Number(perBox))) return '';
  return String(Math.round((Number(perBox) / unitCount) * 100) / 100);
};

/**
 * The date inputs only collect a month and year ("YYYY-MM"), but the backend
 * stores a real calendar date — so a batch is recorded as manufactured on the
 * 1st and expiring on the last day of the picked month.
 */
const toFirstOfMonth = (monthYear: string): string => {
  const match = /^(\d{4})-(\d{2})$/.exec(monthYear);
  return match ? `${match[1]}-${match[2]}-01` : monthYear;
};

const toLastOfMonth = (monthYear: string): string => {
  const match = /^(\d{4})-(\d{2})$/.exec(monthYear);
  if (!match) return monthYear;
  const lastDay = new Date(Number(match[1]), Number(match[2]), 0).getDate();
  return `${match[1]}-${match[2]}-${String(lastDay).padStart(2, '0')}`;
};


const BatchDetails = forwardRef<BatchDetailsRef, BatchDetailsProps>((
  { mode = 'new', batches = [], purchaseUnit = '', smallestUnit = '', unitContains = '', productId = '', packagingId = '' },
  ref
) => {
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  // "" = nothing picked yet, ADD_NEW_BATCH = create one, otherwise a batchId.
  const [selectedBatch, setSelectedBatch] = useState('');
  // Set by the duplicate check below; kept separate from `errors` so a passing
  // schema re-validation doesn't silently wipe it out.
  const [batchExistsError, setBatchExistsError] = useState('');
  const [isCheckingBatch, setIsCheckingBatch] = useState(false);

  const isExistingMode = mode === 'existing';
  // Batch master data mirrors a saved batch and must not be edited.
  const isLocked = isExistingMode && !!selectedBatch && selectedBatch !== ADD_NEW_BATCH;
  // Shown but inert until the user says which batch the stock belongs to.
  const awaitingBatchChoice = isExistingMode && !selectedBatch;
  /**
   * Adding a batch takes over the picker's own slot rather than putting a
   * second "Batch Number" field beside it — with a way back to the saved
   * batches.
   */
  const isAddingNewBatch = isExistingMode && selectedBatch === ADD_NEW_BATCH;

  /**
   * Never user-editable: a saved batch keeps the unit it was recorded with,
   * anything new inherits the unit chosen on the packaging step.
   */
  const effectivePurchaseUnit = isLocked ? formData.purchaseUnit : purchaseUnit;

  // Labels fall back to generic wording until the packaging step is filled in.
  const purchaseUnitLabel = effectivePurchaseUnit || 'Purchase Unit';
  const smallestUnitLabel = smallestUnit || 'Smallest Unit';

  const unitCount = Number(unitContains) > 0 ? Number(unitContains) : 0;
  // A saved batch carries its own per-unit prices; only a new one is derived.
  const isDerived = unitCount > 0 && !isLocked;

  /**
   * Computed on every render rather than stored, so the per-unit prices follow
   * both the price entered above and a pack size edited afterwards.
   */
  const resolvedFormData = useMemo(() => {
    if (!isDerived) return formData;
    const next = { ...formData };
    (Object.keys(PER_UNIT_FIELD) as PerBoxField[]).forEach((field) => {
      next[PER_UNIT_FIELD[field]] = divideToUnit(formData[field], unitCount);
    });
    return next;
  }, [formData, isDerived, unitCount]);

  /**
   * Free goods come in the same unit the stock was bought in, so the only
   * option is the package's purchase unit. Still a dropdown rather than a
   * read-only field, because free quantity is optional — the user may leave it
   * unset. The unit name itself is stored, as before.
   */
  const freeUnitOptions = effectivePurchaseUnit
    ? [{ label: effectivePurchaseUnit, value: effectivePurchaseUnit }]
    : [];

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
    if (!isLocked) {
      validateField(field, value);
      // The paired per-unit field follows this one, so its error is stale now.
      const derivedField = PER_UNIT_FIELD[field as PerBoxField];
      if (derivedField && isDerived) setErrors(prev => ({ ...prev, [derivedField]: '' }));
    }
    // Free quantity and free unit are judged together, so filling one can
    // settle the complaint standing against the other. Only ever clears —
    // raising the error mid-entry would flag the half not typed yet.
    if (field === 'freeQuantity' || field === 'freeUnit') {
      const pair = freeGoodsErrors(
        field === 'freeQuantity' ? value : formData.freeQuantity,
        field === 'freeUnit' ? value : formData.freeUnit
      );
      setErrors(prev => ({
        ...prev,
        freeUnit: pair.freeUnit ? prev.freeUnit : '',
        freeQuantity: pair.freeQuantity ? prev.freeQuantity : ''
      }));
    }

    // The batch number just changed, so any prior duplicate check is stale.
    if (field === 'batchNumber' && batchExistsError) setBatchExistsError('');
  };

  /**
   * A batch number only needs to be unique within the same product + package —
   * checked against the backend rather than the batches already loaded, since
   * those may not cover every batch on record.
   */
  const checkBatchNumberExists = async (batchNumber: string) => {
    const trimmed = batchNumber.trim();
    if (isLocked || !trimmed || !productId || !packagingId) return;

    setIsCheckingBatch(true);
    try {
      const exists = await ProductService.checkBatchExists(trimmed, productId, packagingId);
      setBatchExistsError(exists ? 'This batch number already exists for the selected product and packaging' : '');
    } catch (error) {
      console.error('Error checking batch number:', error);
    } finally {
      setIsCheckingBatch(false);
    }
  };

  /**
   * Picking a saved batch copies its master data in; "Add New Batch" clears it.
   * Purchase / free quantities are always left blank — they belong to this
   * purchase, not to the batch.
   */
  const handleBatchChange = (value: string) => {
    setSelectedBatch(value);
    setErrors({});
    setBatchExistsError('');

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
   * Free goods are optional as a pair, but half a pair says nothing: a
   * quantity with no unit can't be received, and a unit with no quantity
   * receives nothing. The schema can't express this — `z.coerce.number()`
   * turns a blank quantity into 0, so by then "left empty" and "typed 0" look
   * the same. Checked here, against the raw strings, instead.
   */
  const freeGoodsErrors = (
    freeQuantity: string,
    freeUnit: string
  ): Record<string, string> => {
    const next: Record<string, string> = {};

    const quantity = String(freeQuantity).trim();
    const unit = String(freeUnit).trim();
    const hasQuantity = quantity !== '' && Number(quantity) > 0;

    if (hasQuantity && !unit) {
      next.freeUnit = 'Free Unit is required when a free quantity is entered';
    }

    if (unit && !hasQuantity) {
      next.freeQuantity = 'Free Quantity is required when a free unit is selected';
    }

    return next;
  };

  const validateFreeGoods = () =>
    freeGoodsErrors(formData.freeQuantity, formData.freeUnit);

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

    // The negative-quantity message is the more specific one, so it wins.
    return { ...validateFreeGoods(), ...next };
  };

  useImperativeHandle(ref, () => ({
    getFormData: () => ({
      ...resolvedFormData,
      purchaseUnit: effectivePurchaseUnit,
      // A locked batch's dates already came from the backend as full dates;
      // only the month/year picked for a new batch needs expanding.
      manufacturingDate: isLocked || !resolvedFormData.manufacturingDate
        ? resolvedFormData.manufacturingDate
        : toFirstOfMonth(resolvedFormData.manufacturingDate),
      expiryDate: isLocked || !resolvedFormData.expiryDate
        ? resolvedFormData.expiryDate
        : toLastOfMonth(resolvedFormData.expiryDate),
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
      // purchaseUnit comes from the packaging step, not from this form.
      const nextErrors = collectErrors(
        BatchSchema,
        { ...resolvedFormData, purchaseUnit: effectivePurchaseUnit },
        {
          purchaseUnit: 'Select a Purchase Unit on the packaging step first',
          purchaseQuantity: 'Purchase Quantity is required',
          purchasePricePerBox: `Purchase Price (per ${purchaseUnitLabel}) is required`,
          mrpPerBox: `MRP (per ${purchaseUnitLabel}) is required`,
          sellingPricePerBox: `Selling Price (per ${purchaseUnitLabel}) is required`,
          purchasePricePerSmallestUnit: `Purchase Price (per ${smallestUnitLabel}) is required`,
          mrpPerSmallestUnit: `MRP (per ${smallestUnitLabel}) is required`,
          sellingPricePerSmallestUnit: `Selling Price (per ${smallestUnitLabel}) is required`,
        }
      );

      Object.assign(nextErrors, validateFreeGoods());

      // A duplicate found on blur takes priority over the schema's own message.
      if (batchExistsError) nextErrors.batchNumber = batchExistsError;

      setErrors(nextErrors);
      return !hasErrors(nextErrors);
    }
  }));

  // Master-data fields: read-only for a saved batch, inert until one is chosen.
  const masterProps = isLocked
    ? { readOnly: true, disabled: true, className: 'bg-gray-50' }
    : { disabled: awaitingBatchChoice };

  // Per-unit prices are computed from the per-purchase-unit ones whenever the
  // pack size is known, so they stay read-only rather than drifting apart.
  const derivedProps = isDerived
    ? { readOnly: true, disabled: true, className: 'bg-gray-50' }
    : masterProps;

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
            {/* The picker and the new-batch field share one slot. */}
            {isExistingMode && !isAddingNewBatch && (
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
            {!isLocked && !awaitingBatchChoice && (
              <Input
                label="Batch Number"
                required
                placeholder="Enter Batch Number"
                value={formData.batchNumber}
                onChange={(e) => handleChange('batchNumber', e.target.value)}
                onBlur={(e) => checkBatchNumberExists(e.target.value)}
                error={errors.batchNumber || batchExistsError}
                hint={isCheckingBatch ? 'Checking batch number…' : undefined}
                rightIcon={
                  isAddingNewBatch ? (
                    <button
                      type="button"
                      aria-label="Pick a saved batch instead"
                      title="Pick a saved batch instead"
                      onClick={() => handleBatchChange('')}
                      className="flex items-center text-pneutral-500 transition-colors hover:text-pneutral-900"
                    >
                      <X size={16} />
                    </button>
                  ) : undefined
                }
              />
            )}

            <Input
              label="Manufacturing Date"
              type={isLocked ? 'text' : 'month'}
              placeholder="Select Month & Year"
              leftIcon={<CalendarIcon />}
              value={formData.manufacturingDate}
              onChange={(e) => handleChange('manufacturingDate', e.target.value)}
              error={errors.manufacturingDate}
              {...masterProps}
            />

            <Input
              label="Expiry Date"
              type={isLocked ? 'text' : 'month'}
              required={!isLocked}
              placeholder="Select Month & Year"
              leftIcon={<CalendarIcon />}
              value={formData.expiryDate}
              onChange={(e) => handleChange('expiryDate', e.target.value)}
              error={errors.expiryDate}
              {...masterProps}
            />

            {/* Always read-only: inherited from the package, never picked here. */}
            <Input
              label="Purchase Unit"
              value={effectivePurchaseUnit}
              placeholder="Set on the packaging step"
              readOnly
              disabled
              className="bg-gray-50"
              error={errors.purchaseUnit}
            />

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
              options={freeUnitOptions}
              value={formData.freeUnit}
              onChange={(val) => handleChange('freeUnit', val)}
              error={errors.freeUnit}
              disabled={awaitingBatchChoice}
              // Free goods are optional, and there is only one unit to pick —
              // so taking the pick back has to be possible.
              clearable
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
              label={`Purchase Price (per ${purchaseUnitLabel})`}
              required={!isLocked}
              type="number"
              placeholder="₹ 0.00"
              value={formData.purchasePricePerBox}
              onChange={(e) => handleChange('purchasePricePerBox', e.target.value)}
              error={errors.purchasePricePerBox}
              {...masterProps}
            />
            <Input
              label={`MRP (per ${purchaseUnitLabel})`}
              required={!isLocked}
              type="number"
              placeholder="₹ 0.00"
              value={formData.mrpPerBox}
              onChange={(e) => handleChange('mrpPerBox', e.target.value)}
              error={errors.mrpPerBox}
              {...masterProps}
            />
            <Input
              label={`Selling Price (per ${purchaseUnitLabel})`}
              required={!isLocked}
              type="number"
              placeholder="₹ 0.00"
              value={formData.sellingPricePerBox}
              onChange={(e) => handleChange('sellingPricePerBox', e.target.value)}
              error={errors.sellingPricePerBox}
              {...masterProps}
            />

            <Input
              label={`Purchase Price (per ${smallestUnitLabel})`}
              required={!isLocked}
              type="number"
              placeholder="₹ 0.00"
              value={resolvedFormData.purchasePricePerSmallestUnit}
              onChange={(e) => handleChange('purchasePricePerSmallestUnit', e.target.value)}
              error={errors.purchasePricePerSmallestUnit}
              {...derivedProps}
            />
            <Input
              label={`MRP (per ${smallestUnitLabel})`}
              required={!isLocked}
              type="number"
              placeholder="₹ 0.00"
              value={resolvedFormData.mrpPerSmallestUnit}
              onChange={(e) => handleChange('mrpPerSmallestUnit', e.target.value)}
              error={errors.mrpPerSmallestUnit}
              {...derivedProps}
            />
            <Input
              label={`Selling Price (per ${smallestUnitLabel})`}
              required={!isLocked}
              type="number"
              placeholder="₹ 0.00"
              value={resolvedFormData.sellingPricePerSmallestUnit}
              onChange={(e) => handleChange('sellingPricePerSmallestUnit', e.target.value)}
              error={errors.sellingPricePerSmallestUnit}
              {...derivedProps}
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
