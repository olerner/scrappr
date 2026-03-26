/**
 * AuthContext — single source of truth for authentication state.
 *
 * Previously, every component called useAuth() as a local hook, creating
 * independent instances that couldn't communicate. This meant the Header
 * component's isAuthenticated state never updated when a user signed in via
 * the email/password form — the Header kept showing "Log In" even after a
 * successful sign-in.
 *
 * This context lifts auth state to the app root so all consumers share the
 * same instance and react to the same state changes.
 */
import { AuthenticationDetails, CognitoUser, CognitoUserPool } from "amazon-cognito-identity-js";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const userPool =
  import.meta.env.VITE_USER_POOL_ID && import.meta.env.VITE_USER_POOL_CLIENT_ID
    ? new CognitoUserPool({
        UserPoolId: import.meta.env.VITE_USER_POOL_ID,
        ClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
      })
    : null;

const COGNITO_DOMAIN_RAW = import.meta.env.VITE_COGNITO_DOMAIN;
const COGNITO_DOMAIN = COGNITO_DOMAIN_RAW?.startsWith("https://")
  ? COGNITO_DOMAIN_RAW
  : `https://${COGNITO_DOMAIN_RAW}`;
const CLIENT_ID = import.meta.env.VITE_USER_POOL_CLIENT_ID;

const TOKEN_KEYS = {
  accessToken: "scrappr_access_token",
  idToken: "scrappr_id_token",
  refreshToken: "scrappr_refresh_token",
  email: "scrappr_email",
  authSource: "scrappr_auth_source",
} as const;

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp < Math.floor(Date.now() / 1000) + 60;
  } catch {
    return true;
  }
}

async function refreshOAuthTokens(
  refreshToken: string,
): Promise<{ access_token: string; id_token: string } | null> {
  try {
    const response = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: CLIENT_ID,
        refresh_token: refreshToken,
      }).toString(),
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  email: string | null;
  accessToken: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  initiateGoogleSignIn: () => void;
  handleAuthCallback: (code: string) => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEYS.accessToken);
    const storedEmail = localStorage.getItem(TOKEN_KEYS.email);
    const authSource = localStorage.getItem(TOKEN_KEYS.authSource);

    if (authSource === "oauth" && storedToken) {
      if (isTokenExpired(storedToken)) {
        const storedRefreshToken = localStorage.getItem(TOKEN_KEYS.refreshToken);
        if (storedRefreshToken) {
          refreshOAuthTokens(storedRefreshToken).then((newTokens) => {
            if (newTokens) {
              localStorage.setItem(TOKEN_KEYS.accessToken, newTokens.access_token);
              localStorage.setItem(TOKEN_KEYS.idToken, newTokens.id_token);
              setAccessToken(newTokens.access_token);
              setIsAuthenticated(true);
              setEmail(storedEmail);
            } else {
              Object.values(TOKEN_KEYS).forEach((k) => localStorage.removeItem(k));
              setIsAuthenticated(false);
            }
            setIsLoading(false);
          });
          return;
        }
        Object.values(TOKEN_KEYS).forEach((k) => localStorage.removeItem(k));
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);
      setAccessToken(storedToken);
      setEmail(storedEmail);
      setIsLoading(false);
      return;
    }

    // Cognito user pool session (email/password sign-in)
    const currentUser = userPool?.getCurrentUser() ?? null;
    if (currentUser) {
      currentUser.getSession(
        (
          err: Error | null,
          session: {
            isValid: () => boolean;
            getAccessToken: () => { getJwtToken: () => string };
          } | null,
        ) => {
          if (!err && session?.isValid()) {
            setIsAuthenticated(true);
            setAccessToken(session.getAccessToken().getJwtToken());
            currentUser.getUserAttributes((_attrErr, attributes) => {
              const emailAttr = attributes?.find((a) => a.Name === "email");
              setEmail(emailAttr?.Value || currentUser.getUsername());
              setIsLoading(false);
            });
            return;
          }
          setIsLoading(false);
        },
      );
    } else {
      setIsLoading(false);
    }
  }, []);

  const signIn = useCallback(async (emailInput: string, password: string) => {
    setError(null);
    setIsLoading(true);
    return new Promise<void>((resolve, reject) => {
      if (!userPool) {
        setError("Auth not configured");
        setIsLoading(false);
        reject(new Error("Auth not configured"));
        return;
      }
      const cognitoUser = new CognitoUser({ Username: emailInput, Pool: userPool });
      const authDetails = new AuthenticationDetails({
        Username: emailInput,
        Password: password,
      });
      cognitoUser.authenticateUser(authDetails, {
        onSuccess: (result) => {
          const token = result.getAccessToken().getJwtToken();
          setAccessToken(token);
          setIsAuthenticated(true);
          setEmail(emailInput);
          setIsLoading(false);
          resolve();
        },
        onFailure: (err) => {
          setError(err.message || "Sign in failed");
          setIsLoading(false);
          reject(err);
        },
      });
    });
  }, []);

  const initiateGoogleSignIn = useCallback(() => {
    sessionStorage.setItem(
      "scrappr_return_path",
      window.location.pathname + window.location.search,
    );
    const redirectUri = `${window.location.origin}/auth/callback`;
    const params = new URLSearchParams({
      identity_provider: "Google",
      redirect_uri: redirectUri,
      response_type: "code",
      client_id: CLIENT_ID,
      scope: "openid email profile",
    });
    window.location.href = `${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`;
  }, []);

  const handleAuthCallback = useCallback(async (code: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const response = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: CLIENT_ID,
          code,
          redirect_uri: redirectUri,
        }).toString(),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Token exchange failed: ${errorData}`);
      }

      const tokens = await response.json();
      const idTokenPayload = JSON.parse(atob(tokens.id_token.split(".")[1]));
      const userEmail = idTokenPayload.email || idTokenPayload.sub;

      localStorage.setItem(TOKEN_KEYS.accessToken, tokens.access_token);
      localStorage.setItem(TOKEN_KEYS.idToken, tokens.id_token);
      if (tokens.refresh_token) {
        localStorage.setItem(TOKEN_KEYS.refreshToken, tokens.refresh_token);
      }
      localStorage.setItem(TOKEN_KEYS.email, userEmail);
      localStorage.setItem(TOKEN_KEYS.authSource, "oauth");

      setAccessToken(tokens.access_token);
      setIsAuthenticated(true);
      setEmail(userEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    Object.values(TOKEN_KEYS).forEach((key) => localStorage.removeItem(key));
    const currentUser = userPool?.getCurrentUser();
    if (currentUser) {
      currentUser.signOut();
    }
    setIsAuthenticated(false);
    setAccessToken(null);
    setEmail(null);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      email,
      accessToken,
      signIn,
      signOut,
      initiateGoogleSignIn,
      handleAuthCallback,
      error,
    }),
    [
      isAuthenticated,
      isLoading,
      email,
      accessToken,
      signIn,
      signOut,
      initiateGoogleSignIn,
      handleAuthCallback,
      error,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth — consume the shared AuthContext.
 *
 * Must be used inside <AuthProvider>. Replaces the old standalone useAuth hook
 * so that all components (Header, dashboards, etc.) share the same auth state.
 */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
