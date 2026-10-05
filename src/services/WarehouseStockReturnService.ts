import { WarehouseReturn, WarehouseReturnReceivePayload } from '@/types/WarehouseStockReturn';
import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';


// Create a new warehouse return
export const createWarehouseReturn = async (
  payload: WarehouseReturn
): Promise<WarehouseReturn> => {
  try {
    const response = await api.post(
      '/warehouse-return/create',
      payload
    );

    return response.data;
  } catch (error) {
    throw handleApiError(
      error,
      'Failed to create the warehouse return.'
    );
  }
};

// Fetch all warehouse returns for the selected pharmacy
export const getAllWarehouseReturns = async (): Promise<
  WarehouseReturn[]
> => {
  try {
    const response = await api.get(
      '/warehouse-return/getAll'
    );

    return response.data;
  } catch (error) {
    throw handleApiError(
      error,
      'Failed to fetch warehouse returns.'
    );
  }
};

// Fetch a single warehouse return by ID
export const getWarehouseReturnById = async (
  warehouseReturnId: number | string
): Promise<WarehouseReturn> => {
  try {
    const response = await api.get(
      `/warehouse-return/getById/${warehouseReturnId}`
    );

    return response.data;
  } catch (error) {
    throw handleApiError(
      error,
      'Failed to fetch the warehouse return.'
    );
  }
};

// Dispatch a warehouse return
// No request body is required.
//
// Backend:
// PUT /warehouse-return/{warehouseReturnId}/dispatch
//
// The backend will:
// - Set dispatchQuantity = returnQuantity
// - Deduct stock from pharmacy inventory
// - Change status to PENDING_RECEIPT
export const dispatchWarehouseReturn = async (
  warehouseReturnId: number | string
): Promise<WarehouseReturn> => {
  try {
    const response = await api.put(
      `/warehouse-return/${warehouseReturnId}/dispatch`
    );

    return response.data;
  } catch (error) {
    throw handleApiError(
      error,
      'Failed to dispatch the warehouse return.'
    );
  }
};

// Receive a warehouse return
//
// Backend:
// PUT /warehouse-return/{warehouseReturnId}/receive
//
// The request body is the WarehouseReturnDto, so we send
// the updated warehouse return object.
export const receiveWarehouseReturn = async (
  warehouseReturnId: number | string,
  payload: WarehouseReturnReceivePayload
): Promise<WarehouseReturn> => {
  try {
    const response = await api.put(
      `/warehouse-return/${warehouseReturnId}/receive`,
      payload
    );

    return response.data;
  } catch (error) {
    throw handleApiError(
      error,
      'Failed to receive the warehouse return.'
    );
  }
};

// Submit a warehouse return (e.g. from DRAFT to PENDING_RECEIPT with edited details)
export const submitWarehouseReturn = async (
  warehouseReturnId: number | string,
  payload: any
): Promise<WarehouseReturn> => {
  try {
    const response = await api.put(
      `/warehouse-return/${warehouseReturnId}/submit`,
      payload
    );

    return response.data;
  } catch (error) {
    throw handleApiError(
      error,
      'Failed to submit the warehouse return.'
    );
  }
};