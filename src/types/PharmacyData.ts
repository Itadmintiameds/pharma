export interface PharmacyData {
    pharmacyId: string;
    pharmacyRegistrationId?: string;
    organizationId?: number;
    pharmacyName: string;
    pharmacyType: string;
    pharmacyEmail: string;
    pharmacyPhone: number;
    panNumber: string;
    gstNumber: string;
    pharmacyBranch: string;
    pharmacyBuildingNo: string;
    pharmacyStreet: string;
    pharmacyCity: string;
    pharmacyTaluka: string;
    pharmacyDistricts: string;
    pharmacyPincode: number;
    pharmacyLandmark: string;
    pharmacyState: string;
    pharmacyLogo: string;
}

export interface PharmacyDocumentData {
    documentId: number;
    pharmacyId?: string;
    documentNo: string;
    documentType: string;
    documentUrl: string;
    issueDate: Date;
    issueAuthority: string;
    expiryDate: Date;
    isActive: boolean;
}