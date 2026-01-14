import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useEstoqueItens, useEstoqueMovimentacoes } from '@/hooks/useEstoque';
import { useUnidades } from '@/hooks/useUnidades';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FadeIn } from '@/components/animations';
import {
  FileText,
  Download,
  FileSpreadsheet,
  Loader2,
  Package,
  Building2,
  Hash,
  Calendar,
  ArrowLeft,
} from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const statusConfig = {
  disponivel: { label: 'Disponível', color: 'bg-green-100 text-green-700 border-green-300' },
  em_uso: { label: 'Em Uso', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  baixa: { label: 'Baixa', color: 'bg-red-100 text-red-700 border-red-300' },
};

export default function EstoqueRelatorios() {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [unidadeId, setUnidadeId] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [generating, setGenerating] = useState(false);

  const { data: itens, isLoading: loadingItens } = useEstoqueItens();
  const { data: movimentacoes, isLoading: loadingMov } = useEstoqueMovimentacoes();
  const { data: unidades } = useUnidades();

  // Filtrar itens com base nos filtros selecionados
  const filteredItens = React.useMemo(() => {
    if (!itens) return [];

    return itens.filter((item) => {
      // Filtro por período
      if (dataInicio && dataFim) {
        const itemDate = new Date(item.data_entrada);
        const start = startOfDay(parseISO(dataInicio));
        const end = endOfDay(parseISO(dataFim));
        if (!isWithinInterval(itemDate, { start, end })) {
          return false;
        }
      }

      // Filtro por unidade
      if (unidadeId && unidadeId !== 'all' && item.unidade_atual_id !== unidadeId) {
        return false;
      }

      // Filtro por status
      if (status && status !== 'all' && item.status !== status) {
        return false;
      }

      return true;
    });
  }, [itens, dataInicio, dataFim, unidadeId, status]);

  // Exportar para PDF
  const exportPDF = () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Título
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório de Estoque', pageWidth / 2, 20, { align: 'center' });
      
      // Subtítulo com filtros
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      let subtitle = 'Sistema UBS - ';
      if (dataInicio && dataFim) {
        subtitle += `Período: ${format(parseISO(dataInicio), 'dd/MM/yyyy')} a ${format(parseISO(dataFim), 'dd/MM/yyyy')}`;
      } else {
        subtitle += 'Todos os períodos';
      }
      doc.text(subtitle, pageWidth / 2, 28, { align: 'center' });
      
      // Data de geração
      doc.setFontSize(8);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, 34, { align: 'center' });

      // Cabeçalho da tabela
      let y = 45;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(30, 58, 95);
      doc.rect(10, y - 5, pageWidth - 20, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('Produto', 12, y);
      doc.text('Patrimônio', 60, y);
      doc.text('Status', 100, y);
      doc.text('Unidade', 130, y);
      doc.text('Data Entrada', 170, y);
      
      // Dados
      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      filteredItens.forEach((item, index) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        // Zebra striping
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(10, y - 4, pageWidth - 20, 7, 'F');
        }
        
        doc.text((item.produto?.nome || 'N/A').substring(0, 25), 12, y);
        doc.text(item.numero_patrimonio || '-', 60, y);
        doc.text(statusConfig[item.status as keyof typeof statusConfig]?.label || item.status || '-', 100, y);
        doc.text((item.unidade_atual?.nome || '-').substring(0, 20), 130, y);
        doc.text(format(new Date(item.data_entrada), 'dd/MM/yyyy'), 170, y);
        
        y += 7;
      });

      // Resumo
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text(`Total de itens: ${filteredItens.length}`, 12, y);

      doc.save(`relatorio-estoque-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } finally {
      setGenerating(false);
    }
  };

  // Exportar para Excel
  const exportExcel = () => {
    setGenerating(true);
    try {
      const data = filteredItens.map((item) => ({
        'Produto': item.produto?.nome || 'N/A',
        'Patrimônio': item.numero_patrimonio || '-',
        'Status': statusConfig[item.status as keyof typeof statusConfig]?.label || item.status || '-',
        'Unidade Atual': item.unidade_atual?.nome || '-',
        'Data Entrada': format(new Date(item.data_entrada), 'dd/MM/yyyy'),
        'Quantidade': item.quantidade || 1,
        'Observação': item.observacao_entrada || '-',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Estoque');

      // Ajustar largura das colunas
      const colWidths = [
        { wch: 30 }, // Produto
        { wch: 15 }, // Patrimônio
        { wch: 12 }, // Status
        { wch: 25 }, // Unidade
        { wch: 12 }, // Data
        { wch: 10 }, // Quantidade
        { wch: 30 }, // Observação
      ];
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `relatorio-estoque-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } finally {
      setGenerating(false);
    }
  };

  const isLoading = loadingItens || loadingMov;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/admin/estoque">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-7 h-7" />
                  Relatórios de Estoque
                </h1>
                <p className="text-muted-foreground">
                  Gere relatórios com filtros personalizados
                </p>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Filtros */}
        <FadeIn delay={0.1}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtros do Relatório</CardTitle>
              <CardDescription>
                Selecione os critérios para gerar o relatório
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataInicio" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Data Início
                  </Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataFim" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Data Fim
                  </Label>
                  <Input
                    id="dataFim"
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Unidade
                  </Label>
                  <Select value={unidadeId} onValueChange={setUnidadeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as unidades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as unidades</SelectItem>
                      {unidades?.map((unidade) => (
                        <SelectItem key={unidade.id} value={unidade.id}>
                          {unidade.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Status
                  </Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="disponivel">Disponível</SelectItem>
                      <SelectItem value="em_uso">Em Uso</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t">
                <Button
                  onClick={exportPDF}
                  disabled={isLoading || generating || filteredItens.length === 0}
                  variant="outline"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Exportar PDF
                </Button>
                <Button
                  onClick={exportExcel}
                  disabled={isLoading || generating || filteredItens.length === 0}
                  variant="outline"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                  )}
                  Exportar Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Preview dos dados */}
        <FadeIn delay={0.2}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Prévia dos Dados</CardTitle>
              <CardDescription>
                {isLoading
                  ? 'Carregando...'
                  : `${filteredItens.length} ${filteredItens.length === 1 ? 'item' : 'itens'} encontrado(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredItens.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum item encontrado</h3>
                  <p className="text-muted-foreground">
                    Ajuste os filtros para encontrar itens no estoque.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Produto</th>
                        <th className="text-left p-3 font-medium">Patrimônio</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Unidade</th>
                        <th className="text-left p-3 font-medium">Data Entrada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItens.slice(0, 20).map((item, index) => {
                        const config = statusConfig[item.status as keyof typeof statusConfig];
                        return (
                          <tr
                            key={item.id}
                            className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                          >
                            <td className="p-3 font-medium">
                              {item.produto?.nome || 'N/A'}
                            </td>
                            <td className="p-3">
                              {item.numero_patrimonio ? (
                                <span className="flex items-center gap-1">
                                  <Hash className="w-3 h-3" />
                                  {item.numero_patrimonio}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="p-3">
                              <Badge className={config?.color}>{config?.label}</Badge>
                            </td>
                            <td className="p-3">{item.unidade_atual?.nome || '-'}</td>
                            <td className="p-3">
                              {format(new Date(item.data_entrada), 'dd/MM/yyyy', { locale: ptBR })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredItens.length > 20 && (
                    <p className="text-sm text-muted-foreground mt-4 text-center">
                      Mostrando 20 de {filteredItens.length} itens. Exporte o relatório para ver todos.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </Layout>
  );
}
