import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useProdutos, useCreateProduto, useCreateEstoqueItem, useVerificarPatrimonio } from '@/hooks/useEstoque';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FadeIn } from '@/components/animations';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowDownToLine,
  CalendarIcon,
  Loader2,
  Plus,
  AlertTriangle,
  CheckCircle2,
  X,
  Hash,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PatrimonioField {
  value: string;
  isValid: boolean | null;
  isChecking: boolean;
}

export default function EstoqueEntrada() {
  const navigate = useNavigate();
  const { data: produtos, isLoading: loadingProdutos } = useProdutos();
  const createProduto = useCreateProduto();
  const createEstoqueItem = useCreateEstoqueItem();
  const verificarPatrimonio = useVerificarPatrimonio();

  const [produtoId, setProdutoId] = React.useState('');
  const [novoProdutoNome, setNovoProdutoNome] = React.useState('');
  const [quantidade, setQuantidade] = React.useState('');
  const [possuiPatrimonio, setPossuiPatrimonio] = React.useState(false);
  const [patrimonios, setPatrimonios] = React.useState<PatrimonioField[]>([]);
  const [dataEntrada, setDataEntrada] = React.useState<Date>(new Date());
  const [observacao, setObservacao] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showNovoProduto, setShowNovoProduto] = React.useState(false);

  // Atualiza campos de patrimônio quando quantidade ou switch muda
  React.useEffect(() => {
    const qtd = parseInt(quantidade) || 0;
    if (possuiPatrimonio && qtd > 0) {
      const newPatrimonios = Array.from({ length: qtd }, (_, i) => ({
        value: patrimonios[i]?.value || '',
        isValid: patrimonios[i]?.isValid ?? null,
        isChecking: false,
      }));
      setPatrimonios(newPatrimonios);
    } else {
      setPatrimonios([]);
    }
  }, [quantidade, possuiPatrimonio]);

  const handlePatrimonioChange = async (index: number, value: string) => {
    const newPatrimonios = [...patrimonios];
    newPatrimonios[index] = { value, isValid: null, isChecking: true };
    setPatrimonios(newPatrimonios);

    if (value.trim()) {
      // Verificar duplicata local
      const duplicataLocal = patrimonios.some(
        (p, i) => i !== index && p.value.trim() === value.trim()
      );

      if (duplicataLocal) {
        newPatrimonios[index] = { value, isValid: false, isChecking: false };
        setPatrimonios([...newPatrimonios]);
        return;
      }

      // Verificar no banco
      try {
        const existing = await verificarPatrimonio.mutateAsync(value.trim());
        newPatrimonios[index] = { 
          value, 
          isValid: !existing, 
          isChecking: false 
        };
        setPatrimonios([...newPatrimonios]);
      } catch {
        newPatrimonios[index] = { value, isValid: null, isChecking: false };
        setPatrimonios([...newPatrimonios]);
      }
    } else {
      newPatrimonios[index] = { value, isValid: null, isChecking: false };
      setPatrimonios([...newPatrimonios]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const qtdNum = parseInt(quantidade) || 0;
    if (qtdNum < 1) {
      toast.error('Informe uma quantidade válida (mínimo 1)');
      return;
    }

    // Validações
    let finalProdutoId = produtoId;

    if (showNovoProduto) {
      if (!novoProdutoNome.trim()) {
        toast.error('Informe o nome do produto');
        return;
      }
      // Criar novo produto
      try {
        const novoProduto = await createProduto.mutateAsync({ nome: novoProdutoNome.trim() });
        finalProdutoId = novoProduto.id;
      } catch {
        return;
      }
    } else if (!produtoId) {
      toast.error('Selecione um produto');
      return;
    }

    if (possuiPatrimonio) {
      const invalidos = patrimonios.filter((p) => !p.isValid);
      const vazios = patrimonios.filter((p) => !p.value.trim());
      
      if (vazios.length > 0) {
        toast.error('Preencha todos os números de patrimônio');
        return;
      }
      
      if (invalidos.length > 0) {
        toast.error('Existem patrimônios duplicados ou inválidos');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (possuiPatrimonio) {
        // Criar um item para cada patrimônio
        for (const patrimonio of patrimonios) {
          await createEstoqueItem.mutateAsync({
            produto_id: finalProdutoId,
            numero_patrimonio: patrimonio.value.trim(),
            quantidade: 1,
            controle_patrimonial: true,
            quantidade_total: 1,
            data_entrada: dataEntrada.toISOString(),
            observacao_entrada: observacao || null,
          });
        }
        toast.success(`${patrimonios.length} itens registrados com sucesso!`);
      } else {
        // Criar item único com quantidade (sem patrimônio)
        await createEstoqueItem.mutateAsync({
          produto_id: finalProdutoId,
          numero_patrimonio: null,
          quantidade: qtdNum,
          controle_patrimonial: false,
          quantidade_total: qtdNum,
          data_entrada: dataEntrada.toISOString(),
          observacao_entrada: observacao || null,
        });
        toast.success('Entrada registrada com sucesso!');
      }

      navigate('/admin/estoque');
    } catch (error) {
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
              <ArrowDownToLine className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Entrada de Produtos</h1>
              <p className="text-muted-foreground">Registre novos itens no estoque</p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Dados do Produto</CardTitle>
                <CardDescription>Preencha as informações da entrada</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Produto */}
                <div className="space-y-2">
                  <Label>Produto *</Label>
                  {!showNovoProduto ? (
                    <div className="flex gap-2">
                      <Select value={produtoId} onValueChange={setProdutoId}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecione um produto" />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingProdutos ? (
                            <div className="p-2 text-center text-muted-foreground">
                              Carregando...
                            </div>
                          ) : produtos && produtos.length > 0 ? (
                            produtos.map((produto) => (
                              <SelectItem key={produto.id} value={produto.id}>
                                {produto.nome}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-2 text-center text-muted-foreground">
                              Nenhum produto cadastrado
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowNovoProduto(true)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Novo
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={novoProdutoNome}
                        onChange={(e) => setNovoProdutoNome(e.target.value)}
                        placeholder="Nome do novo produto"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setShowNovoProduto(false);
                          setNovoProdutoNome('');
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Quantidade */}
                <div className="space-y-2">
                  <Label htmlFor="quantidade">Quantidade *</Label>
                  <Input
                    id="quantidade"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={quantidade}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setQuantidade(val);
                    }}
                    placeholder="Digite a quantidade"
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Digite o número de itens a registrar
                  </p>
                </div>

                {/* Possui Patrimônio? */}
                {parseInt(quantidade) > 0 && (
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                    <div>
                      <Label htmlFor="patrimonio-switch">Este produto possui número de patrimônio?</Label>
                      <p className="text-sm text-muted-foreground">
                        {possuiPatrimonio
                          ? `Informe ${parseInt(quantidade) || 0} número(s) de patrimônio único(s)`
                          : 'Marque se cada item possui identificação patrimonial'}
                      </p>
                    </div>
                    <Switch
                      id="patrimonio-switch"
                      checked={possuiPatrimonio}
                      onCheckedChange={setPossuiPatrimonio}
                    />
                  </div>
                )}

                {/* Campos de Patrimônio */}
                {possuiPatrimonio && patrimonios.length > 0 && (
                  <div className="space-y-3">
                    <Label>Números de Patrimônio *</Label>
                    {patrimonios.map((patrimonio, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <Hash className="w-4 h-4 text-muted-foreground" />
                          <Input
                            value={patrimonio.value}
                            onChange={(e) => handlePatrimonioChange(index, e.target.value)}
                            placeholder={`Patrimônio ${index + 1}`}
                            className={cn(
                              patrimonio.isValid === false && 'border-destructive',
                              patrimonio.isValid === true && 'border-green-500'
                            )}
                          />
                        </div>
                        <div className="w-6">
                          {patrimonio.isChecking && (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          )}
                          {patrimonio.isValid === true && (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          )}
                          {patrimonio.isValid === false && (
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                      </div>
                    ))}
                    {patrimonios.some((p) => p.isValid === false) && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        Patrimônio já cadastrado ou duplicado
                      </p>
                    )}
                  </div>
                )}

                {/* Data de Entrada */}
                <div className="space-y-2">
                  <Label>Data de Entrada *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !dataEntrada && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataEntrada ? (
                          format(dataEntrada, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                        ) : (
                          <span>Selecione a data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dataEntrada}
                        onSelect={(date) => date && setDataEntrada(date)}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Observação */}
                <div className="space-y-2">
                  <Label htmlFor="observacao">Observação</Label>
                  <Textarea
                    id="observacao"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Informações adicionais sobre esta entrada..."
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
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      <>
                        <ArrowDownToLine className="w-4 h-4 mr-2" />
                        Registrar Entrada
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
