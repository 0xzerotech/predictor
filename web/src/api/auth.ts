import { apiGet, apiPost } from "./client";
import { UserProfile } from "../types/api";

interface AuthResponse {
  user: UserProfile;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export const signup = (email: string, password: string) =>
  apiPost<AuthResponse>("/auth/signup", { email, password });

export const login = (email: string, password: string) =>
  apiPost<AuthResponse>("/auth/login", { email, password });

export const refresh = (refreshToken: string) =>
  apiPost<{ accessToken: string; refreshToken: string }>("/auth/refresh", { refreshToken });

export const fetchProfile = () => apiGet<UserProfile>("/user/me", { auth: true });
