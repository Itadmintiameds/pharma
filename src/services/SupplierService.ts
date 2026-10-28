import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';
import { SupplierData } from '@/types/SupplierData';

// Create a new supplier
export const createSupplier = async (data: SupplierData): Promise<SupplierData> => {
  try {
    const response = await api.post('/supplier/create', data);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to create supplier.');
  }
};

// Fetch all suppliers for the selected pharmacy
export const getAllSupplier = async (): Promise<SupplierData[]> => {
  try {
    const response = await api.get('/supplier/allSupplier');
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch suppliers.');
  }
};

// Fetch a single supplier by id
export const getSupplierById = async (supplierId: number | string): Promise<SupplierData> => {
  try {
    const response = await api.get(`/supplier/getById/${supplierId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch supplier.');
  }
};

export type SupplierDuplicateCheckRequest = Pick<
  SupplierData,
  'supplierId' | 'gstinNo' | 'dlno' | 'panNo' | 'fssaiNo'
>;

export interface SupplierDuplicateCheckResponse {
  duplicate: boolean;
  gstinNoExists: boolean;
  dlnoExists: boolean;
  panNoExists: boolean;
  fssaiNoExists: boolean;
  // One per duplicated number, e.g. "GST number already exists for supplier ABC Pharma"
  messages: string[];
}

// Check GST / DL / PAN / FSSAI numbers against the other suppliers of the current
// pharmacy or warehouse. Pass supplierId when editing so the supplier isn't
// reported as a duplicate of itself.
export const checkDuplicateSupplier = async (
  data: SupplierDuplicateCheckRequest
): Promise<SupplierDuplicateCheckResponse> => {
  try {
    const response = await api.post('/supplier/checkDuplicate', data);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to check for duplicate suppliers.');
  }
};

// Update an existing supplier
export const updateSupplier = async (
  supplierId: number | string,
  data: SupplierData
): Promise<SupplierData> => {
  try {
    const response = await api.put(`/supplier/update/${supplierId}`, data);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to update supplier.');
  }
};
