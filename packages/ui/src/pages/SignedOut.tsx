import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthContext } from "../contexts/AuthContext";

export function SignedOut() {
  const { signOut } = useAuthContext();

  useEffect(() => {
    signOut();
  }, [signOut]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 max-w-sm w-full text-center">
        <img
          src="/scrappy-mascot.png"
          alt="Scrappy the dog mascot"
          className="w-16 h-16 rounded-full object-cover mx-auto mb-4"
        />
        <h1 className="text-xl font-bold text-gray-900 mb-2">You've been signed out</h1>
        <p className="text-sm text-gray-500 mb-6">Thanks for using Scrappr! See you next time.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-full hover:bg-emerald-700 transition-all shadow-md"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
