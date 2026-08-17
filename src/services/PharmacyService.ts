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

// A warehouse has no pharmacy-only fields (GST/PAN, documents, granular
// address parts), so those map to empty and the invoice shows the warehouse's
// single-line address instead.
const warehouseToBillTo = (warehouse: {
  warehouseId: string;
  warehouseName: string;
  warehouseAddress?: string;
  mobileNumber?: string;
}): CurrentPharmacy => ({
  pharmacyId: warehouse.warehouseId,
  pharmacyName: warehouse.warehouseName,
  pharmacyType: "WAREHOUSE",
  pharmacyEmail: "",
  pharmacyPhone: warehouse.mobileNumber ?? null,
  gstNumber: "",
  panNumber: "",
  pharmacyBuildingNo: "",
  pharmacyStreet: warehouse.warehouseAddress ?? "",
  pharmacyBranch: "",
  pharmacyCity: "",
  pharmacyTaluka: "",
  pharmacyDistricts: "",
  pharmacyState: "",
  pharmacyPincode: null,
  pharmacyLandmark: "",
  pharmacyLogo: null,
  documents: [],
});

/**
 * The "Bill To" entity for the signed-in user. A Warehouse Manager operates
 * under an assigned warehouse rather than a pharmacy, so for them this resolves
 * that warehouse (GET /warehouse/{id}) and maps it onto the CurrentPharmacy
 * shape the invoice renders. Everyone else bills to their current pharmacy.
 */
export const getCurrentBillTo = async (): Promise<CurrentPharmacy> => {
  try {
    const userRes = await fetch("/api/user-info");
    if (userRes.ok) {
      const { userId } = await userRes.json();
      if (userId) {
        const { getUserById } = await import("./UserManagementService");
        const user = await getUserById(userId).catch(() => null);
        const warehouseId: string | undefined =
          user?.warehouse?.warehouseId ?? user?.warehouseId;
        if (warehouseId) {
          const { getWarehouseById } = await import("./SetupWarehouseService");
          const warehouse = await getWarehouseById(warehouseId);
          if (warehouse) return warehouseToBillTo(warehouse);
        }
      }
    }
  } catch (err) {
    console.error("Failed to resolve warehouse bill-to; using pharmacy", err);
  }
  return getCurrentPharmacy();
};