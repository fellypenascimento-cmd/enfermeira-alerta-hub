import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useEstoqueItemById, useEstoqueMovimentacoes, useConverterParaPatrimonial, useVerificarPatrimonio, useRegistrarLiberacao, useEstoqueLotacoes } from '@/hooks/useEstoque';
import { useUnidades } from '@/hooks/useUnidades';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar } from '@/components/ui/calendar';
import { FadeIn } from '@/components/animations';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Package,
  Building2,
  Hash,
  Calendar as CalendarIcon,
  User,
  Loader2,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileText,
  Clock,
  Layers,
  MapPin,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Unlock,
  ArrowRightLeft,
  Tag,
  ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const statusConfig = {
  disponivel: { label: 'Disponível', color: 'bg-green-100 text-green-700 border-green-300' },
  em_uso: { label: 'Em Uso', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  baixa: { label: 'Baixa', color: 'bg-red-100 text-red-700 border-red-300' },
};

const tipoMovimentacaoConfig: Record<string, { label: string; icon: any; color: string }> = {
  entrada: { label: 'Entrada', icon: ArrowDownToLine, color: 'text-green-600' },
  saida: { label: 'Saída', icon: ArrowUpFromLine, color: 'text-blue-600' },
  devolucao: { label: 'Devolução', icon: ArrowDownToLine, color: 'text-orange-600' },
  baixa: { label: 'Baixa', icon: FileText, color: 'text-red-600' },
  liberacao: { label: 'Liberação', icon: Unlock, color: 'text-purple-600' },
  transferencia: { label: 'Transferência', icon: ArrowRightLeft, color: 'text-indigo-600' },
  patrimonializacao: { label: 'Patrimonialização', icon: Tag, color: 'text-amber-600' },
};

interface PatrimonioInput {
  value: string;
  isValid: boolean | null;
  isChecking: boolean;
}

export default function EstoqueDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: item, isLoading: loadingItem } = useEstoqueItemById(id || '');
  const { data: movimentacoes, isLoading: loadingMov } = useEstoqueMovimentacoes(id);
  const { data: lotacoes } = useEstoqueLotacoes(id);
  const { data: unidades } = useUnidades();
  const converterParaPatrimonial = useConverterParaPatrimonial();
  const verificarPatrimonio = useVerificarPatrimonio();
  const registrarLiberacao = useRegistrarLiberacao();

  // Patrimônio dialog
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [patrimonioInputs, setPatrimonioInputs] = React.useState<PatrimonioInput[]>([{ value: '', isValid: null, isChecking: false }]);
  const [isConverting, setIsConverting] = React.useState(false);

  // Liberação/Transferência dialog
  const [liberarDialogOpen, setLiberarDialogOpen] = React.useState(false);
  const [isLiberando, setIsLiberando] = React.useState(false);
  const [liberarOrigemId, setLiberarOrigemId] = React.useState('');
  const [liberarDestino, setLiberarDestino] = React.useState<'estoque_geral' | 'transferir'>('estoque_geral');
  const [liberarUnidadeDestinoId, setLiberarUnidadeDestinoId] = React.useState('');
  const [liberarLocalEspecifico, setLiberarLocalEspecifico] = React.useState('');
  const [liberarQuantidade, setLiberarQuantidade] = React.useState('');
  const [liberarData, setLiberarData] = React.useState<Date>(new Date());
  const [liberarDescricao, setLiberarDescricao] = React.useState('');

  const resetLiberarForm = () => {
    setLiberarOrigemId('');
    setLiberarDestino('estoque_geral');
    setLiberarUnidadeDestinoId('');
    setLiberarLocalEspecifico('');
    setLiberarQuantidade('');
    setLiberarData(new Date());
    setLiberarDescricao('');
  };

  // Selected lotação for max quantity
  const selectedLotacao = (lotacoes || []).find(l => l.unidade_id === liberarOrigemId);
  const maxQuantidade = selectedLotacao?.quantidade || 0;

  // ============ Patrimônio handlers ============
  const addPatrimonioField = () => {
    if (item && patrimonioInputs.length < (item.quantidade_total || 0)) {
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
      await converterParaPatrimonial.mutateAsync({
        itemId: id!,
        patrimonios,
      });
      setDialogOpen(false);
      setPatrimonioInputs([{ value: '', isValid: null, isChecking: false }]);
    } catch {
      // Error handled in hook
    } finally {
      setIsConverting(false);
    }
  };

  // ============ Liberação handler ============
  const handleLiberar = async () => {
    if (!liberarOrigemId) {
      toast.error('Selecione a unidade de origem');
      return;
    }
    if (liberarDestino === 'transferir' && !liberarUnidadeDestinoId) {
      toast.error('Selecione a unidade de destino');
      return;
    }

    const qtd = liberarQuantidade ? parseInt(liberarQuantidade) : undefined;
    if (qtd !== undefined && qtd <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }
    if (qtd !== undefined && qtd > maxQuantidade) {
      toast.error(`Quantidade excede o lotado nesta unidade (${maxQuantidade})`);
      return;
    }

    setIsLiberando(true);
    try {
      await registrarLiberacao.mutateAsync({
        itemId: id!,
        unidadeOrigemId: liberarOrigemId,
        destino: liberarDestino,
        unidadeDestinoId: liberarDestino === 'transferir' ? liberarUnidadeDestinoId : undefined,
        localEspecifico: liberarDestino === 'transferir' ? liberarLocalEspecifico : undefined,
        quantidade: qtd,
        dataMovimentacao: liberarData.toISOString(),
        observacao: liberarDescricao || undefined,
      });
      setLiberarDialogOpen(false);
      resetLiberarForm();
    } catch {
      // Error handled in hook
    } finally {
      setIsLiberando(false);
    }
  };

  if (loadingItem) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!item) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <FadeIn>
            <Card className="w-full max-w-md text-center">
              <CardContent className="pt-8 pb-6">
                <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-bold text-foreground mb-2">Item não encontrado</h2>
                <p className="text-muted-foreground mb-6">
                  O item que você está procurando não existe ou foi removido.
                </p>
                <Button onClick={() => navigate('/admin/estoque')}>Voltar ao Estoque</Button>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </Layout>
    );
  }

  const config = statusConfig[item.status as keyof typeof statusConfig];
  const isPatrimonial = item.controle_patrimonial;
  const canAddPatrimonio = !isPatrimonial && (item.quantidade_total || 0) > 0 && item.status !== 'baixa';
  const hasLotacoes = (lotacoes || []).length > 0;
  const canLiberar = (hasLotacoes || (!!item.unidade_atual_id && isPatrimonial)) && item.status !== 'baixa';

  const unidadesDisponiveis = (unidades || []).filter(u => u.id !== liberarOrigemId);

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
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-foreground">
                    {item.produto?.nome || 'Item sem nome'}
                  </h1>
                  <Badge className={config?.color}>{config?.label}</Badge>
                </div>
                {isPatrimonial && item.numero_patrimonio && (
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Hash className="w-4 h-4" />
                    Patrimônio: {item.numero_patrimonio}
                  </p>
                )}
                {!isPatrimonial && (
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Layers className="w-4 h-4" />
                    Quantidade disponível: {item.quantidade_total}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* LIBERAR / TRANSFERIR */}
              {canLiberar && (
                <Dialog open={liberarDialogOpen} onOpenChange={(open) => { setLiberarDialogOpen(open); if (!open) resetLiberarForm(); }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                      <Unlock className="w-4 h-4 mr-2" />
                      Liberar da Unidade
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Liberar / Transferir Equipamento</DialogTitle>
                      <DialogDescription>
                        Desvincular o equipamento da unidade atual ou transferir para outra.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      {/* Unidade de Origem (dropdown from lotações) */}
                      <div>
                        <Label>Unidade de Origem *</Label>
                        <Select value={liberarOrigemId} onValueChange={(v) => { setLiberarOrigemId(v); setLiberarQuantidade(''); }}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecionar unidade de origem" />
                          </SelectTrigger>
                          <SelectContent>
                            {(lotacoes || []).map((lot) => (
                              <SelectItem key={lot.id} value={lot.unidade_id}>
                                {lot.unidade?.nome || 'Unidade desconhecida'} ({lot.quantidade} un.)
                              </SelectItem>
                            ))}
                            {/* For patrimonial items with unidade_atual but no lotação */}
                            {isPatrimonial && item.unidade_atual_id && !(lotacoes || []).some(l => l.unidade_id === item.unidade_atual_id) && (
                              <SelectItem value={item.unidade_atual_id}>
                                {item.unidade_atual?.nome || 'Unidade'} (1 un.)
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <Separator />

                      {/* Destino */}
                      <div>
                        <Label>Destino</Label>
                        <RadioGroup value={liberarDestino} onValueChange={(v) => setLiberarDestino(v as any)} className="mt-2 space-y-2">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="estoque_geral" id="dest_estoque" />
                            <Label htmlFor="dest_estoque" className="font-normal cursor-pointer">Voltar para Estoque Geral</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="transferir" id="dest_transferir" />
                            <Label htmlFor="dest_transferir" className="font-normal cursor-pointer">Transferir para outra Unidade</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* Unidade destino (if transferir) */}
                      {liberarDestino === 'transferir' && (
                        <div className="space-y-3 pl-6 border-l-2 border-primary/20">
                          <div>
                            <Label>Unidade de Destino</Label>
                            <Select value={liberarUnidadeDestinoId} onValueChange={setLiberarUnidadeDestinoId}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Selecione a unidade" />
                              </SelectTrigger>
                              <SelectContent>
                                {unidadesDisponiveis.map((u) => (
                                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Local Específico</Label>
                            <Input
                              value={liberarLocalEspecifico}
                              onChange={(e) => setLiberarLocalEspecifico(e.target.value)}
                              placeholder="Ex: Sala de Vacina"
                              className="mt-1"
                            />
                          </div>
                        </div>
                      )}

                      {/* Quantidade (for non-patrimonial items) */}
                      {!isPatrimonial && liberarOrigemId && (
                        <div>
                          <Label>Quantidade a liberar (máx: {maxQuantidade})</Label>
                          <Input
                            type="number"
                            min={1}
                            max={maxQuantidade}
                            value={liberarQuantidade}
                            onChange={(e) => setLiberarQuantidade(e.target.value)}
                            placeholder={`Máx: ${maxQuantidade}`}
                            className="mt-1"
                          />
                        </div>
                      )}

                      {/* Data */}
                      <div>
                        <Label>Data da Movimentação</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !liberarData && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {liberarData ? format(liberarData, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={liberarData}
                              onSelect={(d) => d && setLiberarData(d)}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Descrição */}
                      <div>
                        <Label>Descrição da Movimentação</Label>
                        <Textarea
                          value={liberarDescricao}
                          onChange={(e) => setLiberarDescricao(e.target.value)}
                          placeholder="Motivo ou observação..."
                          className="mt-1"
                          rows={2}
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => { setLiberarDialogOpen(false); resetLiberarForm(); }}>
                        Cancelar
                      </Button>
                      <Button onClick={handleLiberar} disabled={isLiberando}>
                        {isLiberando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unlock className="w-4 h-4 mr-2" />}
                        Confirmar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {/* ADICIONAR PATRIMÔNIO */}
              {canAddPatrimonio && (
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
                        Converta unidades deste lote em itens individuais com número de patrimônio.
                        Disponível: {item.quantidade_total} unidade(s).
                      </DialogDescription>
                    </DialogHeader>

                    {/* Info atual */}
                    {item.unidade_atual_id && (
                      <div className="rounded-md bg-muted/50 p-3 space-y-1 text-sm">
                        <p className="text-muted-foreground">Os novos itens patrimoniais manterão:</p>
                        <p className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-medium">{item.unidade_atual?.nome || 'Estoque Central'}</span>
                        </p>
                        {item.local_especifico && (
                          <p className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="font-medium">{item.local_especifico}</span>
                          </p>
                        )}
                      </div>
                    )}

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
                    {patrimonioInputs.length < (item.quantidade_total || 0) && (
                      <Button type="button" variant="outline" size="sm" onClick={addPatrimonioField}>
                        <Plus className="w-3 h-3 mr-1" />
                        Adicionar mais
                      </Button>
                    )}
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={handleConverter} disabled={isConverting}>
                        {isConverting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Converter
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informações do Item */}
          <FadeIn delay={0.1} className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações do Item</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Produto</p>
                    <p className="font-medium">{item.produto?.nome}</p>
                    {item.produto?.categoria && (
                      <p className="text-sm text-muted-foreground">{item.produto.categoria}</p>
                    )}
                  </div>
                </div>

                <Separator />

                {isPatrimonial && item.numero_patrimonio && (
                  <>
                    <div className="flex items-start gap-3">
                      <Hash className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Patrimônio</p>
                        <p className="font-medium font-mono">{item.numero_patrimonio}</p>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {!isPatrimonial && (
                  <>
                    <div className="flex items-start gap-3">
                      <Layers className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Quantidade Total</p>
                        <p className="font-medium">{item.quantidade_total} unidade(s)</p>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Unidades Atuais - dynamic from lotações */}
                {!isPatrimonial && (lotacoes || []).length > 0 ? (
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="w-full">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Unidades Atuais</p>
                      <div className="space-y-2">
                        {(lotacoes || []).map((lot) => (
                          <div key={lot.id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="font-medium">{lot.unidade?.nome || 'Desconhecida'}</span>
                              {lot.local_especifico && (
                                <span className="text-muted-foreground text-xs">({lot.local_especifico})</span>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-xs">{lot.quantidade} un.</Badge>
                          </div>
                        ))}
                        {/* Estoque Geral = quantidade_total - soma das lotações */}
                        {(() => {
                          const totalLotado = (lotacoes || []).reduce((sum, l) => sum + l.quantidade, 0);
                          const estoqueGeral = (item.quantidade_total || 0) - totalLotado;
                          if (estoqueGeral > 0) {
                            return (
                              <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <Package className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="font-medium">Estoque Geral</span>
                                </div>
                                <Badge variant="outline" className="text-xs">{estoqueGeral} un.</Badge>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Localização Atual</p>
                        <p className="font-medium">
                          {item.unidade_atual?.nome || 'Estoque Central'}
                        </p>
                      </div>
                    </div>
                    {item.local_especifico && (
                      <>
                        <Separator />
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Local Específico</p>
                            <p className="font-medium">{item.local_especifico}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                <Separator />

                <div className="flex items-start gap-3">
                  <CalendarIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Data de Entrada</p>
                    <p className="font-medium">
                      {format(new Date(item.data_entrada), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Responsável pela Entrada</p>
                    <p className="font-medium">
                      {item.responsavel_entrada?.nome || item.responsavel_entrada?.email || 'Não identificado'}
                    </p>
                  </div>
                </div>

                {item.observacao_entrada && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Observação</p>
                        <p className="text-sm">{item.observacao_entrada}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
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
                  Registro automático de todas as movimentações deste item
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
                    <div className="space-y-4">
                      {movimentacoes.map((mov) => {
                        const tipoConfig = tipoMovimentacaoConfig[mov.tipo] || { label: mov.tipo, icon: FileText, color: 'text-muted-foreground' };
                        const TipoIcon = tipoConfig.icon;
                        
                        return (
                          <Collapsible key={mov.id}>
                            <div className="relative pl-10">
                              <div className={`absolute left-0 w-8 h-8 rounded-full bg-background border-2 flex items-center justify-center ${tipoConfig.color}`}>
                                <TipoIcon className="w-4 h-4" />
                              </div>
                              <CollapsibleTrigger asChild>
                                <button className="w-full bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors text-left group">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-semibold ${tipoConfig.color}`}>
                                        {tipoConfig.label}
                                      </span>
                                      {mov.quantidade_movimentada && (
                                        <Badge variant="secondary" className="text-xs font-medium">
                                          {mov.quantidade_movimentada} un.
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">
                                        {format(new Date(mov.data_movimentacao), "dd/MM/yyyy", { locale: ptBR })}
                                      </span>
                                      <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                                    </div>
                                  </div>
                                </button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="bg-muted/20 rounded-b-lg px-4 py-3 -mt-1 border-t border-border/50 space-y-1.5 text-sm">
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(mov.data_movimentacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </p>
                                  {mov.quantidade_movimentada && (
                                    <p>
                                      <span className="text-muted-foreground">Quantidade:</span>{' '}
                                      <span className="font-semibold">{mov.quantidade_movimentada} unidade(s)</span>
                                    </p>
                                  )}
                                  {mov.unidade_origem && (
                                    <p>
                                      <span className="text-muted-foreground">Origem:</span>{' '}
                                      <span className="font-medium">{mov.unidade_origem.nome}</span>
                                    </p>
                                  )}
                                  {mov.unidade_destino && (
                                    <p>
                                      <span className="text-muted-foreground">Destino:</span>{' '}
                                      <span className="font-medium">{mov.unidade_destino.nome}</span>
                                    </p>
                                  )}
                                  {!mov.unidade_destino && mov.tipo === 'liberacao' && (
                                    <p>
                                      <span className="text-muted-foreground">Destino:</span>{' '}
                                      <span className="font-medium">Estoque Geral</span>
                                    </p>
                                  )}
                                  {mov.local_especifico && (
                                    <p className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-muted-foreground" />
                                      <span className="text-muted-foreground">Local:</span>{' '}
                                      <span className="font-medium">{mov.local_especifico}</span>
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
                                      <p className="text-xs text-muted-foreground mb-1">Descrição:</p>
                                      <p className="text-sm">{mov.observacao}</p>
                                    </div>
                                  )}
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
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
