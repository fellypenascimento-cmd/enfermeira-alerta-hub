import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useChamadoById } from '@/hooks/useChamados';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FadeIn } from '@/components/animations';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Calendar,
  FileText,
  MessageSquare,
  Loader2
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
  const { data: chamado, isLoading } = useChamadoById(id || '');

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!chamado) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <FadeIn>
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
          </FadeIn>
        </div>
      </Layout>
    );
  }

  const config = statusConfig[chamado.status];
  const StatusIcon = config.icon;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <FadeIn>
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
                  Aberto em {format(new Date(chamado.data_abertura), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <FadeIn delay={0.1} className="lg:col-span-2 space-y-6">
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
                  <p className="font-medium">{chamado.problema?.titulo || chamado.problema_texto || 'Não especificado'}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Descrição</p>
                  <p className="whitespace-pre-wrap">{chamado.descricao}</p>
                </div>
              </CardContent>
            </Card>

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
                <div className="relative pl-10">
                  <div className="absolute left-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">Chamado aberto</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(chamado.data_abertura), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.2} className="space-y-6">
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

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Unidade</p>
                    <p className="font-medium">{chamado.unidade?.nome || 'Não especificada'}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Datas</p>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-muted-foreground">Abertura:</span>{' '}
                        {format(new Date(chamado.data_abertura), "dd/MM/yyyy HH:mm")}
                      </p>
                      {chamado.data_atendimento && (
                        <p>
                          <span className="text-muted-foreground">Atendimento:</span>{' '}
                          {format(new Date(chamado.data_atendimento), "dd/MM/yyyy HH:mm")}
                        </p>
                      )}
                      {chamado.data_fechamento && (
                        <p>
                          <span className="text-muted-foreground">Fechamento:</span>{' '}
                          {format(new Date(chamado.data_fechamento), "dd/MM/yyyy HH:mm")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    </Layout>
  );
}
