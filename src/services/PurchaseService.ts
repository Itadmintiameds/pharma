import api from '@/utils/api';

export class PurchaseService {
  /**
   * Whether a purchase already exists for this supplier, invoice number and
   * year — the three together are what has to be unique. The endpoint answers
   * with a bare `true` / `false`, no wrapper.
   *
   * Errors are deliberately not swallowed: the caller decides whether a failed
   * check should block, and treating a network failure as "not a duplicate"
   * would wave through the very thing this guards against.
   */
  static async checkInvoiceExists(
    supplierId: number,
    invoiceNo: string,
    year: number | string
  ): Promise<boolean> {
    const response = await api.get('/purchase/check-invoice', {
      params: { supplierId, invoiceNo, year },
    });
    return response.data === true;
  }

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
