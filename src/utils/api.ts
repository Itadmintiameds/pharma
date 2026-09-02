import { usePharmacyStore } from "@/store/pharmacyStore";
import { useWarehouseStore } from "@/store/warehouseStore";
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // Sends HttpOnly cookies (access/refresh tokens)
  headers: {
    "Content-Type": "application/json",
  },
});

// State to manage concurrent refresh token requests
let isRefreshing = false;
let failedQueue: { resolve: (value?: unknown) => void; reject: (reason?: any) => void }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor to handle token expiration (HTTP 401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and the request has not been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Skip refresh flow if we are already trying to login, logout, or refresh to prevent infinite loops.
      // /terms is here for a different reason: it is read on the registration
      // page by a user who has no account yet, so a 401 there must surface to
      // the caller rather than redirect them away mid-signup.
      if (
        originalRequest.url?.includes("/auth/login") ||
        originalRequest.url?.includes("/auth/refreshToken") ||
        originalRequest.url?.includes("/auth/logout") ||
        originalRequest.url?.includes("/terms/")
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If already refreshing, wait for it to finish then retry the original request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to silently refresh the access token via the refreshToken endpoint
        await api.post("/auth/refreshToken");

        // Success: tell all queued requests to proceed
        processQueue(null);

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Failure: reject all queued requests
        processQueue(refreshError);

        // Refresh token is expired or invalid -> force redirect to login
        if (typeof window !== "undefined") {
          usePharmacyStore.getState().clearPharmacy();
          useWarehouseStore.getState().clearWarehouse();
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

api.interceptors.request.use(
  (config) => {
    // Exactly one location header travels with a request — the two must never
    // both be present. Scope decides which:
    //   - acting as a warehouse (a Super Admin who toggled into one): warehouse.
    //   - otherwise a pharmacy is selected (every store role): pharmacy.
    //   - otherwise a warehouse is selected but no pharmacy (a Warehouse
    //     Manager, who has no pharmacy at all): warehouse.
    // A Super Admin has both a pharmacy and (org) warehouses loaded, so without
    // this the pharmacy branch correctly wins until they switch into a warehouse.
    const warehouseState = useWarehouseStore.getState();
    const pharmacy = usePharmacyStore.getState().selectedPharmacy;
    const warehouse = warehouseState.selectedWarehouse;

    if (warehouseState.actingAsWarehouse) {
      if (warehouse?.warehouseId) {
        config.headers["X-Warehouse-Id"] = warehouse.warehouseId;
      }
    } else if (pharmacy?.pharmacyId) {
      config.headers["X-Pharmacy-Id"] = pharmacy.pharmacyId;
    } else if (warehouse?.warehouseId) {
      config.headers["X-Warehouse-Id"] = warehouse.warehouseId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

//console.log("ADMIN API URL:", process.env.NEXT_PUBLIC_ADMIN_API_URL);
export const adminApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_ADMIN_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// adminApi.interceptors.request.use(
//   (config) => {
//     const pharmacy =
//       usePharmacyStore.getState().selectedPharmacy;

//     if (pharmacy?.pharmacyId) {
//       config.headers["X-Pharmacy-Id"] =
//         pharmacy.pharmacyId;
//     }

//     return config;
//   },
//   (error) => Promise.reject(error)
// );

adminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return adminApi(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Silently refresh token using the main auth client
        await api.post("/auth/refreshToken");
        processQueue(null);
        return adminApi(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        if (typeof window !== "undefined") {
          usePharmacyStore.getState().clearPharmacy();
          useWarehouseStore.getState().clearWarehouse();
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;