import React, { useState, forwardRef, useImperativeHandle } from 'react';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';
import { PackagingSchema } from '@/app/schema/PackagingSchema';
import { z } from 'zod';

export interface PackagingDetailsRef {
  getFormData: () => any;
}

const PackagingDetails = forwardRef<PackagingDetailsRef>((props, ref) => {
  const [purchaseUnit, setPurchaseUnit] = useState('');
  const [eachStripContains, setEachStripContains] = useState<string>('');
  const [smallestUnit, setSmallestUnit] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (value: string) => {
    try {
      PackagingSchema.pick({ eachStripContains: true }).parse({ eachStripContains: Number(value) });
      setErrors(prev => ({ ...prev, eachStripContains: '' }));
    } catch (error) {
      if (error instanceof z.ZodError) {
        const zodError = error as z.ZodError;
        setErrors(prev => ({ ...prev, eachStripContains: zodError.issues[0].message }));
      }
    }
  };

  useImperativeHandle(ref, () => ({
    getFormData: () => ({
      purchaseUnit,
      eachStripContains,
      smallestUnit
    })
  }));

  const purchaseUnitOptions = [
    { label: 'Box', value: 'BOX' },
    { label: 'Carton', value: 'CARTON' }
  ];

  const selectedPurchaseUnit = purchaseUnitOptions.find(opt => opt.value === purchaseUnit);
  const purchaseUnitLabel = selectedPurchaseUnit ? selectedPurchaseUnit.label : 'Unit';

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-sm">
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <div className="flex w-full flex-1 flex-col gap-xlg overflow-y-auto rounded-[12px] border border-pneutral-100 bg-white p-[14px] shadow-sm">
          <h3 className="shrink-0 text-h6 font-semibold text-pneutral-900">
            Packaging & Order Details
          </h3>

          <div className="grid grid-cols-2 items-start gap-x-xlg gap-y-sm">
            <Dropdown
              label="Purchase Unit"
              required
              placeholder="Select Unit"
              options={purchaseUnitOptions}
              value={purchaseUnit}
              onChange={(val) => setPurchaseUnit(val)}
            />

            {/*
            <Input 
              label="Contains" 
              type="number" 
              required 
              placeholder="Enter number" 
            />

            <Dropdown
              label="Secondary Unit"
              required
              placeholder="Select Secondary Unit"
              options={[{ label: 'Strip', value: 'strip' }, { label: 'Bottle', value: 'bottle' }]}
              value=""
              onChange={() => {}}
            />
            */}

            <Input 
              label={`Each ${purchaseUnitLabel} Contains`} 
              type="number" 
              required 
              placeholder="Enter number" 
              value={eachStripContains}
              onChange={(e) => {
                const val = e.target.value;
                setEachStripContains(val);
                validateField(val);
              }}
              error={errors.eachStripContains}
            />

            <Dropdown
              label="Select Unit(Smallest)"
              required
              placeholder="Select Smallest Unit"
              options={[{ label: 'Tablet', value: 'TABLET' }, { label: 'Capsule', value: 'CAPSULE' }, { label: 'Strip', value: 'STRIP' }]}
              value={smallestUnit}
              onChange={(val) => setSmallestUnit(val)}
              menuPlacement="top"
            />
          </div>
        </div>
      </div>
    </div>
  );
});

PackagingDetails.displayName = 'PackagingDetails';
export default PackagingDetails;