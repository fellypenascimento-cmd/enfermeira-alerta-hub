import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useChamados } from '@/hooks/useChamados';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animations';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Filter,
  Calendar,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ChamadoStatus } from '@/types/database';

const statusConfig = {
  aberto: { label: 'Aberto', variant: 'warning' as const, icon: AlertCircle, color: 'bg-yellow-100 text-yellow-700' },
  em_atendimento: { label: 'Em Atendimento', variant: 'info' as const, icon: Clock, color: 'bg-blue-100 text-blue-700' },
  resolvido: { label: 'Resolvido', variant: 'success' as const, icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
};

export default function MeusChamados() {
  const { data: chamados, isLoading } = useChamados();
  const [statusFilter, setStatusFilter] = useState<ChamadoStatus | 'todos'>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChamados = chamados?.filter((chamado) => {
    const matchesStatus = statusFilter === 'todos' || chamado.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      chamado.numero.toString().includes(searchTerm) ||
      chamado.problema?.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chamado.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  }) || [];

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Meus Chamados</h1>
              <p className="text-muted-foreground">
                Acompanhe o status de todos os seus chamados.
              </p>
            </div>
            <Button asChild className="gap-2">
              <Link to="/chamados/novo">
                <Plus className="w-5 h-5" />
                Novo Chamado
              </Link>
            </Button>
          </div>
        </FadeIn>

        {/* Filters */}
        <FadeIn delay={0.1}>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número, problema ou descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ChamadoStatus | 'todos')}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os status</SelectItem>
                      <SelectItem value="aberto">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-600" />
                          Abertos
                        </div>
                      </SelectItem>
                      <SelectItem value="em_atendimento">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          Em Atendimento
                        </div>
                      </SelectItem>
                      <SelectItem value="resolvido">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          Resolvidos
                        </div>
                      </SelectItem>
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
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== 'todos'
                    ? 'Tente ajustar os filtros de busca.'
                    : 'Você ainda não abriu nenhum chamado.'}
                </p>
                {!searchTerm && statusFilter === 'todos' && (
                  <Button asChild>
                    <Link to="/chamados/novo">Abrir Primeiro Chamado</Link>
                  </Button>
                )}
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
                      <Link to={`/chamados/${chamado.id}`} className="block">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
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
                          <div className="text-sm text-muted-foreground sm:text-right shrink-0">
                            <div className="flex items-center gap-1 sm:justify-end">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(chamado.data_abertura), "dd/MM/yyyy", { locale: ptBR })}
                            </div>
                            <p className="mt-1">{chamado.unidade?.nome || 'Unidade não especificada'}</p>
                          </div>
                        </div>
                      </Link>
                    </CardContent>
                  </Card>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}
      </div>
    </Layout>
  );
}
