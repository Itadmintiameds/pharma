import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';
import { CustomerRecord } from '@/types/BillingData';

/**
 * Customers registered against a phone number for the selected pharmacy — one
 * number can belong to a family, so this returns a list.
 * The pharmacy id travels in the X-Pharmacy-Id header (see utils/api).
 */
export const getCustomersByPhone = async (
  phoneNo: string
): Promise<CustomerRecord[]> => {
  try {
    const response = await api.get(`/customer/phone/${phoneNo}`);
    return response.data ?? [];
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch customers for this number.');
  }
};
