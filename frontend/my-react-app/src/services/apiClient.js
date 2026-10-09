import axios from "axios";
import { getAuthToken } from "../utils/auth";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message
      || (error.code === "ECONNABORTED" ? "The server took too long to respond. Please try again." : "Cannot reach the server. Make sure the backend is running.");
    return Promise.reject(new Error(message));
  },
);

export default apiClient;
