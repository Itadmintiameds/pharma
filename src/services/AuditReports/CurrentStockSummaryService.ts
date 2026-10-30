import { CurrentStockSummaryFilter, CurrentStockSummaryResponse } from '@/types/AuditReports/CurrentStockSummaryData';
import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';

// Lists go out as repeated keys (?pharmacyIds=A&pharmacyIds=B), which Spring
// binds to List<...>; axios's default "pharmacyIds[]=A" form would not bind.
// Empty values are left out so the backend treats them as "no restriction".
const toSearchParams = (filter: CurrentStockSummaryFilter): URLSearchParams => {
  const params = new URLSearchParams();
  Object.entries(filter).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, String(item)));
    } else {
      params.append(key, String(value));
    }
  });
  return params;
};

// Current Stock Summary Report (CurrentStockSummaryController): location-, product-
// and batch-wise stock as of a date, with KPI totals and one page of the Stock
// Details table. Needs REPORTS/CURRENT_STOCK_SUMMARY/VIEW.
export const getCurrentStockSummaryReport = async (
  filter: CurrentStockSummaryFilter
): Promise<CurrentStockSummaryResponse> => {
  try {
    const response = await api.get('/auditReports/current-stock-summary', {
      params: toSearchParams(filter),
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the current stock summary report.');
  }
};
