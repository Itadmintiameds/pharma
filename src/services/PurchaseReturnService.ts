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

// Update a return that is still a DRAFT — saving it again as a draft, or
// posting it by sending status CONFIRMED. Editing a CONFIRMED return is a
// separate flow (/{id}/edit) and does not go through here.
export const updatePurchaseReturn = async (
  purchaseReturnId: number | string,
  payload: PurchaseReturnCreatePayload
): Promise<PurchaseReturnData> => {
  try {
    const response = await api.put(`/purchase-return/${purchaseReturnId}`, payload);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to update the purchase return.');
  }
};
