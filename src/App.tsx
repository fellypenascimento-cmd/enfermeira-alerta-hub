import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Pages
import Auth from "./pages/Auth";
import EnfermeiraDashboard from "./pages/enfermeira/Dashboard";
import NovoChamado from "./pages/enfermeira/NovoChamado";
import MeusChamados from "./pages/enfermeira/MeusChamados";
import ChamadoDetalhe from "./pages/enfermeira/ChamadoDetalhe";
import AdminDashboard from "./pages/admin/Dashboard";
import CentralChamados from "./pages/admin/CentralChamados";
import Usuarios from "./pages/admin/Usuarios";
import Unidades from "./pages/admin/Unidades";
import Problemas from "./pages/admin/Problemas";
import Estoque from "./pages/admin/Estoque";
import EstoqueEntrada from "./pages/admin/EstoqueEntrada";
import EstoqueSaida from "./pages/admin/EstoqueSaida";
import EstoqueDetalhe from "./pages/admin/EstoqueDetalhe";
import EstoqueRelatorios from "./pages/admin/EstoqueRelatorios";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Bloqueia acesso a rotas admin para não-admins
  if (adminOnly && !isAdmin) {
    return <Navigate to="/chamados" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={isAdmin ? "/admin/dashboard" : "/dashboard"} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/auth" replace />} />
      <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
      
      {/* Rotas para usuários comuns (não-admin) */}
      <Route path="/dashboard" element={<ProtectedRoute><Navigate to="/chamados" replace /></ProtectedRoute>} />
      <Route path="/chamados" element={<ProtectedRoute><MeusChamados /></ProtectedRoute>} />
      <Route path="/chamados/novo" element={<ProtectedRoute><NovoChamado /></ProtectedRoute>} />
      <Route path="/chamados/:id" element={<ProtectedRoute><ChamadoDetalhe /></ProtectedRoute>} />
      
      {/* Rotas exclusivas para Administradores */}
      <Route path="/admin/dashboard" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/chamados" element={<ProtectedRoute adminOnly><CentralChamados /></ProtectedRoute>} />
      <Route path="/admin/chamados/:id" element={<ProtectedRoute adminOnly><ChamadoDetalhe /></ProtectedRoute>} />
      <Route path="/admin/usuarios" element={<ProtectedRoute adminOnly><Usuarios /></ProtectedRoute>} />
      <Route path="/admin/unidades" element={<ProtectedRoute adminOnly><Unidades /></ProtectedRoute>} />
      <Route path="/admin/problemas" element={<ProtectedRoute adminOnly><Problemas /></ProtectedRoute>} />
      <Route path="/admin/estoque" element={<ProtectedRoute adminOnly><Estoque /></ProtectedRoute>} />
      <Route path="/admin/estoque/entrada" element={<ProtectedRoute adminOnly><EstoqueEntrada /></ProtectedRoute>} />
      <Route path="/admin/estoque/saida" element={<ProtectedRoute adminOnly><EstoqueSaida /></ProtectedRoute>} />
      <Route path="/admin/estoque/relatorios" element={<ProtectedRoute adminOnly><EstoqueRelatorios /></ProtectedRoute>} />
      <Route path="/admin/estoque/:id" element={<ProtectedRoute adminOnly><EstoqueDetalhe /></ProtectedRoute>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
