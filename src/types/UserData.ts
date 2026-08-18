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
    // A user is mapped to many warehouses (pharma_user_warehouse), the same way
    // they are to many pharmacies. Both GET /user/all and GET /user/{id} return
    // the list under `warehouses`; it is absent for users who manage none.
    warehouses?: UserWarehouse[];
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

// One warehouse a user is mapped to (WarehouseSummaryDto).
export interface UserWarehouse {
    warehouseId: string;
    warehouseCode?: string;
    warehouseName: string;
}

/** "Name (CODE)" when the warehouse has a code, its name otherwise. */
export const warehouseLabel = (warehouse: UserWarehouse) =>
    warehouse.warehouseCode
        ? `${warehouse.warehouseName} (${warehouse.warehouseCode})`
        : warehouse.warehouseName;

