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

