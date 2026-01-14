import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useChamados, useChamadosStats } from '@/hooks/useChamados';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animations';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Loader2,
  Users,
  Building2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const statusConfig = {
  aberto: { label: 'Aberto', variant: 'warning' as const, icon: AlertCircle },
  em_atendimento: { label: 'Em Atendimento', variant: 'info' as const, icon: Clock },
  resolvido: { label: 'Resolvido', variant: 'success' as const, icon: CheckCircle2 },
};

const COLORS = ['#f59e0b', '#3b82f6', '#10b981'];

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const { data: chamados, isLoading: chamadosLoading } = useChamados({ allChamados: true, limit: 10 });
  const { data: stats, isLoading: statsLoading } = useChamadosStats();

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const isLoading = chamadosLoading || statsLoading;

  const pieData = stats ? [
    { name: 'Abertos', value: stats.aberto, color: '#f59e0b' },
    { name: 'Em Atendimento', value: stats.em_atendimento, color: '#3b82f6' },
    { name: 'Resolvidos', value: stats.resolvido, color: '#10b981' },
  ].filter(d => d.value > 0) : [];

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard Administrativo</h1>
              <p className="text-muted-foreground">
                Visão geral do sistema de chamados.
              </p>
            </div>
            <Button asChild className="gap-2">
              <Link to="/admin/chamados">
                <FileText className="w-5 h-5" />
                Central de Chamados
              </Link>
            </Button>
          </div>
        </FadeIn>

        {/* Stats Cards */}
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StaggerItem>
            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Abertos</p>
                    <p className="text-3xl font-bold text-yellow-600">
                      {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.aberto || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Em Atendimento</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.em_atendimento || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Resolvidos</p>
                    <p className="text-3xl font-bold text-green-600">
                      {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.resolvido || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-3xl font-bold text-primary">
                      {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.total || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        </StaggerContainer>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FadeIn delay={0.2}>
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Status</CardTitle>
                <CardDescription>Visão geral dos chamados por status</CardDescription>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.3}>
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
                <CardDescription>Acesse as principais funções do sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild variant="outline" className="w-full justify-start gap-3">
                  <Link to="/admin/chamados">
                    <FileText className="w-5 h-5" />
                    Central de Chamados
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start gap-3">
                  <Link to="/admin/usuarios">
                    <Users className="w-5 h-5" />
                    Gerenciar Usuários
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start gap-3">
                  <Link to="/admin/unidades">
                    <Building2 className="w-5 h-5" />
                    Gerenciar Unidades
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        {/* Recent Chamados */}
        <FadeIn delay={0.4}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Chamados Recentes</CardTitle>
                <CardDescription>Últimos chamados do sistema</CardDescription>
              </div>
              <Button variant="ghost" asChild className="gap-1">
                <Link to="/admin/chamados">
                  Ver todos
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {chamadosLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : !chamados || chamados.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground/50" />
                  <p className="mt-2 text-muted-foreground">Nenhum chamado encontrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {chamados.slice(0, 5).map((chamado) => {
                    const config = statusConfig[chamado.status];
                    const StatusIcon = config.icon;

                    return (
                      <Link
                        key={chamado.id}
                        to={`/admin/chamados/${chamado.id}`}
                        className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm text-muted-foreground">
                                #{chamado.numero}
                              </span>
                              <Badge variant={config.variant} className="gap-1">
                                <StatusIcon className="w-3 h-3" />
                                {config.label}
                              </Badge>
                            </div>
                            <h3 className="font-medium truncate">
                              {chamado.problema?.titulo || chamado.problema_texto || 'Sem título'}
                            </h3>
                            <p className="text-sm text-muted-foreground truncate">
                              {chamado.unidade?.nome || 'Unidade não especificada'}
                            </p>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            {format(new Date(chamado.data_abertura), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </Layout>
  );
}
