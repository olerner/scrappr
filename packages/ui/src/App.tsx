import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { AuthCallback } from "./pages/AuthCallback";
import { LandingPage } from "./pages/LandingPage";
import { ScrappeeDashboard } from "./pages/ScrappeeDashboard";
import { ScrapprDashboard } from "./pages/ScrapprDashboard";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/scrappee" element={<ScrappeeDashboard />} />
            <Route path="/scrappr" element={<ScrapprDashboard />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
