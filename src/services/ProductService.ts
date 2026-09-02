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

  // Batches at a specific pharmacy rather than the caller's currently active one —
  // e.g. the source pharmacy chosen for a pharmacy-to-pharmacy transfer, which may
  // differ from the pharmacy the caller is scoped to via X-Pharmacy-Id.
  static async getBatchesForPharmacy(pharmacyId: string) {
    try {
      const response = await api.get(`/product/batches/pharmacy/${pharmacyId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching batches for pharmacy ${pharmacyId}:`, error);
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

  // Checks whether a product with the same name (and optionally brand/HSN)
  // already exists for the caller's organization, so the wizard can warn the
  // user before they proceed past the Product Details step.
  static async checkProductExists(productName: string, brandName?: string, hsnNo?: string) {
    try {
      const response = await api.get('/product/exists', {
        params: { productName, brandName, hsnNo }
      });
      return response.data as { exists: boolean; message: string };
    } catch (error) {
      console.error(`Error checking if product ${productName} exists:`, error);
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

