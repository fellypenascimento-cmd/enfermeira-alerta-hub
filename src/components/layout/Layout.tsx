import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Plus,
  FileText,
  Users,
  Building2,
  AlertCircle,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItemsEnfermeira: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Meus Chamados', href: '/chamados', icon: ClipboardList },
  { label: 'Novo Chamado', href: '/chamados/novo', icon: Plus },
];

const navItemsAdmin: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Meus Chamados', href: '/chamados', icon: ClipboardList },
  { label: 'Novo Chamado', href: '/chamados/novo', icon: Plus },
  { label: 'Todos os Chamados', href: '/admin/chamados', icon: FileText },
  { label: 'Usuários', href: '/admin/usuarios', icon: Users },
  { label: 'Unidades', href: '/admin/unidades', icon: Building2 },
  { label: 'Problemas', href: '/admin/problemas', icon: AlertCircle },
];

export function Layout({ children }: LayoutProps) {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const navItems = isAdmin ? navItemsAdmin : navItemsEnfermeira;

  const handleSignOut = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso!');
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar-background border-b border-sidebar-border z-50 flex items-center justify-between px-4">
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sidebar-primary/20 rounded flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-sidebar-foreground" />
          </div>
          <span className="font-semibold text-sidebar-foreground">Sistema UBS</span>
        </div>
        
        <div className="w-10" />
      </header>

      {/* Sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar-background text-sidebar-foreground flex flex-col transform transition-transform duration-200 lg:transform-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center gap-3 px-4 border-b border-sidebar-border">
          <div className="w-8 h-8 bg-sidebar-primary/20 rounded flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-sidebar-foreground" />
          </div>
          <span className="font-semibold text-lg text-sidebar-foreground">Sistema UBS</span>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-sidebar-border">
          <p className="text-sm text-sidebar-foreground/80 truncate mb-1">
            {profile?.email || 'usuario@email.com'}
          </p>
          <Badge 
            variant="outline" 
            className="bg-sidebar-accent/50 text-sidebar-foreground border-sidebar-border text-xs"
          >
            {isAdmin ? 'Administrador' : 'Enfermeira'}
          </Badge>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors group",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {isActive && (
                    <ChevronRight className="w-4 h-4 opacity-70" />
                  )}
                </>
              )}
            </NavLink>
          ))}

          {/* Admin section label */}
          {isAdmin && (
            <div className="pt-6 pb-2">
              <p className="px-3 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
                Administração
              </p>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-0 mt-14 lg:mt-0 overflow-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
