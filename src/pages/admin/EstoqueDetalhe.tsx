import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useEstoqueItemById, useEstoqueMovimentacoes, useConverterParaPatrimonial, useVerificarPatrimonio } from '@/hooks/useEstoque';
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
  Calendar,
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
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const statusConfig = {
  disponivel: { label: 'Disponível', color: 'bg-green-100 text-green-700 border-green-300' },
  em_uso: { label: 'Em Uso', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  baixa: { label: 'Baixa', color: 'bg-red-100 text-red-700 border-red-300' },
};

const tipoMovimentacaoConfig = {
  entrada: { label: 'Entrada', icon: ArrowDownToLine, color: 'text-green-600' },
  saida: { label: 'Saída', icon: ArrowUpFromLine, color: 'text-blue-600' },
  devolucao: { label: 'Devolução', icon: ArrowDownToLine, color: 'text-orange-600' },
  baixa: { label: 'Baixa', icon: FileText, color: 'text-red-600' },
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
  const converterParaPatrimonial = useConverterParaPatrimonial();
  const verificarPatrimonio = useVerificarPatrimonio();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [patrimonioInputs, setPatrimonioInputs] = React.useState<PatrimonioInput[]>([{ value: '', isValid: null, isChecking: false }]);
  const [isConverting, setIsConverting] = React.useState(false);

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

                <Separator />

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
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
                    <div className="space-y-6">
                      {movimentacoes.map((mov) => {
                        const tipoConfig = tipoMovimentacaoConfig[mov.tipo as keyof typeof tipoMovimentacaoConfig];
                        const TipoIcon = tipoConfig?.icon || FileText;
                        
                        return (
                          <div key={mov.id} className="relative pl-10">
                            <div className={`absolute left-0 w-8 h-8 rounded-full bg-background border-2 flex items-center justify-center ${tipoConfig?.color || 'text-muted-foreground'}`}>
                              <TipoIcon className="w-4 h-4" />
                            </div>
                            <div className="bg-muted/30 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className={`font-semibold ${tipoConfig?.color}`}>
                                  {tipoConfig?.label || mov.tipo}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(mov.data_movimentacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                              
                              <div className="space-y-1 text-sm">
                                {mov.unidade_destino && (
                                  <p>
                                    <span className="text-muted-foreground">Destino:</span>{' '}
                                    <span className="font-medium">{mov.unidade_destino.nome}</span>
                                  </p>
                                )}
                                {mov.unidade_origem && (
                                  <p>
                                    <span className="text-muted-foreground">Origem:</span>{' '}
                                    <span className="font-medium">{mov.unidade_origem.nome}</span>
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
                                    <p className="text-xs text-muted-foreground mb-1">Descrição da movimentação:</p>
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
