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
  dispatchedQuantity?: number;
  receivedQuantity?: number | null;
  damagedQuantity?: number | null;
  remarks?: string;
  dispatchRemarks?: string | null;
  receiveRemarks?: string | null;
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

// Mirrors WarehouseDistributionSummaryResponse.java — one row of the distribution
// list endpoints (e.g. GET /warehouse/distribution/warehouse/destination), a flattened
// view of a distribution with source/destination names and roll-up counts resolved
// server-side so a list row can render without fetching each distribution's lines.
export interface WarehouseDistributionSummary {
  warehouseDistributionId: number;
  allocationNo: string;
  allocationDate?: string;
  currentStatus?: DistributionStatus;
  direction?: "INCOMING" | "OUTGOING";
  fromType?: LocationType;
  fromId?: string;
  fromStore?: string;
  toType?: LocationType;
  toId?: string;
  toStore?: string;
  productsCount: number;
  totalQuantity: number;
  totalDispatchedQuantity?: number;
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

// Mirrors WarehouseDistributionReceiveLineRequest.java — the received/damaged outcome
// for one dispatched line, keyed by the line's warehouseDistributionDetailsId.
export interface ReceiveWarehouseDistributionLineRequest {
  warehouseDistributionDetailsId: number;
  receivedQuantity: number;
  damagedQuantity: number;
  remarks?: string | null;
}

// Mirrors WarehouseDistributionReceiveRequest.java — payload for
// POST /warehouse/distribution/{distributionId}/receive.
export interface ReceiveWarehouseDistributionRequest {
  lines: ReceiveWarehouseDistributionLineRequest[];
}
