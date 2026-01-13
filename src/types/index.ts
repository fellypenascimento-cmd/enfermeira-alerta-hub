// Tipos base do sistema

export type UserRole = 'admin' | 'enfermeira';
export type ChamadoStatus = 'aberto' | 'em_atendimento' | 'resolvido';

export interface User {
  id: string;
  nome: string;
  email: string;
  matricula?: string;
  role: UserRole;
  unidadeId: string;
  ativo: boolean;
  createdAt: Date;
}

export interface Unidade {
  id: string;
  nome: string;
  endereco?: string;
  ativa: boolean;
  createdAt: Date;
}

export interface Problema {
  id: string;
  titulo: string;
  descricao?: string;
  ativo: boolean;
  createdAt: Date;
}

export interface Chamado {
  id: string;
  numero: number;
  usuarioId: string;
  unidadeId: string;
  problemaId: string;
  descricao: string;
  status: ChamadoStatus;
  atendenteId?: string;
  dataAbertura: Date;
  dataAtendimento?: Date;
  dataFechamento?: Date;
  createdAt: Date;
}

export interface ChamadoHistorico {
  id: string;
  chamadoId: string;
  usuarioId: string;
  statusAnterior?: ChamadoStatus;
  statusNovo: ChamadoStatus;
  observacao?: string;
  createdAt: Date;
}

// Tipos com relacionamentos
export interface ChamadoCompleto extends Chamado {
  usuario?: User;
  unidade?: Unidade;
  problema?: Problema;
  atendente?: User;
  historico?: ChamadoHistorico[];
}

export interface DashboardStats {
  totalAbertos: number;
  totalEmAtendimento: number;
  totalResolvidos: number;
  totalChamados: number;
}

export interface ChamadosPorUnidade {
  unidade: string;
  total: number;
}

export interface ProblemaRecorrente {
  problema: string;
  total: number;
}
