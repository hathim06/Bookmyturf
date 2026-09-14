import { Navigate } from 'react-router-dom';
import { getAuthToken, getAuthUser, clearAuthSession } from '../utils/auth';

const destinations = { admin: '/admin/dashboard', owner: '/owner/dashboard', user: '/' };

export default function GuestRoute({ children }) {
  const token = getAuthToken();
  const user = getAuthUser();

  if (token && user?.role && destinations[user.role]) {
    return <Navigate to={destinations[user.role]} replace />;
  }

  if (!token && user) {
    clearAuthSession();
  }

  return children;
}


