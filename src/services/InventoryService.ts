import type {
  ProductDetails,
  ProductDetailsResponse,
  ProductListItem,
  ProductListResponse,
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

// GET /product -> the full product master list used by the purchase search.
export const getAllProducts = async (): Promise<ProductListItem[]> => {
  try {
    const res = await api.get<ProductListResponse | ProductListItem[]>("product");
    // Most endpoints wrap the payload in { data, message }; tolerate a bare array too.
    const payload = Array.isArray(res.data) ? res.data : res.data?.data;
    return payload ?? [];
  } catch (error) {
    throw handleApiError(error, "Failed to load products.");
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
