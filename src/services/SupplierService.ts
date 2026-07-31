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
