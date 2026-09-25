import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';
import { PurchaseData } from '@/types/PurchaseData';

// Fetch all purchases for the selected pharmacy
export const getAllPurchases = async (): Promise<PurchaseData[]> => {
  try {
    const response = await api.get('/purchase/allPurchase');
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch purchases.');
  }
};

// Fetch one purchase with its lines — unlike /allPurchase, this one carries
// the stock still on hand for each batch
export const getPurchaseById = async (
  purchaseId: number | string
): Promise<PurchaseData> => {
  try {
    const response = await api.get(`/purchase/${purchaseId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the purchase.');
  }
};

