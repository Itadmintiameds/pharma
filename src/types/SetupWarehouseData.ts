// Central warehouse details captured when a "Multiple" organization chooses
// to manage inventory centrally. Sent nested inside the organization/create
// payload (see OrganizationCreateRequest.warehouses).
export interface WarehouseDetails {
  // Backend-assigned code (e.g. "ACMACWH0001"). Absent while the warehouse is
  // still being captured; sent back on pharmacy registration so the
  // registration is tied to the existing warehouse rather than a new one.
  warehouseId?: string;
  warehouseName: string;
  warehouseCode: string;
  warehouseAddress: string;
  contactPersonName: string;
  mobileNumber: string;
}

export const EMPTY_WAREHOUSE: WarehouseDetails = {
  warehouseName: "",
  warehouseCode: "",
  warehouseAddress: "",
  contactPersonName: "",
  mobileNumber: "",
};

// Warehouse as returned by GET /warehouse/organization/{organizationId}
// (Pharma Backend). Extends the editable details with backend-managed,
// read-only fields.
export interface OrganizationWarehouse extends WarehouseDetails {
  warehouseId?: string;
  isActive?: boolean;
  organizationId?: number;
}

// Full warehouse record as returned by GET /warehouse/{warehouseId}
// (Pharma Backend WarehouseDto).
export interface WarehouseDto extends WarehouseDetails {
  warehouseId: string;
  isActive?: boolean;
  organizationId?: number;
  createdBy?: string;
  createdAt?: string;
  modifiedBy?: string | null;
  modifiedAt?: string | null;
  // Read-only: product ids currently mapped to this warehouse.
  productIds?: string[];
}
