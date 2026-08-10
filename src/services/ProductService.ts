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

  static async getAllBatches() {
    try {
      const response = await api.get('/product/batches');
      return response.data;
    } catch (error) {
      console.error('Error fetching batches:', error);
      throw error;
    }
  }

  static async getBatchById(batchId: string) {
    try {
      const response = await api.get(`/product/batch/${batchId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching batch details for ${batchId}:`, error);
      throw error;
    }
  }

  static async checkBatchExists(batchNumber: string, productId: string, packagingId: string) {
    try {
      const response = await api.get('/product/batchExists', {
        params: { batchNumber, productId, packagingId }
      });
      return response.data;
    } catch (error) {
      console.error(`Error checking if batch ${batchNumber} exists:`, error);
      throw error;
    }
  }

  static async getMoleculeStrengths() {
    try {
      const response = await api.get('/moleculeStrength');
      return response.data;
    } catch (error) {
      console.error('Error fetching molecule strengths:', error);
      throw error;
    }
  }
}

