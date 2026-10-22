import { SupplierPaymentData, SupplierPaymentKpiResponse } from '@/types/SupplierPaymentData';
import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';


// Record a payment against a purchase of the current warehouse or pharmacy.
// The backend also marks that purchase as PAID.
export const createSupplierPayment = async (
  payload: SupplierPaymentData
): Promise<SupplierPaymentData> => {
  try {
    const response = await api.post('/supplier-payments/create', payload);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to create the supplier payment.');
  }
};

// Fetch all supplier payments for the current warehouse or pharmacy
export const getAllSupplierPayments = async (): Promise<SupplierPaymentData[]> => {
  try {
    const response = await api.get('/supplier-payments/allSupplierPayments');
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch supplier payments.');
  }
};

// KPI cards: total supplier payable, overdue payable and supplier credit,
// for the current warehouse or pharmacy
export const getSupplierPaymentKpis = async (): Promise<SupplierPaymentKpiResponse> => {
  try {
    const response = await api.get('/supplier-payments/kpi');
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch supplier payment KPIs.');
  }
};

// Fetch all payments made against one purchase
export const getSupplierPaymentsByPurchase = async (
  purchaseId: number | string
): Promise<SupplierPaymentData[]> => {
  try {
    const response = await api.get(`/supplier-payments/purchase/${purchaseId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch payments for the purchase.');
  }
};

// Fetch one supplier payment
export const getSupplierPaymentById = async (
  supplierPaymentId: number | string
): Promise<SupplierPaymentData> => {
  try {
    const response = await api.get(`/supplier-payments/getById/${supplierPaymentId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the supplier payment.');
  }
};
