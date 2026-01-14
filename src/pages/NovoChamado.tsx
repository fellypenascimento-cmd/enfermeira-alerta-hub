import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { FadeIn } from '@/components/animations';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUnidades } from '@/hooks/useUnidades';
import { useProblemas } from '@/hooks/useProblemas';
import { useCreateChamado } from '@/hooks/useChamados';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function NovoChamado() {
  const navigate = useNavigate();
  const { data: unidades, isLoading: unidadesLoading } = useUnidades();
  const { data: problemas, isLoading: problemasLoading } = useProblemas();
  const createChamado = useCreateChamado();

  const [unidadeId, setUnidadeId] = useState('');
  const [problemaId, setProblemaId] = useState('');
  const [descricao, setDescricao] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!unidadeId) {
      toast.error('Selecione a unidade');
      return;
    }
    if (!descricao.trim()) {
      toast.error('Descreva o problema');
      return;
    }

    await createChamado.mutateAsync({
      unidade_id: unidadeId,
      problema_id: problemaId || undefined,
      descricao: descricao.trim(),
    });

    navigate('/chamados');
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <FadeIn>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Novo Chamado</h1>
            <p className="text-muted-foreground">Abra um chamado para reportar um problema</p>
          </div>
        </FadeIn>

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade Básica de Saúde *</Label>
              <Select value={unidadeId} onValueChange={setUnidadeId}>
                <SelectTrigger>
                  <SelectValue placeholder={unidadesLoading ? "Carregando..." : "Selecione a unidade"} />
                </SelectTrigger>
                <SelectContent>
                  {unidades?.map((unidade) => (
                    <SelectItem key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="problema">Tipo de Problema</Label>
              <Select value={problemaId} onValueChange={setProblemaId}>
                <SelectTrigger>
                  <SelectValue placeholder={problemasLoading ? "Carregando..." : "Selecione o tipo de problema"} />
                </SelectTrigger>
                <SelectContent>
                  {problemas?.map((problema) => (
                    <SelectItem key={problema.id} value={problema.id}>
                      {problema.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição do Problema *</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva detalhadamente o problema..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={5}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">{descricao.length}/1000 caracteres</p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-gradient" disabled={createChamado.isPending}>
                {createChamado.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Enviar Chamado
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </Layout>
  );
}
