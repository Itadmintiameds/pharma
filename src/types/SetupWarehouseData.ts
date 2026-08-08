// Central warehouse details captured when a "Multiple" organization chooses
// to manage inventory centrally. Sent nested inside the organization/create
// payload (see OrganizationCreateRequest.warehouses).
export interface WarehouseDetails {
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
  warehouseId?: number;
  isActive?: boolean;
  organizationId?: number;
}
