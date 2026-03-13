import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { 
  useEstoqueItensPorProduto, 
  useEstoqueMovimentacoesPorProduto, 
  useProdutoDistribuicao,
  useConverterParaPatrimonial,
  useVerificarPatrimonio,
} from '@/hooks/useEstoque';
import { useProdutos } from '@/hooks/useEstoque';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FadeIn } from '@/components/animations';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Package,
  Building2,
  Hash,
  Loader2,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  FileText,
  Clock,
  Layers,
  MapPin,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Box,
  Wrench,
  XCircle,
  RotateCcw,
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

interface PatrimonioInput {
  value: string;
  isValid: boolean | null;
  isChecking: boolean;
}

export default function EstoqueDetalhe() {
  const { id: produtoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: produtos } = useProdutos();
  const { data: itens, isLoading: loadingItens } = useEstoqueItensPorProduto(produtoId || '');
  const { data: movimentacoes, isLoading: loadingMov } = useEstoqueMovimentacoesPorProduto(produtoId || '');
  const { data: distribuicao, isLoading: loadingDist } = useProdutoDistribuicao(produtoId || '');
  const converterParaPatrimonial = useConverterParaPatrimonial();
  const verificarPatrimonio = useVerificarPatrimonio();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null);
  const [patrimonioInputs, setPatrimonioInputs] = React.useState<PatrimonioInput[]>([{ value: '', isValid: null, isChecking: false }]);
  const [isConverting, setIsConverting] = React.useState(false);

  const produto = produtos?.find(p => p.id === produtoId);

  // Aggregate stats from items
  const resumo = React.useMemo(() => {
    if (!itens) return { total: 0, disponivel: 0, em_uso: 0, manutencao: 0, baixa: 0 };
    return itens.reduce((acc, item) => {
      const qty = item.controle_patrimonial ? 1 : (item.quantidade_total || 0);
      acc.total += qty;
      switch (item.status) {
        case 'disponivel': acc.disponivel += qty; break;
        case 'em_uso': acc.em_uso += qty; break;
        case 'manutencao': acc.manutencao += qty; break;
        case 'baixa': acc.baixa += qty; break;
      }
      return acc;
    }, { total: 0, disponivel: 0, em_uso: 0, manutencao: 0, baixa: 0 });
  }, [itens]);

  const patrimoniais = itens?.filter(i => i.controle_patrimonial) || [];
  const naoPatrimoniais = itens?.filter(i => !i.controle_patrimonial && i.status !== 'baixa') || [];

  const addPatrimonioField = () => {
    const selectedItem = naoPatrimoniais.find(i => i.id === selectedItemId);
    if (selectedItem && patrimonioInputs.length < (selectedItem.quantidade_total || 0)) {
      setPatrimonioInputs([...patrimonioInputs, { value: '', isValid: null, isChecking: false }]);
    }
  };

  const removePatrimonioField = (index: number) => {
    if (patrimonioInputs.length > 1) {
      setPatrimonioInputs(patrimonioInputs.filter((_, i) => i !== index));
    }
  };

  const handlePatrimonioChange = async (index: number, value: string) => {
    const newInputs = [...patrimonioInputs];
    newInputs[index] = { value, isValid: null, isChecking: true };
    setPatrimonioInputs(newInputs);

    if (value.trim()) {
      const duplicataLocal = patrimonioInputs.some(
        (p, i) => i !== index && p.value.trim() === value.trim()
      );
      if (duplicataLocal) {
        newInputs[index] = { value, isValid: false, isChecking: false };
        setPatrimonioInputs([...newInputs]);
        return;
      }
      try {
        const existing = await verificarPatrimonio.mutateAsync(value.trim());
        newInputs[index] = { value, isValid: !existing, isChecking: false };
        setPatrimonioInputs([...newInputs]);
      } catch {
        newInputs[index] = { value, isValid: null, isChecking: false };
        setPatrimonioInputs([...newInputs]);
      }
    } else {
      newInputs[index] = { value, isValid: null, isChecking: false };
      setPatrimonioInputs([...newInputs]);
    }
  };

  const handleConverter = async () => {
    if (!selectedItemId) return;
    const patrimonios = patrimonioInputs.filter(p => p.value.trim()).map(p => p.value.trim());
    if (patrimonios.length === 0) {
      toast.error('Informe ao menos um número de patrimônio');
      return;
    }
    const invalidos = patrimonioInputs.filter(p => p.value.trim() && p.isValid !== true);
    if (invalidos.length > 0) {
      toast.error('Corrija os patrimônios inválidos antes de continuar');
      return;
    }

    setIsConverting(true);
    try {
      await converterParaPatrimonial.mutateAsync({ itemId: selectedItemId, patrimonios });
      setDialogOpen(false);
      setPatrimonioInputs([{ value: '', isValid: null, isChecking: false }]);
      setSelectedItemId(null);
    } catch {
      // Error handled in hook
    } finally {
      setIsConverting(false);
    }
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
          <FadeIn>
            <Card className="w-full max-w-md text-center">
              <CardContent className="pt-8 pb-6">
                <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-bold text-foreground mb-2">Produto não encontrado</h2>
                <p className="text-muted-foreground mb-6">
                  Nenhum item encontrado para este produto.
                </p>
                <Button onClick={() => navigate('/admin/estoque')}>Voltar ao Estoque</Button>
              </CardContent>
            </Card>
          </FadeIn>
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
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{produtoNome}</h1>
                {produtoCategoria && (
                  <p className="text-muted-foreground">{produtoCategoria}</p>
                )}
              </div>
            </div>
            {naoPatrimoniais.length > 0 && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Patrimônio
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Adicionar Patrimônio</DialogTitle>
                    <DialogDescription>
                      Converta unidades de um lote em itens individuais com número de patrimônio.
                    </DialogDescription>
                  </DialogHeader>
                  {/* Select which batch item to convert */}
                  {naoPatrimoniais.length > 1 && (
                    <div className="space-y-2">
                      <Label>Selecione o lote</Label>
                      {naoPatrimoniais.map(item => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setSelectedItemId(item.id);
                            setPatrimonioInputs([{ value: '', isValid: null, isChecking: false }]);
                          }}
                          className={cn(
                            'p-3 rounded-lg border cursor-pointer transition-colors',
                            selectedItemId === item.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                          )}
                        >
                          <p className="font-medium">Qtd: {item.quantidade_total}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.unidade_atual?.nome || 'Estoque Central'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {(selectedItemId || naoPatrimoniais.length === 1) && (() => {
                    const targetItem = naoPatrimoniais.length === 1 ? naoPatrimoniais[0] : naoPatrimoniais.find(i => i.id === selectedItemId);
                    if (!targetItem) return null;
                    if (naoPatrimoniais.length === 1 && !selectedItemId) {
                      // Auto-select single item
                      setTimeout(() => setSelectedItemId(targetItem.id), 0);
                    }
                    return (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Disponível: {targetItem.quantidade_total} unidade(s)
                        </p>
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                          {patrimonioInputs.map((input, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Hash className="w-4 h-4 text-muted-foreground" />
                              <Input
                                value={input.value}
                                onChange={(e) => handlePatrimonioChange(index, e.target.value)}
                                placeholder={`Patrimônio ${index + 1}`}
                                className={cn(
                                  input.isValid === false && 'border-destructive',
                                  input.isValid === true && 'border-green-500'
                                )}
                              />
                              <div className="w-6 flex-shrink-0">
                                {input.isChecking && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                                {input.isValid === true && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                {input.isValid === false && <AlertTriangle className="w-4 h-4 text-destructive" />}
                              </div>
                              {patrimonioInputs.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removePatrimonioField(index)}>
                                  ×
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                        {patrimonioInputs.length < (targetItem.quantidade_total || 0) && (
                          <Button type="button" variant="outline" size="sm" onClick={addPatrimonioField}>
                            <Plus className="w-3 h-3 mr-1" />
                            Adicionar mais
                          </Button>
                        )}
                      </>
                    );
                  })()}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleConverter} disabled={isConverting || !selectedItemId}>
                      {isConverting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Converter
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </FadeIn>

        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{resumo.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{resumo.disponivel}</p>
              <p className="text-sm text-muted-foreground">Estoque Central</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{resumo.em_uso}</p>
              <p className="text-sm text-muted-foreground">Em Uso</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{resumo.manutencao}</p>
              <p className="text-sm text-muted-foreground">Manutenção</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{resumo.baixa}</p>
              <p className="text-sm text-muted-foreground">Baixa</p>
            </CardContent>
          </Card>
        </div>

        {/* Ações Rápidas */}
        <FadeIn delay={0.05}>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/estoque/saida">
                    <ArrowUpFromLine className="w-4 h-4 mr-2" />
                    Enviar para Unidade
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/estoque/transferencia">
                    <ArrowLeftRight className="w-4 h-4 mr-2" />
                    Transferir
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/estoque/manutencao">
                    <Wrench className="w-4 h-4 mr-2" />
                    Manutenção
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10">
                  <Link to="/admin/estoque/baixa">
                    <XCircle className="w-4 h-4 mr-2" />
                    Dar Baixa
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Distribuição */}
          <FadeIn delay={0.1} className="lg:col-span-1 space-y-6">
            {/* Por Unidade */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Distribuição por Unidade
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingDist ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : !distribuicao?.porUnidade?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum item distribuído</p>
                ) : (
                  <div className="space-y-3">
                    {distribuicao.porUnidade.map((d) => (
                      <div key={d.unidade_id} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{d.unidade_nome}</span>
                        <Badge variant="secondary">{d.quantidade}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Por Sala */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Distribuição por Sala
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingDist ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : !distribuicao?.porSala?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma distribuição por sala</p>
                ) : (
                  <div className="space-y-3">
                    {distribuicao.porSala.map((d) => (
                      <div key={d.sala_id} className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium">{d.sala_nome}</span>
                          <p className="text-xs text-muted-foreground">{d.unidade_nome}</p>
                        </div>
                        <Badge variant="secondary">{d.quantidade}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Patrimônios */}
            {patrimoniais.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Hash className="w-5 h-5" />
                    Patrimônios ({patrimoniais.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {patrimoniais.map((item) => {
                      const config = statusConfig[item.status] || statusConfig.disponivel;
                      return (
                        <div key={item.id} className="flex items-center justify-between p-2 rounded border">
                          <div>
                            <span className="font-mono text-sm">{item.numero_patrimonio}</span>
                            <p className="text-xs text-muted-foreground">
                              {item.unidade_atual?.nome || 'Estoque Central'}
                              {item.sala?.nome && ` · ${item.sala.nome}`}
                            </p>
                          </div>
                          <Badge className={cn('text-xs', config.color)}>{config.label}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </FadeIn>

          {/* Histórico de Movimentações */}
          <FadeIn delay={0.2} className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Histórico de Movimentações
                </CardTitle>
                <CardDescription>
                  Registro de todas as movimentações deste produto
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingMov ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : !movimentacoes || movimentacoes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma movimentação registrada.
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                    <div className="space-y-6">
                      {movimentacoes.map((mov) => {
                        const tipoConfig = tipoMovimentacaoConfig[mov.tipo] || tipoMovimentacaoConfig.entrada;
                        const TipoIcon = tipoConfig.icon;
                        
                        return (
                          <div key={mov.id} className="relative pl-10">
                            <div className={`absolute left-0 w-8 h-8 rounded-full bg-background border-2 flex items-center justify-center ${tipoConfig.color}`}>
                              <TipoIcon className="w-4 h-4" />
                            </div>
                            <div className="bg-muted/30 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className={`font-semibold ${tipoConfig.color}`}>
                                  {tipoConfig.label}
                                  {mov.quantidade_movimentada && mov.quantidade_movimentada > 1 && (
                                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                                      ({mov.quantidade_movimentada} un.)
                                    </span>
                                  )}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(mov.data_movimentacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                              
                              <div className="space-y-1 text-sm">
                                {mov.unidade_origem && (
                                  <p>
                                    <span className="text-muted-foreground">Origem:</span>{' '}
                                    <span className="font-medium">
                                      {mov.unidade_origem.nome}
                                      {mov.sala_origem && ` · ${mov.sala_origem.nome}`}
                                    </span>
                                  </p>
                                )}
                                {mov.unidade_destino && (
                                  <p>
                                    <span className="text-muted-foreground">Destino:</span>{' '}
                                    <span className="font-medium">
                                      {mov.unidade_destino.nome}
                                      {mov.sala_destino && ` · ${mov.sala_destino.nome}`}
                                    </span>
                                  </p>
                                )}
                                {!mov.unidade_origem && !mov.unidade_destino && mov.tipo === 'entrada' && (
                                  <p>
                                    <span className="text-muted-foreground">Destino:</span>{' '}
                                    <span className="font-medium">Estoque Central</span>
                                  </p>
                                )}
                                <p>
                                  <span className="text-muted-foreground">Responsável:</span>{' '}
                                  <span className="font-medium">
                                    {mov.responsavel?.nome || mov.responsavel?.email || 'Não identificado'}
                                  </span>
                                </p>
                                {mov.observacao && (
                                  <div className="mt-2 p-2 rounded bg-muted/50 border-l-2 border-primary/30">
                                    <p className="text-sm">{mov.observacao}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    </Layout>
  );
}
