import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useUnidades } from '@/hooks/useUnidades';
import { useProblemas } from '@/hooks/useProblemas';
import { useCreateChamado } from '@/hooks/useChamados';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FadeIn } from '@/components/animations';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Send, Loader2, CheckCircle2, Building2, AlertTriangle } from 'lucide-react';
import { z } from 'zod';

const chamadoSchema = z.object({
  unidadeId: z.string().min(1, 'Selecione uma unidade'),
  problemaId: z.string().min(1, 'Selecione um tipo de problema'),
  descricao: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres').max(1000, 'Descrição deve ter no máximo 1000 caracteres'),
});

export default function NovoChamado() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: unidades } = useUnidades();
  const { data: problemas } = useProblemas();
  const createChamado = useCreateChamado();
  
  const [unidadeId, setUnidadeId] = useState(profile?.unidade_id || '');
  const [problemaId, setProblemaId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{ unidadeId?: string; problemaId?: string; descricao?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = chamadoSchema.safeParse({ unidadeId, problemaId, descricao });
    if (!validation.success) {
      const fieldErrors: typeof errors = {};
      validation.error.errors.forEach((err) => {
        const field = err.path[0] as keyof typeof errors;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    createChamado.mutate(
      { 
        unidade_id: unidadeId, 
        problema_id: problemaId, 
        descricao 
      },
      {
        onSuccess: () => {
          setSuccess(true);
          setTimeout(() => navigate('/chamados'), 2000);
        },
      }
    );
  };

  if (success) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <FadeIn>
            <Card className="w-full max-w-md text-center">
              <CardContent className="pt-8 pb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">
                  Chamado Aberto com Sucesso!
                </h2>
                <p className="text-muted-foreground mb-6">
                  Seu chamado foi registrado e será atendido em breve.
                </p>
                <Button onClick={() => navigate('/chamados')} className="w-full">
                  Ver Meus Chamados
                </Button>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <FadeIn>
          <div className="mb-6">
            <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 mb-4">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Novo Chamado</h1>
            <p className="text-muted-foreground">
              Preencha os campos abaixo para abrir um novo chamado de suporte.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-primary" />
                Informações do Problema
              </CardTitle>
              <CardDescription>
                Descreva detalhadamente o problema para agilizar o atendimento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="unidade" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Unidade de Saúde
                  </Label>
                  <Select value={unidadeId} onValueChange={setUnidadeId}>
                    <SelectTrigger className={errors.unidadeId ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades?.map((unidade) => (
                        <SelectItem key={unidade.id} value={unidade.id}>
                          {unidade.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.unidadeId && (
                    <p className="text-sm text-destructive">{errors.unidadeId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="problema">Tipo de Problema</Label>
                  <Select value={problemaId} onValueChange={setProblemaId}>
                    <SelectTrigger className={errors.problemaId ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Selecione o tipo de problema" />
                    </SelectTrigger>
                    <SelectContent>
                      {problemas?.map((problema) => (
                        <SelectItem key={problema.id} value={problema.id}>
                          <div>
                            <p>{problema.titulo}</p>
                            {problema.descricao && (
                              <p className="text-xs text-muted-foreground">{problema.descricao}</p>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.problemaId && (
                    <p className="text-sm text-destructive">{errors.problemaId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição Detalhada</Label>
                  <Textarea
                    id="descricao"
                    placeholder="Descreva o problema com o máximo de detalhes possível..."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={5}
                    className={errors.descricao ? 'border-destructive' : ''}
                  />
                  <div className="flex items-center justify-between">
                    {errors.descricao ? (
                      <p className="text-sm text-destructive">{errors.descricao}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Inclua detalhes como: quando o problema começou, mensagens de erro, etc.
                      </p>
                    )}
                    <span className={`text-sm ${descricao.length > 1000 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {descricao.length}/1000
                    </span>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                    className="w-full sm:w-auto"
                    disabled={createChamado.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="w-full sm:w-auto gap-2"
                    disabled={createChamado.isPending}
                  >
                    {createChamado.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Enviar Chamado
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </Layout>
  );
}
