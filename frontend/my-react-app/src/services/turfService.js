import apiClient from "./apiClient";

export const turfService = {
  list: (params) => apiClient.get("/turfs", { params }),
  getById: (id) => apiClient.get(`/turfs/${id}`),
};
