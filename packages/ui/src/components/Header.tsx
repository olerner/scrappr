import { useNavigate } from "react-router-dom";

export function Header() {
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img
              src="/scrappy-mascot.png"
              alt="Scrappy the dog mascot"
              className="w-9 h-9 rounded-full object-cover"
            />
            <span className="text-xl font-bold text-emerald-900 tracking-tight">Scrappr</span>
          </button>

          {/* Nav */}
          <nav className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/scrappee")}
              className="text-sm font-medium text-gray-600 hover:text-emerald-700 transition-colors"
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => navigate("/scrappr")}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
            >
              Hauler View
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
