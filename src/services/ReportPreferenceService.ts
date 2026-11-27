import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';

// The logged-in user's favourite reports in the Reports hub. A report is
// identified by its route segment (e.g. "BillSummary"). Favourites belong to
// the user, not the pharmacy.

const BASE = '/user-preferences/report-favourites';

/** Favourite report keys, oldest first. */
export const getReportFavourites = async (): Promise<string[]> => {
  try {
    const response = await api.get<{ reportKeys: string[] }>(BASE);
    return response.data?.reportKeys ?? [];
  } catch (error) {
    throw handleApiError(error, 'Failed to load favourite reports.');
  }
};

/** Idempotent: adding an existing favourite is a no-op. */
export const addReportFavourite = async (reportKey: string): Promise<void> => {
  try {
    await api.put(`${BASE}/${encodeURIComponent(reportKey)}`);
  } catch (error) {
    throw handleApiError(error, 'Failed to add the report to favourites.');
  }
};

/** Idempotent: removing a report that isn't a favourite is a no-op. */
export const removeReportFavourite = async (reportKey: string): Promise<void> => {
  try {
    await api.delete(`${BASE}/${encodeURIComponent(reportKey)}`);
  } catch (error) {
    throw handleApiError(error, 'Failed to remove the report from favourites.');
  }
};
