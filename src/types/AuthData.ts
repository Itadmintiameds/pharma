export interface RegisterRequest {
  userEmail: string;
  password: string;
}

export interface LoginRequest {
  userName: string;
  password: string;
}

export interface VerifyOtpRequest {
  userEmail: string;
  otp: string;
}