import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthSession, getAuthToken } from "../utils/auth";
import { userService } from "../services/userService";

export default function SessionGuard({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const verifySession = async () => {
      const token = getAuthToken();
      if (!token) return;
      try {
        await userService.getProfile();
      } catch {
        // Only sign out on auth errors; ignore network failures
        clearAuthSession();
        navigate("/login", { replace: true, state: { message: "Your account is no longer available. Please log in again." } });
      }
    };
    verifySession();
    const interval = window.setInterval(verifySession, 30000);
    return () => window.clearInterval(interval);
  }, [navigate]);

  return children;
}

