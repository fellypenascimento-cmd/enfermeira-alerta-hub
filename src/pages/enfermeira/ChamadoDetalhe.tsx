import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useChamados } from '@/contexts/ChamadosContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  User,
  Calendar,
  FileText,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig = {
  aberto: { label: 'Aberto', variant: 'warning' as const, icon: AlertCircle, color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  em_atendimento: { label: 'Em Atendimento', variant: 'info' as const, icon: Clock, color: 'bg-blue-100 text-blue-700 border-blue-300' },
  resolvido: { label: 'Resolvido', variant: 'success' as const, icon: CheckCircle2, color: 'bg-green-100 text-green-700 border-green-300' },
};

export default function ChamadoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getChamadoById } = useChamados();

  const chamado = getChamadoById(id || '');

  if (!chamado) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-8 pb-6">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">
                Chamado não encontrado
              </h2>
              <p className="text-muted-foreground mb-6">
                O chamado que você está procurando não existe ou foi removido.
              </p>
              <Button asChild>
                <Link to="/chamados">Voltar aos Chamados</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const config = statusConfig[chamado.status];
  const StatusIcon = config.icon;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-foreground">
                  Chamado #{chamado.numero}
                </h1>
                <Badge variant={config.variant} className="gap-1">
                  <StatusIcon className="w-4 h-4" />
                  {config.label}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Aberto em {format(new Date(chamado.dataAbertura), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Problem details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Detalhes do Problema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Tipo de Problema</p>
                  <p className="font-medium">{chamado.problema?.titulo}</p>
                  {chamado.problema?.descricao && (
                    <p className="text-sm text-muted-foreground">{chamado.problema.descricao}</p>
                  )}
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Descrição</p>
                  <p className="whitespace-pre-wrap">{chamado.descricao}</p>
                </div>
              </CardContent>
            </Card>

            {/* History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Histórico de Alterações
                </CardTitle>
                <CardDescription>
                  Acompanhe todas as atualizações do seu chamado
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chamado.historico && chamado.historico.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-6">
                      {chamado.historico.map((item, index) => (
                        <div key={item.id} className="relative pl-10">
                          <div className="absolute left-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            {item.statusNovo === 'resolvido' ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : item.statusNovo === 'em_atendimento' ? (
                              <Clock className="w-4 h-4 text-blue-600" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-yellow-600" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={statusConfig[item.statusNovo].variant} className="text-xs">
                                {statusConfig[item.statusNovo].label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(item.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            {item.observacao && (
                              <p className="text-sm text-muted-foreground">{item.observacao}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma atualização ainda.
                  </p>
                )}

                {/* Opening event */}
                <div className="relative pl-10 mt-6">
                  <div className="absolute left-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">Chamado aberto</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(chamado.dataAbertura), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card className={`border-2 ${config.color}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <StatusIcon className="w-8 h-8" />
                  <div>
                    <p className="font-bold text-lg">{config.label}</p>
                    <p className="text-sm opacity-80">Status atual</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Unidade</p>
                    <p className="font-medium">{chamado.unidade?.nome}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Solicitante</p>
                    <p className="font-medium">{chamado.usuario?.nome}</p>
                  </div>
                </div>

                {chamado.atendente && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Atendente</p>
                        <p className="font-medium">{chamado.atendente.nome}</p>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Datas</p>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-muted-foreground">Abertura:</span>{' '}
                        {format(new Date(chamado.dataAbertura), "dd/MM/yyyy HH:mm")}
                      </p>
                      {chamado.dataAtendimento && (
                        <p>
                          <span className="text-muted-foreground">Atendimento:</span>{' '}
                          {format(new Date(chamado.dataAtendimento), "dd/MM/yyyy HH:mm")}
                        </p>
                      )}
                      {chamado.dataFechamento && (
                        <p>
                          <span className="text-muted-foreground">Fechamento:</span>{' '}
                          {format(new Date(chamado.dataFechamento), "dd/MM/yyyy HH:mm")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
