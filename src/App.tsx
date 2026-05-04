import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import AdminPropostas from "./pages/AdminPropostas";
import AdminPropostasPoliticas from "./pages/AdminPropostasPoliticas";
import AdminSugestoes from "./pages/AdminSugestoes";
import AdminEixos from "./pages/AdminEixos";
import AdminMunicipios from "./pages/AdminMunicipios";
import AdminUsuarios from "./pages/AdminUsuarios";
import AdminLeads from "./pages/AdminLeads";
import AdminMensageria from "./pages/AdminMensageria";
import AdminPlanoGoverno from "./pages/AdminPlanoGoverno";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminMeuPainel from "./pages/AdminMeuPainel";
import AdminAIHub from "./pages/AdminAIHub";
import AdminPesquisas from "./pages/AdminPesquisas";
import AdminTSE from "./pages/AdminTSE";
import AdminBiblioteca from "./pages/AdminBiblioteca";
import Entrevista from "./pages/Entrevista";
import EntrevistaInstitucional from "./pages/EntrevistaInstitucional";
import Liderancas from "./pages/Liderancas";
import PublicPresentation from "./pages/PublicPresentation";
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/propostas" element={<AdminPropostas />} />
            <Route path="/admin/propostas-politicas" element={<AdminPropostasPoliticas />} />
            <Route path="/admin/sugestoes" element={<AdminSugestoes />} />
            <Route path="/admin/eixos" element={<AdminEixos />} />
            <Route path="/admin/municipios" element={<AdminMunicipios />} />
            <Route path="/admin/usuarios" element={<AdminUsuarios />} />
            <Route path="/admin/leads" element={<AdminLeads />} />
            <Route path="/admin/mensageria" element={<AdminMensageria />} />
            <Route path="/admin/plano-governo" element={<AdminPlanoGoverno />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/meu-painel" element={<AdminMeuPainel />} />
            <Route path="/admin/ai-hub" element={<AdminAIHub />} />
            <Route path="/admin/pesquisas" element={<AdminPesquisas />} />
            <Route path="/admin/tse" element={<AdminTSE />} />
            <Route path="/admin/biblioteca" element={<AdminBiblioteca />} />
            <Route path="/entrevista" element={<Entrevista />} />
            <Route path="/entrevista-institucional" element={<EntrevistaInstitucional />} />
            <Route path="/liderancas" element={<Liderancas />} />
            <Route path="/apresentacao/:publicId" element={<PublicPresentation />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
