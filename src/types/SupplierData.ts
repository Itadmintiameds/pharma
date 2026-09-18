export type SupplierStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";

export interface SupplierData {
  supplierId?: number;
  pharmacyId?: string;
  warehouseId?: string;
  supplierName: string;
  status?: SupplierStatus;

  dlno?: string;
  gstinNo?: string;
  panNo?: string;
  dlExpiryDate?: string;
  issuingAuthority?: string;
  fssaiNo?: string;

  contactPersonName?: string;
  mobileNumber?: number;
  supplierEmail?: string;

  address?: string;
  buildingNo?: string;
  pincode?: number;
  city?: string;
  district?: string;
  state?: string;

  bankName?: string;
  accountHolderName?: string;
  accountNumber?: number;
  ifscCode?: string;

  createdBy?: string;
  createdAt?: string;
  modifiedBy?: string;
  modifiedAt?: string;
}
