import apiClient from "./apiClient";

export const ownerTurfService = {
  list: (params) => apiClient.get("/owner/turfs", { params }),
  listCategories: () => apiClient.get("/owner/categories"),
  save: (id, data) => id ? apiClient.put(`/owner/turfs/${id}`, data) : apiClient.post("/owner/turfs", data),
  setListing: (id, isListed) => apiClient.patch(`/owner/turfs/${id}/listing`, { isListed }),
  remove: (id) => apiClient.delete(`/owner/turfs/${id}`),
  getBookings: () => apiClient.get("/owner/bookings"),
  addCategory: (data) => apiClient.post("/owner/categories", data),
  removeCategory: (id) => apiClient.delete(`/owner/categories/${id}`),

  // Offers
  listOffers: () => apiClient.get("/owner/offers"),
  listTurfOffers: (turfId) => apiClient.get(`/owner/turfs/${turfId}/offers`),
  createOffer: (data) => apiClient.post("/owner/offers", data),
  updateOffer: (id, data) => apiClient.put(`/owner/offers/${id}`, data),
  deleteOffer: (id) => apiClient.delete(`/owner/offers/${id}`),
};
