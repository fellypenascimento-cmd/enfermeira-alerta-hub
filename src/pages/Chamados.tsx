import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChamados } from '@/hooks/useChamados';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Ticket, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ChamadoStatus } from '@/types/database';

export default function Chamados() {
  const { isAdmin } = useAuth();
  const [statusFilter, setStatusFilter] = useState<ChamadoStatus | 'todos'>('todos');
  
  const { data: chamados, isLoading } = useChamados({
    status: statusFilter === 'todos' ? undefined : statusFilter,
    allChamados: isAdmin,
  });

  return (
    <AppLayout>
      <PageHeader
        title={isAdmin ? "Todos os Chamados" : "Meus Chamados"}
        subtitle="Acompanhe o status dos chamados"
        actions={
          <Button asChild className="btn-gradient">
            <Link to="/chamados/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo Chamado
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="aberto">Abertos</SelectItem>
            <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
            <SelectItem value="resolvido">Resolvidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Chamados List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-12">Carregando...</p>
          ) : chamados?.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum chamado encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {chamados?.map((chamado) => (
                <Link
                  key={chamado.id}
                  to={`/chamados/${chamado.id}`}
                  className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-foreground">#{chamado.numero}</span>
                      <StatusBadge status={chamado.status} />
                    </div>
                    <p className="text-sm text-foreground mb-1">
                      {chamado.problema?.titulo || chamado.problema_texto || 'Problema não especificado'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {chamado.unidade?.nome} • {format(new Date(chamado.data_abertura), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground ml-4" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
