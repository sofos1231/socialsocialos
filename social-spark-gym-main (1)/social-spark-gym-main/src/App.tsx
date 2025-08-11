import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PageTransition from "./components/PageTransition";
import PracticeHub from "./pages/PracticeHub";
import PracticeRoad from "./pages/PracticeRoad";
import QuickDrill from "./pages/QuickDrill";
import ShadowPractice from "./pages/ShadowPractice";
import Stats from "./pages/Stats";
import Profile from "./pages/Profile";
import Upgrade from "./pages/Upgrade";
import Shop from "./pages/Shop";
import Badges from "./pages/Badges";
import LevelMilestones from "./pages/LevelMilestones";
import Navigation from "./components/Navigation";
import TopStatusBar from "./components/TopStatusBar";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="relative overflow-hidden">
          <TopStatusBar />
          <Routes>
            <Route path="/" element={<PageTransition currentPath="/"><PracticeHub /></PageTransition>} />
            <Route path="/practice-road/:category" element={<PageTransition currentPath="/practice-road"><PracticeRoad /></PageTransition>} />
            <Route path="/practice" element={<PageTransition currentPath="/practice"><PracticeHub /></PageTransition>} />
            <Route path="/quick-drill" element={<PageTransition currentPath="/quick-drill"><QuickDrill /></PageTransition>} />
            <Route path="/shadow-practice" element={<PageTransition currentPath="/shadow-practice"><ShadowPractice /></PageTransition>} />
            <Route path="/stats" element={<PageTransition currentPath="/stats"><Stats /></PageTransition>} />
            <Route path="/profile" element={<PageTransition currentPath="/profile"><Profile /></PageTransition>} />
            <Route path="/upgrade" element={<PageTransition currentPath="/upgrade"><Upgrade /></PageTransition>} />
            <Route path="/shop" element={<PageTransition currentPath="/shop"><Shop /></PageTransition>} />
            <Route path="/badges" element={<PageTransition currentPath="/badges"><Badges /></PageTransition>} />
            <Route path="/level-milestones" element={<PageTransition currentPath="/level-milestones"><LevelMilestones /></PageTransition>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<PageTransition currentPath="*"><NotFound /></PageTransition>} />
          </Routes>
          <Navigation />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
