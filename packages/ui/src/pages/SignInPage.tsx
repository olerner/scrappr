import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SignInForm } from "../components/SignInForm";
import { useAuth } from "../hooks/useAuth";

export function SignInPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading, signIn, initiateGoogleSignIn, error } = useAuth();

  // If no explicit redirect, fall back to the user's last-visited dashboard.
  const defaultRedirect =
    localStorage.getItem("scrappr_last_role") === "scrappr" ? "/haul" : "/list";
  const redirectTo = searchParams.get("redirect") || defaultRedirect;

  // After successful sign-in, redirect to the target
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, redirectTo]);

  const handleSignIn = async (email: string, password: string) => {
    await signIn(email, password);
  };

  const handleGoogleSignIn = () => {
    // Store the redirect target so AuthCallback can use it
    sessionStorage.setItem("scrappr_redirect_target", redirectTo);
    initiateGoogleSignIn();
  };

  return <SignInForm onSignIn={handleSignIn} onGoogleSignIn={handleGoogleSignIn} error={error} />;
}
