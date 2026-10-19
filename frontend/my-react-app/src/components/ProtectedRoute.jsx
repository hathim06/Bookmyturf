import { Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { getAuthToken, getAuthUser, clearAuthSession } from '../utils/auth';
import { userService } from '../services/userService';
import OwnerSubscriptionProvider from '../contexts/OwnerSubscriptionProvider';

export default function ProtectedRoute({ role, children }) {
  const navigate = useNavigate();
  const token = getAuthToken();
  const user = getAuthUser();

  useEffect(() => {
    if (!token) return undefined;
    const checkAccount = async () => {
      try {
        await userService.getProfile();
      } catch (err) {
        // 403 = blocked, 401 = invalid token
        if (err.message?.includes('blocked') || err.message?.includes('401') || err.message?.includes('403')) {
          clearAuthSession();
          navigate('/login', { replace: true, state: { message: 'Your account has been blocked.' } });
        }
      }
    };
    checkAccount();
    const interval = window.setInterval(checkAccount, 15000);
    return () => window.clearInterval(interval);
  }, [navigate, token]);

  if (token && user?.role === role) {
    return role === 'owner'
      ? <OwnerSubscriptionProvider>{children}</OwnerSubscriptionProvider>
      : children;
  }

  if (token && user?.role) {
    const destinations = { admin: "/admin/dashboard", owner: "/owner/dashboard", user: "/" };
    return <Navigate to={destinations[user.role] || "/"} replace />;
  }
  clearAuthSession();
  return <Navigate to="/login" replace />;
}

