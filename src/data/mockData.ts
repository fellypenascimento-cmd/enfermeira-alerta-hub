import type { User, Unidade, Problema, Chamado, ChamadoHistorico } from '@/types';

// Unidades de Saúde
export const mockUnidades: Unidade[] = [
  { id: '1', nome: 'UBS Central', endereco: 'Rua Principal, 100', ativa: true, createdAt: new Date('2024-01-01') },
  { id: '2', nome: 'UBS Vila Nova', endereco: 'Av. Brasil, 500', ativa: true, createdAt: new Date('2024-01-01') },
  { id: '3', nome: 'UBS Jardim América', endereco: 'Rua das Flores, 200', ativa: true, createdAt: new Date('2024-01-01') },
  { id: '4', nome: 'UBS Bela Vista', endereco: 'Praça Central, 50', ativa: true, createdAt: new Date('2024-01-01') },
  { id: '5', nome: 'UBS Santa Maria', endereco: 'Rua São Paulo, 300', ativa: true, createdAt: new Date('2024-01-01') },
  { id: '6', nome: 'UBS Boa Esperança', endereco: 'Av. das Américas, 1000', ativa: true, createdAt: new Date('2024-01-01') },
  { id: '7', nome: 'UBS São José', endereco: 'Rua Paraná, 150', ativa: false, createdAt: new Date('2024-01-01') },
  { id: '8', nome: 'UBS Nova Esperança', endereco: 'Av. Independência, 800', ativa: true, createdAt: new Date('2024-01-01') },
];

// Catálogo de Problemas
export const mockProblemas: Problema[] = [
  { id: '1', titulo: 'Sistema lento', descricao: 'Lentidão no sistema de prontuário', ativo: true, createdAt: new Date('2024-01-01') },
  { id: '2', titulo: 'Impressora não funciona', descricao: 'Problemas com impressão de documentos', ativo: true, createdAt: new Date('2024-01-01') },
  { id: '3', titulo: 'Sem acesso à internet', descricao: 'Conexão de rede indisponível', ativo: true, createdAt: new Date('2024-01-01') },
  { id: '4', titulo: 'Computador não liga', descricao: 'Equipamento não inicializa', ativo: true, createdAt: new Date('2024-01-01') },
  { id: '5', titulo: 'Erro no sistema de agendamento', descricao: 'Falha ao agendar consultas', ativo: true, createdAt: new Date('2024-01-01') },
  { id: '6', titulo: 'Teclado/Mouse com defeito', descricao: 'Periféricos não funcionam', ativo: true, createdAt: new Date('2024-01-01') },
  { id: '7', titulo: 'Sistema fora do ar', descricao: 'Sistema completamente indisponível', ativo: true, createdAt: new Date('2024-01-01') },
  { id: '8', titulo: 'Problema com e-mail', descricao: 'Não consegue enviar/receber emails', ativo: true, createdAt: new Date('2024-01-01') },
  { id: '9', titulo: 'Atualização de software', descricao: 'Solicitação de atualização', ativo: false, createdAt: new Date('2024-01-01') },
];

// Usuários
export const mockUsers: User[] = [
  { 
    id: 'admin-1', 
    nome: 'Administrador', 
    email: 'admin@ubs.gov.br', 
    role: 'admin', 
    unidadeId: '1', 
    ativo: true, 
    createdAt: new Date('2024-01-01') 
  },
  { 
    id: 'enf-1', 
    nome: 'Maria Silva', 
    email: 'maria.silva@ubs.gov.br', 
    matricula: '12345',
    role: 'enfermeira', 
    unidadeId: '1', 
    ativo: true, 
    createdAt: new Date('2024-01-15') 
  },
  { 
    id: 'enf-2', 
    nome: 'Ana Santos', 
    email: 'ana.santos@ubs.gov.br', 
    matricula: '12346',
    role: 'enfermeira', 
    unidadeId: '2', 
    ativo: true, 
    createdAt: new Date('2024-01-20') 
  },
  { 
    id: 'enf-3', 
    nome: 'Carla Oliveira', 
    email: 'carla.oliveira@ubs.gov.br', 
    matricula: '12347',
    role: 'enfermeira', 
    unidadeId: '3', 
    ativo: true, 
    createdAt: new Date('2024-02-01') 
  },
  { 
    id: 'enf-4', 
    nome: 'Paula Costa', 
    email: 'paula.costa@ubs.gov.br', 
    matricula: '12348',
    role: 'enfermeira', 
    unidadeId: '4', 
    ativo: false, 
    createdAt: new Date('2024-02-10') 
  },
];

// Chamados
export const mockChamados: Chamado[] = [
  {
    id: 'ch-1',
    numero: 1001,
    usuarioId: 'enf-1',
    unidadeId: '1',
    problemaId: '1',
    descricao: 'O sistema de prontuário está muito lento desde ontem. Demora cerca de 2 minutos para abrir cada ficha.',
    status: 'aberto',
    dataAbertura: new Date('2025-01-10T08:30:00'),
    createdAt: new Date('2025-01-10T08:30:00'),
  },
  {
    id: 'ch-2',
    numero: 1002,
    usuarioId: 'enf-1',
    unidadeId: '1',
    problemaId: '2',
    descricao: 'Impressora HP da recepção não imprime. Já tentei reiniciar mas não funcionou.',
    status: 'em_atendimento',
    atendenteId: 'admin-1',
    dataAbertura: new Date('2025-01-09T14:00:00'),
    dataAtendimento: new Date('2025-01-09T16:00:00'),
    createdAt: new Date('2025-01-09T14:00:00'),
  },
  {
    id: 'ch-3',
    numero: 1003,
    usuarioId: 'enf-2',
    unidadeId: '2',
    problemaId: '3',
    descricao: 'Estamos sem internet desde as 10h da manhã. Nenhum computador está conectando.',
    status: 'resolvido',
    atendenteId: 'admin-1',
    dataAbertura: new Date('2025-01-08T10:30:00'),
    dataAtendimento: new Date('2025-01-08T11:00:00'),
    dataFechamento: new Date('2025-01-08T15:00:00'),
    createdAt: new Date('2025-01-08T10:30:00'),
  },
  {
    id: 'ch-4',
    numero: 1004,
    usuarioId: 'enf-3',
    unidadeId: '3',
    problemaId: '4',
    descricao: 'O computador do consultório 3 não liga. Já verificamos se está na tomada.',
    status: 'aberto',
    dataAbertura: new Date('2025-01-11T09:00:00'),
    createdAt: new Date('2025-01-11T09:00:00'),
  },
  {
    id: 'ch-5',
    numero: 1005,
    usuarioId: 'enf-2',
    unidadeId: '2',
    problemaId: '5',
    descricao: 'Erro ao tentar agendar consultas. Aparece mensagem "Erro interno do servidor".',
    status: 'em_atendimento',
    atendenteId: 'admin-1',
    dataAbertura: new Date('2025-01-10T11:00:00'),
    dataAtendimento: new Date('2025-01-11T08:00:00'),
    createdAt: new Date('2025-01-10T11:00:00'),
  },
  {
    id: 'ch-6',
    numero: 1006,
    usuarioId: 'enf-1',
    unidadeId: '1',
    problemaId: '7',
    descricao: 'Sistema completamente fora do ar. Ninguém consegue acessar.',
    status: 'resolvido',
    atendenteId: 'admin-1',
    dataAbertura: new Date('2025-01-05T08:00:00'),
    dataAtendimento: new Date('2025-01-05T08:15:00'),
    dataFechamento: new Date('2025-01-05T10:00:00'),
    createdAt: new Date('2025-01-05T08:00:00'),
  },
  {
    id: 'ch-7',
    numero: 1007,
    usuarioId: 'enf-3',
    unidadeId: '3',
    problemaId: '6',
    descricao: 'Mouse sem fio do consultório 1 parou de funcionar. Já troquei as pilhas.',
    status: 'aberto',
    dataAbertura: new Date('2025-01-12T07:30:00'),
    createdAt: new Date('2025-01-12T07:30:00'),
  },
  {
    id: 'ch-8',
    numero: 1008,
    usuarioId: 'enf-2',
    unidadeId: '2',
    problemaId: '8',
    descricao: 'Não consigo receber emails há 3 dias. Preciso dos resultados de exames.',
    status: 'aberto',
    dataAbertura: new Date('2025-01-12T10:00:00'),
    createdAt: new Date('2025-01-12T10:00:00'),
  },
];

// Histórico de Chamados
export const mockHistorico: ChamadoHistorico[] = [
  {
    id: 'hist-1',
    chamadoId: 'ch-2',
    usuarioId: 'admin-1',
    statusAnterior: 'aberto',
    statusNovo: 'em_atendimento',
    observacao: 'Iniciando verificação da impressora.',
    createdAt: new Date('2025-01-09T16:00:00'),
  },
  {
    id: 'hist-2',
    chamadoId: 'ch-3',
    usuarioId: 'admin-1',
    statusAnterior: 'aberto',
    statusNovo: 'em_atendimento',
    observacao: 'Verificando conexão de rede.',
    createdAt: new Date('2025-01-08T11:00:00'),
  },
  {
    id: 'hist-3',
    chamadoId: 'ch-3',
    usuarioId: 'admin-1',
    statusAnterior: 'em_atendimento',
    statusNovo: 'resolvido',
    observacao: 'Problema no switch resolvido. Rede restabelecida.',
    createdAt: new Date('2025-01-08T15:00:00'),
  },
  {
    id: 'hist-4',
    chamadoId: 'ch-5',
    usuarioId: 'admin-1',
    statusAnterior: 'aberto',
    statusNovo: 'em_atendimento',
    observacao: 'Analisando logs do sistema de agendamento.',
    createdAt: new Date('2025-01-11T08:00:00'),
  },
  {
    id: 'hist-5',
    chamadoId: 'ch-6',
    usuarioId: 'admin-1',
    statusAnterior: 'aberto',
    statusNovo: 'em_atendimento',
    observacao: 'Verificando servidor.',
    createdAt: new Date('2025-01-05T08:15:00'),
  },
  {
    id: 'hist-6',
    chamadoId: 'ch-6',
    usuarioId: 'admin-1',
    statusAnterior: 'em_atendimento',
    statusNovo: 'resolvido',
    observacao: 'Servidor reiniciado. Sistema normalizado.',
    createdAt: new Date('2025-01-05T10:00:00'),
  },
];

// Funções auxiliares
export function getUnidadeById(id: string): Unidade | undefined {
  return mockUnidades.find(u => u.id === id);
}

export function getProblemaById(id: string): Problema | undefined {
  return mockProblemas.find(p => p.id === id);
}

export function getUserById(id: string): User | undefined {
  return mockUsers.find(u => u.id === id);
}

export function getChamadoHistorico(chamadoId: string): ChamadoHistorico[] {
  return mockHistorico.filter(h => h.chamadoId === chamadoId).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
