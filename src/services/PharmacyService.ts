import api from "@/utils/api";

export interface Pharmacy {
  pharmacyId: string;
  pharmacyName: string;
}

export interface PharmacyDocument {
  documentId: number;
  documentNo: string;
  documentType: string;
  documentUrl: string | null;
  expiryDate: string | null;
  issueAuthority: string | null;
  issueDate: string | null;
  isActive: boolean | null;
}

/** Full profile of the pharmacy the user is currently operating under. */
export interface CurrentPharmacy {
  pharmacyId: string;
  pharmacyName: string;
  pharmacyType: string;
  pharmacyEmail: string;
  pharmacyPhone: number | string | null;
  gstNumber: string;
  panNumber: string;
  pharmacyBuildingNo: string;
  pharmacyStreet: string;
  pharmacyBranch: string;
  pharmacyCity: string;
  pharmacyTaluka: string;
  pharmacyDistricts: string;
  pharmacyState: string;
  pharmacyPincode: number | string | null;
  pharmacyLandmark: string;
  pharmacyLogo: string | null;
  documents: PharmacyDocument[];
}

export const getUserPharmacies = async (): Promise<Pharmacy[]> => {

  const response = await api.get("/pharmacy/userPharmacy");

  return response.data;
};

/** The current pharmacy (selected via the X-Pharmacy-Id header on `api`). */
export const getCurrentPharmacy = async (): Promise<CurrentPharmacy> => {
  const response = await api.get("/pharmacy/getCurrentPharmacy");

  return response.data;
};