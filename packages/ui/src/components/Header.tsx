import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, signOut, email } = useAuth();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img
                src="/scrappy-mascot.png"
                alt="Scrappy the dog mascot"
                className="w-9 h-9 rounded-full object-cover"
              />
              <span className="text-xl font-bold text-emerald-900 tracking-tight">Scrappr</span>
            </Link>

            {/* Nav */}
            <nav className="flex items-center gap-4">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => setShowSignOutConfirm(true)}
                  className="px-4 py-2 border border-emerald-600 text-emerald-700 text-sm font-medium rounded-lg hover:bg-emerald-50 transition-all cursor-pointer"
                >
                  Log Out
                </button>
              ) : (
                <Link
                  to="/list"
                  className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
                >
                  Log In
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Sign Out Confirmation */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSignOutConfirm(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sign out?</h3>
            {email && <p className="text-sm text-gray-500 mb-5">You're signed in as {email}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  signOut();
                  navigate("/");
                }}
                className="flex-1 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
