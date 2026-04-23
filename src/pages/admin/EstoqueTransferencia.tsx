import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useProdutosResumo, useEstoqueItensPorProduto, useRegistrarTransferencia, useSalas } from '@/hooks/useEstoque';
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
import { toast } from 'sonner';
import { ArrowLeft, ArrowLeftRight, CalendarIcon, Loader2, Package, MapPin, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function EstoqueTransferencia() {
  const navigate = useNavigate();
  const { data: produtosResumo } = useProdutosResumo();
  const { data: unidades, isLoading: loadingUnidades } = useUnidades();
  const registrarTransferencia = useRegistrarTransferencia();

  const [produtoId, setProdutoId] = React.useState('');
  const [unidadeOrigemId, setUnidadeOrigemId] = React.useState('');
  const [salaOrigemId, setSalaOrigemId] = React.useState('');
  const [unidadeDestinoId, setUnidadeDestinoId] = React.useState('');
  const [salaDestinoId, setSalaDestinoId] = React.useState('');
  const [quantidade, setQuantidade] = React.useState('');
  const [modoManual, setModoManual] = React.useState(false);
  const [selectedItemIds, setSelectedItemIds] = React.useState<string[]>([]);
  const [data, setData] = React.useState<Date>(new Date());
  const [observacao, setObservacao] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { data: salasOrigem } = useSalas(unidadeOrigemId || undefined);
  const { data: salasDestino } = useSalas(unidadeDestinoId || undefined);
  const { data: itensProduto } = useEstoqueItensPorProduto(produtoId);

  const itensNaUnidade = React.useMemo(
    () => (itensProduto || []).filter(i =>
      i.status === 'em_uso' &&
      i.unidade_atual_id === unidadeOrigemId &&
      (!salaOrigemId || i.sala_id === salaOrigemId)
    ),
    [itensProduto, unidadeOrigemId, salaOrigemId]
  );

  const toggleItem = (id: string) => {
    setSelectedItemIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoId || !unidadeOrigemId || !unidadeDestinoId) {
      toast.error('Preencha equipamento, origem e destino');
      return;
    }
    if (modoManual) {
      if (selectedItemIds.length === 0) { toast.error('Selecione pelo menos 1 item'); return; }
    } else {
      const qtd = parseInt(quantidade) || 0;
      if (qtd < 1) { toast.error('Informe a quantidade'); return; }
      if (qtd > itensNaUnidade.length) {
        toast.error(`Apenas ${itensNaUnidade.length} item(ns) nesta origem`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await registrarTransferencia.mutateAsync({
        produtoId: modoManual ? undefined : produtoId,
        itemIds: modoManual ? selectedItemIds : undefined,
        quantidade: modoManual ? undefined : parseInt(quantidade),
        unidadeOrigemId,
        salaOrigemId: salaOrigemId || undefined,
        unidadeDestinoId,
        salaDestinoId: salaDestinoId || undefined,
        dataTransferencia: data.toISOString(),
        observacao: observacao || undefined,
      });
      navigate('/admin/estoque');
    } catch {
      // tratado no hook
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
              <ArrowLeftRight className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Transferência</h1>
              <p className="text-muted-foreground">Mover equipamentos entre unidades</p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Dados da Transferência</CardTitle>
                <CardDescription>Selecione equipamento, origem e destino</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Equipamento *</Label>
                  <Select value={produtoId} onValueChange={(v) => { setProdutoId(v); setSelectedItemIds([]); setQuantidade(''); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(produtosResumo || []).filter(p => p.em_uso > 0).map(p => (
                        <SelectItem key={p.produto_id} value={p.produto_id}>{p.nome} — {p.em_uso} em uso</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Origem */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unidade de Origem *</Label>
                    {loadingUnidades ? (
                      <div className="flex items-center gap-2 p-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Carregando...</div>
                    ) : (
                      <Select value={unidadeOrigemId} onValueChange={(v) => { setUnidadeOrigemId(v); setSalaOrigemId(''); setSelectedItemIds([]); }}>
                        <SelectTrigger><SelectValue placeholder="Origem" /></SelectTrigger>
                        <SelectContent>
                          {(unidades || []).map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {unidadeOrigemId && salasOrigem && salasOrigem.length > 0 && (
                    <div className="space-y-2">
                      <Label>Sala de Origem</Label>
                      <Select value={salaOrigemId} onValueChange={(v) => { setSalaOrigemId(v); setSelectedItemIds([]); }}>
                        <SelectTrigger><SelectValue placeholder="Sala (opcional)" /></SelectTrigger>
                        <SelectContent>
                          {salasOrigem.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {produtoId && unidadeOrigemId && (
                  <>
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div>
                        <Label htmlFor="manual-t">Selecionar itens manualmente</Label>
                        <p className="text-xs text-muted-foreground">{itensNaUnidade.length} item(ns) na origem</p>
                      </div>
                      <Switch id="manual-t" checked={modoManual} onCheckedChange={(v) => { setModoManual(v); setSelectedItemIds([]); setQuantidade(''); }} />
                    </div>

                    {!modoManual ? (
                      <div className="space-y-2">
                        <Label>Quantidade a transferir *</Label>
                        <Input type="text" inputMode="numeric" pattern="[0-9]*" value={quantidade}
                          onChange={(e) => setQuantidade(e.target.value.replace(/\D/g, ''))}
                          placeholder={`Máximo: ${itensNaUnidade.length}`} />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Itens ({selectedItemIds.length} selecionado(s))</Label>
                        <div className="space-y-1 max-h-60 overflow-y-auto border rounded-lg p-2">
                          {itensNaUnidade.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">Nenhum item nesta origem</p>
                          ) : itensNaUnidade.map(item => (
                            <label key={item.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer">
                              <Checkbox checked={selectedItemIds.includes(item.id)} onCheckedChange={() => toggleItem(item.id)} />
                              <Package className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm flex-1">
                                Item #{item.id.slice(0, 8)}
                                {item.numero_patrimonio && <span className="ml-2 text-muted-foreground"><Hash className="w-3 h-3 inline" />{item.numero_patrimonio}</span>}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Destino */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unidade de Destino *</Label>
                    <Select value={unidadeDestinoId} onValueChange={(v) => { setUnidadeDestinoId(v); setSalaDestinoId(''); }}>
                      <SelectTrigger><SelectValue placeholder="Destino" /></SelectTrigger>
                      <SelectContent>
                        {(unidades || []).map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {unidadeDestinoId && salasDestino && salasDestino.length > 0 && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><MapPin className="w-4 h-4" />Sala de Destino</Label>
                      <Select value={salaDestinoId} onValueChange={setSalaDestinoId}>
                        <SelectTrigger><SelectValue placeholder="Sala (opcional)" /></SelectTrigger>
                        <SelectContent>
                          {salasDestino.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Data da Transferência *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(data, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={data} onSelect={(d) => d && setData(d)} locale={ptBR} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Motivo da transferência..." rows={3} />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => navigate('/admin/estoque')} disabled={isSubmitting} className="flex-1">Cancelar</Button>
                  <Button type="submit" disabled={isSubmitting || !produtoId || !unidadeDestinoId} className="flex-1">
                    {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Registrando...</> : <><ArrowLeftRight className="w-4 h-4 mr-2" />Registrar Transferência</>}
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
