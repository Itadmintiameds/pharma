import { PharmacyData } from "./PharmacyData";

export interface UserData {
    userId: number;
    pharmacyId?: string;
    userEmail: string;
    fullName: string;
    password?: string;
    userPhone?: string;
    employeeId?: string;
    dob?: Date;
    gender?: string;
    department?: string;
    imageUrl?: string;
    lastLogin?: string | Date;
    isRejected?: boolean;
    userStatus?: string;
    pharmacyCities?: string[];
    // GET /user/all returns a nested `warehouse` object; GET /user/{id}
    // returns the same info as flat `warehouseId` / `warehouseName` fields.
    warehouse?: UserWarehouse | null;
    warehouseId?: string;
    warehouseName?: string;
    createdAt?: string | Date;

    roleId?: number;
    roleName?: string;
    pharmaRolesDto?: PharmaRolesDto;
    pharmacies?: PharmacyData[];
}

export interface PharmaRolesDto {
    roleId: number;
    roleName: string;
}

// Warehouse assigned to a user, as returned by GET /user/all for
// Warehouse Manager roles (null for non-warehouse roles).
export interface UserWarehouse {
    warehouseId: string;
    warehouseCode?: string;
    warehouseName: string;
}

