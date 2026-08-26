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
  /** Multi-select; sent as `ageGroupIds`. */
  ageGroup: string[];
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
  /** Multi-select; sent as `ageGroupIds`. */
  ageGroup: string[];
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
  /** Multi-select; sent as `intendedUseAreaIds`. */
  intendedUseArea: string[];
  skinType: string;
  hairType: string;
  /** Multi-select; sent as `ageGroupIds`. */
  ageGroup: string[];
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

/* -------------------------------------------------------------------------- */
/*  Inventory / Stock APIs                                                     */
/* -------------------------------------------------------------------------- */

/** Overall stock status returned by the inventory APIs. */
export type StockStatus =
  | "ACTIVE"
  | "NEAR_EXPIRY"
  | "EXPIRED"
  | "OUT_OF_STOCK";

/**
 * GET /api/v1/product/stock-summary
 * One row per product in the inventory list (top-level table).
 */
export interface ProductStockSummary {
  productId: string;
  productName: string;
  brandName: string | null;
  manufacturerName: string | null;
  productCategoryId: number;
  productCategoryName: string;
  totalStock: number;
  activeBatches: number;
  nearExpiryBatches: number;
  expiredBatches: number;
  nearestExpiryDate: string | null;
  overallStatus: StockStatus;
}

export interface ProductStockSummaryResponse {
  data: ProductStockSummary[];
  count: number;
  message: string;
}

/**
 * GET /api/v1/product/{productId}/details
 * A single batch belonging to a package.
 */
export interface ProductBatchDetails {
  batchId: string;
  batchNumber: string;
  packagingId: string;
  manufacturingDate: string;
  expiryDate: string;
  stockQuantity: number;
  purchaseUnit: string;
  rackLocation: string | null;
  mrp: number;
  mrpPerUnit: number;
  purchasePrice: number;
  purchasePricePerUnit: number;
  sellingPrice: number;
  sellingPricePerUnit: number;
  freeQuantity: number | null;
  freeUnit: string | null;
}

/**
 * A package (variant) of a product with its batches.
 *
 * Packaging is stored against a `purchaseSmallestUnitId` master pairing, so the
 * smallest-unit name may come back under either key — or not at all, in which
 * case `packageSmallestUnitName` resolves it from the master list.
 */
export interface ProductPackageDetails {
  packagingId: string;
  purchaseUnit: string;
  purchaseUnitContains: number;
  smallestUnit?: string;
  purchaseSmallestUnitName?: string;
  purchaseSmallestUnitId?: number;
  batches: ProductBatchDetails[];
}

/**
 * The smallest-unit name for a package, whichever way the API expressed it.
 * Pass the category's unit master to resolve an id-only response.
 */
export const packageSmallestUnitName = (
  pkg?: ProductPackageDetails | null,
  unitPairs: PurchaseSmallestUnit[] = []
): string => {
  if (!pkg) return "";
  if (pkg.smallestUnit) return pkg.smallestUnit;
  if (pkg.purchaseSmallestUnitName) return pkg.purchaseSmallestUnitName;

  const pair = unitPairs.find(
    (unit) => unit.purchaseSmallestUnitId === pkg.purchaseSmallestUnitId
  );
  return pair?.purchaseSmallestUnitName ?? "";
};

/** The `data` payload of the product details response. */
export interface ProductDetails {
  productId: string;
  productName: string;
  brandName: string;
  pharmacyId: string;
  productCategoryId: number;
  hsnNo: string;
  gstPercentage: number;
  packages: ProductPackageDetails[];
  unassignedBatches: ProductBatchDetails[];
}

export interface ProductDetailsResponse {
  data: ProductDetails;
  message: string;
}

/**
 * GET /api/v1/master/product-categories/{id}/purchase-smallest-units
 * One row per valid purchase-unit / smallest-unit pairing.
 */
export interface PurchaseSmallestUnit {
  purchaseSmallestUnitId: number;
  purchaseSmallestUnitName: string;
  purchaseUnitName: string;
  productCategoryId: number;
  productCategoryName?: string;
  isActive?: boolean;
}

/**
 * A batch as sent when adding stock to an existing product.
 * Stock/free quantities are deliberately absent — they belong to the purchase,
 * not the batch master, and are carried in the /purchase payload instead.
 */
export interface NewBatchPayload {
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  purchaseUnit: string;
  purchasePrice: number;
  mrp: number;
  sellingPrice: number;
  purchasePricePerUnit: number;
  mrpPerUnit: number;
  sellingPricePerUnit: number;
  rackLocation: string;
}

/**
 * POST /api/v1/product/{productId}/package — new package plus its first batch.
 * The unit names are implied by `purchaseSmallestUnitId`, which points at a
 * purchase-unit / smallest-unit pairing in the master.
 */
export interface AddPackagePayload {
  purchaseUnitContains: number;
  purchaseSmallestUnitId: number;
  batches: NewBatchPayload[];
}

/** POST /api/v1/product/{productId}/batch — new batches on existing packages. */
export interface AddBatchPayload extends NewBatchPayload {
  packagingId: string;
}

/**
 * GET /api/v1/product/expiry-kpi
 * Aggregate counts for the products page stat cards.
 */
export interface ProductExpiryKpi {
  expired: number;
  expiring0To30Days: number;
  expiring31To60Days: number;
  healthyAbove60Days: number;
  totalProducts: number;
}

export interface ProductExpiryKpiResponse {
  data: ProductExpiryKpi;
  message: string;
}

/**
 * GET /api/v1/batch-expiry-kpi
 * Aggregate batch-level expiry counts for the products page stat cards.
 */
export interface BatchExpiryKpi {
  expiredBatches: number;
  expiring0To30DaysBatches: number;
  expiring31To60DaysBatches: number;
  healthyAbove60DaysBatches: number;
  totalBatches: number;
  totalProducts: number;
}

export interface BatchExpiryKpiResponse {
  data: BatchExpiryKpi;
  message: string;
}
