export interface Molecule {
  id: number;
  name: string;
  strength: string;
}

export interface DrugProductData {
  productName: string;
  brandName: string;
  molecules: Molecule[];
  drugSchedule: string;
  gst: string;
  hsnCode: string;
}

export interface SupplementProductData {
  productName: string;
  brandName: string;
  therapeuticCategory: string;
  therapeuticSubcategory: string;
  flavor: string;
  dosageForm: string;
  strength: string;
  netQuantity: string;
  netQuantityUnit: string;
  ageGroup: string;
  gender: string;
  manufacturerName: string;
  fssaiLicense: string;
  gst: string;
  hsnCode: string;
}

export interface FoodInfantProductData {
  productName: string;
  brandName: string;
  productCategory: string;
  productSubCategory: string;
  variantName: string;
  productForm: string;
  ageGroup: string;
  netQuantity: string;
  netQuantityUnit: string;
  manufacturerName: string;
  gst: string;
  hsnCode: string;
}

export interface CosmeticProductData {
  productName: string;
  brandName: string;
  productType: string;
  productSubType: string;
  productForm: string;
  variant: string;
  intendedUseArea: string;
  skinType: string;
  hairType: string;
  ageGroup: string;
  gender: string;
  fragrance: string;
  netQuantity: string;
  netQuantityUnit: string;
  manufacturerName: string;
  gst: string;
  hsnCode: string;
}

export interface ConsumableProductData {
  productName: string;
  brandName: string;
  deviceCategory: string;
  deviceSubCategory: string;
  materialType: string;
  sizeDimensionGauge: string;
  sterile: string;
  disposable: string;
  intendedUse: string;
  manufacturerName: string;
  manufacturerLicenseNumber: string;
  isIsoCertified: string;
  gst: string;
  hsnCode: string;
}

export interface NonConsumableProductData {
  productName: string;
  brandName: string;
  deviceCategory: string;
  deviceSubCategory: string;
  modelName: string;
  deviceClassification: string;
  intendedUse: string;
  technicalDimension: string;
  materialBuildType: string;
  powerSource: string;
  warranty: string;
  amcServiceAvailability: string;
  manufacturerName: string;
  countryOfOrigin: string;
  gst: string;
  hsnCode: string;
}

export type AnyProductData = 
  | DrugProductData 
  | SupplementProductData 
  | FoodInfantProductData 
  | CosmeticProductData 
  | ConsumableProductData 
  | NonConsumableProductData;

export interface PackagingDetailsData {
  // Add fields based on PackagingDetails.tsx
  // Leaving empty for now to be populated when that form is built
}

export interface BatchDetailsData {
  // Add fields based on BatchDetails.tsx
  // Leaving empty for now to be populated when that form is built
}

export interface FullProductSubmissionData {
  categoryId: number;
  subCategoryId?: number;
  productDetails: AnyProductData;
  packagingDetails: PackagingDetailsData;
}
