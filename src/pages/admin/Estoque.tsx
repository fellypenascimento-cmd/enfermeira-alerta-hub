import React from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useEstoqueItens, useEstoqueStats } from '@/hooks/useEstoque';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FadeIn, StaggerContainer, AnimatedCard } from '@/components/animations';
import {
  Package,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  Box,
  Building2,
  FileText,
  Hash,
  XCircle,
  Layers,
  MapPin,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig = {
  disponivel: { label: 'Disponível', color: 'bg-green-100 text-green-700 border-green-300' },
  em_uso: { label: 'Em Uso', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  baixa: { label: 'Baixa', color: 'bg-red-100 text-red-700 border-red-300' },
};

export default function Estoque() {
  const [activeTab, setActiveTab] = React.useState('todos');
  const { data: stats, isLoading: loadingStats } = useEstoqueStats();
  const { data: itens, isLoading: loadingItens } = useEstoqueItens(
    activeTab !== 'todos' ? { status: activeTab as any } : undefined
  );

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Package className="w-7 h-7" />
                Gestão de Estoque
              </h1>
              <p className="text-muted-foreground">
                Controle de produtos e equipamentos das unidades
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to="/admin/estoque/relatorios">
                  <FileText className="w-4 h-4 mr-2" />
                  Relatórios
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10">
                <Link to="/admin/estoque/baixa">
                  <XCircle className="w-4 h-4 mr-2" />
                  Registrar Baixa
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/admin/estoque/saida">
                  <ArrowUpFromLine className="w-4 h-4 mr-2" />
                  Registrar Saída
                </Link>
              </Button>
              <Button asChild>
                <Link to="/admin/estoque/entrada">
                  <ArrowDownToLine className="w-4 h-4 mr-2" />
                  Entrada de Produtos
                </Link>
              </Button>
            </div>
          </div>
        </FadeIn>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <AnimatedCard>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Package className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{loadingStats ? '...' : stats?.total || 0}</p>
                    <p className="text-sm text-muted-foreground">Total de Itens</p>
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
                    <p className="text-sm text-muted-foreground">Disponíveis</p>
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
                  <Hash className="w-8 h-8 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold">{loadingStats ? '...' : stats?.baixa || 0}</p>
                    <p className="text-sm text-muted-foreground">Baixa</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>

        {/* Tabs de filtro */}
        <FadeIn delay={0.2}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="disponivel">Disponíveis</TabsTrigger>
              <TabsTrigger value="em_uso">Em Uso</TabsTrigger>
              <TabsTrigger value="baixa">Baixa</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {loadingItens ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : !itens || itens.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum item encontrado</h3>
                    <p className="text-muted-foreground mb-4">
                      {activeTab === 'todos'
                        ? 'Comece registrando a entrada de produtos no estoque.'
                        : `Não há itens com status "${statusConfig[activeTab as keyof typeof statusConfig]?.label}".`}
                    </p>
                    <Button asChild>
                      <Link to="/admin/estoque/entrada">
                        <Plus className="w-4 h-4 mr-2" />
                        Registrar Entrada
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Itens de Estoque</CardTitle>
                    <CardDescription>
                      {itens.length} {itens.length === 1 ? 'item' : 'itens'} encontrado(s)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {itens.map((item) => {
                        const config = statusConfig[item.status as keyof typeof statusConfig];
                        const isPatrimonial = item.controle_patrimonial;
                        return (
                          <Link
                            key={item.id}
                            to={`/admin/estoque/${item.id}`}
                            className="block"
                          >
                            <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <Package className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {item.produto?.nome || 'Produto não identificado'}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                    {isPatrimonial && item.numero_patrimonio && (
                                      <span className="flex items-center gap-1">
                                        <Hash className="w-3 h-3" />
                                        {item.numero_patrimonio}
                                      </span>
                                    )}
                                    {!isPatrimonial && (
                                      <span className="flex items-center gap-1">
                                        <Layers className="w-3 h-3" />
                                        Quantidade: {item.quantidade_total}
                                      </span>
                                    )}
                                    {item.unidade_atual && (
                                      <span className="flex items-center gap-1">
                                        <Building2 className="w-3 h-3" />
                                        {item.unidade_atual.nome}
                                      </span>
                                    )}
                                    {item.local_especifico && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {item.local_especifico}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-muted-foreground hidden sm:inline">
                                  {format(new Date(item.data_entrada), 'dd/MM/yyyy', { locale: ptBR })}
                                </span>
                                <Badge className={config?.color}>
                                  {config?.label}
                                </Badge>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </FadeIn>
      </div>
    </Layout>
  );
}
