import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import api from '@/utils/api';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';
import { Plus, Minus } from 'lucide-react';

export interface ProductDetailsRef {
  getFormData: () => any;
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

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const res = await api.get('master/molecules');
        setMoleculeOptions(res.data.map((item: any) => ({ label: item.moleculeName, value: String(item.moleculeId) })));
        
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

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const updateMolecule = (id: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      molecules: prev.molecules.map(m => m.id === id ? { ...m, [field]: value } : m)
    }));
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
    })
  }));

  return (
    <>
      <Input label="Product Name" required placeholder="Enter Product Name" value={formData.productName} onChange={(e) => handleChange('productName', e.target.value)} />
      <Input label="Brand name" required placeholder="Enter Brand Name" value={formData.brandName} onChange={(e) => handleChange('brandName', e.target.value)} />

      {formData.molecules.map((mol, index) => (
        <React.Fragment key={mol.id}>
          <Dropdown 
            label="Molecule" 
            searchable
            required 
            placeholder="Select Molecule" 
            options={moleculeOptions} 
            value={mol.name} 
            onChange={(val) => updateMolecule(mol.id, 'name', val)} 
          />
          <div className="flex items-end gap-2 w-full">
            <div className="flex-1">
              <Input 
                label="Molecule Strength" 
                required 
                placeholder="Enter Strength" 
                value={mol.strength} 
                onChange={(e) => updateMolecule(mol.id, 'strength', e.target.value)} 
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
        required 
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
      />
      
      <Input label="Hsn code" required placeholder="Enter HSN Code" value={formData.hsnCode} onChange={(e) => handleChange('hsnCode', e.target.value)} />
    </>
  );
});

DrugProductDetails.displayName = 'DrugProductDetails';
export default DrugProductDetails;
