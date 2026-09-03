import React, { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { X } from 'lucide-react';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';
import { PackagingSchema } from '@/app/schema/PackagingSchema';
import { collectErrors, hasErrors } from '@/utils/formValidation';
import { usePurchaseSmallestUnits } from '@/hooks/usePurchaseSmallestUnits';
import { packageSmallestUnitName, type ProductPackageDetails, type PurchaseSmallestUnit } from '@/types/ProductData';
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

/**
 * Dropdown label for an existing package, e.g. "1X10 Strip : Capsule".
 *
 * The smallest unit is part of the label because it is part of what makes a
 * package distinct: a product can hold 1X10 Strip of capsules and 1X10 Strip of
 * tablets, and without it both read as "1X10 Strip" and the list looks like the
 * same entry three times over.
 *
 * It needs the unit master because the API does not always send the name — see
 * packageSmallestUnitName — so a package whose pairing has not resolved yet
 * falls back to the bare "1X10 Strip" rather than showing a dangling colon.
 */
export const packageLabel = (
  pkg: ProductPackageDetails,
  unitPairs: PurchaseSmallestUnit[] = []
) => {
  const base = `1X${pkg.purchaseUnitContains} ${pkg.purchaseUnit}`;
  const smallest = packageSmallestUnitName(pkg, unitPairs);
  return smallest ? `${base} : ${smallest}` : base;
};

const ADD_NEW_PACKAGE = 'ADD_NEW';

/** Unit names come from a master list, so only case and stray space can differ. */
const sameUnitName = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

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
  /**
   * Adding a package takes over the picker's own slot: the label turns from
   * "Package" into "Purchase Unit" and the field becomes the unit dropdown,
   * with a way back to the saved packages. No second field appears beside it.
   */
  const isAddingNewPackage = isExistingMode && selectedPackage === ADD_NEW_PACKAGE;

  const packageOptions = [
    ...packages.map((pkg) => ({
      label: packageLabel(pkg, unitPairs),
      value: pkg.packagingId,
    })),
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
    const name = pair?.purchaseSmallestUnitName ?? '';
    setSmallestUnit(name);
    setErrors((prev) => ({
      ...prev,
      smallestUnit: '',
      // A pairing of the same unit both ways fixes the pack size at 1, so any
      // standing complaint about that field is settled by this pick alone.
      eachStripContains:
        !!purchaseUnit && !!name && sameUnitName(purchaseUnit, name)
          ? ''
          : prev.eachStripContains,
    }));
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

  /**
   * The package is bought and sold in the same unit — a Bottle of Bottle, a
   * Piece of Piece. One purchase unit then holds exactly one sellable unit by
   * definition, so the pack size is not something to be typed: it is 1, and
   * anything else the user could enter would be wrong. Filled in and locked
   * rather than hidden, so the payload still carries the 1 the backend expects
   * and the form still reads as the three fields it has everywhere else.
   */
  const isSelfContained =
    !isLocked &&
    !!purchaseUnit &&
    !!smallestUnit &&
    sameUnitName(purchaseUnit, smallestUnit);

  /**
   * The pack size everything downstream uses — the field, the duplicate check,
   * the validation and the payload.
   *
   * Derived rather than written into state, so a pairing that stops matching
   * cannot leave a stray "1" behind as the pack size of the Bottle : ml the
   * user moved on to; and anything typed before the units happened to match is
   * still there if they stop matching again.
   */
  const effectiveContains = isSelfContained ? '1' : eachStripContains;

  // Derived, not read from state, so a saved package's smallest unit still
  // resolves when the unit master finishes loading after the package was picked.
  const lockedPackage = isLocked
    ? packages.find((pkg) => pkg.packagingId === selectedPackage)
    : undefined;
  const displaySmallestUnit = isLocked
    ? packageSmallestUnitName(lockedPackage, unitPairs) || smallestUnit
    : smallestUnit;

  /**
   * The saved package the fields currently spell out, if any.
   *
   * A package is identified by all three of purchase unit, pack size and
   * smallest unit — which is exactly what the dropdown labels now show — so
   * re-entering "1X10 Strip : Tablet" against a product that already has it
   * would create a second package the counter cannot tell apart from the first.
   * Case and surrounding space are ignored: the unit names come from a master
   * list, but the pack size is typed.
   *
   * Only meaningful while adding: picking a saved package fills these fields
   * from that very package, which would otherwise flag itself.
   */
  const duplicatePackage = useMemo(() => {
    if (!isAddingNewPackage) return undefined;
    const contains = Number(effectiveContains);
    // Nothing to compare until all three are set — a half-filled form is
    // "incomplete", not "duplicate", and the field errors already say so.
    if (!purchaseUnit || !smallestUnit || !Number.isFinite(contains) || contains <= 0) {
      return undefined;
    }

    const same = (a: string, b: string) =>
      a.trim().toLowerCase() === b.trim().toLowerCase();

    return packages.find(
      (pkg) =>
        same(pkg.purchaseUnit, purchaseUnit) &&
        Number(pkg.purchaseUnitContains) === contains &&
        same(packageSmallestUnitName(pkg, unitPairs), smallestUnit)
    );
  }, [
    isAddingNewPackage,
    purchaseUnit,
    effectiveContains,
    smallestUnit,
    packages,
    unitPairs,
  ]);

  const duplicateError = duplicatePackage
    ? `${packageLabel(duplicatePackage, unitPairs)} already exists on this product. Pick it from the Package list instead of adding it again.`
    : '';

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
      unitContains: effectiveContains,
    });
  }, [purchaseUnit, displaySmallestUnit, effectiveContains]);

  useImperativeHandle(ref, () => ({
    getFormData: () => ({
      purchaseUnit,
      // The 1 the locked field shows, when the pairing is what fixed it.
      eachStripContains: effectiveContains,
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
        { purchaseUnit, eachStripContains: effectiveContains, purchaseSmallestUnitId },
        {
          purchaseUnit: 'Purchase Unit is required',
          eachStripContains: `Each ${purchaseUnitLabel} Contains is required`,
          purchaseSmallestUnitId: 'Smallest Unit is required',
        }
      );

      // Each field is fine on its own; together they name a package the product
      // already has. Reported against the smallest unit because that is the
      // field the pairing is completed in, and the one the user can change to
      // make it a genuinely new package.
      if (!hasErrors(nextErrors) && duplicatePackage) {
        nextErrors.purchaseSmallestUnitId = duplicateError;
      }

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
            {/* The picker and the new-package unit share one slot. */}
            {isExistingMode && !isAddingNewPackage && (
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
                  label="Purchase Smallest Sellable Unit"
                  value={displaySmallestUnit}
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
                  labelAction={
                    isAddingNewPackage ? (
                      <button
                        type="button"
                        aria-label="Pick a saved package instead"
                        title="Pick a saved package instead"
                        onClick={() => handlePackageChange('')}
                        className="flex items-center text-pneutral-500 transition-colors hover:text-pneutral-900"
                      >
                        <X size={16} />
                      </button>
                    ) : undefined
                  }
                />

                {/* Before the pack size, not after it: the pack size is "how
                    many of the smallest unit", so it cannot be answered until
                    the smallest unit is named — and when the two units match it
                    is not asked at all. */}
                <Dropdown
                  label="Purchase Smallest Sellable Unit"
                  required
                  placeholder={purchaseUnit ? 'Select Smallest Unit' : 'Select a Purchase Unit first'}
                  options={smallestUnitOptions}
                  value={purchaseSmallestUnitId}
                  onChange={handleSmallestUnitChange}
                  // Live, not only on submit: the clash is knowable the moment
                  // the third field is set, and finding out at save time means
                  // re-deriving which of the three to change.
                  error={errors.purchaseSmallestUnitId || duplicateError}
                  // Only the units paired with the chosen purchase unit are valid.
                  disabled={awaitingPackageChoice || !purchaseUnit}
                />

                <Input
                  label={`Each ${purchaseUnitLabel} Contains`}
                  type="number"
                  required
                  placeholder="Enter number"
                  value={effectiveContains}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEachStripContains(val);
                    validateField(val);
                  }}
                  error={errors.eachStripContains}
                  hint={
                    isSelfContained
                      ? `One ${purchaseUnit} is one ${displaySmallestUnit}, so this is always 1.`
                      : undefined
                  }
                  // A matching pairing fixes this at 1; it is shown rather than
                  // hidden so the package still reads as its three parts.
                  readOnly={isSelfContained}
                  disabled={awaitingPackageChoice || isSelfContained}
                  className={
                    awaitingPackageChoice || isSelfContained
                      ? 'bg-gray-50 opacity-60'
                      : undefined
                  }
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