import { SalesReturnCreatePayload, SalesReturnData, SalesReturnKpiResponse } from '@/types/SalesReturnData';
import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';


// Raise a sales return against a bill. It is Completed on create and the
// stock goes back immediately; amounts are stored as sent.
export const createSalesReturn = async (
  payload: SalesReturnCreatePayload
): Promise<SalesReturnData> => {
  try {
    const response = await api.post('/sales-return/create', payload);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to create the sales return.');
  }
};

// Fetch all sales returns for the selected pharmacy
export const getAllSalesReturn = async (): Promise<SalesReturnData[]> => {
  try {
    const response = await api.get('/sales-return/allSalesReturn');
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch sales returns.');
  }
};

// KPI cards: number of returns and total amount refunded, for the selected pharmacy
export const getSalesReturnKpis = async (): Promise<SalesReturnKpiResponse> => {
  try {
    const response = await api.get('/sales-return/kpi');
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch sales return KPIs.');
  }
};

// Fetch one sales return with its lines
export const getSalesReturnById = async (
  salesReturnId: number | string
): Promise<SalesReturnData> => {
  try {
    const response = await api.get(`/sales-return/${salesReturnId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the sales return.');
  }
};
