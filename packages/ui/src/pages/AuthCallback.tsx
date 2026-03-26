import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleAuthCallback } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError(searchParams.get("error_description") || errorParam);
      return;
    }

    if (!code) {
      setError("No authorization code received");
      return;
    }

    handleAuthCallback(code)
      .then(() => {
        navigate("/list", { replace: true });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Authentication failed");
      });
  }, [searchParams, handleAuthCallback, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
          <p className="text-red-600 font-medium mb-4">Sign-in failed</p>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <Link
            to="/list"
            replace
            className="inline-block px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-all"
          >
            Try Again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="animate-spin text-emerald-600 mx-auto mb-4" size={32} />
        <p className="text-gray-500 text-sm">Completing sign-in...</p>
      </div>
    </div>
  );
}
