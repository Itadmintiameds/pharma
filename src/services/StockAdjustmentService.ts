import { StockAdjustmentData, StockAdjustmentKpiResponse } from '@/types/StockAdjustmentData';
import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';


// Set a batch's stock at the current warehouse or pharmacy to actualStockQty.
// adjustmentType (INCREASE / DECREASE) must match the direction of the change.
export const createStockAdjustment = async (
  payload: StockAdjustmentData
): Promise<StockAdjustmentData> => {
  try {
    const response = await api.post('/stock-adjustment/create', payload);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to create the stock adjustment.');
  }
};

// Fetch all stock adjustments for the current warehouse or pharmacy
export const getAllStockAdjustments = async (): Promise<StockAdjustmentData[]> => {
  try {
    const response = await api.get('/stock-adjustment/allStockAdjustment');
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch stock adjustments.');
  }
};

// KPI cards: number of adjustments and net adjustment value, for the current warehouse or pharmacy
export const getStockAdjustmentKpis = async (): Promise<StockAdjustmentKpiResponse> => {
  try {
    const response = await api.get('/stock-adjustment/kpi');
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch stock adjustment KPIs.');
  }
};

// Fetch one stock adjustment
export const getStockAdjustmentById = async (
  stockAdjustmentId: number | string
): Promise<StockAdjustmentData> => {
  try {
    const response = await api.get(`/stock-adjustment/getById/${stockAdjustmentId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the stock adjustment.');
  }
};
