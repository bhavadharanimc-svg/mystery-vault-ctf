import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';
import type { Team } from '../types';

interface AuthContextType {
  team: Team | null;
  token: string | null;
  isAdmin: boolean;
  login: (name: string, pin: string) => Promise<void>;
  register: (name: string, pin: string) => Promise<void>;
  adminLogin: (name: string, pin: string) => Promise<void>;
  logout: () => void;
  refreshTeam: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('ctf_token'));
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const adminFlag = localStorage.getItem('ctf_is_admin') === 'true';
      setIsAdmin(adminFlag);
      if (!adminFlag) {
        refreshTeam();
      }
    }
  }, []);

  /** Shared helper: persist token + update React state */
  const _applyToken = (t: string, teamData: Team, admin = false) => {
    localStorage.setItem('ctf_token', t);
    localStorage.setItem('ctf_is_admin', admin ? 'true' : 'false');
    axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    setToken(t);
    setTeam(teamData);
    setIsAdmin(admin);
  };

  const login = async (name: string, pin: string) => {
    const { data } = await axios.post('/api/auth/login', { name, pin });
    _applyToken(data.token, data.team, false);
  };

  /** Self-registration — creates the team then logs them straight in */
  const register = async (name: string, pin: string) => {
    const { data } = await axios.post('/api/auth/register', { name, pin });
    _applyToken(data.token, data.team, false);
  };

  const adminLogin = async (name: string, pin: string) => {
    const { data } = await axios.post('/api/auth/admin', { name, pin });
    localStorage.setItem('ctf_token', data.token);
    localStorage.setItem('ctf_is_admin', 'true');
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setToken(data.token);
    setIsAdmin(true);
  };

  const logout = () => {
    localStorage.removeItem('ctf_token');
    localStorage.removeItem('ctf_is_admin');
    delete axios.defaults.headers.common['Authorization'];
    // Hard redirect — clears all React state so no stale token bounces the user back
    window.location.href = '/';
  };

  const refreshTeam = async () => {
    try {
      const { data } = await axios.get('/api/teams/me');
      setTeam(data);
    } catch {
      // Token may be expired
    }
  };

  return (
    <AuthContext.Provider value={{ team, token, isAdmin, login, register, adminLogin, logout, refreshTeam }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
