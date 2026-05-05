import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useEstoqueItens, useProdutosResumo, useRegistrarManutencao, useRetornarManutencao, useSalas } from '@/hooks/useEstoque';
import { useUnidades } from '@/hooks/useUnidades';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FadeIn } from '@/components/animations';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ArrowLeft, Wrench, CalendarIcon, Loader2, Package, Search, RotateCcw, Building2, MapPin, Box, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function EstoqueManutencao() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState('enviar');

  const { data: produtosResumo } = useProdutosResumo();
  const { data: itensManutencao, isLoading: loadingManut } = useEstoqueItens({ status: 'manutencao' });
  const { data: itensEmUso } = useEstoqueItens({ status: 'em_uso' });
  const { data: itensDisp } = useEstoqueItens({ status: 'disponivel' });
  const { data: unidades, isLoading: loadingUnidades } = useUnidades();
  const registrarManutencao = useRegistrarManutencao();
  const retornarManutencao = useRetornarManutencao();

  // ENVIAR
  const [produtoId, setProdutoId] = React.useState('');
  const [quantidade, setQuantidade] = React.useState('');
  const [modoManual, setModoManual] = React.useState(false);
  const [selectedItemIds, setSelectedItemIds] = React.useState<string[]>([]);

  // RETORNAR
  const [retornoItemId, setRetornoItemId] = React.useState('');
  const [destino, setDestino] = React.useState<'estoque_central' | 'unidade'>('estoque_central');
  const [unidadeDestinoId, setUnidadeDestinoId] = React.useState('');
  const [salaDestinoId, setSalaDestinoId] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');

  const [data, setData] = React.useState<Date>(new Date());
  const [observacao, setObservacao] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { data: salasDestino } = useSalas(unidadeDestinoId || undefined);

  const itensParaManutencaoDoProduto = React.useMemo(() => {
    return [...(itensEmUso || []), ...(itensDisp || [])].filter(i => i.produto_id === produtoId);
  }, [itensEmUso, itensDisp, produtoId]);

  const itensManutencaoFiltrados = React.useMemo(() => {
    if (!itensManutencao) return [];
    if (!searchTerm) return itensManutencao;
    const t = searchTerm.toLowerCase();
    return itensManutencao.filter(i =>
      i.produto?.nome?.toLowerCase().includes(t) || i.numero_patrimonio?.toLowerCase().includes(t)
    );
  }, [itensManutencao, searchTerm]);

  const toggleItem = (id: string) => {
    setSelectedItemIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  const handleEnviar = async () => {
    if (!produtoId && !modoManual) { toast.error('Selecione um equipamento'); return; }
    if (modoManual) {
      if (selectedItemIds.length === 0) { toast.error('Selecione pelo menos 1 item'); return; }
    } else {
      const qtd = parseInt(quantidade) || 0;
      if (qtd < 1) { toast.error('Informe a quantidade'); return; }
      if (qtd > itensParaManutencaoDoProduto.length) {
        toast.error(`Apenas ${itensParaManutencaoDoProduto.length} item(ns) disponível(eis)`);
        return;
      }
    }
    setIsSubmitting(true);
    try {
      await registrarManutencao.mutateAsync({
        itemIds: modoManual ? selectedItemIds : undefined,
        produtoId: modoManual ? undefined : produtoId,
        quantidade: modoManual ? undefined : parseInt(quantidade),
        dataManutencao: data.toISOString(),
        observacao: observacao || undefined,
      });
      navigate('/admin/estoque');
    } catch { /* hook */ } finally { setIsSubmitting(false); }
  };

  const handleRetornar = async () => {
    if (!retornoItemId) { toast.error('Selecione um equipamento'); return; }
    if (destino === 'unidade' && !unidadeDestinoId) { toast.error('Selecione a unidade'); return; }
    setIsSubmitting(true);
    try {
      await retornarManutencao.mutateAsync({
        itemId: retornoItemId,
        dataRetorno: data.toISOString(),
        observacao: observacao || undefined,
        destino,
        unidadeDestinoId: destino === 'unidade' ? unidadeDestinoId : undefined,
        salaDestinoId: destino === 'unidade' ? (salaDestinoId || undefined) : undefined,
      });
      navigate('/admin/estoque');
    } catch { /* hook */ } finally { setIsSubmitting(false); }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        <FadeIn>
          <Button variant="ghost" onClick={() => navigate('/admin/estoque')} className="gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" />Voltar
          </Button>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Manutenção</h1>
              <p className="text-muted-foreground">Gerenciar equipamentos em manutenção</p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedItemIds([]); setRetornoItemId(''); setSearchTerm(''); }}>
            <TabsList className="mb-4">
              <TabsTrigger value="enviar">Enviar para Manutenção</TabsTrigger>
              <TabsTrigger value="retornar">Retornar da Manutenção</TabsTrigger>
            </TabsList>

            <TabsContent value="enviar">
              <Card>
                <CardHeader>
                  <CardTitle>Enviar para Manutenção</CardTitle>
                  <CardDescription>Selecione um equipamento e informe a quantidade ou marque manualmente</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Equipamento *</Label>
                    <Select value={produtoId} onValueChange={(v) => { setProdutoId(v); setSelectedItemIds([]); setQuantidade(''); }}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {(produtosResumo || []).filter(p => (p.em_uso + p.disponivel) > 0).map(p => (
                          <SelectItem key={p.produto_id} value={p.produto_id}>
                            {p.nome} — {p.em_uso + p.disponivel} disponível(eis)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {produtoId && (
                    <>
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div>
                          <Label htmlFor="manual-m">Selecionar itens manualmente</Label>
                          <p className="text-xs text-muted-foreground">{itensParaManutencaoDoProduto.length} item(ns)</p>
                        </div>
                        <Switch id="manual-m" checked={modoManual} onCheckedChange={(v) => { setModoManual(v); setSelectedItemIds([]); setQuantidade(''); }} />
                      </div>

                      {!modoManual ? (
                        <div className="space-y-2">
                          <Label>Quantidade *</Label>
                          <Input type="text" inputMode="numeric" pattern="[0-9]*" value={quantidade}
                            onChange={(e) => setQuantidade(e.target.value.replace(/\D/g, ''))}
                            placeholder={`Máximo: ${itensParaManutencaoDoProduto.length}`} />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label>Itens ({selectedItemIds.length} selecionado(s))</Label>
                          <div className="space-y-1 max-h-60 overflow-y-auto border rounded-lg p-2">
                            {itensParaManutencaoDoProduto.map(item => (
                              <label key={item.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer">
                                <Checkbox checked={selectedItemIds.includes(item.id)} onCheckedChange={() => toggleItem(item.id)} />
                                <Package className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm flex-1">
                                  Item #{item.id.slice(0, 8)}
                                  {item.numero_patrimonio && <span className="ml-2 text-muted-foreground"><Hash className="w-3 h-3 inline" />{item.numero_patrimonio}</span>}
                                  <span className="ml-2 text-muted-foreground">· {item.unidade_atual?.nome || 'Estoque Central'}</span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div className="space-y-2">
                    <Label>Data *</Label>
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
                    <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => navigate('/admin/estoque')} disabled={isSubmitting} className="flex-1">Cancelar</Button>
                    <Button onClick={handleEnviar} disabled={isSubmitting || !produtoId} className="flex-1">
                      {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Registrando...</> : <><Wrench className="w-4 h-4 mr-2" />Enviar para Manutenção</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="retornar">
              <Card>
                <CardHeader>
                  <CardTitle>Retornar da Manutenção</CardTitle>
                  <CardDescription>Selecione o equipamento e defina para onde ele retorna</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Buscar</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar..." className="pl-10" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Equipamento *</Label>
                    {loadingManut ? (
                      <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                    ) : itensManutencaoFiltrados.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum equipamento em manutenção</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                        {itensManutencaoFiltrados.map(item => (
                          <div key={item.id} onClick={() => setRetornoItemId(item.id)}
                            className={cn('flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border',
                              retornoItemId === item.id ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50')}>
                            <Package className="w-5 h-5 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="font-medium">{item.produto?.nome}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.numero_patrimonio ? `#${item.numero_patrimonio}` : `Item #${item.id.slice(0, 8)}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {retornoItemId && (
                    <>
                      <div className="space-y-3">
                        <Label>Para onde retorna? *</Label>
                        <RadioGroup value={destino} onValueChange={(v) => { setDestino(v as any); setUnidadeDestinoId(''); setSalaDestinoId(''); }}>
                          <div className="flex items-center space-x-2 p-3 rounded-lg border">
                            <RadioGroupItem value="estoque_central" id="central" />
                            <Label htmlFor="central" className="flex items-center gap-2 cursor-pointer flex-1"><Box className="w-4 h-4" />Estoque Central</Label>
                          </div>
                          <div className="flex items-center space-x-2 p-3 rounded-lg border">
                            <RadioGroupItem value="unidade" id="unidade" />
                            <Label htmlFor="unidade" className="flex items-center gap-2 cursor-pointer flex-1"><Building2 className="w-4 h-4" />Unidade de Saúde</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {destino === 'unidade' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Unidade *</Label>
                            <Select value={unidadeDestinoId} onValueChange={(v) => { setUnidadeDestinoId(v); setSalaDestinoId(''); }}>
                              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                {(unidades || []).map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          {unidadeDestinoId && salasDestino && salasDestino.length > 0 && (
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2"><MapPin className="w-4 h-4" />Sala</Label>
                              <Select value={salaDestinoId} onValueChange={setSalaDestinoId}>
                                <SelectTrigger><SelectValue placeholder="Sala (opcional)" /></SelectTrigger>
                                <SelectContent>
                                  {salasDestino.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  <div className="space-y-2">
                    <Label>Data *</Label>
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
                    <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => navigate('/admin/estoque')} disabled={isSubmitting} className="flex-1">Cancelar</Button>
                    <Button onClick={handleRetornar} disabled={isSubmitting || !retornoItemId} className="flex-1">
                      {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Registrando...</> : <><RotateCcw className="w-4 h-4 mr-2" />Retornar da Manutenção</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </FadeIn>
      </div>
    </Layout>
  );
}
