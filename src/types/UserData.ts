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
    lastLogin?: boolean;
    isRejected?: boolean;
    userStatus?: string;
    pharmacyCities?: string[];
    createdAt?: string | Date;

    pharmaRolesDto?: PharmaRolesDto;
    pharmacies?: PharmacyData[];
}

export interface PharmaRolesDto {
    roleId: number;
    roleName: string;
}

