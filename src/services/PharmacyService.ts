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
  /**
   * The organization's logo. Branding is held at the organization, not per
   * branch, so this is what a bill or an invoice prints — `pharmacyLogo` above
   * is per-branch and is usually null.
   */
  organizationLogoUrl?: string | null;
  /** Present on responses that nest the organization rather than flattening it. */
  pharmacyOrganization?: {
    organizationId?: number;
    organizationName?: string;
    organizationLogoUrl?: string | null;
  } | null;
  documents: PharmacyDocument[];
}

/**
 * The logo to print for a pharmacy: the organization's mark, wherever the
 * response happens to carry it, falling back to a branch logo if one is set.
 * Returns null when there is none — callers show their own mark rather than a
 * stand-in logo belonging to somebody else.
 */
export const pharmacyLogoUrl = (
  pharmacy: CurrentPharmacy | null | undefined
): string | null => {
  const candidates = [
    pharmacy?.organizationLogoUrl,
    pharmacy?.pharmacyOrganization?.organizationLogoUrl,
    pharmacy?.pharmacyLogo,
  ];
  return (
    candidates.find(
      (url): url is string => typeof url === "string" && url.trim() !== ""
    ) ?? null
  );
};

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
 * under a warehouse rather than a pharmacy, so for them this resolves the
 * warehouse they are currently acting as (GET /warehouse/{id}) and maps it onto
 * the CurrentPharmacy shape the invoice renders. Everyone else bills to their
 * current pharmacy.
 *
 * The warehouse comes from the store rather than the user record: a manager may
 * hold several, and the invoice has to name the one the purchase was made under
 * — the same one the request carried in `X-Warehouse-Id`.
 */
export const getCurrentBillTo = async (): Promise<CurrentPharmacy> => {
  try {
    const { useWarehouseStore } = await import("@/store/warehouseStore");
    const warehouseId =
      useWarehouseStore.getState().selectedWarehouse?.warehouseId;

    if (warehouseId) {
      const { getWarehouseById } = await import("./SetupWarehouseService");
      const warehouse = await getWarehouseById(warehouseId);
      if (warehouse) return warehouseToBillTo(warehouse);
    }
  } catch (err) {
    console.error("Failed to resolve warehouse bill-to; using pharmacy", err);
  }
  return getCurrentPharmacy();
};