import api from '@/utils/api';

export class ProductService {
  static async onboardProduct(payload: any) {
    try {
      const response = await api.post('/product/onboard', payload);
      return response.data;
    } catch (error) {
      console.error('Error onboarding product:', error);
      throw error;
    }
  }
}
