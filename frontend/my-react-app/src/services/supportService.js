import apiClient from "./apiClient";

export const supportService = {
  list: (params) => apiClient.get("/support", { params }),
  create: (ticket) => apiClient.post("/support", ticket),
  reply: (ticketId, message) =>
    apiClient.post(`/support/${ticketId}/replies`, { message }),
  updateStatus: (ticketId, status) =>
    apiClient.patch(`/support/${ticketId}/status`, { status }),
};
