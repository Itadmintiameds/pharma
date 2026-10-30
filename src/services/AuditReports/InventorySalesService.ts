import { InventorySalesReportFilter, InventorySalesReportResponse } from '@/types/AuditReports/InventorySalesData';
import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';

// Lists go out as repeated keys (?pharmacyIds=A&pharmacyIds=B), which Spring
// binds to List<...>; axios's default "pharmacyIds[]=A" form would not bind.
// Empty values are left out so the backend treats them as "no restriction".
const toSearchParams = (filter: InventorySalesReportFilter): URLSearchParams => {
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

// Inventory Sales Report: product-wise sales and sales returns for the period,
// with KPI totals and one page of the Product Sales Details table.
export const getInventorySalesReport = async (
  filter: InventorySalesReportFilter
): Promise<InventorySalesReportResponse> => {
  try {
    const response = await api.get('/auditReports/inventory-sales', {
      params: toSearchParams(filter),
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the inventory sales report.');
  }
};
