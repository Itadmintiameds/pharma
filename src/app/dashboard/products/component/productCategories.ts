/**
 * The category cards shown above the product step, shared by the purchase
 * flow's Add Item wizard and the Masters → Products edit view so both read the
 * same. Medical Devices (5) splits into Consumable (5) / Non-Consumable (6).
 */
export const PRODUCT_CATEGORIES = [
  { id: 1, label: 'Drugs', iconPath: '/ProductManagement/Drug.svg', width: 'w-[178px]' },
  { id: 2, label: 'Supplements /\nNutraceuticals', iconPath: '/ProductManagement/Suppliments.svg', width: 'w-[246px]' },
  { id: 4, label: 'Cosmetic &\nPersonal Use', iconPath: '/ProductManagement/Cosmetics.svg', width: 'w-[233px]' },
  { id: 3, label: 'Food & Infant\nNutrition', iconPath: '/ProductManagement/Food&Infant.svg', width: 'w-[242px]' },
  { id: 5, label: 'Medical\nDevices & Equipment', iconPath: '/ProductManagement/MedicalDevices.svg', width: 'w-[200px]' },
];
