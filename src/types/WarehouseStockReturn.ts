export interface WarehouseReturn {
  warehouseReturnId: number;
  fromPharmacyId?: string;
  toWarehouseId?: string;
  stockReturnNo?: string;
  stockReturnDate?: string;
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
  productId?: number;
  batchId?: number;
  returnQuantity?: number;
  dispatchQuantity?: number;
  receivedQuantity?: number;
  notReceivedQuantity?: number;
  returnReason?: string;
}

export interface WarehouseReturnReceivePayload {
  totalReceivedQuantity: number;
  totalNotReceivedQuantity: number;
  warehouseReturnDetails: WarehouseReturnDetails[];
}

export enum StockReturnStatus {
  DRAFT = 'Draft',
  PENDING_RECEIPT = 'Pending Receipt',
  COMPLETE = 'Complete',
}