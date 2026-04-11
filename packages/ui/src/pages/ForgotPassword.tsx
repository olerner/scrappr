import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { useAuth } from "../hooks/useAuth";

type Step = "request" | "confirm" | "done";

export function ForgotPassword() {
  const { forgotPassword, confirmPassword, signIn, error } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = localError || error;

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLocalError(null);
    try {
      await forgotPassword(email);
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
      await confirmPassword(email, code, newPassword);
      try {
        await signIn(email, newPassword);
        navigate("/list");
        return;
      } catch {
        // Auto-sign-in failed — fall through to success screen
      }
      setStep("done");
    } catch {
      // error handled by useAuth
    } finally {
      setLoading(false);
    }
  };

  if (step === "done") {
    return (
      <AuthLayout heading="Password Reset">
        <div className="text-center">
          <div className="text-4xl mb-4">✅</div>
          <p className="text-sm text-gray-500 mb-6">
            Your password has been reset successfully. You can now sign in with your new password.
          </p>
          <button
            type="button"
            onClick={() => navigate("/sign-in")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-full hover:bg-emerald-700 transition-all shadow-md"
          >
            Sign In
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      heading="Reset Your Password"
      subtitle={
        step === "request"
          ? "Enter your email and we'll send you a verification code."
          : "Enter the code we sent to your email and your new password."
      }
    >
      {step === "request" && (
        <form onSubmit={handleRequestCode} className="space-y-4">
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
          {displayError && <p className="text-red-600 text-sm">{displayError}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-40"
          >
            {loading ? "Sending..." : "Send Reset Code"}
          </button>
        </form>
      )}

      {step === "confirm" && (
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      )}

      <div className="mt-6 text-center">
        <Link
          to="/sign-in"
          className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
        >
          Back to Sign In
        </Link>
      </div>
    </AuthLayout>
  );
}
