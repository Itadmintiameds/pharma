// How an allocation was initiated. allocationMode is a plain String column/field on
// the backend (no enum there), so these short codes are a frontend-only convention.
export type AllocationMode = "myself" | "requirement";

// Source/destination of a stock movement. Mirrors LocationType.java.
export type LocationType = "WAREHOUSE" | "PHARMACY";

// Lifecycle of a warehouse distribution / stock transfer. Mirrors DistributionStatus.java.
export type DistributionStatus =
  | "DISTRIBUTION_CREATED"
  | "PRODUCTS_DISPATCHED"
  | "STOCK_RECEIVED"
  | "STOCK_REJECTED";

// Mirrors WarehouseDistributionLineResponse.ProductInfo.
export interface WarehouseDistributionLineProductInfo {
  productId: string;
  productName: string;
  brandName?: string;
  hsnNo?: string;
  gstPercentage?: number;
}

// Mirrors WarehouseDistributionLineResponse.PackagingInfo.
export interface WarehouseDistributionLinePackagingInfo {
  packagingId: string;
  purchaseUnit: string;
  purchaseUnitContains?: number;
}

// Mirrors WarehouseDistributionLineResponse.BatchInfo.
export interface WarehouseDistributionLineBatchInfo {
  batchId: string;
  batchNumber: string;
  manufacturingDate?: string;
  expiryDate?: string;
  mrp?: number;
  sellingPrice?: number;
  purchasePrice?: number;
  rackLocation?: string;
}

// Mirrors WarehouseDistributionLineResponse.java — one allocation line as the API
// returns it (WarehouseDistributionDetails.java plus nested product/packaging/batch
// info, so the frontend can render a line without extra lookups).
export interface WarehouseDistributionLineData {
  warehouseDistributionDetailsId?: number;
  productId: string;
  packagingId?: string;
  batchId?: string;
  issueQuantity: number;
  receivedQuantity?: number;
  damagedQuantity?: number;
  remarks?: string;
  product?: WarehouseDistributionLineProductInfo;
  packaging?: WarehouseDistributionLinePackagingInfo;
  batch?: WarehouseDistributionLineBatchInfo;
}

// Mirrors WarehouseDistributionStatusResponse.java — one entry of a distribution's
// status history (created / dispatched / received / rejected).
export interface WarehouseDistributionStatusData {
  warehouseDistributionStatusId?: number;
  status: DistributionStatus;
  createdBy?: string;
  createdAt?: string;
}

// Mirrors WarehouseDistributionResponse.java — the API's shape for one distribution:
// WarehouseDistribution.java plus the source/destination store names resolved
// server-side, its lines and its full status history (oldest first).
export interface WarehouseDistributionData {
  warehouseDistributionId?: number;
  allocationMode?: AllocationMode;
  allocationNo: string;
  allocationDate?: string;
  distributionType?: string;
  reference?: string;
  remarks?: string;
  sourceType: LocationType;
  sourceId: string;
  sourceName?: string;
  destinationType: LocationType;
  destinationId: string;
  destinationName?: string;
  allocationRequestedBy?: string;
  currentStatus?: DistributionStatus;
  lines?: WarehouseDistributionLineData[];
  statuses?: WarehouseDistributionStatusData[];
  createdBy?: string;
  createdAt?: string;
}

// Relative to the acting warehouse: it either shipped the allocation (OUTGOING)
// or is receiving it (INCOMING). Mirrors the direction values set in
// WarehouseDistributionServiceImpl's summary mapping.
export type DistributionDirection = "OUTGOING" | "INCOMING";

// Mirrors WarehouseDistributionSummaryResponse.java — one row of the distribution
// list screen: identifiers, both ends already resolved to their store name, line
// totals and the latest status, with no per-line detail.
export interface WarehouseDistributionSummaryData {
  warehouseDistributionId: number;
  allocationNo: string;
  direction: DistributionDirection;
  fromType: LocationType;
  fromId: string;
  fromStore: string;
  toType: LocationType;
  toId: string;
  toStore: string;
  productsCount: number;
  totalQuantity: number;
  currentStatus: DistributionStatus;
  allocationDate?: string;
}

// Mirrors WarehouseDistributionLineRequest.java — one allocation line to be issued.
export interface WarehouseDistributionLineRequest {
  productId: string;
  packagingId?: string;
  batchId?: string;
  issueQuantity: number;
}

// Mirrors WarehouseDistributionRequest.java — payload for POST /warehouse/distribution/create.
export interface CreateWarehouseDistributionRequest {
  allocationMode?: AllocationMode;
  distributionType?: string;
  reference?: string;
  remarks?: string;
  sourceType: LocationType;
  sourceId: string;
  destinationType: LocationType;
  destinationId: string;
  lines: WarehouseDistributionLineRequest[];
}
