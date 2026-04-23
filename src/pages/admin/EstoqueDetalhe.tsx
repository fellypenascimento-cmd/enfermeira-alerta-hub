import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import {
  useEstoqueItensPorProduto,
  useEstoqueMovimentacoesPorProduto,
  useProdutoDistribuicao,
  useAtualizarPatrimonio,
  useVerificarPatrimonio,
  useProdutos,
} from '@/hooks/useEstoque';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FadeIn } from '@/components/animations';
import { toast } from 'sonner';
import {
  ArrowLeft, Package, Building2, Hash, Loader2, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight,
  Clock, MapPin, Wrench, XCircle, RotateCcw, Pencil, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; color: string }> = {
  disponivel: { label: 'Disponível', color: 'bg-green-100 text-green-700 border-green-300' },
  em_uso: { label: 'Em Uso', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  manutencao: { label: 'Manutenção', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  baixa: { label: 'Baixa', color: 'bg-red-100 text-red-700 border-red-300' },
};

const tipoMovimentacaoConfig: Record<string, { label: string; icon: any; color: string }> = {
  entrada: { label: 'Entrada', icon: ArrowDownToLine, color: 'text-green-600' },
  saida: { label: 'Saída', icon: ArrowUpFromLine, color: 'text-blue-600' },
  transferencia: { label: 'Transferência', icon: ArrowLeftRight, color: 'text-purple-600' },
  devolucao: { label: 'Devolução', icon: ArrowDownToLine, color: 'text-orange-600' },
  manutencao: { label: 'Manutenção', icon: Wrench, color: 'text-amber-600' },
  retorno_manutencao: { label: 'Retorno Manutenção', icon: RotateCcw, color: 'text-teal-600' },
  baixa: { label: 'Baixa', icon: XCircle, color: 'text-red-600' },
};

export default function EstoqueDetalhe() {
  const { id: produtoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: produtos } = useProdutos();
  const { data: itens, isLoading: loadingItens } = useEstoqueItensPorProduto(produtoId || '');
  const { data: movimentacoes, isLoading: loadingMov } = useEstoqueMovimentacoesPorProduto(produtoId || '');
  const { data: distribuicao, isLoading: loadingDist } = useProdutoDistribuicao(produtoId || '');
  const atualizarPatrimonio = useAtualizarPatrimonio();
  const verificarPatrimonio = useVerificarPatrimonio();

  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [patrimonioInput, setPatrimonioInput] = React.useState('');
  const [patValid, setPatValid] = React.useState<boolean | null>(null);

  const produto = produtos?.find(p => p.id === produtoId);

  const resumo = React.useMemo(() => {
    const r = { total: 0, disponivel: 0, em_uso: 0, manutencao: 0, baixa: 0 };
    (itens || []).forEach(i => {
      r.total++;
      if (i.status === 'disponivel') r.disponivel++;
      else if (i.status === 'em_uso') r.em_uso++;
      else if (i.status === 'manutencao') r.manutencao++;
      else if (i.status === 'baixa') r.baixa++;
    });
    return r;
  }, [itens]);

  const handleCheckPat = async (val: string) => {
    setPatrimonioInput(val);
    if (!val.trim()) { setPatValid(null); return; }
    try {
      const exists = await verificarPatrimonio.mutateAsync(val.trim());
      setPatValid(!exists || (exists as any).id === editingItemId);
    } catch { setPatValid(null); }
  };

  const handleSavePat = async () => {
    if (!editingItemId) return;
    if (patrimonioInput.trim() && patValid === false) {
      toast.error('Patrimônio já cadastrado');
      return;
    }
    try {
      await atualizarPatrimonio.mutateAsync({ itemId: editingItemId, numero_patrimonio: patrimonioInput.trim() || null });
      setEditingItemId(null);
      setPatrimonioInput('');
      setPatValid(null);
    } catch {/* hook */}
  };

  if (loadingItens) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!itens || itens.length === 0) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-8 pb-6">
              <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h2 className="text-xl font-bold mb-2">Produto sem itens</h2>
              <Button onClick={() => navigate('/admin/estoque')}>Voltar ao Estoque</Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const produtoNome = itens[0]?.produto?.nome || produto?.nome || 'Produto';
  const produtoCategoria = itens[0]?.produto?.categoria || produto?.categoria;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <FadeIn>
          <Button variant="ghost" onClick={() => navigate('/admin/estoque')} className="gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" />Voltar
          </Button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{produtoNome}</h1>
              {produtoCategoria && <p className="text-muted-foreground">{produtoCategoria}</p>}
            </div>
          </div>
        </FadeIn>

        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{resumo.total}</p><p className="text-sm text-muted-foreground">Total</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{resumo.disponivel}</p><p className="text-sm text-muted-foreground">Estoque Central</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{resumo.em_uso}</p><p className="text-sm text-muted-foreground">Em Uso</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{resumo.manutencao}</p><p className="text-sm text-muted-foreground">Manutenção</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{resumo.baixa}</p><p className="text-sm text-muted-foreground">Baixa</p></CardContent></Card>
        </div>

        {/* Ações */}
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/admin/estoque/saida"><ArrowUpFromLine className="w-4 h-4 mr-2" />Enviar para Unidade</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/admin/estoque/transferencia"><ArrowLeftRight className="w-4 h-4 mr-2" />Transferir</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/admin/estoque/manutencao"><Wrench className="w-4 h-4 mr-2" />Manutenção</Link></Button>
            <Button asChild variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10">
              <Link to="/admin/estoque/baixa"><XCircle className="w-4 h-4 mr-2" />Dar Baixa</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Distribuição */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-5 h-5" />Distribuição por Unidade</CardTitle></CardHeader>
              <CardContent>
                {loadingDist ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> :
                  !distribuicao?.porUnidade?.length ? <p className="text-sm text-muted-foreground text-center py-4">Nenhum item distribuído</p> :
                  <div className="space-y-2">
                    {distribuicao.porUnidade.map(u => (
                      <div key={u.unidade_id} className="flex justify-between p-2 rounded bg-muted/50">
                        <span className="text-sm">{u.unidade_nome}</span>
                        <Badge variant="secondary">{u.quantidade}</Badge>
                      </div>
                    ))}
                  </div>
                }
              </CardContent>
            </Card>

            {distribuicao?.porSala && distribuicao.porSala.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="w-5 h-5" />Distribuição por Sala</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {distribuicao.porSala.map(s => (
                      <div key={`${s.unidade_id}-${s.sala_id}`} className="flex justify-between p-2 rounded bg-muted/50">
                        <div>
                          <p className="text-sm font-medium">{s.sala_nome}</p>
                          <p className="text-xs text-muted-foreground">{s.unidade_nome}</p>
                        </div>
                        <Badge variant="secondary">{s.quantidade}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Itens individuais */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Itens Individuais ({itens.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {itens.map(item => {
                    const cfg = statusConfig[item.status];
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <Package className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">Item #{item.id.slice(0, 8)}</p>
                            {item.numero_patrimonio && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Hash className="w-3 h-3" />{item.numero_patrimonio}
                              </span>
                            )}
                            <Badge className={cn('text-xs', cfg?.color)}>{cfg?.label}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.unidade_atual?.nome || 'Estoque Central'}
                            {item.sala?.nome && ` · ${item.sala.nome}`}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setEditingItemId(item.id);
                          setPatrimonioInput(item.numero_patrimonio || '');
                          setPatValid(null);
                        }}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Histórico */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-5 h-5" />Histórico de Movimentações</CardTitle></CardHeader>
              <CardContent>
                {loadingMov ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> :
                  !movimentacoes?.length ? <p className="text-sm text-muted-foreground text-center py-4">Sem movimentações</p> :
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {movimentacoes.map(mov => {
                      const cfg = tipoMovimentacaoConfig[mov.tipo];
                      const Icon = cfg?.icon || ArrowLeftRight;
                      return (
                        <div key={mov.id} className="flex gap-3 p-3 rounded-lg border">
                          <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', cfg?.color)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="font-medium text-sm">{cfg?.label}</p>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(mov.data_movimentacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            {(mov.unidade_origem?.nome || mov.unidade_destino?.nome) && (
                              <p className="text-xs text-muted-foreground">
                                {mov.unidade_origem?.nome && `De: ${mov.unidade_origem.nome}${mov.sala_origem?.nome ? ` (${mov.sala_origem.nome})` : ''}`}
                                {mov.unidade_origem?.nome && mov.unidade_destino?.nome && ' → '}
                                {mov.unidade_destino?.nome && `Para: ${mov.unidade_destino.nome}${mov.sala_destino?.nome ? ` (${mov.sala_destino.nome})` : ''}`}
                              </p>
                            )}
                            {mov.observacao && <p className="text-xs text-muted-foreground italic mt-1">{mov.observacao}</p>}
                            {mov.responsavel?.nome && <p className="text-xs text-muted-foreground mt-1">Por: {mov.responsavel.nome}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                }
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dialog de patrimônio */}
        <Dialog open={!!editingItemId} onOpenChange={(o) => { if (!o) { setEditingItemId(null); setPatrimonioInput(''); setPatValid(null); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Patrimônio do Item</DialogTitle>
              <DialogDescription>Defina ou atualize o número de patrimônio deste item individual.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Número de Patrimônio</Label>
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <Input
                  value={patrimonioInput}
                  onChange={(e) => handleCheckPat(e.target.value)}
                  placeholder="Deixe vazio para remover"
                  className={cn(patValid === false && 'border-destructive', patValid === true && patrimonioInput && 'border-green-500')}
                />
                <div className="w-6">
                  {patValid === true && patrimonioInput && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  {patValid === false && <AlertTriangle className="w-4 h-4 text-destructive" />}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingItemId(null)}>Cancelar</Button>
              <Button onClick={handleSavePat} disabled={atualizarPatrimonio.isPending}>
                {atualizarPatrimonio.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
