import React, { useState, forwardRef, useImperativeHandle } from 'react';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';
import { PackagingSchema } from '@/app/schema/PackagingSchema';
import { collectErrors, hasErrors } from '@/utils/formValidation';
import type { ProductPackageDetails } from '@/types/ProductData';
import { z } from 'zod';

export interface PackagingDetailsRef {
  getFormData: () => any;
  validate: () => boolean;
}

export interface PackagingDetailsProps {
  /**
   * "new" (default) is the product-onboarding flow: the package is always
   * created from scratch. "existing" adds a package picker on top, so stock can
   * be booked against a package the product already has.
   */
  mode?: 'new' | 'existing';
  /** Packages already on the product. Only read when mode is "existing". */
  packages?: ProductPackageDetails[];
}

/** Dropdown label for an existing package, e.g. "1X10 Box". */
export const packageLabel = (pkg: ProductPackageDetails) =>
  `1X${pkg.purchaseUnitContains} ${pkg.purchaseUnit}`;

const ADD_NEW_PACKAGE = 'ADD_NEW';

const PackagingDetails = forwardRef<PackagingDetailsRef, PackagingDetailsProps>((
  { mode = 'new', packages = [] },
  ref
) => {
  const [purchaseUnit, setPurchaseUnit] = useState('');
  const [eachStripContains, setEachStripContains] = useState<string>('');
  const [smallestUnit, setSmallestUnit] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  // "" = nothing picked yet, ADD_NEW_PACKAGE = create one, otherwise a packagingId.
  const [selectedPackage, setSelectedPackage] = useState('');

  const isExistingMode = mode === 'existing';
  // Fields mirror a saved package and must not be edited.
  const isLocked = isExistingMode && !!selectedPackage && selectedPackage !== ADD_NEW_PACKAGE;
  // Shown but inert until the user says which package the stock belongs to.
  const awaitingPackageChoice = isExistingMode && !selectedPackage;

  const packageOptions = [
    ...packages.map((pkg) => ({ label: packageLabel(pkg), value: pkg.packagingId })),
    { label: '+ Add New Package', value: ADD_NEW_PACKAGE },
  ];

  // Picking a saved package fills the three fields from it; "Add New" clears them.
  const handlePackageChange = (value: string) => {
    setSelectedPackage(value);
    setErrors((prev) => ({ ...prev, selectedPackage: '' }));

    const pkg = packages.find((p) => p.packagingId === value);
    if (pkg) {
      setPurchaseUnit(pkg.purchaseUnit);
      setEachStripContains(String(pkg.purchaseUnitContains));
      setSmallestUnit(pkg.smallestUnit);
      setErrors({});
    } else {
      setPurchaseUnit('');
      setEachStripContains('');
      setSmallestUnit('');
    }
  };

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

  const purchaseUnitOptions = [
    { label: 'Box', value: 'BOX' },
    { label: 'Carton', value: 'CARTON' }
  ];

  const selectedPurchaseUnit = purchaseUnitOptions.find(opt => opt.value === purchaseUnit);
  // A saved package stores its unit as free text ("Box", "BOTTLE"), which won't
  // match an option value — fall back to the stored text before "Unit".
  const purchaseUnitLabel =
    selectedPurchaseUnit?.label ?? (isLocked && purchaseUnit ? purchaseUnit : 'Unit');

  useImperativeHandle(ref, () => ({
    getFormData: () => ({
      purchaseUnit,
      eachStripContains,
      smallestUnit,
      // Empty unless an existing package was picked — that is what tells the
      // caller to POST a batch rather than a whole new package.
      packagingId: isLocked ? selectedPackage : ''
    }),
    validate: () => {
      if (isExistingMode && !selectedPackage) {
        setErrors({ selectedPackage: 'Please select a package or add a new one' });
        return false;
      }

      // A saved package is already valid by definition; nothing to re-check.
      if (isLocked) {
        setErrors({});
        return true;
      }

      const nextErrors = collectErrors(
        PackagingSchema,
        { purchaseUnit, eachStripContains, smallestUnit },
        {
          purchaseUnit: 'Purchase Unit is required',
          eachStripContains: `Each ${purchaseUnitLabel} Contains is required`,
          smallestUnit: 'Smallest Unit is required',
        }
      );

      setErrors(nextErrors);
      return !hasErrors(nextErrors);
    }
  }));

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-sm">
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <div className="flex w-full flex-1 flex-col gap-xlg overflow-y-auto rounded-[12px] border border-pneutral-100 bg-white p-[14px] shadow-sm">
          <h3 className="shrink-0 text-h6 font-semibold text-pneutral-900">
            Packaging & Order Details
          </h3>

          <div className="grid grid-cols-2 items-start gap-x-xlg gap-y-sm">
            {isExistingMode && (
              <Dropdown
                label="Package"
                required
                placeholder="Select Package"
                options={packageOptions}
                value={selectedPackage}
                onChange={handlePackageChange}
                error={errors.selectedPackage}
              />
            )}

            {isLocked ? (
              // Saved package: units come straight from the API and may not be
              // in the option lists, so show the stored text instead.
              <>
                <Input
                  label="Purchase Unit"
                  value={purchaseUnit}
                  readOnly
                  disabled
                  className="bg-gray-50"
                />
                <Input
                  label={`Each ${purchaseUnitLabel} Contains`}
                  value={eachStripContains}
                  readOnly
                  disabled
                  className="bg-gray-50"
                />
                <Input
                  label="Select Unit(Smallest)"
                  value={smallestUnit}
                  readOnly
                  disabled
                  className="bg-gray-50"
                />
              </>
            ) : (
              <>
                <Dropdown
                  label="Purchase Unit"
                  required
                  placeholder="Select Unit"
                  options={purchaseUnitOptions}
                  value={purchaseUnit}
                  onChange={(val) => setPurchaseUnit(val)}
                  error={errors.purchaseUnit}
                  disabled={awaitingPackageChoice}
                />

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
                  disabled={awaitingPackageChoice}
                  className={awaitingPackageChoice ? 'bg-gray-50 opacity-60' : undefined}
                />

                <Dropdown
                  label="Select Unit(Smallest)"
                  required
                  placeholder="Select Smallest Unit"
                  options={[{ label: 'Tablet', value: 'TABLET' }, { label: 'Capsule', value: 'CAPSULE' }, { label: 'Strip', value: 'STRIP' }]}
                  value={smallestUnit}
                  onChange={(val) => setSmallestUnit(val)}
                  menuPlacement="top"
                  error={errors.smallestUnit}
                  disabled={awaitingPackageChoice}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

PackagingDetails.displayName = 'PackagingDetails';
export default PackagingDetails;