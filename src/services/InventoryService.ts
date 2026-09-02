import type {
  AddBatchPayload,
  AddPackagePayload,
  BatchExpiryKpi,
  BatchExpiryKpiResponse,
  ProductDetails,
  ProductDetailsResponse,
  ProductExpiryKpi,
  ProductExpiryKpiResponse,
  ProductStockSummary,
  ProductStockSummaryResponse,
} from "@/types/ProductData";
import api from "@/utils/api";
import { handleApiError } from "@/utils/errorHandler";

/**
 * Inventory / stock APIs backing the products dashboard.
 * Both endpoints wrap their payload in a { data, message } envelope,
 * which is unwrapped here so callers get the inner value directly.
 */

// GET /product/stock-summary -> one row per product for the inventory list.
export const getProductStockSummary = async (): Promise<ProductStockSummary[]> => {
  try {
    const res = await api.get<ProductStockSummaryResponse>("product/stock-summary");
    return res.data.data;
  } catch (error) {
    throw handleApiError(error, "Failed to load product stock summary.");
  }
};

// GET /product/stock-summary/organization -> same shape as /product/stock-summary
// but scoped to the whole organization rather than the active pharmacy/warehouse.
// Used by the Purchase product search so stock from every location is selectable.
export const getOrganizationProductStockSummary = async (): Promise<ProductStockSummary[]> => {
  try {
    const res = await api.get<ProductStockSummaryResponse>("product/stock-summary/organization");
    return res.data.data;
  } catch (error) {
    throw handleApiError(error, "Failed to load product stock summary.");
  }
};

// GET /product/expiry-kpi -> aggregate counts for the stat cards.
export const getProductExpiryKpi = async (): Promise<ProductExpiryKpi> => {
  try {
    const res = await api.get<ProductExpiryKpiResponse>("product/expiry-kpi");
    return res.data.data;
  } catch (error) {
    throw handleApiError(error, "Failed to load product expiry KPIs.");
  }
};

// GET /product/batch-expiry-kpi -> aggregate batch-level counts for the stat cards.
export const getBatchExpiryKpi = async (): Promise<BatchExpiryKpi> => {
  try {
    const res = await api.get<BatchExpiryKpiResponse>("product/batch-expiry-kpi");
    return res.data.data;
  } catch (error) {
    throw handleApiError(error, "Failed to load batch expiry KPIs.");
  }
};

/**
 * POST /product/{productId}/package -> add a new package (with its first batch)
 * to an existing product. Answers with the product's *full* details, so callers
 * diff against the ids they held before the call to find what was created.
 */
export const addProductPackage = async (
  productId: string,
  payload: AddPackagePayload
): Promise<ProductDetails> => {
  try {
    const res = await api.post<ProductDetailsResponse>(
      `product/${productId}/package`,
      payload
    );
    return res.data?.data ?? (res.data as unknown as ProductDetails);
  } catch (error) {
    throw handleApiError(error, "Failed to add package.");
  }
};

/**
 * POST /product/{productId}/batch -> add batches to existing packages.
 * Takes an array and, like the package call, returns the full product details.
 */
export const addProductBatches = async (
  productId: string,
  payload: AddBatchPayload[]
): Promise<ProductDetails> => {
  try {
    const res = await api.post<ProductDetailsResponse>(
      `product/${productId}/batch`,
      payload
    );
    // This endpoint's body is an array even for a single batch.
    return res.data?.data ?? (res.data as unknown as ProductDetails);
  } catch (error) {
    throw handleApiError(error, "Failed to add batch.");
  }
};

// GET /product/{productId}/details -> packages + batches for a single product.
export const getProductDetails = async (
  productId: string
): Promise<ProductDetails> => {
  try {
    const res = await api.get<ProductDetailsResponse>(`product/${productId}/details`);
    return res.data.data;
  } catch (error) {
    throw handleApiError(error, "Failed to load product details.");
  }
};
