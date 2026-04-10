import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { useAuth } from "../hooks/useAuth";

type Step = "register" | "confirm";

export function SignUp() {
  const { signUp, confirmSignUp, signIn, initiateGoogleSignIn, error } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = localError || error;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLocalError(null);
    try {
      await signUp(email, password);
      setStep("confirm");
    } catch {
      // error handled by useAuth
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLocalError(null);
    try {
      await confirmSignUp(email, code);
      // Auto-login after successful verification
      try {
        await signIn(email, password);
        navigate("/list");
        return;
      } catch {
        // Auto-sign-in failed — redirect to sign-in page
        navigate("/list");
        return;
      }
    } catch {
      // error handled by useAuth
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
          {step === "register" ? "Create Your Account" : "Verify Your Email"}
        </h2>

        {step === "register" && (
          <>
            <GoogleSignInButton onClick={initiateGoogleSignIn} label="Sign up with Google" />

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-sm text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Min 8 characters, with uppercase, lowercase, and a number.
                </p>
              </div>
              {displayError && <p className="text-red-600 text-sm">{displayError}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-40"
              >
                {loading ? "Creating account..." : "Sign Up"}
              </button>
            </form>
          </>
        )}

        {step === "confirm" && (
          <>
            <p className="text-sm text-gray-500 mb-6 text-center">
              We sent a verification code to <strong>{email}</strong>. Enter it below.
            </p>
            <form onSubmit={handleConfirm} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="123456"
                  required
                />
              </div>
              {displayError && <p className="text-red-600 text-sm">{displayError}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-40"
              >
                {loading ? "Verifying..." : "Verify Email"}
              </button>
            </form>
          </>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              to="/list"
              className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
