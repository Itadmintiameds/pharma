import api, { adminApi } from "@/utils/api";
import { 
  OrganizationCreateRequest, 
  PharmacyRegistrationRequest,
  PharmacyRegistrationResponse
} from "@/types/SetupBusinessData";
import { handleApiError } from "@/utils/errorHandler";

// Step 1: Hits Pharma Backend (uses standard api client)
export const createOrganization = async (data: OrganizationCreateRequest) => {
  try {
    const response = await api.post("/organization/create", data);
    return response.data;
  } catch (error) {
    throw handleApiError(error, "Failed to create organization.");
  }
};

// Fetch organization details for the logged-in user
export const getUserOrganization = async () => {
  try {
    const response = await api.get("/organization/getUserOrganization");
    return response.data;
  } catch (error) {
    // Return null if organization doesn't exist
    return null;
  }
};

// Fetch all pharmacy registrations from admin backend
export const getPharmacyRegistrations = async (token?: string) => {
    console.log("Base URL:", adminApi.defaults.baseURL);

  try {
    const response = await adminApi.get("/pharmacy-registration", {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch pharmacy registrations:", error);
    return null;
  }
};

// Fetch pharmacy registrations for a specific user from admin backend
export const getUserPharmacyRegistrations = async (userId: string, token?: string) => {
  try {
    const response = await adminApi.get(`/pharmacy-registration/user/${userId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch pharmacy registrations for user ${userId}:`, error);
    return null;
  }
};

// Fetch pharmacy KPIs for a specific user from admin backend
export const getUserPharmacyKPIs = async (userId: string, token?: string) => {
  try {
    const response = await adminApi.get(`/pharmacy-registration/kpis/${userId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch pharmacy KPIs for user ${userId}:`, error);
    return null;
  }
};

// Fetch specific pharmacy registration details by reqId from admin backend
export const getPharmacyRegistrationDetails = async (reqId: string, token?: string) => {
  try {
    const response = await adminApi.get(`/pharmacy-registration/${reqId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch details for reqId ${reqId}:`, error);
    return null;
  }
};

// Step 2: Hits Admin Backend (uses adminApi client)
export const registerPharmacy = async (
  data: PharmacyRegistrationRequest,
  token?: string
): Promise<any> => {
  try {
    const response = await adminApi.post<any>(
      "/pharmacy-registration",
      data,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      }
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error, "Failed to register pharmacy.");
  }
};

// Step 3: Hits Admin Backend File Upload (uses adminApi client)
export const uploadPharmacyDocument = async (
  pharmacyRegistrationId: string,
  registrationDocumentId: number,
  file: File,
  token?: string
) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await adminApi.post(
      `/pharmacy-registration/${pharmacyRegistrationId}/documents/${registrationDocumentId}/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
      }
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error, "Failed to upload document.");
  }
};
