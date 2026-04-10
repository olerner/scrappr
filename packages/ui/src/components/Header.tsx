import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function Header() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const loginPath = location.pathname === "/" ? "/list" : location.pathname;

  return (
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
              <Link
                to="/signed-out"
                className="px-4 py-2 border border-emerald-600 text-emerald-700 text-sm font-medium rounded-lg hover:bg-emerald-50 transition-all"
              >
                Log Out
              </Link>
            ) : (
              <Link
                to={loginPath}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
              >
                Log In
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
