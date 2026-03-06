import { create } from "zustand";
import * as auth from "../services/auth";
import { getAuthStatus, logout as apiLogout } from "../services/api";

interface AuthState {
  isAuthenticated: boolean;
  loading: boolean;
  portalId: string | null;
  checkAuth: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  handleCallback: (url: string) => boolean;
}

export const useAuth = create<AuthState>((set) => ({
  isAuthenticated: false,
  loading: true,
  portalId: null,

  checkAuth: async () => {
    // Check if we have a locally stored token
    if (auth.isAuthenticated()) {
      try {
        const status = await getAuthStatus();
        if (status.authenticated) {
          set({
            isAuthenticated: true,
            loading: false,
            portalId: status.portalId || null,
          });
          return;
        }
      } catch {
        // Token invalid — clear it
        auth.clearAuthToken();
      }
    }
    set({ isAuthenticated: false, loading: false });
  },

  login: async () => {
    await auth.startOAuthFlow();
  },

  logout: async () => {
    try {
      await apiLogout();
    } catch {
      // Best effort — clear local state regardless
    }
    auth.clearAuthToken();
    set({ isAuthenticated: false, portalId: null });
  },

  handleCallback: (url: string) => {
    const result = auth.parseAuthCallback(url);
    if (result) {
      auth.setAuthToken(result.token, result.portalId);
      set({
        isAuthenticated: true,
        portalId: result.portalId || null,
      });
      return true;
    }
    return false;
  },
}));
