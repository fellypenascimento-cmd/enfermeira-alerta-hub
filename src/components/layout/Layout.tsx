import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Plus, FileText, Users, Building2, AlertCircle, LogOut, Menu, X, ChevronRight, ClipboardList, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import logoTocha from '@/assets/logo-tocha.png';
interface LayoutProps {
  children: React.ReactNode;
}
interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

// Navegação principal - para usuários não-admin (apenas chamados)
const navItemsEnfermeira: NavItem[] = [{
  label: 'Novo Chamado',
  href: '/chamados/novo',
  icon: Plus
}, {
  label: 'Meus Chamados',
  href: '/chamados',
  icon: ClipboardList
}];

// Navegação principal - para admin
const navItemsPrincipalAdmin: NavItem[] = [{
  label: 'Dashboard',
  href: '/admin/dashboard',
  icon: LayoutDashboard
}, {
  label: 'Meus Chamados',
  href: '/chamados',
  icon: ClipboardList
}, {
  label: 'Novo Chamado',
  href: '/chamados/novo',
  icon: Plus
}, {
  label: 'Todos os Chamados',
  href: '/admin/chamados',
  icon: FileText
}];

// Navegação de administração - apenas para admin
const navItemsAdministracao: NavItem[] = [{
  label: 'Usuários',
  href: '/admin/usuarios',
  icon: Users
}, {
  label: 'Unidades',
  href: '/admin/unidades',
  icon: Building2
}, {
  label: 'Problemas',
  href: '/admin/problemas',
  icon: AlertCircle
}, {
  label: 'Estoque',
  href: '/admin/estoque',
  icon: Package
}];
export function Layout({
  children
}: LayoutProps) {
  const {
    profile,
    signOut,
    isAdmin
  } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Itens de navegação principal baseado no perfil
  const navItemsPrincipal = isAdmin ? navItemsPrincipalAdmin : navItemsEnfermeira;
  const handleSignOut = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso!');
    navigate('/auth');
  };

  // Cor base institucional única - azul escuro UBS
  const menuBaseColor = '#1e3a5f';
  return <div className="min-h-screen bg-background flex">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 z-50 flex items-center justify-between px-4" style={{
      backgroundColor: menuBaseColor,
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
        <Button variant="ghost" size="icon" className="text-white/90 hover:text-white hover:bg-white/5" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        
        <div className="flex items-center gap-2">
          <img 
            src={logoTocha} 
            alt="Tocha" 
            className="h-8 w-auto object-contain"
          />
        </div>
        
        <div className="w-10" />
      </header>

      {/* Sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn("fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col transform transition-transform duration-200 lg:transform-none", sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")} style={{
      backgroundColor: menuBaseColor
    }}>
        {/* Logo */}
        <NavLink 
          to={isAdmin ? '/admin/dashboard' : '/dashboard'}
          className="h-16 flex items-center justify-center px-4 hover:opacity-90 transition-opacity"
          style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}
        >
          <img 
            src={logoTocha} 
            alt="Tocha - Ilumine sua ideia" 
            className="h-12 w-auto object-contain"
          />
        </NavLink>

        {/* User info */}
        <div className="px-4 py-4" style={{
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
          <p className="text-sm text-white/70 truncate mb-1">
            {profile?.nome || profile?.email || 'Usuário'}
          </p>
          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded text-white/90" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}>
            {isAdmin ? 'Administrador' : 'Enfermeira'}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {/* Seção Principal */}
          <div className="space-y-1">
          {navItemsPrincipal.map(item => <NavLink key={item.href} to={item.href} end onClick={() => setSidebarOpen(false)} className="block">
                {({
              isActive
            }) => <div className={cn("flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 group", isActive ? "text-white" : "text-white/60 hover:text-white/90")} style={{
              backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
            }} onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              }
            }} onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}>
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {isActive && <ChevronRight className="w-4 h-4 text-white/70" />}
                  </div>}
              </NavLink>)}
          </div>

          {/* Seção Administração - apenas para admin */}
          {isAdmin && <div className="mt-6">
              <p className="px-3 pb-2 text-xs font-medium text-white/40 uppercase tracking-wider">
                Administração
              </p>
              <div className="space-y-1">
              {navItemsAdministracao.map(item => <NavLink key={item.href} to={item.href} end onClick={() => setSidebarOpen(false)} className="block">
                    {({
                isActive
              }) => <div className={cn("flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 group", isActive ? "text-white" : "text-white/60 hover:text-white/90")} style={{
                backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
              }} onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                }
              }} onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}>
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {isActive && <ChevronRight className="w-4 h-4 text-white/70" />}
                      </div>}
                  </NavLink>)}
              </div>
            </div>}
        </nav>

        {/* Footer */}
        <div className="p-3" style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-white/60 hover:text-white/90 transition-all duration-150" style={{
          backgroundColor: 'transparent'
        }} onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        }} onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }} onClick={handleSignOut}>
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-0 mt-14 lg:mt-0 overflow-auto">
        <motion.div initial={{
        opacity: 0,
        y: 10
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.3
      }}>
          {children}
        </motion.div>
      </main>
    </div>;
}