import { AuthenticationDetails, CognitoUser, CognitoUserPool } from "amazon-cognito-identity-js";
import { useCallback, useEffect, useState } from "react";

const userPool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_USER_POOL_ID,
  ClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
});

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  email: string | null;
  accessToken: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
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
    const currentUser = userPool.getCurrentUser();
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
            setEmail(currentUser.getUsername());
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

  const signOut = useCallback(() => {
    const currentUser = userPool.getCurrentUser();
    if (currentUser) {
      currentUser.signOut();
    }
    setIsAuthenticated(false);
    setAccessToken(null);
    setEmail(null);
  }, []);

  return { isAuthenticated, isLoading, email, accessToken, signIn, signOut, error };
}
