import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";
import { GoogleSignInButton } from "./GoogleSignInButton";

export function SignInForm({
  onSignIn,
  onGoogleSignIn,
  error,
}: {
  onSignIn: (email: string, password: string) => Promise<void>;
  onGoogleSignIn: () => void;
  error: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSignIn(email, password);
    } catch {
      // error is handled by useAuth
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout heading="Sign In to Scrappr">
      <GoogleSignInButton onClick={onGoogleSignIn} />

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-sm text-gray-400">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
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
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-40"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      {/* Forgot Password & Sign Up Links */}
      <div className="mt-6 text-center space-y-3">
        <Link
          to="/forgot-password"
          className="block text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
        >
          Forgot password?
        </Link>
        <p className="text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link
            to="/sign-up"
            className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
