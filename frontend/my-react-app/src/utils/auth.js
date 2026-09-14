export const getAuthToken = () => {
  return sessionStorage.getItem('token') || localStorage.getItem('token') || '';
};

export const getAuthUser = () => {
  try {
    const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setAuthSession = (token, user) => {
  sessionStorage.setItem('token', token);
  sessionStorage.setItem('user', JSON.stringify(user));
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const updateAuthUser = (userUpdates) => {
  const current = getAuthUser() || {};
  const updated = { ...current, ...userUpdates };
  if (sessionStorage.getItem('token')) {
    sessionStorage.setItem('user', JSON.stringify(updated));
  } else {
    localStorage.setItem('user', JSON.stringify(updated));
  }
};

export const clearAuthSession = () => {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};
