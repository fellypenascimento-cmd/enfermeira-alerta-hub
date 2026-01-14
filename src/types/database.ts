export type AppRole = 'admin' | 'enfermeira';
export type ChamadoStatus = 'aberto' | 'em_atendimento' | 'resolvido';

export interface Profile {
  id: string;
  nome: string;
  email: string;
  unidade_id: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Unidade {
  id: string;
  nome: string;
  endereco: string | null;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

export interface Problema {
  id: string;
  titulo: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Chamado {
  id: string;
  numero: number;
  usuario_id: string | null;
  unidade_id: string | null;
  problema_id: string | null;
  problema_texto: string | null;
  descricao: string;
  status: ChamadoStatus;
  atendente_id: string | null;
  data_abertura: string;
  data_atendimento: string | null;
  data_fechamento: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChamadoHistorico {
  id: string;
  chamado_id: string;
  usuario_id: string | null;
  status_anterior: ChamadoStatus | null;
  status_novo: ChamadoStatus | null;
  observacao: string | null;
  created_at: string;
}

// Extended types with relations
export interface ChamadoWithRelations extends Chamado {
  unidade?: { id: string; nome: string } | null;
  problema?: { id: string; titulo: string } | null;
  usuario?: Profile | null;
  atendente?: { id: string; nome: string; email: string } | null;
}

export interface ProfileWithRole extends Profile {
  role?: AppRole;
  unidade?: Unidade | null;
}
