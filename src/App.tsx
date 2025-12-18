import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProjectProvider } from "@/context/ProjectContext";
import Index from "./pages/Index";
import ThresholdsPage from "./pages/ThresholdsPage";
import DashboardPage from "./pages/DashboardPage";
import IndicatorPage from "./pages/IndicatorPage";
import SummaryPage from "./pages/SummaryPage";
import VisualizationPage from "./pages/VisualizationPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ProjectProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/thresholds" element={<ThresholdsPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/indicator/:indicatorId" element={<IndicatorPage />} />
            <Route path="/summary" element={<SummaryPage />} />
            <Route path="/visualization" element={<VisualizationPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ProjectProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
