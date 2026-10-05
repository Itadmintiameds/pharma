export interface WarehouseReturn {
  warehouseReturnId: number;
  fromPharmacyId?: string;
  toWarehouseId?: string;
  stockReturnNo?: string;
  stockReturnDate?: string; // ISO datetime
  stockReturnType?: string;
  stockReturnStatus?: StockReturnStatus;
  totalReturnProducts?: number;
  totalReturnQuantity?: number;
  totalReceivedQuantity?: number;
  totalNotReceivedQuantity?: number;
  isDelete?: boolean;
  warehouseReturnDetails?: WarehouseReturnDetails[];
}

export interface WarehouseReturnDetails {
  warehouseReturnDetailId: number;
  // These are IDs because the backend entity uses @ManyToOne
  productId?: number;
  batchId?: number;
  returnQuantity?: number;
  dispatchQuantity?: number;
  receivedQuantity?: number;
  notReceivedQuantity?: number;
  returnReason?: string;
}

export enum StockReturnStatus {
  DRAFT = "Draft",
  PENDING_RECEIPT = "Pending Receipt",
  COMPLETE = "Complete",
}