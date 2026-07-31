import api from '@/utils/api';

export class PurchaseService {
  static async createPurchase(payload: any) {
    try {
      const response = await api.post('/purchase/create', payload);
      return response.data;
    } catch (error) {
      console.error('Error creating purchase:', error);
      throw error;
    }
  }
}
