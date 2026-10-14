export type StockAdjustmentType = "INCREASE" | "DECREASE";

export interface StockAdjustmentData {
  stockAdjustmentId?: number;

  pharmacyId?: string;
  warehouseId?: string;

  productId: string;
  productName?: string;
  batchId: string;
  batchNumber?: string;

  stockAdjustmentNo?: string;
  stockAdjustmentDate?: string;
  actualStockQty: number;
  adjustmentQty: number;
  adjustmentType: StockAdjustmentType;
  adjustmentValue?: number;
  stockAdjustmentReason?: string;
  stockAdjustmentRemarks?: string;

  createdBy?: string;
  createdAt?: string;
  modifiedBy?: string;
  modifiedAt?: string;
}

export interface StockAdjustmentKpiResponse {
  totalStockAdjustments: number;
  totalStockValue: number;
}
