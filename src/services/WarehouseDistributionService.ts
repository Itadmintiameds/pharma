import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';
import {
  CreateWarehouseDistributionRequest,
  ReceiveWarehouseDistributionRequest,
  WarehouseDistributionData,
  WarehouseDistributionSummary,
} from '@/types/WarehouseDistributionData';

// Create a distribution / stock-transfer allocation.
// POST /warehouse/create -> WarehouseDistributionController#createAllocation
export const createAllocation = async (
  request: CreateWarehouseDistributionRequest
): Promise<WarehouseDistributionData> => {
  try {
    const response = await api.post('/warehouse/distribution/create', request);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to create warehouse distribution allocation.');
  }
};

// Preview the allocation number a new allocation will be assigned on create.
// GET /warehouse/distribution/next-allocation-no -> WarehouseDistributionController#nextAllocationNo
export const getNextAllocationNo = async (): Promise<string> => {
  try {
    const response = await api.get('/warehouse/distribution/next-allocation-no');
    return response.data?.allocationNo ?? '';
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the next allocation number.');
  }
};

// Stock-receipt list: distributions where the current store is the destination.
// GET /warehouse/distribution/warehouse/destination -> WarehouseDistributionController#destinationForWarehouse
export const getDestinationDistributions = async (): Promise<
  WarehouseDistributionSummary[]
> => {
  try {
    const response = await api.get('/warehouse/distribution/warehouse/destination');
    return response.data ?? [];
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch incoming stock distributions.');
  }
};

// Full detail of one distribution (header, lines with product/batch/packaging, status history).
// GET /warehouse/distribution/{distributionId} -> WarehouseDistributionController#getById
export const getWarehouseDistribution = async (
  distributionId: number
): Promise<WarehouseDistributionData> => {
  try {
    const response = await api.get(`/warehouse/distribution/${distributionId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the distribution details.');
  }
};

// Receive: destination confirms received/damaged quantities (PRODUCTS_DISPATCHED -> STOCK_RECEIVED).
// POST /warehouse/distribution/{distributionId}/receive -> WarehouseDistributionController#receive
export const receiveAllocation = async (
  distributionId: number,
  request: ReceiveWarehouseDistributionRequest
): Promise<WarehouseDistributionData> => {
  try {
    const response = await api.post(
      `/warehouse/distribution/${distributionId}/receive`,
      request
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to confirm stock receipt.');
  }
};

// Dispatch: source stock leaves (DISTRIBUTION_CREATED -> PRODUCTS_DISPATCHED).
// POST /warehouse/distribution/{distributionId}/dispatch -> WarehouseDistributionController#dispatch
export const dispatchAllocation = async (
  distributionId: number
): Promise<WarehouseDistributionData> => {
  try {
    const response = await api.post(`/warehouse/distribution/${distributionId}/dispatch`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to dispatch the allocation.');
  }
};
