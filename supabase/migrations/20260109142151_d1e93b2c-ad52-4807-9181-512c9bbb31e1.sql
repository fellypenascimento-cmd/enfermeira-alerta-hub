-- Enum para roles de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'enfermeira');

-- Enum para status dos chamados
CREATE TYPE public.chamado_status AS ENUM ('aberto', 'em_atendimento', 'resolvido');

-- Tabela de perfis de usuários
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  unidade_id UUID,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de roles (separada por segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'enfermeira',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Tabela de Unidades Básicas de Saúde
CREATE TABLE public.unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  endereco TEXT,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Problemas (catálogo)
CREATE TABLE public.problemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Chamados
CREATE TABLE public.chamados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero SERIAL,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  unidade_id UUID REFERENCES public.unidades(id) ON DELETE SET NULL,
  problema_id UUID REFERENCES public.problemas(id) ON DELETE SET NULL,
  problema_texto TEXT,
  descricao TEXT NOT NULL,
  status chamado_status DEFAULT 'aberto',
  atendente_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  data_abertura TIMESTAMP WITH TIME ZONE DEFAULT now(),
  data_atendimento TIMESTAMP WITH TIME ZONE,
  data_fechamento TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de histórico de chamados
CREATE TABLE public.chamados_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID REFERENCES public.chamados(id) ON DELETE CASCADE NOT NULL,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status_anterior chamado_status,
  status_novo chamado_status,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar foreign key de unidade no profiles
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_unidade_fkey 
FOREIGN KEY (unidade_id) REFERENCES public.unidades(id) ON DELETE SET NULL;

-- Enable RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamados_historico ENABLE ROW LEVEL SECURITY;

-- Função para verificar role do usuário
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_unidades_updated_at
  BEFORE UPDATE ON public.unidades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_problemas_updated_at
  BEFORE UPDATE ON public.problemas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chamados_updated_at
  BEFORE UPDATE ON public.chamados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil ao registrar usuário
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies para profiles
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins podem ver todos os perfis"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem inserir perfis"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem atualizar perfis"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para user_roles
CREATE POLICY "Usuários podem ver sua própria role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins podem ver todas as roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem gerenciar roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para unidades (todos autenticados podem ver, só admin modifica)
CREATE POLICY "Usuários autenticados podem ver unidades ativas"
  ON public.unidades FOR SELECT
  TO authenticated
  USING (ativa = true);

CREATE POLICY "Admins podem ver todas unidades"
  ON public.unidades FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem gerenciar unidades"
  ON public.unidades FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para problemas (todos autenticados podem ver, só admin modifica)
CREATE POLICY "Usuários autenticados podem ver problemas ativos"
  ON public.problemas FOR SELECT
  TO authenticated
  USING (ativo = true);

CREATE POLICY "Admins podem ver todos problemas"
  ON public.problemas FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem gerenciar problemas"
  ON public.problemas FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para chamados
CREATE POLICY "Enfermeiras podem ver seus próprios chamados"
  ON public.chamados FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Admins podem ver todos os chamados"
  ON public.chamados FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuários autenticados podem criar chamados"
  ON public.chamados FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Admins podem atualizar chamados"
  ON public.chamados FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para chamados_historico
CREATE POLICY "Enfermeiras podem ver histórico dos seus chamados"
  ON public.chamados_historico FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chamados c
      WHERE c.id = chamado_id AND c.usuario_id = auth.uid()
    )
  );

CREATE POLICY "Admins podem ver todo histórico"
  ON public.chamados_historico FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuários autenticados podem inserir histórico"
  ON public.chamados_historico FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Admins podem inserir histórico"
  ON public.chamados_historico FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));