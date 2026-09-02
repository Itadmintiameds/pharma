export interface RegisterRequest {
  fullName: string;
  userEmail: string;
  password: string;
  /**
   * Always true when sent — registration is blocked until the user has read the
   * Terms & Conditions and Privacy Policy through to the end and accepted them.
   */
  acceptedTerms: boolean;
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