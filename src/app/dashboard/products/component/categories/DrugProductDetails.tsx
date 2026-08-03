import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ProductMasterService } from '@/services/ProductMasterService';
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
    molecules: [{ id: Date.now(), name: '', strength: '' }],
    gst: "",
    hsnCode: ""
  });

  const [moleculeOptions, setMoleculeOptions] = useState<{label: string, value: string}[]>([]);
  const [moleculeSchedules, setMoleculeSchedules] = useState<Record<string, string>>({});
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
      molecules: [...prev.molecules, { id: Date.now(), name: '', strength: '' }]
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
    setFormData(prev => ({
      ...prev,
      molecules: prev.molecules.map(m => m.id === id ? { ...m, [field]: value } : m)
    }));
    validateMoleculeField(id, field, value);
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

        const strength = MoleculeSchema.pick({ strength: true }).safeParse({ strength: mol.strength });
        nextErrors[`mol_${mol.id}_strength`] = strength.success ? '' : strength.error.issues[0].message;
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
          <div className="flex items-end gap-2 w-full">
            <div className="flex-1">
              <Input
                label="Molecule Strength"
                placeholder="e.g. 500mg, 10mg/ml"
                value={mol.strength} 
                onChange={(e) => updateMolecule(mol.id, 'strength', e.target.value)} 
                error={errors[`mol_${mol.id}_strength`]}
                maxLength={30}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 h-[48px]">
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
