import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

import { fetchProfile, login as apiLogin, signup as apiSignup, refresh as apiRefresh } from "../api/auth";
import { UserProfile } from "../types/api";

interface AuthContextValue {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ACCESS_TOKEN_KEY = "pm_access_token";
const REFRESH_TOKEN_KEY = "pm_refresh_token";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY));
  const [refreshToken, setRefreshToken] = useState<string | null>(localStorage.getItem(REFRESH_TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(!!accessToken);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        const profile = await fetchProfile();
        setUser(profile);
      } catch (err) {
        console.error("Failed to fetch profile", err);
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem(ACCESS_TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [accessToken]);

  const handleAuthSuccess = (profile: UserProfile, tokens: { accessToken: string; refreshToken: string }) => {
    setUser(profile);
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  };

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const response = await apiLogin(email, password);
      handleAuthSuccess(response.user, response.tokens);
    } catch (err: any) {
      setError(err.message ?? "Login failed");
      throw err;
    }
  };

  const signup = async (email: string, password: string) => {
    setError(null);
    try {
      const response = await apiSignup(email, password);
      handleAuthSuccess(response.user, response.tokens);
    } catch (err: any) {
      setError(err.message ?? "Signup failed");
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  };

  useEffect(() => {
    if (!refreshToken) return;

    const interval = setInterval(async () => {
      try {
        const tokens = await apiRefresh(refreshToken);
        setAccessToken(tokens.accessToken);
        localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
      } catch (err) {
        console.warn("refresh failed", err);
        logout();
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshToken]);

  const value = useMemo(
    () => ({ user, accessToken, refreshToken, login, signup, logout, isLoading, error }),
    [user, accessToken, refreshToken, isLoading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
