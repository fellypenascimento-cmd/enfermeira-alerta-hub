import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useChamados, useUpdateChamadoStatus } from '@/hooks/useChamados';
import { useUnidades } from '@/hooks/useUnidades';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animations';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Search, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Filter,
  Calendar,
  Loader2,
  Play,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ChamadoStatus, ChamadoWithRelations } from '@/types/database';

const statusConfig = {
  aberto: { label: 'Aberto', variant: 'warning' as const, icon: AlertCircle, color: 'bg-yellow-100 text-yellow-700' },
  em_atendimento: { label: 'Em Atendimento', variant: 'info' as const, icon: Clock, color: 'bg-blue-100 text-blue-700' },
  resolvido: { label: 'Resolvido', variant: 'success' as const, icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
};

export default function CentralChamados() {
  const { isAdmin } = useAuth();
  const { data: chamados, isLoading } = useChamados({ allChamados: true });
  const { data: unidades } = useUnidades();
  const updateStatus = useUpdateChamadoStatus();
  
  const [statusFilter, setStatusFilter] = useState<ChamadoStatus | 'todos'>('todos');
  const [unidadeFilter, setUnidadeFilter] = useState<string>('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionDialog, setActionDialog] = useState<{ open: boolean; chamado: ChamadoWithRelations | null; action: 'atender' | 'resolver' | null }>({
    open: false,
    chamado: null,
    action: null,
  });
  const [observacao, setObservacao] = useState('');

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const filteredChamados = chamados?.filter((chamado) => {
    const matchesStatus = statusFilter === 'todos' || chamado.status === statusFilter;
    const matchesUnidade = unidadeFilter === 'todas' || chamado.unidade_id === unidadeFilter;
    const matchesSearch = searchTerm === '' || 
      chamado.numero.toString().includes(searchTerm) ||
      chamado.problema?.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chamado.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesUnidade && matchesSearch;
  }) || [];

  const handleAction = (chamado: ChamadoWithRelations, action: 'atender' | 'resolver') => {
    setActionDialog({ open: true, chamado, action });
    setObservacao('');
  };

  const confirmAction = () => {
    if (!actionDialog.chamado || !actionDialog.action) return;

    const newStatus: ChamadoStatus = actionDialog.action === 'atender' ? 'em_atendimento' : 'resolvido';
    
    updateStatus.mutate(
      { 
        id: actionDialog.chamado.id, 
        status: newStatus,
        observacao: observacao || undefined,
      },
      {
        onSuccess: () => {
          setActionDialog({ open: false, chamado: null, action: null });
          setObservacao('');
        },
      }
    );
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <FadeIn>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Central de Chamados</h1>
            <p className="text-muted-foreground">
              Gerencie todos os chamados do sistema.
            </p>
          </div>
        </FadeIn>

        {/* Filters */}
        <FadeIn delay={0.1}>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número, problema ou descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ChamadoStatus | 'todos')}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os status</SelectItem>
                      <SelectItem value="aberto">Abertos</SelectItem>
                      <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                      <SelectItem value="resolvido">Resolvidos</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as unidades</SelectItem>
                      {unidades?.map((unidade) => (
                        <SelectItem key={unidade.id} value={unidade.id}>
                          {unidade.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Results count */}
        <FadeIn delay={0.15}>
          <p className="text-sm text-muted-foreground">
            {filteredChamados.length} chamado(s) encontrado(s)
          </p>
        </FadeIn>

        {/* Chamados List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredChamados.length === 0 ? (
          <FadeIn delay={0.2}>
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">
                  Nenhum chamado encontrado
                </h3>
                <p className="text-muted-foreground">
                  Tente ajustar os filtros de busca.
                </p>
              </CardContent>
            </Card>
          </FadeIn>
        ) : (
          <StaggerContainer className="space-y-3">
            {filteredChamados.map((chamado) => {
              const config = statusConfig[chamado.status];
              const StatusIcon = config.icon;

              return (
                <StaggerItem key={chamado.id}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Status indicator */}
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
                          <StatusIcon className="w-6 h-6" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-bold text-primary">#{chamado.numero}</span>
                            <Badge variant={config.variant}>
                              {config.label}
                            </Badge>
                          </div>
                          <h3 className="font-medium text-foreground truncate">
                            {chamado.problema?.titulo || chamado.problema_texto || 'Sem título'}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {chamado.descricao}
                          </p>
                        </div>

                        {/* Meta */}
                        <div className="text-sm text-muted-foreground shrink-0">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(chamado.data_abertura), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                          <p className="mt-1">{chamado.unidade?.nome || 'N/A'}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 shrink-0">
                          {chamado.status === 'aberto' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="gap-1"
                              onClick={() => handleAction(chamado, 'atender')}
                            >
                              <Play className="w-4 h-4" />
                              Atender
                            </Button>
                          )}
                          {chamado.status === 'em_atendimento' && (
                            <Button 
                              size="sm" 
                              className="gap-1"
                              onClick={() => handleAction(chamado, 'resolver')}
                            >
                              <Check className="w-4 h-4" />
                              Resolver
                            </Button>
                          )}
                          <Button asChild size="sm" variant="ghost">
                            <Link to={`/admin/chamados/${chamado.id}`}>
                              Ver
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}

        {/* Action Dialog */}
        <Dialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open: false, chamado: null, action: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionDialog.action === 'atender' ? 'Assumir Chamado' : 'Resolver Chamado'}
              </DialogTitle>
              <DialogDescription>
                {actionDialog.action === 'atender' 
                  ? 'Você está assumindo este chamado. Adicione uma observação se necessário.'
                  : 'Você está marcando este chamado como resolvido. Adicione uma observação sobre a resolução.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Chamado #{actionDialog.chamado?.numero}</p>
                <p className="text-sm text-muted-foreground">{actionDialog.chamado?.problema?.titulo}</p>
              </div>
              <Textarea
                placeholder="Observação (opcional)"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialog({ open: false, chamado: null, action: null })}>
                Cancelar
              </Button>
              <Button onClick={confirmAction} disabled={updateStatus.isPending}>
                {updateStatus.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
