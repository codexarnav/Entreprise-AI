import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import RFPIngestion from "./pages/RFPIngestion";
import RiskAnalysis from "./pages/RiskAnalysis";
import ProposalDrafting from "./pages/ProposalDrafting";
import DynamicPricing from "./pages/DynamicPricing";
import GoNoGoDecision from "./pages/GoNoGoDecision";
import FinalSubmission from "./pages/FinalSubmission";
import InnovationTracking from "./pages/InnovationTracking";
import CompetitorAnalysis from "./pages/CompetitorAnalysis";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
          <Route path="/employee/ingestion" element={<RFPIngestion />} />
          <Route path="/employee/analysis" element={<RiskAnalysis />} />
          <Route path="/employee/drafting" element={<ProposalDrafting />} />
          <Route path="/employee/pricing" element={<DynamicPricing />} />
          <Route path="/employee/decision" element={<GoNoGoDecision />} />
          <Route path="/employee/submission" element={<FinalSubmission />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/innovation" element={<InnovationTracking />} />
          <Route path="/competitor" element={<CompetitorAnalysis />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
