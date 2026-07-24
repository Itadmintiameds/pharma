import React from 'react';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';

const PackagingDetails = () => {
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
              options={[{ label: 'Box', value: 'box' }, { label: 'Carton', value: 'carton' }]}
              value=""
              onChange={() => {}}
            />
            
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

            <Input 
              label="Each Strip Contains" 
              type="number" 
              required 
              placeholder="Enter number" 
            />

            <Dropdown
              label="Select Unit(Smallest)"
              required
              placeholder="Select Smallest Unit"
              options={[{ label: 'Tablet', value: 'tablet' }, { label: 'Capsule', value: 'capsule' }]}
              value=""
              onChange={() => {}}
              menuPlacement="top"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackagingDetails;