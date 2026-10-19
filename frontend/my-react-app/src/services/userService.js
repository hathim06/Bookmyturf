import apiClient from "./apiClient";

export const userService = {
  // Auth
  login: (credentials) => apiClient.post("/users/login", credentials),
  register: (details) => apiClient.post("/users/register", details),
  googleLogin: (credential) =>
    apiClient.post("/users/google-login", { credential }),
  forgotPassword: (email) =>
    apiClient.post("/users/forgot-password", { email }),
  verifyPasswordResetOtp: (email, otp) =>
    apiClient.post("/users/verify-password-reset-otp", { email, otp }),
  resetPassword: (email, otp, password) =>
    apiClient.post("/users/reset-password", { email, otp, password }),
  resendSignupOtp: (email) =>
    apiClient.post("/users/resend-signup-otp", { email }),
  verifySignupOtp: (email, otp) =>
    apiClient.post("/users/verify-signup-otp", { email, otp }),

  // Profile
  getProfile: () => apiClient.get("/users/profile"),
  updateProfile: (data) => apiClient.patch("/users/profile", data),
  uploadPicture: (formData) =>
    apiClient.post("/users/profile/picture", formData),
  deletePicture: () => apiClient.delete("/users/profile/picture"),
  changeEmail: (data) => apiClient.patch("/users/profile/email", data),
  changePassword: (data) => apiClient.patch("/users/profile/password", data),
  setPassword: (data) => apiClient.post("/users/profile/password/create", data),
  verifyOtp: (data) => apiClient.post("/users/profile/verify-otp", data),
  resendOtp: () => apiClient.post("/users/profile/resend-otp", {}),

  // Bookings
  getBookings: () => apiClient.get("/users/bookings"),
  getWallet: () => apiClient.get("/users/wallet"),
  cancelBooking: (id, reason) =>
    apiClient.patch(`/users/bookings/${id}/cancel`, { reason }),
  retryPaymentOrder: (id) => apiClient.post(`/users/bookings/${id}/retry-payment`, {}),
  verifyRetryPayment: (data) => apiClient.post("/users/payments/verify", data),
};
