import { StockMovementReportFilter, StockMovementReportResponse } from '@/types/AuditReports/StockMovementData';
import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';

// Lists go out as repeated keys (?pharmacyIds=A&pharmacyIds=B), which Spring
// binds to List<...>; axios's default "pharmacyIds[]=A" form would not bind.
// Empty values are left out so the backend treats them as "no restriction".
const toSearchParams = (filter: StockMovementReportFilter): URLSearchParams => {
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

// Stock Movement Report: every stock movement at pharmacies and warehouses during
// the period with a running balance, plus KPI totals and one page of the Stock
// Movement Details table.
export const getStockMovementReport = async (
  filter: StockMovementReportFilter
): Promise<StockMovementReportResponse> => {
  try {
    const response = await api.get('/auditReports/stock-movement', {
      params: toSearchParams(filter),
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the stock movement report.');
  }
};
