import { useAuth } from '@/contexts/AuthContext';
import { useChamadosStats, useChamados } from '@/hooks/useChamados';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, Clock, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const { profile, isAdmin } = useAuth();
  const { data: stats, isLoading: statsLoading } = useChamadosStats();
  const { data: recentChamados, isLoading: chamadosLoading } = useChamados({ limit: 5, allChamados: isAdmin });

  return (
    <AppLayout>
      <PageHeader
        title={`Olá, ${profile?.nome?.split(' ')[0] || 'Usuário'}!`}
        subtitle={isAdmin ? 'Visão geral de todos os chamados' : 'Acompanhe seus chamados'}
        actions={
          <Button asChild className="btn-gradient">
            <Link to="/chamados/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo Chamado
            </Link>
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total de Chamados"
          value={statsLoading ? '-' : stats?.total || 0}
          icon={<Ticket className="h-6 w-6" />}
        />
        <StatCard
          title="Abertos"
          value={statsLoading ? '-' : stats?.aberto || 0}
          icon={<AlertCircle className="h-6 w-6" />}
          variant="aberto"
        />
        <StatCard
          title="Em Atendimento"
          value={statsLoading ? '-' : stats?.em_atendimento || 0}
          icon={<Clock className="h-6 w-6" />}
          variant="atendimento"
        />
        <StatCard
          title="Resolvidos"
          value={statsLoading ? '-' : stats?.resolvido || 0}
          icon={<CheckCircle2 className="h-6 w-6" />}
          variant="resolvido"
        />
      </div>

      {/* Recent Chamados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Chamados Recentes</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/chamados">Ver todos</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {chamadosLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : recentChamados?.length === 0 ? (
            <div className="text-center py-8">
              <Ticket className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum chamado encontrado</p>
              <Button asChild className="mt-4" variant="outline">
                <Link to="/chamados/novo">Criar primeiro chamado</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentChamados?.map((chamado) => (
                <Link
                  key={chamado.id}
                  to={`/chamados/${chamado.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium text-foreground">#{chamado.numero}</span>
                      <StatusBadge status={chamado.status} size="sm" />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {chamado.problema?.titulo || chamado.problema_texto || 'Sem problema definido'}
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground ml-4">
                    <p>{chamado.unidade?.nome}</p>
                    <p>{format(new Date(chamado.data_abertura), "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
