import Button from "@/app/components/common/Button";
import { variantSchema, unitSchema } from "@/app/schema/VariantSchema";
import { createVariant, getVariantById, getVariant, updateVariant } from "@/app/services/VariantService";
import { VariantData, UnitData } from "@/app/types/VariantData";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { z } from "zod";
import { Trash2 } from "lucide-react";
import { IoAddCircle } from "react-icons/io5";

interface VariantProps {
  setShowDrawer: (value: boolean) => void;
  variantId?: string | null;
  action?: "edit" | "delete";
  onSuccess?: () => void;
}

const removeProperty = (obj: Record<string, string>, key: string) => {
  const newObj = { ...obj };
  delete newObj[key];
  return newObj;
};

const AddVariant: React.FC<VariantProps> = ({
  setShowDrawer,
  variantId,
  action,
  onSuccess,
}) => {
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const [formData, setFormData] = useState<{
    variantName: string;
    units: UnitData[];
  }>({
    variantName: "",
    units: [{ unitId: "", unitName: "" }],
  });

  const [existingVariantNames, setExistingVariantNames] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add a new empty unit field
  const addUnit = () => {
    setFormData(prev => ({
      ...prev,
      units: [...prev.units, { unitId: "", unitName: "" }]
    }));
  };

  // Remove a unit by index
  const removeUnit = (index: number) => {
    if (formData.units.length > 1) {
      setFormData(prev => ({
        ...prev,
        units: prev.units.filter((_, i) => i !== index)
      }));

      // Remove validation error for this unit if it exists
      setValidationErrors(prev => removeProperty(prev, `unit-${index}`));
    }
  };

  // Handle variant name change
  const handleVariantNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, variantName: value }));

    // Validate variant name
    const result = variantSchema.safeParse({
      variantName: value,
      existingVariantNames: existingVariantNames
    });

    if (!result.success) {
      setValidationErrors(prev => ({
        ...prev,
        variantName: result.error.errors[0].message
      }));
    } else {
      setValidationErrors(prev => removeProperty(prev, 'variantName'));
    }
  };

  // Handle unit name change
  const handleUnitNameChange = (index: number, value: string) => {
    const updatedUnits = [...formData.units];
    updatedUnits[index] = { ...updatedUnits[index], unitName: value };

    setFormData(prev => ({ ...prev, units: updatedUnits }));

    // Get existing unit names excluding current unit being edited
    const otherUnitNames = formData.units
      .filter((_, i) => i !== index)
      .map(unit => unit.unitName.toLowerCase().trim());

    // Validate unit name
    const result = unitSchema.safeParse({
      unitName: value,
      existingUnitNames: otherUnitNames
    });

    if (!result.success) {
      setValidationErrors(prev => ({
        ...prev,
        [`unit-${index}`]: result.error.errors[0].message
      }));
    } else {
      setValidationErrors(prev => removeProperty(prev, `unit-${index}`));
    }
  };

// Save variant with units
const saveVariant = async (e: { preventDefault: () => void }) => {
  e.preventDefault();
  setIsSubmitting(true);
  setValidationErrors({});

  try {
    // Validate variant name first
    const variantValidation = variantSchema.safeParse({
      variantName: formData.variantName,
      existingVariantNames
    });

    if (!variantValidation.success) {
      const formattedErrors: Record<string, string> = {};
      variantValidation.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        formattedErrors[field] = err.message;
      });
      setValidationErrors(formattedErrors);
      toast.error("Variant Name must be at least 2 characters", { autoClose: 3000 });
      setIsSubmitting(false);
      return;
    }

    // Check for empty variant name
    if (!formData.variantName.trim()) {
      toast.error("Variant name is required", { autoClose: 3000 });
      setIsSubmitting(false);
      return;
    }

    // Check for empty units
    const emptyUnits = formData.units.filter(unit => unit.unitName.trim() === "");
    if (emptyUnits.length > 0) {
      toast.error("At least one unit is required", { autoClose: 3000 });
      setIsSubmitting(false);
      return;
    }

    // Check if at least one unit is provided
    if (formData.units.length === 0) {
      toast.error("At least one unit is required", { autoClose: 3000 });
      setIsSubmitting(false);
      return;
    }

    // Validate all units with Zod
    let hasUnitErrors = false;
    const unitErrors: Record<string, string> = {};

    formData.units.forEach((unit, index) => {
      const otherUnitNames = formData.units
        .filter((_, i) => i !== index)
        .map(u => u.unitName.toLowerCase().trim());

      const unitValidation = unitSchema.safeParse({
        unitName: unit.unitName,
        existingUnitNames: otherUnitNames
      });

      if (!unitValidation.success) {
        hasUnitErrors = true;
        unitValidation.error.errors.forEach((err) => {
          unitErrors[`unit-${index}`] = err.message;
        });
      }
    });

    if (hasUnitErrors) {
      setValidationErrors(unitErrors);
      toast.error("Unit Name must be at least 2 characters", { autoClose: 3000 });
      setIsSubmitting(false);
      return;
    }

    // Check for duplicate unit names within the same form
    const unitNames = formData.units.map(unit => unit.unitName.toLowerCase().trim());
    const duplicateUnits = unitNames.filter((name, index) => unitNames.indexOf(name) !== index);
    
    if (duplicateUnits.length > 0) {
      toast.error("Duplicate unit names are not allowed", { autoClose: 3000 });
      setIsSubmitting(false);
      return;
    }

    // Prepare data for API
    const variantData: VariantData = {
      variantId: variantId || "",
      variantName: formData.variantName.trim(),
      unitDtos: formData.units.map(unit => ({
        unitId: unit.unitId || "",
        unitName: unit.unitName.trim()
      }))
    };

    if (variantId && action === "edit") {
      // UPDATE EXISTING VARIANT
      await updateVariant(variantId, variantData);
      toast.success("Variant updated successfully", { autoClose: 3000 });
    } else {
      // CREATE NEW VARIANT
      await createVariant(variantData);
      toast.success("Variant created successfully", { autoClose: 3000 });
    }

    setShowDrawer(false);
    onSuccess?.();
  } catch (error) {
    console.error("Error:", error);

    if (error instanceof z.ZodError) {
      const formattedErrors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const field = err.path[0] as string;
        formattedErrors[field] = err.message;
      });
      setValidationErrors(formattedErrors);
      toast.error("Please fix the form errors", { autoClose: 3000 });
    } else if (error instanceof Error) {
      toast.error(error.message || "An error occurred while saving variant", { autoClose: 3000 });
    } else {
      toast.error("Unknown error occurred", { autoClose: 3000 });
    }
  } finally {
    setIsSubmitting(false);
  }
};

  // Load existing variant names and current variant data for edit
  useEffect(() => {
    // Fetch existing variant names to check for duplicates
    const fetchExistingVariants = async () => {
      try {
        const variants = await getVariant();
        const variantNames = variants
          .filter(variant => variant.variantId !== variantId) 
          .map(variant => variant.variantName.toLowerCase());
        setExistingVariantNames(variantNames);
      } catch (error) {
        console.error("Error fetching existing variants:", error);
      }
    };

    fetchExistingVariants();

    if (variantId && action === "edit") {
      // Fetch variant data for editing
      const fetchVariantDetails = async () => {
        try {
          const data = await getVariantById(variantId);
          setFormData({
            variantName: data.variantName,
            units: data.unitDtos && data.unitDtos.length > 0 ? data.unitDtos : [{ unitId: "", unitName: "" }]
          });
        } catch (error) {
          console.error("Failed to fetch variant details:", error);
          toast.error("Failed to fetch variant data", { autoClose: 3000 });
        }
      };
      fetchVariantDetails();
    }
  }, [variantId, action]);

  return (
    <form onSubmit={saveVariant} className="space-y-6">
      {/* Variant Name Field */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="text"
            value={formData.variantName}
            onChange={handleVariantNameChange}
            className={`peer w-full px-3 py-3 border rounded-md bg-transparent text-black outline-none focus:ring-0 ${validationErrors.variantName ? "border-tertiaryRed" : "border-gray-400 focus:border-purple-900"
              }`}
            placeholder=" "
            maxLength={50}
          />
          <label className="absolute left-3 top-0 -translate-y-1/2 bg-white px-1 text-gray-500 text-xs transition-all pointer-events-none">
            Variant Name <span className="text-tertiaryRed">*</span>
          </label>
        </div>
        {validationErrors.variantName && (
          <span className="text-tertiaryRed text-sm">
            {validationErrors.variantName}
          </span>
        )}
      </div>

      {/* Units Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-gray-700">
            Unit Types <span className="text-tertiaryRed">*</span>
          </label>
        </div>

        {formData.units.map((unit, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="flex-grow space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={unit.unitName}
                  onChange={(e) => handleUnitNameChange(index, e.target.value)}
                  className={`peer w-full px-3 py-3 border rounded-md bg-transparent text-black outline-none focus:ring-0 ${validationErrors[`unit-${index}`] ? "border-tertiaryRed" : "border-gray-400 focus:border-purple-900"
                    }`}
                  placeholder=" "
                  maxLength={50}
                />
                <label className="absolute left-3 top-0 -translate-y-1/2 bg-white px-1 text-gray-500 text-xs transition-all pointer-events-none">
                  Unit Name {index === 0 && <span className="text-tertiaryRed">*</span>}
                </label>
              </div>
              {validationErrors[`unit-${index}`] && (
                <span className="text-tertiaryRed text-sm">
                  {validationErrors[`unit-${index}`]}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addUnit}
                className="p-2 text-darkPurple hover:bg-purple-50 rounded-lg transition-colors"
                disabled={isSubmitting}
                title="Add another unit"
              >
                <IoAddCircle size={20} />
              </button>

              {formData.units.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeUnit(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  disabled={isSubmitting}
                  title="Remove unit"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <div className="flex justify-start space-x-4 pt-4">
  <Button
    onClick={saveVariant}
    label={
      variantId && action === "edit" 
        ? "Save" 
        : "Add Variant"
    }
    value=""
    className="w-36 h-11 text-white bg-darkPurple"
    type="button"
    disabled={isSubmitting}
  />
</div>
    </form>
  );
};

export default AddVariant;