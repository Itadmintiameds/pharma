import React, { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';
import { PackagingSchema } from '@/app/schema/PackagingSchema';
import { collectErrors, hasErrors } from '@/utils/formValidation';
import { usePurchaseSmallestUnits } from '@/hooks/usePurchaseSmallestUnits';
import { packageSmallestUnitName, type ProductPackageDetails } from '@/types/ProductData';
import { z } from 'zod';

export interface PackagingDetailsRef {
  getFormData: () => any;
  validate: () => boolean;
}

export interface PackagingDetailsProps {
  /** Drives the purchase-unit / smallest-unit master lookup. */
  categoryId?: number;
  /**
   * "new" (default) is the product-onboarding flow: the package is always
   * created from scratch. "existing" adds a package picker on top, so stock can
   * be booked against a package the product already has.
   */
  mode?: 'new' | 'existing';
  /** Packages already on the product. Only read when mode is "existing". */
  packages?: ProductPackageDetails[];
  /**
   * Fires with the chosen packagingId, or null for "Add New Package". The
   * parent needs this reactively to drive the batch picker; getFormData() is
   * only readable on demand.
   */
  onPackageChange?: (packagingId: string | null) => void;
  /**
   * Fires whenever the unit pairing changes. The batch form needs all three:
   * the purchase unit to show read-only, and the smallest unit plus pack size
   * to label and derive its per-smallest-unit prices.
   */
  onUnitsChange?: (units: PackagingUnits) => void;
}

/** The unit pairing a batch is priced against. */
export interface PackagingUnits {
  purchaseUnit: string;
  smallestUnit: string;
  /** How many smallest units one purchase unit holds; "" until entered. */
  unitContains: string;
}

/** Dropdown label for an existing package, e.g. "1X10 Box". */
export const packageLabel = (pkg: ProductPackageDetails) =>
  `1X${pkg.purchaseUnitContains} ${pkg.purchaseUnit}`;

const ADD_NEW_PACKAGE = 'ADD_NEW';

const PackagingDetails = forwardRef<PackagingDetailsRef, PackagingDetailsProps>((
  { categoryId, mode = 'new', packages = [], onPackageChange, onUnitsChange },
  ref
) => {
  const [purchaseUnit, setPurchaseUnit] = useState('');
  const [eachStripContains, setEachStripContains] = useState<string>('');
  const [smallestUnit, setSmallestUnit] = useState('');
  // The master row id for the chosen pairing — this is what the payload sends.
  const [purchaseSmallestUnitId, setPurchaseSmallestUnitId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { units: unitPairs, isLoading: isLoadingUnits } = usePurchaseSmallestUnits(categoryId);
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

  // One master row per pairing, so the purchase units are the distinct names.
  const purchaseUnitOptions = useMemo(() => {
    const names = Array.from(new Set(unitPairs.map((pair) => pair.purchaseUnitName)));
    return names.map((name) => ({ label: name, value: name }));
  }, [unitPairs]);

  // Smallest units are whatever pairs with the chosen purchase unit.
  const smallestUnitOptions = useMemo(
    () =>
      unitPairs
        .filter((pair) => pair.purchaseUnitName === purchaseUnit)
        .map((pair) => ({
          label: pair.purchaseSmallestUnitName,
          value: String(pair.purchaseSmallestUnitId),
        })),
    [unitPairs, purchaseUnit]
  );

  // Changing the purchase unit invalidates the smallest unit paired with it.
  const handlePurchaseUnitChange = (value: string) => {
    setPurchaseUnit(value);
    setSmallestUnit('');
    setPurchaseSmallestUnitId('');
    setErrors((prev) => ({ ...prev, purchaseUnit: '', smallestUnit: '' }));
  };

  const handleSmallestUnitChange = (value: string) => {
    setPurchaseSmallestUnitId(value);
    const pair = unitPairs.find((p) => String(p.purchaseSmallestUnitId) === value);
    setSmallestUnit(pair?.purchaseSmallestUnitName ?? '');
    setErrors((prev) => ({ ...prev, smallestUnit: '' }));
  };

  // Picking a saved package fills the three fields from it; "Add New" clears them.
  const handlePackageChange = (value: string) => {
    setSelectedPackage(value);
    setErrors((prev) => ({ ...prev, selectedPackage: '' }));

    const pkg = packages.find((p) => p.packagingId === value);
    if (pkg) {
      setPurchaseUnit(pkg.purchaseUnit);
      setEachStripContains(String(pkg.purchaseUnitContains));
      setSmallestUnit(packageSmallestUnitName(pkg, unitPairs));
      setErrors({});
    } else {
      setPurchaseUnit('');
      setEachStripContains('');
      setSmallestUnit('');
    }
    // A saved package is identified by packagingId, not by a master pairing.
    setPurchaseSmallestUnitId('');

    onPackageChange?.(pkg ? pkg.packagingId : null);
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

  // Values are the master's unit names, so this doubles as the field label
  // ("Each Strip Contains") for both a fresh pick and a saved package.
  const purchaseUnitLabel = purchaseUnit || 'Unit';

  // Derived, not read from state, so a saved package's smallest unit still
  // resolves when the unit master finishes loading after the package was picked.
  const lockedPackage = isLocked
    ? packages.find((pkg) => pkg.packagingId === selectedPackage)
    : undefined;
  const displaySmallestUnit = isLocked
    ? packageSmallestUnitName(lockedPackage, unitPairs) || smallestUnit
    : smallestUnit;

  /**
   * Reported from an effect rather than each handler: the smallest unit is
   * derived (it can resolve late, once the unit master loads) and the pack size
   * has its own input, so there is no single place all three settle.
   */
  const onUnitsChangeRef = useRef(onUnitsChange);
  onUnitsChangeRef.current = onUnitsChange;

  useEffect(() => {
    onUnitsChangeRef.current?.({
      purchaseUnit,
      smallestUnit: displaySmallestUnit,
      unitContains: eachStripContains,
    });
  }, [purchaseUnit, displaySmallestUnit, eachStripContains]);

  useImperativeHandle(ref, () => ({
    getFormData: () => ({
      purchaseUnit,
      eachStripContains,
      smallestUnit: displaySmallestUnit,
      // The master pairing id — what /product/onboard and /{id}/package expect.
      purchaseSmallestUnitId,
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
        { purchaseUnit, eachStripContains, purchaseSmallestUnitId },
        {
          purchaseUnit: 'Purchase Unit is required',
          eachStripContains: `Each ${purchaseUnitLabel} Contains is required`,
          purchaseSmallestUnitId: 'Smallest Unit is required',
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
                  value={displaySmallestUnit}
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
                  onChange={handlePurchaseUnitChange}
                  error={errors.purchaseUnit}
                  isLoading={isLoadingUnits}
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
                  placeholder={purchaseUnit ? 'Select Smallest Unit' : 'Select a Purchase Unit first'}
                  options={smallestUnitOptions}
                  value={purchaseSmallestUnitId}
                  onChange={handleSmallestUnitChange}
                  menuPlacement="top"
                  error={errors.purchaseSmallestUnitId}
                  // Only the units paired with the chosen purchase unit are valid.
                  disabled={awaitingPackageChoice || !purchaseUnit}
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