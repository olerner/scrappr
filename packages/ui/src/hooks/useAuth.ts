import { AuthenticationDetails, CognitoUser, CognitoUserPool } from "amazon-cognito-identity-js";
import { useCallback, useEffect, useState } from "react";

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

// Token storage keys
const TOKEN_KEYS = {
  accessToken: "scrappr_access_token",
  idToken: "scrappr_id_token",
  refreshToken: "scrappr_refresh_token",
  email: "scrappr_email",
  authSource: "scrappr_auth_source",
} as const;

/** Returns true if a JWT's exp claim is in the past (with 60s buffer). */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp < Math.floor(Date.now() / 1000) + 60;
  } catch {
    return true;
  }
}

/** Exchange a refresh token for a new access token via Cognito hosted UI. */
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

export function useAuth(): AuthState {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    // First check for OAuth tokens (Google sign-in)
    const storedToken = localStorage.getItem(TOKEN_KEYS.accessToken);
    const storedEmail = localStorage.getItem(TOKEN_KEYS.email);
    const authSource = localStorage.getItem(TOKEN_KEYS.authSource);

    if (authSource === "oauth" && storedToken) {
      // Check if access token is expired; refresh if possible
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
              // Refresh failed — clear session and require re-login
              Object.values(TOKEN_KEYS).forEach((k) => localStorage.removeItem(k));
              setIsAuthenticated(false);
            }
            setIsLoading(false);
          });
          return;
        }
        // No refresh token — clear expired session
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

    // Fall back to Cognito user pool session
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
      const cognitoUser = new CognitoUser({
        Username: emailInput,
        Pool: userPool,
      });

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
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
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

      // Decode the ID token to get email
      const idTokenPayload = JSON.parse(atob(tokens.id_token.split(".")[1]));
      const userEmail = idTokenPayload.email || idTokenPayload.sub;

      // Store tokens
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
    // Clear OAuth tokens
    Object.values(TOKEN_KEYS).forEach((key) => localStorage.removeItem(key));

    // Clear Cognito session
    const currentUser = userPool?.getCurrentUser();
    if (currentUser) {
      currentUser.signOut();
    }

    setIsAuthenticated(false);
    setAccessToken(null);
    setEmail(null);
  }, []);

  return {
    isAuthenticated,
    isLoading,
    email,
    accessToken,
    signIn,
    signOut,
    initiateGoogleSignIn,
    handleAuthCallback,
    error,
  };
}
