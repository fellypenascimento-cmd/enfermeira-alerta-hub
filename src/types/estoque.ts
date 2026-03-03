export type EstoqueStatus = 'disponivel' | 'em_uso' | 'baixa';
export type MovimentacaoTipo = 'entrada' | 'saida' | 'devolucao' | 'baixa' | 'liberacao' | 'transferencia' | 'patrimonializacao';

export interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface EstoqueItem {
  id: string;
  produto_id: string;
  numero_patrimonio: string | null;
  quantidade: number;
  controle_patrimonial: boolean;
  quantidade_total: number;
  local_especifico: string | null;
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
  responsavel_id: string;
  observacao: string | null;
  local_especifico: string | null;
  quantidade_movimentada: number | null;
  created_at: string;
}

// Extended types with relations
export interface EstoqueItemWithRelations extends EstoqueItem {
  produto?: { id: string; nome: string; categoria?: string | null; descricao?: string | null } | null;
  unidade_atual?: { id: string; nome: string } | null;
  responsavel_entrada?: { id: string; nome: string; email: string } | null;
}

export interface EstoqueMovimentacaoWithRelations extends EstoqueMovimentacao {
  item?: EstoqueItemWithRelations | null;
  unidade_origem?: { id: string; nome: string } | null;
  unidade_destino?: { id: string; nome: string } | null;
  responsavel?: { id: string; nome: string; email: string } | null;
}
