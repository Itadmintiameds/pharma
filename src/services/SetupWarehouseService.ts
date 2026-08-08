import api from "@/utils/api";
import { OrganizationCreateRequest } from "@/types/SetupBusinessData";
import { OrganizationWarehouse, WarehouseDetails } from "@/types/SetupWarehouseData";

// The warehouse is persisted as part of the organization/create call rather
// than through its own endpoint. This builds the warehouse-related fragment of
// that payload for a "Multiple" organization:
//   - manageCentrally === true  -> { centralizedInventory: true, warehouses: [...] }
//   - manageCentrally === false -> { centralizedInventory: false }
//   - manageCentrally === null  -> {} (no choice made yet)
export const buildWarehousePayload = (
  manageCentrally: boolean | null,
  warehouse: WarehouseDetails,
): Partial<OrganizationCreateRequest> => {
  if (manageCentrally === null) return {};

  if (manageCentrally) {
    return {
      centralizedInventory: true,
      warehouses: [{ ...warehouse }],
    };
  }

  return { centralizedInventory: false };
};

// Fetch the central warehouse(s) attached to an existing organization
// (Pharma Backend). Used when an organization already exists so we reuse its
// warehouse instead of prompting the user to add one again. Returns [] on
// error or when the org has no warehouse.
export const getWarehousesByOrganizationId = async (
  organizationId: number | string,
): Promise<OrganizationWarehouse[]> => {
  try {
    const response = await api.get(`/warehouse/organization/${organizationId}`);
    return response.data ?? [];
  } catch (error) {
    console.error(
      `Failed to fetch warehouses for organization ${organizationId}:`,
      error,
    );
    return [];
  }
};
