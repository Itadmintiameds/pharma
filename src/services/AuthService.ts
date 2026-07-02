import { LoginRequest, RegisterRequest, VerifyOtpRequest } from "@/types/AuthData";
import api from "@/utils/api";
import { handleApiError } from "@/utils/errorHandler";


export const register = async (data: RegisterRequest) => {
  try {
    const response = await api.post("/user/registration", data);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to register user.");
  }
};

export const login = async (data: LoginRequest) => {
  try {
    const response = await api.post("/auth/login", data);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to login.");
  }
};

export const verifyOtp = async (data: VerifyOtpRequest) => {
  try {
    const response = await api.post("/auth/verify-otp", data);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to verify OTP.");
  }
};

export const logout = async () => {
  try {
    const response = await api.post("/auth/logout");
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to logout.");
  }
};