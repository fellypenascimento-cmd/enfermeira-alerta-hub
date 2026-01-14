import React from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useMockAuth } from '@/contexts/MockAuthContext';
import { useChamados } from '@/contexts/ChamadosContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig = {
  aberto: { label: 'Aberto', variant: 'warning' as const, icon: AlertCircle },
  em_atendimento: { label: 'Em Atendimento', variant: 'info' as const, icon: Clock },
  resolvido: { label: 'Resolvido', variant: 'success' as const, icon: CheckCircle2 },
};

export default function EnfermeiraDashboard() {
  const { user } = useMockAuth();
  const { getChamadosEnfermeira, getStats } = useChamados();
  
  const chamados = getChamadosEnfermeira();
  const stats = getStats();
  const recentChamados = chamados.slice(0, 5);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Olá, {user?.nome?.split(' ')[0]}!
            </h1>
            <p className="text-muted-foreground">
              Acompanhe seus chamados e solicite suporte técnico.
            </p>
          </div>
          <Button asChild size="lg" className="gap-2">
            <Link to="/chamados/novo">
              <Plus className="w-5 h-5" />
              Novo Chamado
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Abertos</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.abertos}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Em Atendimento</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.emAtendimento}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Resolvidos</p>
                  <p className="text-3xl font-bold text-green-600">{stats.resolvidos}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-3xl font-bold text-primary">{stats.total}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Chamados */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Chamados Recentes</CardTitle>
              <CardDescription>Seus últimos 5 chamados abertos</CardDescription>
            </div>
            <Button variant="ghost" asChild className="gap-1">
              <Link to="/chamados">
                Ver todos
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentChamados.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground">Nenhum chamado encontrado</p>
                <Button asChild className="mt-4">
                  <Link to="/chamados/novo">Abrir primeiro chamado</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentChamados.map((chamado) => {
                  const config = statusConfig[chamado.status];
                  const StatusIcon = config.icon;

                  return (
                    <Link
                      key={chamado.id}
                      to={`/chamados/${chamado.id}`}
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
                            {chamado.problema?.titulo}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {chamado.unidade?.nome}
                          </p>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          {format(new Date(chamado.dataAbertura), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
