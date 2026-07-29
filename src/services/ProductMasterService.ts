import api from '@/utils/api';

/**
 * Service for fetching product master data for the dynamic product creation forms.
 * Consolidates all master API calls for Drugs, Supplements, Food & Infant, Cosmetics, etc.
 */
export const ProductMasterService = {
  // --- Common ---
  getAgeGroups: () => api.get('master/age-groups'),

  // --- Category: Drug (1) ---
  getMolecules: () => api.get('master/molecules'),
  
  // --- Category: Supplements (2) ---
  getFlavours: () => api.get('master/flavours'),
  getTherapeuticCategories: () => api.get('master/therapeutic-categories'),
  getTherapeuticSubCategories: (categoryId: string | number) => api.get(`master/therapeutic-categories/${categoryId}/subcategories`),
  getSupplementNetQuantityUnits: () => api.get('master/product-categories/2/net-quantity-units'),

  // --- Category: Food & Infant (3) ---
  getFoodProductTypes: () => api.get('master/product-categories/3/product-types'),
  getFoodProductSubTypes: (typeId: string | number) => api.get(`master/product-types/${typeId}/sub-types`),
  getFoodProductForms: () => api.get('master/product-categories/3/product-forms'),
  getFoodNetQuantityUnits: () => api.get('master/product-categories/3/net-quantity-units'),

  // --- Category: Cosmetics (4) ---
  getCosmeticProductTypes: () => api.get('master/product-categories/4/product-types'),
  getCosmeticProductSubTypes: (typeId: string | number) => api.get(`master/product-types/${typeId}/sub-types`),
  getCosmeticProductForms: () => api.get('master/product-categories/4/product-forms'),
  getCosmeticNetQuantityUnits: () => api.get('master/product-categories/4/net-quantity-units'),
  getIntendedUseAreas: () => api.get('master/intended-use-areas'),
  getSkinTypes: () => api.get('master/skin-types'),
  getHairTypes: () => api.get('master/hair-types'),

  // --- Medical Devices (5, 6) ---
  // To be implemented...
};
