import { useLocation, useNavigate } from "react-router-dom";
import { ScrappyDog } from "./ScrappyDog";

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();

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
            <ScrappyDog size={36} />
            <span className="text-xl font-bold text-emerald-900 tracking-tight">Scrappr</span>
          </button>

          {/* Mode Buttons */}
          <nav className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/scrappee")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                location.pathname === "/scrappee"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
              }`}
            >
              I have scrap
            </button>
            <button
              type="button"
              onClick={() => navigate("/scrappr")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                location.pathname === "/scrappr"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
              }`}
            >
              I haul scrap
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
