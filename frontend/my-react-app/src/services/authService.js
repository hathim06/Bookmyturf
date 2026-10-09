import apiClient from "./apiClient";

export const authService = {
  login: (credentials) => apiClient.post("/users/login", credentials),
  register: (details) => apiClient.post("/users/register", details),
  googleLogin: (credential) =>
    apiClient.post("/users/google-login", { credential }),
};
