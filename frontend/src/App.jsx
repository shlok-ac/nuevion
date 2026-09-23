import { Toaster } from "@/components/ui/toaster";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import ScrollToTop from "./components/ScrollToTop";

import CommandLayout from "@/components/command/CommandLayout";
import CommandDashboard from "@/pages/CommandDashboard";
import MoneyTrail from "@/pages/MoneyTrail";
import LegalWindow from "@/pages/LegalWindow";
import FreezeSimulation from "@/pages/FreezeSimulation";
import SuspectDatabase from "@/pages/SuspectDatabase";
import Export from "@/pages/Export";

function App() {
  return (
    <Router>
      <ScrollToTop />

      <Routes>
        <Route element={<CommandLayout />}>
          <Route path="/" element={<CommandDashboard />} />
          <Route path="/money-trail" element={<MoneyTrail />} />
          <Route path="/legal" element={<LegalWindow />} />
          <Route path="/freeze-sim" element={<FreezeSimulation />} />
          <Route path="/suspects" element={<SuspectDatabase />} />
          <Route path="/export" element={<Export />} />
        </Route>

        {/* Send unknown URLs back to dashboard */}
        <Route path="*" element={<CommandDashboard />} />
      </Routes>

      <Toaster />
    </Router>
  );
}

export default App;