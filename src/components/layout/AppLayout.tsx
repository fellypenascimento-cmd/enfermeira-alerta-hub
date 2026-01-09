import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Building2,
  LayoutDashboard,
  Ticket,
  Plus,
  Users,
  Settings,
  AlertCircle,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Meus Chamados', href: '/chamados', icon: <Ticket className="h-5 w-5" /> },
  { label: 'Novo Chamado', href: '/chamados/novo', icon: <Plus className="h-5 w-5" /> },
];

const adminNavItems: NavItem[] = [
  { label: 'Todos os Chamados', href: '/admin/chamados', icon: <Ticket className="h-5 w-5" />, adminOnly: true },
  { label: 'Usuários', href: '/admin/usuarios', icon: <Users className="h-5 w-5" />, adminOnly: true },
  { label: 'Unidades', href: '/admin/unidades', icon: <Home className="h-5 w-5" />, adminOnly: true },
  { label: 'Problemas', href: '/admin/problemas', icon: <AlertCircle className="h-5 w-5" />, adminOnly: true },
];

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { profile, role, signOut, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Sessão encerrada');
    navigate('/auth');
  };

  const filteredNavItems = isAdmin 
    ? [...navItems, ...adminNavItems]
    : navItems;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-40 flex items-center px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          className="mr-4"
        >
          <Menu className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="font-semibold text-foreground">Sistema UBS</span>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 sidebar-gradient z-50 transform transition-transform duration-200 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <Building2 className="h-7 w-7 text-white" />
              <span className="font-semibold text-white text-lg">Sistema UBS</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white hover:bg-white/10"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User info */}
          <div className="px-6 py-4 border-b border-white/10">
            <p className="text-sm text-white/70 truncate">{profile?.nome || 'Usuário'}</p>
            <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-xs font-medium bg-white/10 text-white/90">
              {role === 'admin' ? 'Administrador' : 'Enfermeira'}
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-3 overflow-y-auto">
            <div className="space-y-1">
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-white/15 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                  </Link>
                );
              })}
            </div>

            {isAdmin && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="px-3 mb-2 text-xs font-medium text-white/50 uppercase tracking-wider">
                  Administração
                </p>
              </div>
            )}
          </nav>

          {/* Logout button */}
          <div className="p-4 border-t border-white/10">
            <Button
              variant="ghost"
              className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-5 w-5" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
