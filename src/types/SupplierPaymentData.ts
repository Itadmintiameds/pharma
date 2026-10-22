export interface SupplierPaymentData {
  supplierPaymentId?: number;

  supplierId: number;
  purchaseId: number;

  supplierPaymentNo?: string;
  supplierPaymentDate?: string;
  paymentMode?: string;
  paymentAmount?: number;
  transactionNo?: string;
  remarks?: string;

  createdBy?: string;
  createdAt?: string;
  modifiedBy?: string;
  modifiedAt?: string;
}

export interface SupplierPaymentKpiResponse {
  totalSupplierPayable: number;
  overduePayable: number;
  supplierCredit: number;
}
