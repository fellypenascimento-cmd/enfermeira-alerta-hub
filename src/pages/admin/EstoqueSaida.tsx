import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useProdutosResumo, useEstoqueItensPorProduto, useRegistrarSaida, useSalas } from '@/hooks/useEstoque';
import { useUnidades } from '@/hooks/useUnidades';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FadeIn } from '@/components/animations';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowUpFromLine, CalendarIcon, Loader2, Package, MapPin, Hash,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function EstoqueSaida() {
  const navigate = useNavigate();
  const { data: produtosResumo, isLoading: loadingProdutos } = useProdutosResumo();
  const { data: unidades, isLoading: loadingUnidades } = useUnidades();
  const registrarSaida = useRegistrarSaida();

  const [produtoId, setProdutoId] = React.useState('');
  const [quantidade, setQuantidade] = React.useState('');
  const [modoManual, setModoManual] = React.useState(false);
  const [selectedItemIds, setSelectedItemIds] = React.useState<string[]>([]);
  const [unidadeDestinoId, setUnidadeDestinoId] = React.useState('');
  const [salaDestinoId, setSalaDestinoId] = React.useState('');
  const [dataSaida, setDataSaida] = React.useState<Date>(new Date());
  const [observacao, setObservacao] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { data: salas, isLoading: loadingSalas } = useSalas(unidadeDestinoId || undefined);
  const { data: itensProduto } = useEstoqueItensPorProduto(produtoId);

  const itensDisponiveis = React.useMemo(
    () => (itensProduto || []).filter(i => i.status === 'disponivel' && !i.unidade_atual_id),
    [itensProduto]
  );

  const produtoSelecionado = produtosResumo?.find(p => p.produto_id === produtoId);

  const toggleItem = (id: string) => {
    setSelectedItemIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoId) { toast.error('Selecione um equipamento'); return; }
    if (!unidadeDestinoId) { toast.error('Selecione a unidade de destino'); return; }

    if (modoManual) {
      if (selectedItemIds.length === 0) { toast.error('Selecione pelo menos 1 item'); return; }
    } else {
      const qtd = parseInt(quantidade) || 0;
      if (qtd < 1) { toast.error('Informe uma quantidade válida'); return; }
      if (qtd > (produtoSelecionado?.disponivel || 0)) {
        toast.error(`Apenas ${produtoSelecionado?.disponivel} disponível(eis) no estoque`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await registrarSaida.mutateAsync({
        produtoId: modoManual ? undefined : produtoId,
        itemIds: modoManual ? selectedItemIds : undefined,
        quantidade: modoManual ? undefined : parseInt(quantidade),
        unidadeDestinoId,
        salaDestinoId: salaDestinoId || undefined,
        dataSaida: dataSaida.toISOString(),
        observacao: observacao || undefined,
      });
      navigate('/admin/estoque');
    } catch {
      // erro já tratado
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        <FadeIn>
          <Button variant="ghost" onClick={() => navigate('/admin/estoque')} className="gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" />Voltar
          </Button>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <ArrowUpFromLine className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Saída de Equipamentos</h1>
              <p className="text-muted-foreground">Envie itens individuais do estoque central para uma unidade</p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Dados da Saída</CardTitle>
                <CardDescription>Informe a quantidade ou selecione manualmente os itens</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Produto */}
                <div className="space-y-2">
                  <Label>Equipamento *</Label>
                  <Select value={produtoId} onValueChange={(v) => { setProdutoId(v); setSelectedItemIds([]); setQuantidade(''); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o equipamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingProdutos ? (
                        <div className="p-2 text-center text-muted-foreground">Carregando...</div>
                      ) : (produtosResumo || []).filter(p => p.disponivel > 0).length === 0 ? (
                        <div className="p-2 text-center text-muted-foreground">Nenhum item disponível</div>
                      ) : (
                        (produtosResumo || []).filter(p => p.disponivel > 0).map(p => (
                          <SelectItem key={p.produto_id} value={p.produto_id}>
                            {p.nome} — {p.disponivel} disponível(eis)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {produtoId && (
                  <>
                    {/* Toggle modo manual */}
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div>
                        <Label htmlFor="manual-mode">Selecionar itens manualmente</Label>
                        <p className="text-xs text-muted-foreground">Marque cada equipamento individualmente</p>
                      </div>
                      <Switch id="manual-mode" checked={modoManual} onCheckedChange={(v) => { setModoManual(v); setSelectedItemIds([]); setQuantidade(''); }} />
                    </div>

                    {!modoManual ? (
                      <div className="space-y-2">
                        <Label>Quantidade a enviar *</Label>
                        <Input
                          type="text" inputMode="numeric" pattern="[0-9]*"
                          value={quantidade}
                          onChange={(e) => setQuantidade(e.target.value.replace(/\D/g, ''))}
                          placeholder={`Máximo: ${produtoSelecionado?.disponivel || 0}`}
                        />
                        <p className="text-xs text-muted-foreground">Sistema selecionará os {quantidade || 'N'} primeiros itens disponíveis</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Selecione os itens ({selectedItemIds.length} selecionado(s))</Label>
                        <div className="space-y-1 max-h-60 overflow-y-auto border rounded-lg p-2">
                          {itensDisponiveis.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">Nenhum item disponível</p>
                          ) : itensDisponiveis.map(item => (
                            <label key={item.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer">
                              <Checkbox checked={selectedItemIds.includes(item.id)} onCheckedChange={() => toggleItem(item.id)} />
                              <Package className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm flex-1">
                                Item #{item.id.slice(0, 8)}
                                {item.numero_patrimonio && (
                                  <span className="ml-2 text-muted-foreground">
                                    <Hash className="w-3 h-3 inline" />{item.numero_patrimonio}
                                  </span>
                                )}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Unidade */}
                <div className="space-y-2">
                  <Label>Unidade de Destino *</Label>
                  {loadingUnidades ? (
                    <div className="flex items-center gap-2 p-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />Carregando...
                    </div>
                  ) : (
                    <Select value={unidadeDestinoId} onValueChange={(v) => { setUnidadeDestinoId(v); setSalaDestinoId(''); }}>
                      <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                      <SelectContent>
                        {(unidades || []).map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Sala */}
                {unidadeDestinoId && !loadingSalas && salas && salas.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><MapPin className="w-4 h-4" />Sala de Destino</Label>
                    <Select value={salaDestinoId} onValueChange={setSalaDestinoId}>
                      <SelectTrigger><SelectValue placeholder="Selecione a sala (opcional)" /></SelectTrigger>
                      <SelectContent>
                        {salas.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {unidadeDestinoId && !loadingSalas && (!salas || salas.length === 0) && (
                  <p className="text-xs text-muted-foreground">Esta unidade não possui salas cadastradas. Cadastre na tela de Unidades.</p>
                )}

                {/* Data */}
                <div className="space-y-2">
                  <Label>Data de Saída *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(dataSaida, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dataSaida} onSelect={(d) => d && setDataSaida(d)} locale={ptBR} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Descrição da Saída</Label>
                  <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: Enviado para sala de vacina..." rows={3} />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => navigate('/admin/estoque')} disabled={isSubmitting} className="flex-1">Cancelar</Button>
                  <Button type="submit" disabled={isSubmitting || !produtoId || !unidadeDestinoId} className="flex-1">
                    {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Registrando...</> : <><ArrowUpFromLine className="w-4 h-4 mr-2" />Registrar Saída</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </FadeIn>
      </div>
    </Layout>
  );
}
