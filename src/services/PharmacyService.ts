import api from "@/utils/api";

export interface Pharmacy {
  pharmacyId: string;
  pharmacyName: string;
}

export const getUserPharmacies = async (): Promise<Pharmacy[]> => {

  const response = await api.get("/pharmacy/userPharmacy");

  return response.data;
};