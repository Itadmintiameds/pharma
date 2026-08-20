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

// Mirrors WarehouseDistribution.java (pharma_warehouse_distribution).
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
  destinationType: LocationType;
  destinationId: string;
  allocationRequestedBy?: string;
  createdBy?: string;
  createdAt?: string;
  modifiedBy?: string;
  modifiedAt?: string;
  // Not a column on the entity itself — carried on WarehouseDistributionResponse.java.
  currentStatus?: DistributionStatus;
  details?: WarehouseDistributionDetailsData[];
}

// Mirrors WarehouseDistributionDetails.java (pharma_warehouse_distribution_details).
// product/packaging/batch are @ManyToOne + @JsonIgnore on the entity, so the API
// (see WarehouseDistributionLineResponse.java) flattens them down to their id strings.
export interface WarehouseDistributionDetailsData {
  warehouseDistributionDetailsId?: number;
  warehouseDistributionId?: number;
  productId: string;
  packagingId?: string;
  batchId?: string;
  issueQuantity: number;
  receivedQuantity?: number;
  damagedQuantity?: number;
  remarks?: string;
  createdBy?: string;
  createdAt?: string;
  modifiedBy?: string;
  modifiedAt?: string;
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
