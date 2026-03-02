import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useEstoqueItens, useRegistrarSaida } from '@/hooks/useEstoque';
import { useUnidades } from '@/hooks/useUnidades';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FadeIn } from '@/components/animations';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowUpFromLine,
  CalendarIcon,
  Loader2,
  Package,
  Building2,
  Hash,
  Search,
  MapPin,
  Layers,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function EstoqueSaida() {
  const navigate = useNavigate();
  const { data: itensDisponiveis, isLoading: loadingItens, error: errorItens } = useEstoqueItens({ status: 'disponivel' });
  const { data: unidades, isLoading: loadingUnidades, error: errorUnidades } = useUnidades();
  const registrarSaida = useRegistrarSaida();

  // Debug logging
  React.useEffect(() => {
    console.log('[EstoqueSaida] Rendered', { 
      itensDisponiveis: itensDisponiveis?.length, 
      loadingItens, 
      errorItens,
      unidades: unidades?.length, 
      loadingUnidades,
      errorUnidades 
    });
  }, [itensDisponiveis, loadingItens, errorItens, unidades, loadingUnidades, errorUnidades]);

  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedItemId, setSelectedItemId] = React.useState('');
  const [unidadeDestinoId, setUnidadeDestinoId] = React.useState('');
  const [dataSaida, setDataSaida] = React.useState<Date>(new Date());
  const [observacao, setObservacao] = React.useState('');
  const [localEspecifico, setLocalEspecifico] = React.useState('');
  const [quantidadeSaida, setQuantidadeSaida] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const itensFiltrados = React.useMemo(() => {
    if (!itensDisponiveis) return [];
    if (!searchTerm) return itensDisponiveis;

    const termo = searchTerm.toLowerCase();
    return itensDisponiveis.filter(
      (item) =>
        item.produto?.nome?.toLowerCase().includes(termo) ||
        item.numero_patrimonio?.toLowerCase().includes(termo)
    );
  }, [itensDisponiveis, searchTerm]);

  const selectedItem = itensDisponiveis?.find((i) => i.id === selectedItemId);
  const isPatrimonial = selectedItem?.controle_patrimonial ?? false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedItemId) return;
    if (!unidadeDestinoId) return;

    // Validar quantidade para itens sem patrimônio
    if (selectedItem && !isPatrimonial) {
      const qtd = parseInt(quantidadeSaida) || 0;
      if (qtd < 1) {
        toast.error('Informe uma quantidade válida');
        return;
      }
      if (qtd > (selectedItem.quantidade_total || 0)) {
        toast.error(`Quantidade máxima disponível: ${selectedItem.quantidade_total}`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await registrarSaida.mutateAsync({
        itemId: selectedItemId,
        unidadeDestinoId,
        dataSaida: dataSaida.toISOString(),
        observacao: observacao || undefined,
        localEspecifico: localEspecifico || undefined,
        quantidadeSaida: isPatrimonial ? undefined : parseInt(quantidadeSaida) || 1,
      });

      navigate('/admin/estoque');
    } catch {
      // Erro já tratado no hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        <FadeIn>
          <Button variant="ghost" onClick={() => navigate('/admin/estoque')} className="gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <ArrowUpFromLine className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Saída de Produtos</h1>
              <p className="text-muted-foreground">Registre a saída de itens para as unidades</p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Dados da Saída</CardTitle>
                <CardDescription>Selecione o item e a unidade de destino</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Busca de Item */}
                <div className="space-y-2">
                  <Label>Buscar Produto/Equipamento *</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por nome ou número de patrimônio..."
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Lista de Itens */}
                <div className="space-y-2">
                  <Label>Selecione o Item *</Label>
                  {loadingItens ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : itensFiltrados.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchTerm
                        ? 'Nenhum item encontrado com esses termos.'
                        : 'Não há itens disponíveis no estoque.'}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                      {itensFiltrados.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setSelectedItemId(item.id);
                            setQuantidadeSaida('');
                          }}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border',
                            selectedItemId === item.id
                              ? 'border-primary bg-primary/5'
                              : 'border-transparent hover:bg-muted/50'
                          )}
                        >
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <Package className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{item.produto?.nome}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {item.controle_patrimonial && item.numero_patrimonio ? (
                                <span className="flex items-center gap-1">
                                  <Hash className="w-3 h-3" />
                                  {item.numero_patrimonio}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Layers className="w-3 h-3" />
                                  Qtd disponível: {item.quantidade_total}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Item Selecionado */}
                {selectedItem && (
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm text-muted-foreground mb-1">Item selecionado:</p>
                    <p className="font-semibold">{selectedItem.produto?.nome}</p>
                    {selectedItem.controle_patrimonial && selectedItem.numero_patrimonio && (
                      <p className="text-sm text-muted-foreground">
                        Patrimônio: {selectedItem.numero_patrimonio}
                      </p>
                    )}
                    {!selectedItem.controle_patrimonial && (
                      <p className="text-sm text-muted-foreground">
                        Quantidade disponível: {selectedItem.quantidade_total}
                      </p>
                    )}
                  </div>
                )}

                {/* Quantidade a retirar (apenas para itens sem patrimônio) */}
                {selectedItem && !isPatrimonial && (
                  <div className="space-y-2">
                    <Label htmlFor="qtd-saida">Quantidade a Retirar *</Label>
                    <Input
                      id="qtd-saida"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={quantidadeSaida}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setQuantidadeSaida(val);
                      }}
                      placeholder={`Máximo: ${selectedItem.quantidade_total}`}
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Disponível: {selectedItem.quantidade_total} unidade(s)
                    </p>
                  </div>
                )}

                {/* Unidade de Destino */}
                <div className="space-y-2">
                  <Label>Unidade de Destino *</Label>
                  <Select value={unidadeDestinoId} onValueChange={setUnidadeDestinoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade de destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingUnidades ? (
                        <div className="p-2 text-center text-muted-foreground">Carregando...</div>
                      ) : unidades && unidades.length > 0 ? (
                        unidades.map((unidade) => (
                          <SelectItem key={unidade.id} value={unidade.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4" />
                              {unidade.nome}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-center text-muted-foreground">
                          Nenhuma unidade cadastrada
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Local Específico */}
                <div className="space-y-2">
                  <Label htmlFor="local-especifico" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Local Específico
                  </Label>
                  <Input
                    id="local-especifico"
                    value={localEspecifico}
                    onChange={(e) => setLocalEspecifico(e.target.value)}
                    placeholder="Ex: Sala de Vacina, Consultório 2..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Informe o local detalhado dentro da unidade (opcional)
                  </p>
                </div>

                {/* Data de Saída */}
                <div className="space-y-2">
                  <Label>Data de Saída *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !dataSaida && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataSaida ? (
                          format(dataSaida, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                        ) : (
                          <span>Selecione a data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dataSaida}
                        onSelect={(date) => date && setDataSaida(date)}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Descrição da Saída */}
                <div className="space-y-2">
                  <Label htmlFor="observacao">Descrição da Saída</Label>
                  <Textarea
                    id="observacao"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Ex: Enviado para sala de vacina para uso no sistema e-SUS..."
                    rows={3}
                  />
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/admin/estoque')}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !selectedItemId || !unidadeDestinoId}
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      <>
                        <ArrowUpFromLine className="w-4 h-4 mr-2" />
                        Registrar Saída
                      </>
                    )}
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
