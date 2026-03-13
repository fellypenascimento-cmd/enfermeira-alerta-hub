import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useEstoqueItens, useRegistrarTransferencia, useSalas } from '@/hooks/useEstoque';
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
  ArrowLeftRight,
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

export default function EstoqueTransferencia() {
  const navigate = useNavigate();
  const { data: itensEmUso, isLoading: loadingItens } = useEstoqueItens({ status: 'em_uso' });
  const { data: unidades } = useUnidades();
  const registrarTransferencia = useRegistrarTransferencia();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedItemId, setSelectedItemId] = React.useState('');
  const [unidadeOrigemId, setUnidadeOrigemId] = React.useState('');
  const [salaOrigemId, setSalaOrigemId] = React.useState('');
  const [unidadeDestinoId, setUnidadeDestinoId] = React.useState('');
  const [salaDestinoId, setSalaDestinoId] = React.useState('');
  const [dataTransferencia, setDataTransferencia] = React.useState<Date>(new Date());
  const [observacao, setObservacao] = React.useState('');
  const [quantidade, setQuantidade] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { data: salasOrigem } = useSalas(unidadeOrigemId || undefined);
  const { data: salasDestino } = useSalas(unidadeDestinoId || undefined);

  const itensFiltrados = React.useMemo(() => {
    if (!itensEmUso) return [];
    if (!searchTerm) return itensEmUso;
    const termo = searchTerm.toLowerCase();
    return itensEmUso.filter(
      (item) =>
        item.produto?.nome?.toLowerCase().includes(termo) ||
        item.numero_patrimonio?.toLowerCase().includes(termo)
    );
  }, [itensEmUso, searchTerm]);

  const selectedItem = itensEmUso?.find((i) => i.id === selectedItemId);
  const isPatrimonial = selectedItem?.controle_patrimonial ?? false;

  // Auto-fill origin when selecting an item
  React.useEffect(() => {
    if (selectedItem?.unidade_atual_id) {
      setUnidadeOrigemId(selectedItem.unidade_atual_id);
      setSalaOrigemId(selectedItem.sala_id || '');
    }
  }, [selectedItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedItemId || !unidadeOrigemId || !unidadeDestinoId) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!isPatrimonial) {
      const qtd = parseInt(quantidade) || 0;
      if (qtd < 1) {
        toast.error('Informe uma quantidade válida');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await registrarTransferencia.mutateAsync({
        itemId: selectedItemId,
        unidadeOrigemId,
        salaOrigemId: salaOrigemId || undefined,
        unidadeDestinoId,
        salaDestinoId: salaDestinoId || undefined,
        dataTransferencia: dataTransferencia.toISOString(),
        observacao: observacao || undefined,
        quantidade: isPatrimonial ? 1 : parseInt(quantidade) || 1,
      });
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
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <ArrowLeftRight className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Transferência</h1>
              <p className="text-muted-foreground">Transferir equipamento entre unidades</p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Dados da Transferência</CardTitle>
                <CardDescription>Selecione o item, origem e destino</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search */}
                <div className="space-y-2">
                  <Label>Buscar Equipamento *</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nome ou patrimônio..." className="pl-10" />
                  </div>
                </div>

                {/* Item list */}
                <div className="space-y-2">
                  <Label>Selecione o Item *</Label>
                  {loadingItens ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : itensFiltrados.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'Nenhum item encontrado.' : 'Não há itens em uso para transferir.'}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                      {itensFiltrados.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => { setSelectedItemId(item.id); setQuantidade(''); }}
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
                              {' · '}{item.unidade_atual?.nome || 'Sem unidade'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quantidade (non-patrimonial) */}
                {selectedItem && !isPatrimonial && (
                  <div className="space-y-2">
                    <Label>Quantidade a Transferir *</Label>
                    <Input
                      type="text" inputMode="numeric" pattern="[0-9]*"
                      value={quantidade}
                      onChange={(e) => setQuantidade(e.target.value.replace(/\D/g, ''))}
                      placeholder="Quantidade"
                    />
                  </div>
                )}

                {/* Origem */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unidade de Origem</Label>
                    <Select value={unidadeOrigemId} onValueChange={(v) => { setUnidadeOrigemId(v); setSalaOrigemId(''); }}>
                      <SelectTrigger><SelectValue placeholder="Origem" /></SelectTrigger>
                      <SelectContent>
                        {unidades && unidades.length > 0 ? (
                          unidades.map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__empty" disabled>Nenhuma unidade</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  {unidadeOrigemId && (
                    <div className="space-y-2">
                      <Label>Sala de Origem</Label>
                      <Select value={salaOrigemId} onValueChange={setSalaOrigemId}>
                        <SelectTrigger><SelectValue placeholder="Sala (opcional)" /></SelectTrigger>
                        <SelectContent>
                          {salasOrigem && salasOrigem.length > 0 ? (
                            salasOrigem.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                            ))
                          ) : (
                            <SelectItem value="__empty" disabled>Nenhuma sala</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Destino */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unidade de Destino *</Label>
                    <Select value={unidadeDestinoId} onValueChange={(v) => { setUnidadeDestinoId(v); setSalaDestinoId(''); }}>
                      <SelectTrigger><SelectValue placeholder="Destino" /></SelectTrigger>
                      <SelectContent>
                        {unidades && unidades.length > 0 ? (
                          unidades.map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__empty" disabled>Nenhuma unidade</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  {unidadeDestinoId && (
                    <div className="space-y-2">
                      <Label>Sala de Destino</Label>
                      <Select value={salaDestinoId} onValueChange={setSalaDestinoId}>
                        <SelectTrigger><SelectValue placeholder="Sala (opcional)" /></SelectTrigger>
                        <SelectContent>
                          {salasDestino && salasDestino.length > 0 ? (
                            salasDestino.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                            ))
                          ) : (
                            <SelectItem value="__empty" disabled>Nenhuma sala</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Data */}
                <div className="space-y-2">
                  <Label>Data da Transferência *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(dataTransferencia, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dataTransferencia} onSelect={(d) => d && setDataTransferencia(d)} locale={ptBR} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Observação */}
                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Motivo da transferência..." rows={3} />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => navigate('/admin/estoque')} disabled={isSubmitting} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !selectedItemId || !unidadeDestinoId} className="flex-1">
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
