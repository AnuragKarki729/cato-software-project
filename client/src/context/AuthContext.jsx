// Responsibility 7 — Aye Myo Myat (6837919)
import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from '../api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export function homeFor(user) {
  if (user.role === 'recruiter') return '/find';
  if (user.onboarding_step === 'profile') return '/onboarding/profile';
  if (user.onboarding_step === 'video') return '/onboarding/video';
  return '/profile';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  useEffect(() => {
    let active = true;
    if (getToken()) {
      api.get('/auth/me').then(data => { if (active) setUser(data); })
        .catch(error => { if (active) setSessionError(error.message); })
        .finally(() => { if (active) setLoading(false); });
    } else setLoading(false);
    function expire() { setUser(null); setSessionError('Your session has expired. Please log in again.'); }
    window.addEventListener('cato:session-expired', expire);
    return () => { active = false; window.removeEventListener('cato:session-expired', expire); };
  }, []);

  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    setToken(data.access_token);
    setUser(data.user);
    setSessionError('');
    return data.user;
  }
  async function logout() {
    // Keep the session if revocation fails, so the user can retry logout.
    await api.post('/auth/logout');
    setToken(null);
    setUser(null);
  }
  return <AuthContext.Provider value={{ user, loading, login, logout, sessionError }}>{children}</AuthContext.Provider>;
}
