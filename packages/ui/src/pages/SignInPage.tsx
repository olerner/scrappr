import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SignInForm } from "../components/SignInForm";
import { useAuth } from "../hooks/useAuth";

export function SignInPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading, signIn, initiateGoogleSignIn, error } = useAuth();

  const redirectTo = searchParams.get("redirect") || "/list";

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
