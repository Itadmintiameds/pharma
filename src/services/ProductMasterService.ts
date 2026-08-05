import api from '@/utils/api';

/**
 * Service for fetching product master data for the dynamic product creation forms.
 * Consolidates all master API calls for Drugs, Supplements, Food & Infant, Cosmetics, etc.
 */
export const ProductMasterService = {
  // --- Common ---
  getAgeGroups: () => api.get('master/age-groups'),

  /**
   * Valid purchase-unit / smallest-unit pairs for a category, e.g. a Strip of
   * Tablets or a Bottle of Syrup (ml). One row per pair, so the purchase-unit
   * list is the distinct `purchaseUnitName` values and the smallest-unit list is
   * the rows matching the chosen purchase unit.
   */
  getPurchaseSmallestUnits: (productCategoryId: string | number) =>
    api.get(`master/product-categories/${productCategoryId}/purchase-smallest-units`),

  // --- Category: Drug (1) ---
  getMolecules: () => api.get('master/molecules'),
  
  // --- Category: Supplements (2) ---
  getDosageForms: () => api.get('master/dosage-forms'),
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

  // --- Medical Devices / Consumables (5) & Non-Consumables (6) ---
  getDeviceCategories: (productCategoryId: string | number) => api.get(`master/product-categories/${productCategoryId}/device-categories`),
  getDeviceSubCategories: (deviceCategoryId: string | number) => api.get(`master/device-categories/${deviceCategoryId}/device-sub-categories`),
  getMaterialTypes: (productCategoryId: string | number) => api.get(`master/product-categories/${productCategoryId}/material-types`),
  getPowerSources: () => api.get('master/power-sources'),
  getCountries: () => api.get('master/countries'),
};
