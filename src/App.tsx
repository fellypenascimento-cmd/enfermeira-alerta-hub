import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MockAuthProvider, useMockAuth } from "@/contexts/MockAuthContext";
import { ChamadosProvider } from "@/contexts/ChamadosContext";
import { DataProvider } from "@/contexts/DataContext";

// Pages
import Login from "./pages/Login";
import EnfermeiraDashboard from "./pages/enfermeira/Dashboard";
import NovoChamado from "./pages/enfermeira/NovoChamado";
import MeusChamados from "./pages/enfermeira/MeusChamados";
import ChamadoDetalhe from "./pages/enfermeira/ChamadoDetalhe";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useMockAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin } = useMockAuth();

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? "/admin/dashboard" : "/dashboard"} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Navigate to="/auth" replace />} />
      <Route path="/auth" element={<PublicRoute><Login /></PublicRoute>} />
      
      {/* Enfermeira routes */}
      <Route path="/dashboard" element={<ProtectedRoute><EnfermeiraDashboard /></ProtectedRoute>} />
      <Route path="/chamados" element={<ProtectedRoute><MeusChamados /></ProtectedRoute>} />
      <Route path="/chamados/novo" element={<ProtectedRoute><NovoChamado /></ProtectedRoute>} />
      <Route path="/chamados/:id" element={<ProtectedRoute><ChamadoDetalhe /></ProtectedRoute>} />
      
      {/* Admin routes - placeholder for now */}
      <Route path="/admin/dashboard" element={<ProtectedRoute><EnfermeiraDashboard /></ProtectedRoute>} />
      <Route path="/admin/chamados" element={<ProtectedRoute><MeusChamados /></ProtectedRoute>} />
      <Route path="/admin/usuarios" element={<ProtectedRoute><div className="p-8">Gestão de Usuários - Em breve</div></ProtectedRoute>} />
      <Route path="/admin/unidades" element={<ProtectedRoute><div className="p-8">Gestão de Unidades - Em breve</div></ProtectedRoute>} />
      <Route path="/admin/problemas" element={<ProtectedRoute><div className="p-8">Catálogo de Problemas - Em breve</div></ProtectedRoute>} />
      
      {/* 404 */}
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
        <MockAuthProvider>
          <DataProvider>
            <ChamadosProvider>
              <AppRoutes />
            </ChamadosProvider>
          </DataProvider>
        </MockAuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
