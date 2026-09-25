import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';
import {
  PurchaseReturnCreatePayload,
  PurchaseReturnData,
} from '@/types/PurchaseReturnData';

// Fetch all purchase returns for the selected pharmacy
export const getAllPurchaseReturn = async (): Promise<PurchaseReturnData[]> => {
  try {
    const response = await api.get('/purchase-return/allPurchaseReturn');
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch purchase returns.');
  }
};

// Raise a purchase return — as a DRAFT, or CONFIRMED to post it
export const createPurchaseReturn = async (
  payload: PurchaseReturnCreatePayload
): Promise<PurchaseReturnData> => {
  try {
    const response = await api.post('/purchase-return/create', payload);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to create the purchase return.');
  }
};
