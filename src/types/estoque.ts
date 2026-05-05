export type EstoqueStatus = 'disponivel' | 'em_uso' | 'manutencao' | 'baixa';
export type MovimentacaoTipo = 'entrada' | 'saida' | 'transferencia' | 'devolucao' | 'manutencao' | 'retorno_manutencao' | 'baixa';

export interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Sala {
  id: string;
  nome: string;
  unidade_id: string;
  ativa: boolean;
  created_at: string;
}

export interface SalaWithUnidade extends Sala {
  unidade?: { id: string; nome: string } | null;
}

// Cada registro = 1 equipamento físico individual
export interface EstoqueItem {
  id: string;
  produto_id: string;
  numero_patrimonio: string | null;
  local_especifico: string | null;
  sala_id: string | null;
  status: EstoqueStatus;
  unidade_atual_id: string | null;
  data_entrada: string;
  responsavel_entrada_id: string;
  observacao_entrada: string | null;
  created_at: string;
  updated_at: string;
}

export interface EstoqueMovimentacao {
  id: string;
  item_id: string;
  tipo: MovimentacaoTipo;
  data_movimentacao: string;
  unidade_origem_id: string | null;
  unidade_destino_id: string | null;
  sala_origem_id: string | null;
  sala_destino_id: string | null;
  responsavel_id: string;
  observacao: string | null;
  local_especifico: string | null;
  quantidade_movimentada: number | null;
  created_at: string;
}

export interface EstoqueItemWithRelations extends EstoqueItem {
  produto?: { id: string; nome: string; categoria?: string | null; descricao?: string | null } | null;
  unidade_atual?: { id: string; nome: string } | null;
  sala?: { id: string; nome: string } | null;
  responsavel_entrada?: { id: string; nome: string; email: string } | null;
}

export interface EstoqueMovimentacaoWithRelations extends EstoqueMovimentacao {
  item?: EstoqueItemWithRelations | null;
  unidade_origem?: { id: string; nome: string } | null;
  unidade_destino?: { id: string; nome: string } | null;
  sala_origem?: { id: string; nome: string } | null;
  sala_destino?: { id: string; nome: string } | null;
  responsavel?: { id: string; nome: string; email: string } | null;
}

// Aggregated product summary for main screen (counts of records)
export interface ProdutoResumo {
  produto_id: string;
  nome: string;
  categoria: string | null;
  total: number;
  disponivel: number;
  em_uso: number;
  manutencao: number;
  baixa: number;
}

export interface DistribuicaoUnidade {
  unidade_id: string;
  unidade_nome: string;
  quantidade: number;
}

export interface DistribuicaoSala {
  sala_id: string;
  sala_nome: string;
  unidade_id: string;
  unidade_nome: string;
  quantidade: number;
}
