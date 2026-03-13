import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useEstoqueItens, useRegistrarManutencao, useRetornarManutencao, useSalas } from '@/hooks/useEstoque';
import { useUnidades } from '@/hooks/useUnidades';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FadeIn } from '@/components/animations';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Wrench,
  CalendarIcon,
  Loader2,
  Package,
  Search,
  RotateCcw,
  Building2,
  MapPin,
  Box,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function EstoqueManutencao() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState('enviar');

  const { data: itensEmUso, isLoading: loadingEmUso } = useEstoqueItens({ status: 'em_uso' });
  const { data: itensDisponiveis } = useEstoqueItens({ status: 'disponivel' });
  const { data: itensManutencao, isLoading: loadingManut } = useEstoqueItens({ status: 'manutencao' as any });
  const { data: unidades } = useUnidades();
  const registrarManutencao = useRegistrarManutencao();
  const retornarManutencao = useRetornarManutencao();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedItemId, setSelectedItemId] = React.useState('');
  const [data, setData] = React.useState<Date>(new Date());
  const [observacao, setObservacao] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Retorno fields
  const [destino, setDestino] = React.useState<'estoque_central' | 'unidade'>('estoque_central');
  const [unidadeDestinoId, setUnidadeDestinoId] = React.useState('');
  const [salaDestinoId, setSalaDestinoId] = React.useState('');

  const { data: salasDestino } = useSalas(unidadeDestinoId || undefined);

  // Items que podem ir para manutenção: em_uso + disponível
  const itensParaManutencao = React.useMemo(() => {
    return [...(itensEmUso || []), ...(itensDisponiveis || [])];
  }, [itensEmUso, itensDisponiveis]);

  const itensAtuais = activeTab === 'enviar' ? itensParaManutencao : itensManutencao;
  const loadingItens = activeTab === 'enviar' ? loadingEmUso : loadingManut;

  const itensFiltrados = React.useMemo(() => {
    if (!itensAtuais) return [];
    if (!searchTerm) return itensAtuais;
    const termo = searchTerm.toLowerCase();
    return itensAtuais.filter(
      (item) =>
        item.produto?.nome?.toLowerCase().includes(termo) ||
        item.numero_patrimonio?.toLowerCase().includes(termo)
    );
  }, [itensAtuais, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      toast.error('Selecione um equipamento');
      return;
    }

    setIsSubmitting(true);
    try {
      if (activeTab === 'enviar') {
        await registrarManutencao.mutateAsync({
          itemId: selectedItemId,
          dataManutencao: data.toISOString(),
          observacao: observacao || undefined,
        });
      } else {
        if (destino === 'unidade' && !unidadeDestinoId) {
          toast.error('Selecione a unidade de destino');
          setIsSubmitting(false);
          return;
        }
        await retornarManutencao.mutateAsync({
          itemId: selectedItemId,
          dataRetorno: data.toISOString(),
          observacao: observacao || undefined,
          destino,
          unidadeDestinoId: destino === 'unidade' ? unidadeDestinoId : undefined,
          salaDestinoId: destino === 'unidade' ? (salaDestinoId || undefined) : undefined,
        });
      }
      navigate('/admin/estoque');
    } catch {
      // Error handled in hook
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
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedItemId(''); setSearchTerm(''); setDestino('estoque_central'); setUnidadeDestinoId(''); setSalaDestinoId(''); }}>
            <TabsList className="mb-4">
              <TabsTrigger value="enviar">Enviar para Manutenção</TabsTrigger>
              <TabsTrigger value="retornar">Retornar da Manutenção</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              <form onSubmit={handleSubmit}>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {activeTab === 'enviar' ? 'Enviar para Manutenção' : 'Retornar da Manutenção'}
                    </CardTitle>
                    <CardDescription>
                      {activeTab === 'enviar'
                        ? 'Selecione o equipamento que será enviado para manutenção'
                        : 'Selecione o equipamento e defina para onde ele retorna'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Search */}
                    <div className="space-y-2">
                      <Label>Buscar Equipamento</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar..." className="pl-10" />
                      </div>
                    </div>

                    {/* Item list */}
                    <div className="space-y-2">
                      <Label>Selecione o Equipamento *</Label>
                      {loadingItens ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : itensFiltrados.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          {activeTab === 'enviar' ? 'Nenhum equipamento disponível.' : 'Nenhum equipamento em manutenção.'}
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                          {itensFiltrados.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => setSelectedItemId(item.id)}
                              className={cn(
                                'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border',
                                selectedItemId === item.id ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50'
                              )}
                            >
                              <Package className="w-5 h-5 text-muted-foreground" />
                              <div className="flex-1">
                                <p className="font-medium">{item.produto?.nome}</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.controle_patrimonial ? `#${item.numero_patrimonio}` : `Qtd: ${item.quantidade_total}`}
                                  {item.unidade_atual?.nome && ` · ${item.unidade_atual.nome}`}
                                  {!item.unidade_atual_id && ' · Estoque Central'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Destino (apenas para retorno) */}
                    {activeTab === 'retornar' && selectedItemId && (
                      <>
                        <div className="space-y-3">
                          <Label>Para onde o equipamento retorna? *</Label>
                          <RadioGroup value={destino} onValueChange={(v) => { setDestino(v as any); setUnidadeDestinoId(''); setSalaDestinoId(''); }}>
                            <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                              <RadioGroupItem value="estoque_central" id="central" />
                              <Label htmlFor="central" className="flex items-center gap-2 cursor-pointer flex-1">
                                <Box className="w-4 h-4" />
                                Estoque Central (disponível)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
                              <RadioGroupItem value="unidade" id="unidade" />
                              <Label htmlFor="unidade" className="flex items-center gap-2 cursor-pointer flex-1">
                                <Building2 className="w-4 h-4" />
                                Unidade de Saúde (em uso)
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {destino === 'unidade' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Unidade de Destino *</Label>
                              <Select value={unidadeDestinoId} onValueChange={(v) => { setUnidadeDestinoId(v); setSalaDestinoId(''); }}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a unidade" />
                                </SelectTrigger>
                                <SelectContent>
                                  {unidades?.map((u) => (
                                    <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {unidadeDestinoId && (
                              <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  Sala de Destino
                                </Label>
                                <Select value={salaDestinoId} onValueChange={setSalaDestinoId}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sala (opcional)" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {salasDestino?.map((s) => (
                                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {/* Data */}
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

                    {/* Observação */}
                    <div className="space-y-2">
                      <Label>Observação</Label>
                      <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Motivo ou detalhes..." rows={3} />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => navigate('/admin/estoque')} disabled={isSubmitting} className="flex-1">
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isSubmitting || !selectedItemId} className="flex-1">
                        {isSubmitting ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Registrando...</>
                        ) : activeTab === 'enviar' ? (
                          <><Wrench className="w-4 h-4 mr-2" />Enviar para Manutenção</>
                        ) : (
                          <><RotateCcw className="w-4 h-4 mr-2" />Retornar da Manutenção</>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </form>
            </TabsContent>
          </Tabs>
        </FadeIn>
      </div>
    </Layout>
  );
}
