import React, { useState, useEffect } from 'react';
import api from '@/utils/api';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';
import { Plus, Minus } from 'lucide-react';

const ProductDetails = ({ categoryId = 1 }: { categoryId?: number }) => {
  const [molecules, setMolecules] = useState([{ id: 1, name: '', strength: '' }]);

  // Master Data Options
  const [ageGroupOptions, setAgeGroupOptions] = useState<{label: string, value: string}[]>([]);
  const [flavorOptions, setFlavorOptions] = useState<{label: string, value: string}[]>([]);
  const [therapeuticCategoryOptions, setTherapeuticCategoryOptions] = useState<{label: string, value: string}[]>([]);
  const [therapeuticSubcategoryOptions, setTherapeuticSubcategoryOptions] = useState<{label: string, value: string}[]>([]);
  const [moleculeOptions, setMoleculeOptions] = useState<{label: string, value: string}[]>([]);
  const [moleculeSchedules, setMoleculeSchedules] = useState<Record<string, string>>({});

  // Selected Values
  const [selectedTherapeuticCategory, setSelectedTherapeuticCategory] = useState("");
  const [selectedTherapeuticSubcategory, setSelectedTherapeuticSubcategory] = useState("");
  const [selectedFlavor, setSelectedFlavor] = useState("");
  const [selectedAgeGroup, setSelectedAgeGroup] = useState("");

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        if (categoryId === 1) {
          const res = await api.get('master/molecules');
          setMoleculeOptions(res.data.map((item: any) => ({ label: item.moleculeName, value: String(item.moleculeId) })));
          
          const schedulesMap: Record<string, string> = {};
          res.data.forEach((item: any) => {
            schedulesMap[String(item.moleculeId)] = item.drugSchedule;
          });
          setMoleculeSchedules(schedulesMap);
        } else if (categoryId === 2) {
          const [ageRes, flavorRes, therRes] = await Promise.all([
            api.get('master/age-groups'),
            api.get('master/flavours'),
            api.get('master/therapeutic-categories')
          ]);
          setAgeGroupOptions(ageRes.data.map((item: any) => ({ label: item.ageGroupName, value: String(item.ageGroupId) })));
          setFlavorOptions(flavorRes.data.map((item: any) => ({ label: item.flavourName, value: String(item.flavourId) })));
          setTherapeuticCategoryOptions(therRes.data.map((item: any) => ({ label: item.therapeuticCategoryName, value: String(item.therapeuticCategoryId) })));
        }
      } catch (error) {
        console.error("Error fetching master data:", error);
      }
    };
    fetchMasterData();
  }, [categoryId]);

  useEffect(() => {
    if (selectedTherapeuticCategory) {
      const fetchSubcategories = async () => {
        try {
          const res = await api.get(`master/therapeutic-categories/${selectedTherapeuticCategory}/subcategories`);
          setTherapeuticSubcategoryOptions(res.data.map((item: any) => ({ label: item.therapeuticSubcategoryName, value: String(item.therapeuticSubcategoryId) })));
        } catch (error) {
          console.error("Error fetching subcategories:", error);
        }
      };
      fetchSubcategories();
    } else {
      setTherapeuticSubcategoryOptions([]);
    }
  }, [selectedTherapeuticCategory]);

  const addMolecule = () => {
    setMolecules([...molecules, { id: Date.now(), name: '', strength: '' }]);
  };

  const removeMolecule = (id: number) => {
    if (molecules.length > 1) {
      setMolecules(molecules.filter(m => m.id !== id));
    }
  };

  const updateMolecule = (id: number, field: string, value: string) => {
    setMolecules(molecules.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  // Compute Drug Schedule based on selected molecules
  let finalDrugSchedule = "";
  if (categoryId === 1) {
    let hasH1 = false;
    let hasH = false;
    let hasOTC = false;

    molecules.forEach(mol => {
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
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-sm">
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <div className="flex w-full flex-1 flex-col gap-xlg overflow-y-auto rounded-[12px] border border-pneutral-100 bg-white p-[14px] shadow-sm">
          <h3 className="shrink-0 text-h6 font-semibold text-pneutral-900">
            Product Details
          </h3>

          <div className="grid grid-cols-2 items-start gap-x-xlg gap-y-sm">
            {categoryId === 1 && (
              <>
                <Input label="Product Name" required placeholder="Enter Product Name" />
                <Input label="Brand name" required placeholder="Enter Brand Name" />

            {molecules.map((mol, index) => (
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
                    {molecules.length > 1 && (
                      <button 
                        onClick={() => removeMolecule(mol.id)}
                        className="w-[48px] h-[48px] rounded-[8px] bg-red-50 border border-red-200 flex items-center justify-center hover:bg-red-100 transition-colors"
                      >
                        <Minus className="text-red-500" size={20} />
                      </button>
                    )}
                    {index === molecules.length - 1 ? (
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
              </>
            )}

            {categoryId === 2 && (
              <>
                <Input label="Product Name" required placeholder="Placeholder" />
                <Dropdown
                  label="Therapeutic Category"
                  required
                  placeholder="Select Category"
                  options={therapeuticCategoryOptions}
                  value={selectedTherapeuticCategory}
                  onChange={(val) => {
                    setSelectedTherapeuticCategory(val);
                    setSelectedTherapeuticSubcategory(""); // Reset subcategory when category changes
                  }}
                />

                <Dropdown
                  label="Therapeutic Subcategory"
                  required
                  placeholder="Select Subcategory"
                  options={therapeuticSubcategoryOptions}
                  value={selectedTherapeuticSubcategory}
                  onChange={(val) => setSelectedTherapeuticSubcategory(val)}
                  disabled={!selectedTherapeuticCategory}
                />
                <Input label="Brand Name" required placeholder="Enter Brand Name" />

                <Dropdown
                  label="Flavor"
                  required
                  placeholder="Select Flavor"
                  options={flavorOptions}
                  value={selectedFlavor}
                  onChange={(val) => setSelectedFlavor(val)}
                />
                <Input label="Dosage Form" required placeholder="Eg., Gel, Powder" />

                <Input label="Strength / Composition" required placeholder="Placeholder" />
                <div className="flex flex-col gap-1 w-full">
                  <label className="text-label-l4 font-medium text-pneutral-900">Net Quantity<span className="ml-2 text-warning-500 font-semibold">*</span></label>
                  <div className="flex w-full">
                    <div className="flex-1">
                      <input 
                        type="text" 
                        placeholder="Placeholder" 
                        className="w-full h-12 rounded-l-md border border-r-0 border-pneutral-300 px-3 outline-none text-p4 text-pneutral-900 focus:border-pneutral-500" 
                      />
                    </div>
                    <div className="w-[140px] shrink-0 border border-pneutral-300 rounded-r-md bg-gray-50 flex items-center px-3 cursor-pointer">
                      <span className="text-p4 text-pneutral-500 flex-1 truncate">Select Unit</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-pneutral-500 shrink-0">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </div>
                  </div>
                </div>

                <Dropdown
                  label="Age Group"
                  required
                  placeholder="Select Age Group"
                  options={ageGroupOptions}
                  value={selectedAgeGroup}
                  onChange={(val) => setSelectedAgeGroup(val)}
                />
                <Input label="Gender" required placeholder="Placeholder" />

                <Input label="Manufacturer Name" required placeholder="Placeholder" />
                <Input label="FSSAI License number" required placeholder="Placeholder" />
              </>
            )}

            {/* Other categories (3,4,5) can be added similarly later */}

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
              value=""
              onChange={() => {}}
              menuPlacement="top"
            />
            
            <Input label="Hsn code" required placeholder="Enter HSN Code" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;