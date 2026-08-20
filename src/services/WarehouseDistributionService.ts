import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';
import {
  CreateWarehouseDistributionRequest,
  WarehouseDistributionData,
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
