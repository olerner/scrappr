import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { RequireAuth } from "./components/RequireAuth";
import { AuthContext, useCognito } from "./hooks/useAuth";
import { AuthCallback } from "./pages/AuthCallback";
import { CreateListing } from "./pages/CreateListing";
import { EditListing } from "./pages/EditListing";
import { ForgotPassword } from "./pages/ForgotPassword";
import { LandingPage } from "./pages/LandingPage";
import { ScrappeeDashboard } from "./pages/ScrappeeDashboard";
import { ScrapprDashboard } from "./pages/ScrapprDashboard";
import { SignedOut } from "./pages/SignedOut";
import { SignInPage } from "./pages/SignInPage";
import { SignUp } from "./pages/SignUp";

function App() {
  const auth = useCognito();

  return (
    <AuthContext.Provider value={auth}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Header />
          <main className="flex-1 flex flex-col">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route
                path="/list"
                element={
                  <RequireAuth>
                    <ScrappeeDashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="/list/new"
                element={
                  <RequireAuth>
                    <CreateListing />
                  </RequireAuth>
                }
              />
              <Route
                path="/list/edit/:id"
                element={
                  <RequireAuth>
                    <EditListing />
                  </RequireAuth>
                }
              />
              <Route
                path="/haul"
                element={
                  <RequireAuth>
                    <ScrapprDashboard />
                  </RequireAuth>
                }
              />
              <Route path="/sign-in" element={<SignInPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/sign-up" element={<SignUp />} />
              <Route path="/signed-out" element={<SignedOut />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
