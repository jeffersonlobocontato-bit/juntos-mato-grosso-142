import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import AdminGeradorConteudo from "./pages/AdminGeradorConteudo";
import AdminCadastroRapido from "./pages/AdminCadastroRapido";
import AdminCruzamentoSugestoes from "./pages/AdminCruzamentoSugestoes";
import AdminMetodologia from "./pages/AdminMetodologia";
import AdminModuloMkt from "./pages/AdminModuloMkt";
import Entrevista from "./pages/Entrevista";
import EntrevistaInstitucional from "./pages/EntrevistaInstitucional";
import Liderancas from "./pages/Liderancas";
import PublicPresentation from "./pages/PublicPresentation";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import CookieConsentBanner from "./components/CookieConsentBanner";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import TermosDeUso from "./pages/TermosDeUso";
import MetodologiaPlano from "./pages/MetodologiaPlano";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

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
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/admin/propostas" element={<ProtectedRoute requiredRoles={['lider_tematico','curador_municipal','especialista']}><AdminPropostas /></ProtectedRoute>} />
            <Route path="/admin/propostas-institucionais" element={<ProtectedRoute requiredRoles={['lider_tematico']}><AdminPropostas /></ProtectedRoute>} />
            <Route path="/admin/propostas-politicas" element={<ProtectedRoute requiredRoles={[]}><AdminPropostasPoliticas /></ProtectedRoute>} />
            <Route path="/admin/sugestoes" element={<ProtectedRoute requiredRoles={['curador_municipal']}><AdminSugestoes /></ProtectedRoute>} />
            <Route path="/admin/eixos" element={<ProtectedRoute requiredRoles={[]}><AdminEixos /></ProtectedRoute>} />
            <Route path="/admin/municipios" element={<ProtectedRoute requiredRoles={[]}><AdminMunicipios /></ProtectedRoute>} />
            <Route path="/admin/usuarios" element={<ProtectedRoute requiredRoles={[]}><AdminUsuarios /></ProtectedRoute>} />
            <Route path="/admin/leads" element={<ProtectedRoute requiredRoles={['lider_tematico','curador_municipal']}><AdminLeads /></ProtectedRoute>} />
            <Route path="/admin/mensageria" element={<ProtectedRoute requiredRoles={['lider_tematico']}><AdminMensageria /></ProtectedRoute>} />
            <Route path="/admin/plano-governo" element={<ProtectedRoute requiredRoles={[]}><AdminPlanoGoverno /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute requiredRoles={[]}><AdminAnalytics /></ProtectedRoute>} />
            <Route path="/admin/meu-painel" element={<ProtectedRoute requiredRoles={['lider_tematico','curador_municipal','especialista']}><AdminMeuPainel /></ProtectedRoute>} />
            <Route path="/admin/ai-hub" element={<ProtectedRoute requiredRoles={[]}><AdminAIHub /></ProtectedRoute>} />
            <Route path="/admin/pesquisas" element={<ProtectedRoute requiredRoles={[]}><AdminPesquisas /></ProtectedRoute>} />
            <Route path="/admin/tse" element={<ProtectedRoute requiredRoles={[]}><AdminTSE /></ProtectedRoute>} />
            <Route path="/admin/biblioteca" element={<ProtectedRoute requiredRoles={['lider_tematico']}><AdminBiblioteca /></ProtectedRoute>} />
            <Route path="/admin/gerador-conteudo" element={<ProtectedRoute requiredRoles={['lider_tematico']}><AdminGeradorConteudo /></ProtectedRoute>} />
            <Route path="/admin/cadastro-rapido" element={<ProtectedRoute><AdminCadastroRapido /></ProtectedRoute>} />
            <Route path="/admin/cruzamento-sugestoes" element={<ProtectedRoute requiredRoles={['lider_tematico']}><AdminCruzamentoSugestoes /></ProtectedRoute>} />
            <Route path="/admin/metodologia" element={<ProtectedRoute requiredRoles={[]}><AdminMetodologia /></ProtectedRoute>} />
            <Route path="/admin/modulo-mkt" element={<ProtectedRoute requiredRoles={['lider_tematico','marketing']}><AdminModuloMkt /></ProtectedRoute>} />
            <Route path="/entrevista" element={<Entrevista />} />
            <Route path="/entrevista-institucional" element={<EntrevistaInstitucional />} />
            <Route path="/liderancas" element={<Liderancas />} />
            <Route path="/apresentacao/:publicId" element={<PublicPresentation />} />
            <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
            <Route path="/termos-de-uso" element={<TermosDeUso />} />
            <Route path="/planodegoverno" element={<MetodologiaPlano />} />
            <Route path="/metodologia" element={<Navigate to="/planodegoverno" replace />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieConsentBanner />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
