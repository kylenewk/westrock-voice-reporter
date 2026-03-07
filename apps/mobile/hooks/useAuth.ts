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
  handleCallback: (url: string) => Promise<boolean>;
}

export const useAuth = create<AuthState>((set) => ({
  isAuthenticated: false,
  loading: true,
  portalId: null,

  checkAuth: async () => {
    // First, try to restore a persisted session from secure storage
    if (!auth.isAuthenticated()) {
      await auth.loadPersistedAuth();
    }

    // If we have a token (either from memory or restored), validate it
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
        await auth.clearAuthToken();
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
    await auth.clearAuthToken();
    set({ isAuthenticated: false, portalId: null });
  },

  handleCallback: async (url: string) => {
    const result = auth.parseAuthCallback(url);
    if (result) {
      await auth.setAuthToken(result.token, result.portalId);
      set({
        isAuthenticated: true,
        portalId: result.portalId || null,
      });
      return true;
    }
    return false;
  },
}));
