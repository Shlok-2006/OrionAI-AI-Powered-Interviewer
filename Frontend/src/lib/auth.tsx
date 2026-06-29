import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AuthUser = {
  id?: string;
  email: string;
  fullName?: string;
  targetRole?: string;
  experienceLevel?: string;
  profileComplete?: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "orionai_token";
const USER_KEY = "orionai_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = window.localStorage.getItem(TOKEN_KEY);
    const u = window.localStorage.getItem(USER_KEY);
    if (t) setToken(t);
    if (u) {
      try {
        const parsed = JSON.parse(u);
        // Map name to fullName if present
        if (parsed.name && !parsed.fullName) {
          parsed.fullName = parsed.name;
        }
        setUser(parsed);
      } catch {
        /* ignore */
      }
    }
    setHydrated(true);
  }, []);

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    const mappedUser = {
      ...newUser,
      fullName: newUser.fullName || (newUser as any).name,
    };
    window.localStorage.setItem(TOKEN_KEY, newToken);
    window.localStorage.setItem(USER_KEY, JSON.stringify(mappedUser));
    setToken(newToken);
    setUser(mappedUser);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((prev) => {
      const next = { ...(prev ?? { email: "" }), ...patch } as AuthUser;
      // Ensure name is also kept in sync for backend compatibility
      if (next.fullName) {
        (next as any).name = next.fullName;
      }
      window.localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      login,
      logout,
      updateUser,
    }),
    [user, token, login, logout, updateUser],
  );

  if (!hydrated) {
    // Avoid hydration mismatch flicker.
    return <div className="min-h-screen" />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}