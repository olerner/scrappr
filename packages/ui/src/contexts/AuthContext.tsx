import { createContext, type ReactNode, useContext } from "react";
import { type AuthState, useAuth } from "../hooks/useAuth";

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

/**
 * Returns the shared auth state from the nearest AuthProvider.
 * Use this instead of calling useAuth() directly in components — it ensures
 * all components see the same auth state (e.g. Header stays in sync after sign-in).
 */
export function useAuthContext(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside <AuthProvider>");
  return ctx;
}
