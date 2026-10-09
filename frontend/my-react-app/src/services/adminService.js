import apiClient from "./apiClient";

export const adminService = {
  // Users / Owners
  getUsers: (params) => apiClient.get("/admin/users", { params }),
  getUserById: (id) => apiClient.get(`/admin/users/${id}`),
  blockUser: (id, isBlocked) => apiClient.patch(`/admin/users/${id}/block`, { isBlocked }),
  deleteUser: (id) => apiClient.delete(`/admin/users/${id}`),
  createOwner: (data) => apiClient.post("/admin/owners", data),

  // Turfs
  getTurfs: (params) => apiClient.get("/admin/turfs", { params }),
  setTurfListing: (id, isListed) => apiClient.patch(`/admin/turfs/${id}/listing`, { isListed }),
  setTurfStatus: (id, status) => apiClient.patch(`/admin/turfs/${id}/status`, { status }),
  deleteTurf: (id) => apiClient.delete(`/admin/turfs/${id}`),

  // Bookings
  getBookings: (params) => apiClient.get("/admin/bookings", { params }),
};
