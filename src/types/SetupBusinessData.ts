export interface OrganizationCreateRequest {
  organizationName: string;
  organizationType: string;
  ownershipType: string;
  panNumber: string;
  gstNumber: string;
}

export interface OrganizationCreateResponse {
  organizationId: number;
  organizationName: string;
  organizationType: string;
  ownershipType: string;
  panNumber: string;
  gstNumber: string;
  isActive: boolean;
  isRejected: boolean;
  createdAt: string;
}

export interface PharmacyDocumentRequest {
  documentNumber: string;
  documentType: string; // e.g. "DRUG_LICENSE", "CLINICAL_ESTABLISHMENT_CERTIFICATE"
  issueDate?: string;
  issueAuthority?: string;
  expiryDate?: string;
}

export interface PharmacyRegistrationRequest {
  userId: string;
  pharmacyName: string;
  pharmacyType: string;
  pharmacyEmail?: string;
  pharmacyPhone: string;
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
  organizationId: number;
  organizationName: string;
  ownershipType: string;
  organizationType: string;
  organizationPanNumber: string;
  organizationGstNumber: string;
  pharmacyRegistrationDocuments: PharmacyDocumentRequest[];
}

export interface PharmacyDocumentResponse {
  registrationDocumentId: number;
  documentNumber: string;
  documentType: string;
  issueDate?: string;
  issueAuthority?: string;
  expiryDate?: string;
  documentUrl?: string;
}

export interface PharmacyRegistrationResponse {
  pharmacyRegistrationId: string; // e.g. "Req-0001"
  userId: string;
  pharmacyName: string;
  pharmacyType: string;
  pharmacyEmail: string;
  pharmacyPhone: string;
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
  organizationId: number;
  organizationName: string;
  ownershipType: string;
  organizationType: string;
  organizationPanNumber: string;
  organizationGstNumber: string;
  pharmacyRegistrationDocuments: PharmacyDocumentResponse[];
}
