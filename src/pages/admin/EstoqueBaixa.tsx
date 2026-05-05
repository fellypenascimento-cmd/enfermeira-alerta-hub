import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useProdutosResumo, useEstoqueItensPorProduto, useRegistrarBaixa } from '@/hooks/useEstoque';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FadeIn } from '@/components/animations';
import { XCircle, Loader2, Package, CalendarIcon, AlertTriangle, ArrowLeft, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function EstoqueBaixa() {
  const navigate = useNavigate();
  const { data: produtosResumo } = useProdutosResumo();
  const registrarBaixa = useRegistrarBaixa();

  const [produtoId, setProdutoId] = React.useState('');
  const [quantidade, setQuantidade] = React.useState('');
  const [modoManual, setModoManual] = React.useState(false);
  const [selectedItemIds, setSelectedItemIds] = React.useState<string[]>([]);
  const [dataBaixa, setDataBaixa] = React.useState<Date | undefined>(new Date());
  const [motivo, setMotivo] = React.useState('');
  const [showConfirm, setShowConfirm] = React.useState(false);

  const { data: itensProduto } = useEstoqueItensPorProduto(produtoId);
  const itensBaixaveis = React.useMemo(
    () => (itensProduto || []).filter(i => i.status === 'disponivel' || i.status === 'em_uso'),
    [itensProduto]
  );
  const produtoSelecionado = produtosResumo?.find(p => p.produto_id === produtoId);
  const totalBaixavel = (produtoSelecionado?.disponivel || 0) + (produtoSelecionado?.em_uso || 0);

  const toggleItem = (id: string) => setSelectedItemIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleConfirmBaixa = async () => {
    if (!dataBaixa) { toast.error('Informe a data'); return; }
    try {
      await registrarBaixa.mutateAsync({
        itemIds: modoManual ? selectedItemIds : undefined,
        produtoId: modoManual ? undefined : produtoId,
        quantidade: modoManual ? undefined : parseInt(quantidade),
        dataBaixa: dataBaixa.toISOString(),
        motivo: motivo.trim() || undefined,
      });
      navigate('/admin/estoque');
    } catch { /* hook */ }
    setShowConfirm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoId) { toast.error('Selecione um equipamento'); return; }
    if (modoManual) {
      if (selectedItemIds.length === 0) { toast.error('Selecione pelo menos 1 item'); return; }
    } else {
      const qtd = parseInt(quantidade) || 0;
      if (qtd < 1) { toast.error('Informe a quantidade'); return; }
      if (qtd > totalBaixavel) { toast.error(`Apenas ${totalBaixavel} disponível(eis)`); return; }
    }
    if (!dataBaixa) { toast.error('Informe a data'); return; }
    setShowConfirm(true);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        <FadeIn>
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/estoque')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <XCircle className="w-7 h-7 text-destructive" />Baixa de Equipamento
              </h1>
              <p className="text-muted-foreground">Registrar baixa definitiva de equipamento(s)</p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Dados da Baixa</CardTitle>
                <CardDescription>Informe equipamento e quantidade ou selecione manualmente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Equipamento *</Label>
                  <Select value={produtoId} onValueChange={(v) => { setProdutoId(v); setSelectedItemIds([]); setQuantidade(''); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(produtosResumo || []).filter(p => (p.disponivel + p.em_uso) > 0).map(p => (
                        <SelectItem key={p.produto_id} value={p.produto_id}>
                          {p.nome} — {p.disponivel + p.em_uso} disponível(eis)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {produtoId && (
                  <>
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div>
                        <Label htmlFor="manual-b">Selecionar itens manualmente</Label>
                        <p className="text-xs text-muted-foreground">{itensBaixaveis.length} item(ns)</p>
                      </div>
                      <Switch id="manual-b" checked={modoManual} onCheckedChange={(v) => { setModoManual(v); setSelectedItemIds([]); setQuantidade(''); }} />
                    </div>

                    {!modoManual ? (
                      <div className="space-y-2">
                        <Label>Quantidade a dar baixa *</Label>
                        <Input type="text" inputMode="numeric" pattern="[0-9]*" value={quantidade}
                          onChange={(e) => setQuantidade(e.target.value.replace(/\D/g, ''))}
                          placeholder={`Máximo: ${totalBaixavel}`} />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Itens ({selectedItemIds.length} selecionado(s))</Label>
                        <div className="space-y-1 max-h-60 overflow-y-auto border rounded-lg p-2">
                          {itensBaixaveis.map(item => (
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
                  <Label>Data da Baixa *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !dataBaixa && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataBaixa ? format(dataBaixa, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Selecione a data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dataBaixa} onSelect={setDataBaixa} disabled={(date) => date > new Date()} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Motivo (opcional)</Label>
                  <Textarea placeholder="Ex: Equipamento danificado, obsoleto..." value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Ação irreversível</p>
                    <p className="text-amber-700">A baixa marca os itens como inutilizados. Esta ação não pode ser desfeita.</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => navigate('/admin/estoque')}>Cancelar</Button>
                  <Button type="submit" variant="destructive" className="flex-1" disabled={!produtoId || !dataBaixa || registrarBaixa.isPending}>
                    {registrarBaixa.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                    Registrar Baixa
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </FadeIn>

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />Confirmar Baixa
              </AlertDialogTitle>
              <AlertDialogDescription>
                Você está prestes a dar baixa em <strong>{modoManual ? selectedItemIds.length : quantidade}</strong> item(ns) de <strong>{produtoSelecionado?.nome}</strong>. Esta ação é irreversível.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmBaixa} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Confirmar Baixa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
