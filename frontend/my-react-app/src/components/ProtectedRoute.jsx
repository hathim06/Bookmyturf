import { Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { getAuthToken, getAuthUser, clearAuthSession } from '../utils/auth';

export default function ProtectedRoute({ role, children }) {
  const navigate = useNavigate();
  const token = getAuthToken();
  const user = getAuthUser();

  useEffect(() => {
    if (!token) return undefined;
    const checkAccount = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/users/profile', {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
        });
        if (response.status === 403) {
          clearAuthSession();
          navigate('/login', { replace: true, state: { message: 'Your account has been blocked.' } });
        }
      } catch {
        // The normal page request handles temporary network failures.
      }
    };
    checkAccount();
    const interval = window.setInterval(checkAccount, 15000);
    return () => window.clearInterval(interval);
  }, [navigate, token]);

  if (token && user?.role === role) {
    return children;
  }

  clearAuthSession();
  return <Navigate to="/login" replace />;
}


