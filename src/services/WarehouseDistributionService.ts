import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';
import {
  CreateWarehouseDistributionRequest,
  WarehouseDistributionData,
  WarehouseDistributionSummaryData,
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

// List this warehouse's distributions (incoming + outgoing) as summary rows,
// for the Transfer Explorer table.
// GET /warehouse/distribution/warehouse/list -> WarehouseDistributionController#getAll
export const getWarehouseDistributionList = async (): Promise<
  WarehouseDistributionSummaryData[]
> => {
  try {
    const response = await api.get('/warehouse/distribution/warehouse/list');
    return response.data ?? [];
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the warehouse distribution list.');
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
