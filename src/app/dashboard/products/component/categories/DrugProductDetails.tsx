import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ProductMasterService } from '@/services/ProductMasterService';
import { ProductService } from '@/services/ProductService';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';
import { Plus, Minus } from 'lucide-react';
import { DrugProductSchema, MoleculeSchema } from '@/app/schema/ProductSchemas';
import { collectErrors, hasErrors } from '@/utils/formValidation';
import { z } from 'zod';

export interface ProductDetailsRef {
  getFormData: () => any;
  validate: () => boolean;
}

const DrugProductDetails = forwardRef<ProductDetailsRef>((props, ref) => {
  const [formData, setFormData] = useState({
    productName: "",
    brandName: "",
    molecules: [{ id: Date.now(), name: '', strength: '', strengthValue: '', strengthUnit: '' }],
    gst: "",
    hsnCode: ""
  });

  const [moleculeOptions, setMoleculeOptions] = useState<{label: string, value: string}[]>([]);
  const [moleculeSchedules, setMoleculeSchedules] = useState<Record<string, string>>({});
  const [strengthUnitOptions, setStrengthUnitOptions] = useState<{label: string, value: string}[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const res = await ProductMasterService.getMolecules();
        setMoleculeOptions(res.data.map((m: any) => ({ label: m.moleculeName, value: String(m.moleculeId) })));

        const schedulesMap: Record<string, string> = {};
        res.data.forEach((item: any) => {
          schedulesMap[String(item.moleculeId)] = item.drugSchedule;
        });
        setMoleculeSchedules(schedulesMap);
      } catch (error) {
        console.error("Error fetching master data:", error);
      }
    };
    fetchMasterData();

    const fetchMoleculeStrengths = async () => {
      try {
        const data = await ProductService.getMoleculeStrengths();
        const options = (data ?? []).map((item: any) => ({
          label: item.moleculeStrengthName,
          value: String(item.moleculeStrengthId),
        }));
        setStrengthUnitOptions(options);
      } catch (error) {
        console.error("Error fetching molecule strengths:", error);
      }
    };
    fetchMoleculeStrengths();
  }, []);

  const validateField = (field: keyof typeof formData, value: any) => {
    try {
      DrugProductSchema.pick({ [field]: true } as any).parse({ [field]: value });
      setErrors(prev => ({ ...prev, [field]: '' }));
    } catch (error) {
      if (error instanceof z.ZodError) {
        const zodError = error as z.ZodError;
        setErrors(prev => ({ ...prev, [field]: zodError.issues[0].message }));
      }
    }
  };

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const addMolecule = () => {
    setFormData(prev => ({
      ...prev,
      molecules: [...prev.molecules, { id: Date.now(), name: '', strength: '', strengthValue: '', strengthUnit: '' }]
    }));
  };

  const removeMolecule = (id: number) => {
    if (formData.molecules.length > 1) {
      setFormData(prev => ({
        ...prev,
        molecules: prev.molecules.filter(m => m.id !== id)
      }));
    }
  };

  // The dropdown carries its own unit text; only the input beside it needs to
  // be kept numeric-only.
  const NUMERIC_ONLY = /^\d*\.?\d*$/;
  const strengthValueError = (value: string): string =>
    value.trim() !== '' && !NUMERIC_ONLY.test(value.trim()) ? 'Only numbers are allowed' : '';

  const validateMoleculeField = (id: number, field: string, value: string) => {
    if (field === 'strength') {
      try {
        MoleculeSchema.pick({ strength: true }).parse({ strength: value });
        setErrors(prev => ({ ...prev, [`mol_${id}_strength`]: '' }));
      } catch (error) {
        if (error instanceof z.ZodError) {
          const zodError = error as z.ZodError;
          setErrors(prev => ({ ...prev, [`mol_${id}_strength`]: zodError.issues[0].message }));
        }
      }
    }
  };

  const updateMolecule = (id: number, field: string, value: string) => {
    const molecule = formData.molecules.find(m => m.id === id);
    if (!molecule) return;

    // The value and unit are entered separately but stored — and validated —
    // as the single "500mg"-style string the backend expects. The unit is
    // selected by id, so its display label is what goes into that string.
    const isStrengthPart = field === 'strengthValue' || field === 'strengthUnit';
    const nextStrengthValue = field === 'strengthValue' ? value : molecule.strengthValue;
    const nextStrengthUnit = field === 'strengthUnit' ? value : molecule.strengthUnit;
    const nextStrengthUnitLabel = strengthUnitOptions.find(opt => opt.value === nextStrengthUnit)?.label ?? '';
    const nextStrength = isStrengthPart
      ? `${nextStrengthValue}${nextStrengthUnitLabel}`.trim()
      : molecule.strength;

    setFormData(prev => ({
      ...prev,
      molecules: prev.molecules.map(m => m.id === id
        ? { ...m, [field]: value, ...(isStrengthPart ? { strength: nextStrength } : {}) }
        : m
      )
    }));

    if (isStrengthPart) {
      // The numeric check on the value takes priority over the combined
      // schema check, since a letter typed there is the more specific error.
      const numericError = strengthValueError(nextStrengthValue);
      if (numericError) {
        setErrors(prev => ({ ...prev, [`mol_${id}_strength`]: numericError }));
      } else {
        validateMoleculeField(id, 'strength', nextStrength);
      }
    }
  };

  let finalDrugSchedule = "";
  let hasH1 = false;
  let hasH = false;
  let hasOTC = false;

  formData.molecules.forEach(mol => {
    if (mol.name) {
      const schedule = moleculeSchedules[mol.name];
      if (schedule === 'H1') hasH1 = true;
      else if (schedule === 'H') hasH = true;
      else if (schedule === 'OTC') hasOTC = true;
    }
  });

  if (hasH1) finalDrugSchedule = "H1";
  else if (hasH) finalDrugSchedule = "H";
  else if (hasOTC) finalDrugSchedule = "OTC";

  useImperativeHandle(ref, () => ({
    getFormData: () => ({
      ...formData,
      drugSchedule: finalDrugSchedule
    }),
    validate: () => {
      const nextErrors = collectErrors(DrugProductSchema, formData, {
        gst: 'GST is required',
      });

      // Molecules are optional: an untouched row is ignored, but a half-filled
      // one still has to be completed.
      formData.molecules.forEach((mol) => {
        const hasName = !!mol.name;
        const hasStrength = mol.strength.trim() !== '';

        if (!hasName && !hasStrength) {
          nextErrors[`mol_${mol.id}_name`] = '';
          nextErrors[`mol_${mol.id}_strength`] = '';
          return;
        }

        nextErrors[`mol_${mol.id}_name`] = hasName ? '' : 'Molecule is required';

        const numericError = strengthValueError(mol.strengthValue);
        if (numericError) {
          nextErrors[`mol_${mol.id}_strength`] = numericError;
        } else {
          const strength = MoleculeSchema.pick({ strength: true }).safeParse({ strength: mol.strength });
          nextErrors[`mol_${mol.id}_strength`] = strength.success ? '' : strength.error.issues[0].message;
        }
      });

      setErrors(nextErrors);
      return !hasErrors(nextErrors);
    }
  }));

  return (
    <>
      <Input 
        label="Product Name" 
        required 
        placeholder="Enter Product Name" 
        value={formData.productName} 
        onChange={(e) => handleChange('productName', e.target.value)} 
        error={errors.productName}
        maxLength={60}
      />
      <Input 
        label="Brand name" 
        required 
        placeholder="Enter Brand Name" 
        value={formData.brandName} 
        onChange={(e) => handleChange('brandName', e.target.value)} 
        error={errors.brandName}
        maxLength={60}
      />

      {formData.molecules.map((mol, index) => (
        <React.Fragment key={mol.id}>
          <Dropdown
            label="Molecule"
            searchable
            placeholder="Select Molecule"
            options={moleculeOptions} 
            value={mol.name} 
            onChange={(val) => updateMolecule(mol.id, 'name', val)} 
            error={errors[`mol_${mol.id}_name`]}
          />
          {/* items-start + mt-7 (label's height) on the buttons — items-end would
              re-align them under the error text, which only this field has. */}
          <div className="flex items-start gap-2 w-full">
            <div className="flex-1">
              <div className="flex flex-col gap-1 w-full">
                <label className="mb-1 block text-label-l4 font-medium text-pneutral-900 justify-center">
                  Molecule Strength
                </label>
                <div className="flex w-full">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="e.g. 500"
                      value={mol.strengthValue}
                      onChange={(e) => updateMolecule(mol.id, 'strengthValue', e.target.value)}
                      className={`w-full h-12 rounded-l-md border border-r-0 px-3 outline-none text-p4 text-pneutral-900 focus:border-pneutral-500 ${
                        errors[`mol_${mol.id}_strength`] ? "border-warning-500" : "border-pneutral-300"
                      }`}
                    />
                  </div>
                  <div className={`relative w-[140px] shrink-0 border rounded-r-md bg-gray-50 flex items-center px-3 cursor-pointer ${
                    errors[`mol_${mol.id}_strength`] ? "border-warning-500 border-l-pneutral-300" : "border-pneutral-300"
                  }`}>
                    <span className="text-p4 text-pneutral-500 flex-1 truncate pointer-events-none">
                      {strengthUnitOptions.find(opt => opt.value === mol.strengthUnit)?.label || "Select Unit"}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-pneutral-500 shrink-0 pointer-events-none">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                    <select
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      value={mol.strengthUnit}
                      onChange={(e) => updateMolecule(mol.id, 'strengthUnit', e.target.value)}
                    >
                      <option value="" disabled>Select Unit</option>
                      {strengthUnitOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {errors[`mol_${mol.id}_strength`] && (
                  <p className="mt-1 text-p2 text-warning-500">{errors[`mol_${mol.id}_strength`]}</p>
                )}
              </div>
            </div>
            <div className="mt-7 flex items-center gap-2 shrink-0 h-[48px]">
              {formData.molecules.length > 1 && (
                <button
                  onClick={() => removeMolecule(mol.id)}
                  className="w-[48px] h-[48px] rounded-[8px] bg-red-50 border border-red-200 flex items-center justify-center hover:bg-red-100 transition-colors"
                >
                  <Minus className="text-red-500" size={20} />
                </button>
              )}
              {index === formData.molecules.length - 1 ? (
                <button
                  onClick={addMolecule}
                  className="w-[48px] h-[48px] rounded-[8px] bg-[#4C0080] border border-[#4C0080] flex items-center justify-center hover:bg-[#3a0063] transition-colors"
                >
                  <Plus className="text-white" size={20} />
                </button>
              ) : (
                <div className="w-[48px] h-[48px]" />
              )}
            </div>
          </div>
        </React.Fragment>
      ))}

      <Input
        label="Drug Schedule"
        placeholder="Auto-generated"
        value={finalDrugSchedule}
        readOnly
        disabled
      />

      <Dropdown
        label="GST"
        required
        placeholder="Select GST"
        options={[
          { label: '5%', value: '5' },
          { label: '12%', value: '12' },
          { label: '18%', value: '18' },
          { label: '28%', value: '28' }
        ]}
        value={formData.gst}
        onChange={(val) => handleChange('gst', val)}
        menuPlacement="top"
        error={errors.gst}
      />
      
      <Input 
        label="Hsn code" 
        required 
        placeholder="Enter HSN Code" 
        value={formData.hsnCode} 
        onChange={(e) => handleChange('hsnCode', e.target.value)} 
        error={errors.hsnCode}
      />
    </>
  );
});

DrugProductDetails.displayName = 'DrugProductDetails';
export default DrugProductDetails;
