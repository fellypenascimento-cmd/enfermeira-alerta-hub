import React from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useProdutosResumo, useEstoqueStats } from '@/hooks/useEstoque';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FadeIn, AnimatedCard } from '@/components/animations';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  Box,
  Building2,
  FileText,
  XCircle,
  ArrowLeftRight,
  Wrench,
  Search,
  ChevronRight,
  RotateCcw,
  Shuffle,
} from 'lucide-react';

export default function Estoque() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('todos');
  const [categoriaFilter, setCategoriaFilter] = React.useState('todas');
  const { data: stats, isLoading: loadingStats } = useEstoqueStats();
  const { data: produtosResumo, isLoading: loadingProdutos } = useProdutosResumo();

  const categorias = React.useMemo(() => {
    if (!produtosResumo) return [];
    const cats = new Set(produtosResumo.map(p => p.categoria).filter(Boolean));
    return Array.from(cats) as string[];
  }, [produtosResumo]);

  const filteredProdutos = React.useMemo(() => {
    if (!produtosResumo) return [];
    let result = produtosResumo;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.nome.toLowerCase().includes(term) ||
        p.categoria?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'todos') {
      result = result.filter(p => {
        switch (statusFilter) {
          case 'disponivel': return p.disponivel > 0;
          case 'em_uso': return p.em_uso > 0;
          case 'manutencao': return p.manutencao > 0;
          case 'baixa': return p.baixa > 0;
          default: return true;
        }
      });
    }

    if (categoriaFilter !== 'todas') {
      result = result.filter(p => p.categoria === categoriaFilter);
    }

    return result;
  }, [produtosResumo, searchTerm, statusFilter, categoriaFilter]);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Bloco 1 — Barra superior compacta */}
        <FadeIn>
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Package className="w-7 h-7" />
                Gestão de Estoque
              </h1>
              <p className="text-muted-foreground">
                Controle de equipamentos das unidades de saúde
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar equipamento..."
                  className="pl-10"
                />
              </div>
              <Button asChild>
                <Link to="/admin/estoque/entrada">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Equipamento
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Shuffle className="w-4 h-4 mr-2" />
                    Movimentar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/admin/estoque/saida" className="flex items-center gap-2">
                      <ArrowUpFromLine className="w-4 h-4" />
                      Saída para Unidade
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/estoque/transferencia" className="flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4" />
                      Transferência
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/estoque/manutencao" className="flex items-center gap-2">
                      <Wrench className="w-4 h-4" />
                      Manutenção
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/estoque/baixa" className="flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Baixa
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button asChild variant="outline">
                <Link to="/admin/estoque/relatorios">
                  <FileText className="w-4 h-4 mr-2" />
                  Relatórios
                </Link>
              </Button>
            </div>
          </div>
        </FadeIn>

        {/* Bloco 2 — Indicadores (4 cards) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AnimatedCard>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Package className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{loadingStats ? '...' : stats?.total || 0}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
          <AnimatedCard>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Building2 className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{loadingStats ? '...' : stats?.em_uso || 0}</p>
                    <p className="text-sm text-muted-foreground">Em Uso</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
          <AnimatedCard>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Box className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{loadingStats ? '...' : stats?.disponivel || 0}</p>
                    <p className="text-sm text-muted-foreground">Estoque Central</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
          <AnimatedCard>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Wrench className="w-8 h-8 text-amber-600" />
                  <div>
                    <p className="text-2xl font-bold">{loadingStats ? '...' : stats?.manutencao || 0}</p>
                    <p className="text-sm text-muted-foreground">Manutenção</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>

        {/* Bloco 3 — Lista com filtros */}
        <FadeIn delay={0.2}>
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Equipamentos</CardTitle>
                  <CardDescription>
                    {loadingProdutos ? 'Carregando...' : `${filteredProdutos.length} tipo(s) de equipamento`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="disponivel">Disponível</SelectItem>
                      <SelectItem value="em_uso">Em Uso</SelectItem>
                      <SelectItem value="manutencao">Manutenção</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                  {categorias.length > 0 && (
                    <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas categorias</SelectItem>
                        {categorias.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingProdutos ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredProdutos.length === 0 ? (
                <div className="py-12 text-center">
                  <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum equipamento encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm ? 'Tente buscar com outros termos.' : 'Comece registrando a entrada de produtos no estoque.'}
                  </p>
                  {!searchTerm && (
                    <Button asChild>
                      <Link to="/admin/estoque/entrada">
                        <Plus className="w-4 h-4 mr-2" />
                        Registrar Entrada
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProdutos.map((produto) => (
                    <Link
                      key={produto.produto_id}
                      to={`/admin/estoque/produto/${produto.produto_id}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Package className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-lg">{produto.nome}</p>
                            {produto.categoria && (
                              <Badge variant="secondary" className="text-xs mt-1">{produto.categoria}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <p className="text-xl font-bold text-foreground">{produto.total}</p>
                            <p className="text-muted-foreground">Total</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-bold text-blue-600">{produto.em_uso}</p>
                            <p className="text-muted-foreground">Em uso</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-bold text-green-600">{produto.disponivel}</p>
                            <p className="text-muted-foreground">Estoque</p>
                          </div>
                          {produto.manutencao > 0 && (
                            <div className="text-center">
                              <p className="text-xl font-bold text-amber-600">{produto.manutencao}</p>
                              <p className="text-muted-foreground">Manut.</p>
                            </div>
                          )}
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </Layout>
  );
}
