import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useEstoqueItensParaBaixa, useRegistrarBaixa } from '@/hooks/useEstoque';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FadeIn } from '@/components/animations';
import {
  XCircle,
  Search,
  Loader2,
  Package,
  Hash,
  Building2,
  CalendarIcon,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { EstoqueItemWithRelations } from '@/types/estoque';

const statusConfig = {
  disponivel: { label: 'Disponível', color: 'bg-green-100 text-green-700 border-green-300' },
  em_uso: { label: 'Em Uso', color: 'bg-blue-100 text-blue-700 border-blue-300' },
};

export default function EstoqueBaixa() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<EstoqueItemWithRelations | null>(null);
  const [dataBaixa, setDataBaixa] = useState<Date | undefined>(new Date());
  const [motivo, setMotivo] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { data: itens, isLoading } = useEstoqueItensParaBaixa(searchTerm);
  const registrarBaixa = useRegistrarBaixa();

  const handleSelectItem = (item: EstoqueItemWithRelations) => {
    setSelectedItem(item);
  };

  const handleConfirmBaixa = async () => {
    if (!selectedItem || !dataBaixa) {
      toast.error('Selecione um equipamento e a data da baixa.');
      return;
    }

    try {
      await registrarBaixa.mutateAsync({
        itemId: selectedItem.id,
        dataBaixa: dataBaixa.toISOString(),
        motivo: motivo.trim() || undefined,
      });
      navigate('/admin/estoque');
    } catch (error) {
      // Error is handled in the mutation
    }
    setShowConfirmDialog(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      toast.error('Selecione um equipamento para baixa.');
      return;
    }
    if (!dataBaixa) {
      toast.error('Informe a data da baixa.');
      return;
    }
    setShowConfirmDialog(true);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <FadeIn>
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/estoque')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <XCircle className="w-7 h-7 text-destructive" />
                Baixa de Equipamento
              </h1>
              <p className="text-muted-foreground">
                Registrar baixa definitiva de equipamento do estoque
              </p>
            </div>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna da Busca */}
          <FadeIn delay={0.1}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Buscar Equipamento</CardTitle>
                <CardDescription>
                  Busque por número de patrimônio ou nome do equipamento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Digite patrimônio ou nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : !itens || itens.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>
                        {searchTerm
                          ? 'Nenhum equipamento encontrado com esse termo.'
                          : 'Nenhum equipamento disponível para baixa.'}
                      </p>
                    </div>
                  ) : (
                    itens.map((item) => {
                      const config = statusConfig[item.status as keyof typeof statusConfig];
                      const isSelected = selectedItem?.id === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectItem(item)}
                          className={cn(
                            'p-3 rounded-lg border cursor-pointer transition-all',
                            isSelected
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'hover:bg-muted/50'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Package className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {item.produto?.nome || 'Produto'}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {item.numero_patrimonio && (
                                    <span className="flex items-center gap-1">
                                      <Hash className="w-3 h-3" />
                                      {item.numero_patrimonio}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Badge className={cn('text-xs', config?.color)}>
                              {config?.label}
                            </Badge>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          {/* Coluna do Formulário */}
          <FadeIn delay={0.2}>
            <form onSubmit={handleSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detalhes da Baixa</CardTitle>
                  <CardDescription>
                    Preencha os dados para registrar a baixa
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Item Selecionado */}
                  {selectedItem ? (
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Equipamento Selecionado
                      </Label>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">
                            {selectedItem.produto?.nome || 'Produto'}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            {selectedItem.numero_patrimonio && (
                              <span className="flex items-center gap-1">
                                <Hash className="w-3 h-3" />
                                {selectedItem.numero_patrimonio}
                              </span>
                            )}
                            {selectedItem.unidade_atual && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {selectedItem.unidade_atual.nome}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border border-dashed text-center">
                      <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        Selecione um equipamento na lista ao lado
                      </p>
                    </div>
                  )}

                  {/* Data da Baixa */}
                  <div className="space-y-2">
                    <Label htmlFor="data-baixa">Data da Baixa *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !dataBaixa && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dataBaixa ? (
                            format(dataBaixa, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                          ) : (
                            'Selecione a data'
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dataBaixa}
                          onSelect={setDataBaixa}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Motivo */}
                  <div className="space-y-2">
                    <Label htmlFor="motivo">Motivo da Baixa (opcional)</Label>
                    <Textarea
                      id="motivo"
                      placeholder="Ex: Equipamento danificado, obsoleto, perda..."
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Aviso */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">Ação irreversível</p>
                      <p className="text-amber-700">
                        A baixa remove definitivamente o equipamento do sistema. Esta ação não
                        pode ser desfeita.
                      </p>
                    </div>
                  </div>

                  {/* Botões */}
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate('/admin/estoque')}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      variant="destructive"
                      className="flex-1"
                      disabled={!selectedItem || !dataBaixa || registrarBaixa.isPending}
                    >
                      {registrarBaixa.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" />
                      )}
                      Registrar Baixa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </FadeIn>
        </div>

        {/* Dialog de Confirmação */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Confirmar Baixa de Equipamento
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>Você está prestes a realizar a baixa do seguinte equipamento:</p>
                <div className="p-3 rounded-lg bg-muted my-3">
                  <p className="font-semibold">{selectedItem?.produto?.nome}</p>
                  {selectedItem?.numero_patrimonio && (
                    <p className="text-sm text-muted-foreground">
                      Patrimônio: {selectedItem.numero_patrimonio}
                    </p>
                  )}
                </div>
                <p className="font-medium text-destructive">
                  Esta ação é irreversível. O equipamento será removido definitivamente do
                  sistema e não poderá mais ser utilizado em movimentações.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmBaixa}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Confirmar Baixa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}