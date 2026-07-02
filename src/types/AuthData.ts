export interface RegisterRequest {
  userEmail: string;
  password: string;
}

export interface LoginRequest {
  userEmail: string;
  password: string;
}

export interface VerifyOtpRequest {
  userEmail: string;
  otp: string;
}

export interface EmailOtpRequest {
  email: string;
}

export interface EmailOtpVerifyRequest {
  email: string;
  otp: string;
}