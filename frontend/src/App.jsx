import { Toaster } from "@/components/ui/toaster";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";

import ScrollToTop from "./components/ScrollToTop";

import CommandLayout from "@/components/command/CommandLayout";
import CommandDashboard from "@/pages/CommandDashboard";
import CaseManagement from "@/pages/CaseManagement";
import CaseDetails from "@/pages/CaseDetails";
import MoneyTrail from "@/pages/MoneyTrail";
import LegalWindow from "@/pages/LegalWindow";
import FreezeSimulation from "@/pages/FreezeSimulation";
import SuspectDatabase from "@/pages/SuspectDatabase";
import Export from "@/pages/Export";
import Analytics from "@/pages/Analytics";
import ATMIntelligence from "@/pages/ATMIntelligence";
import LoginPage from "@/pages/LoginPage";

const isAuthenticated = () => Boolean(localStorage.getItem("cyberfraud_token"));

const ProtectedRoute = ({ children }) =>
  isAuthenticated() ? children : <Navigate to="/login" replace />;

function App() {
  return (
    <Router>
      <ScrollToTop />

      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <CommandLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<CommandDashboard />} />
          <Route path="/case-management" element={<CaseManagement />} />
          <Route path="/cases/:caseId" element={<CaseDetails />} />
          <Route path="/atm-intelligence" element={<ATMIntelligence />} />
          <Route path="/money-trail" element={<MoneyTrail />} />
          <Route path="/legal" element={<LegalWindow />} />
          <Route path="/freeze-sim" element={<FreezeSimulation />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/suspects" element={<SuspectDatabase />} />
          <Route path="/export" element={<Export />} />
        </Route>

        <Route path="*" element={<Navigate to={isAuthenticated() ? "/" : "/login"} replace />} />
      </Routes>

      <Toaster />
    </Router>
  );
}

export default App;