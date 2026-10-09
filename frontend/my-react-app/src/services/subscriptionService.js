import apiClient from "./apiClient";

export const subscriptionService = {
  // Plans
  getPlans: () => apiClient.get("/subscriptions/plans"),

  // Owner
  getMySubscription: () => apiClient.get("/subscriptions/my"),
  getMyHistory: () => apiClient.get("/subscriptions/my/history"),
  createOrder: (data) => apiClient.post("/subscriptions/create-order", data),
  verifyPayment: (data) => apiClient.post("/subscriptions/verify", data),
  cancelSubscription: (id) => apiClient.patch(`/subscriptions/${id}/cancel`),
  getOwnerReport: (params) => apiClient.get("/subscriptions/owner/report", { params }),
  getOwnerDashboard: () => apiClient.get("/subscriptions/owner/dashboard"),

  // Admin
  adminGetAll: (params) => apiClient.get("/subscriptions/admin/all", { params }),
  adminGetStats: () => apiClient.get("/subscriptions/admin/stats"),
  adminGetReport: (params) => apiClient.get("/subscriptions/admin/report", { params }),
  adminGetDashboard: () => apiClient.get("/subscriptions/admin/dashboard"),
};
