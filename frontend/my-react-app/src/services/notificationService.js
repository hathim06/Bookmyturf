import apiClient from "./apiClient";

export const notificationService = {
  list: () => apiClient.get("/notifications"),
  markRead: (ids) => apiClient.patch("/notifications/read", ids ? { ids } : {}),
};
