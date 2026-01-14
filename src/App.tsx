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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

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
      
      {/* Enfermeira routes */}
      <Route path="/dashboard" element={<ProtectedRoute><EnfermeiraDashboard /></ProtectedRoute>} />
      <Route path="/chamados" element={<ProtectedRoute><MeusChamados /></ProtectedRoute>} />
      <Route path="/chamados/novo" element={<ProtectedRoute><NovoChamado /></ProtectedRoute>} />
      <Route path="/chamados/:id" element={<ProtectedRoute><ChamadoDetalhe /></ProtectedRoute>} />
      
      {/* Admin routes */}
      <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/chamados" element={<ProtectedRoute><CentralChamados /></ProtectedRoute>} />
      <Route path="/admin/chamados/:id" element={<ProtectedRoute><ChamadoDetalhe /></ProtectedRoute>} />
      <Route path="/admin/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
      <Route path="/admin/unidades" element={<ProtectedRoute><Unidades /></ProtectedRoute>} />
      <Route path="/admin/problemas" element={<ProtectedRoute><Problemas /></ProtectedRoute>} />
      <Route path="/admin/estoque" element={<ProtectedRoute><Estoque /></ProtectedRoute>} />
      <Route path="/admin/estoque/entrada" element={<ProtectedRoute><EstoqueEntrada /></ProtectedRoute>} />
      <Route path="/admin/estoque/saida" element={<ProtectedRoute><EstoqueSaida /></ProtectedRoute>} />
      <Route path="/admin/estoque/relatorios" element={<ProtectedRoute><EstoqueRelatorios /></ProtectedRoute>} />
      <Route path="/admin/estoque/:id" element={<ProtectedRoute><EstoqueDetalhe /></ProtectedRoute>} />
      
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
