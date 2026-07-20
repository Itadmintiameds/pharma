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
    imageUrl?: string;
    role: string;
    lastLogin?: boolean;
    isRejected?: boolean;
    userStatus?: string;
}

