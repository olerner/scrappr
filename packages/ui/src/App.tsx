import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { AuthContext, useAuth } from "./hooks/useAuth";
import { AuthCallback } from "./pages/AuthCallback";
import { CreateListing } from "./pages/CreateListing";
import { EditListing } from "./pages/EditListing";
import { LandingPage } from "./pages/LandingPage";
import { ScrappeeDashboard } from "./pages/ScrappeeDashboard";
import { ScrapprDashboard } from "./pages/ScrapprDashboard";
import { SignedOut } from "./pages/SignedOut";

function App() {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Header />
          <main className="flex-1 flex flex-col">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/list" element={<ScrappeeDashboard />} />
              <Route path="/list/new" element={<CreateListing />} />
              <Route path="/list/edit/:id" element={<EditListing />} />
              <Route path="/haul" element={<ScrapprDashboard />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/signed-out" element={<SignedOut />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
