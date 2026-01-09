import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { useUsers } from '@/hooks/useUsers';
import { useUnidades } from '@/hooks/useUnidades';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, UserPlus, Edit, UserX, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

export default function Usuarios() {
  const { isAdmin } = useAuth();
  const { data: usuarios, isLoading, refetch } = useUsers();
  const { data: unidades } = useUnidades();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    unidade_id: '',
    role: 'enfermeira' as 'admin' | 'enfermeira',
  });

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      senha: '',
      unidade_id: '',
      role: 'enfermeira',
    });
    setEditingUser(null);
  };

  const handleOpenDialog = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        nome: user.nome,
        email: user.email,
        senha: '',
        unidade_id: user.unidade_id || '',
        role: user.role || 'enfermeira',
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        // Update existing user profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            nome: formData.nome,
            unidade_id: formData.unidade_id || null,
          })
          .eq('id', editingUser.id);

        if (profileError) throw profileError;

        // Update role if changed
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: formData.role })
          .eq('user_id', editingUser.id);

        if (roleError) throw roleError;

        toast.success('Usuário atualizado com sucesso!');
      } else {
        // Create new user via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.senha,
          options: {
            data: {
              nome: formData.nome,
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (authError) throw authError;

        if (authData.user) {
          // Update profile with unidade
          if (formData.unidade_id) {
            await supabase
              .from('profiles')
              .update({ unidade_id: formData.unidade_id })
              .eq('id', authData.user.id);
          }

          // Set role
          await supabase
            .from('user_roles')
            .insert({ user_id: authData.user.id, role: formData.role });
        }

        toast.success('Usuário criado com sucesso!');
      }

      setDialogOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Erro ao salvar usuário');
    }
  };

  const handleToggleActive = async (user: any) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ativo: !user.ativo })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(user.ativo ? 'Usuário desativado' : 'Usuário ativado');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar usuário');
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Gestão de Usuários"
        subtitle="Gerencie os usuários do sistema"
      />

      <div className="flex justify-end mb-6">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingUser}
                  required={!editingUser}
                />
              </div>

              {!editingUser && (
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha</Label>
                  <Input
                    id="senha"
                    type="password"
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="unidade">Unidade</Label>
                <Select
                  value={formData.unidade_id}
                  onValueChange={(value) => setFormData({ ...formData, unidade_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades?.map((unidade) => (
                      <SelectItem key={unidade.id} value={unidade.id}>
                        {unidade.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Perfil</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: 'admin' | 'enfermeira') => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enfermeira">Enfermeira</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingUser ? 'Salvar' : 'Criar Usuário'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : usuarios?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            ) : (
              usuarios?.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell className="font-medium">{usuario.nome}</TableCell>
                  <TableCell>{usuario.email}</TableCell>
                  <TableCell>{usuario.unidade?.nome || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={usuario.role === 'admin' ? 'default' : 'secondary'}>
                      {usuario.role === 'admin' ? 'Administrador' : 'Enfermeira'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={usuario.ativo ? 'default' : 'outline'}>
                      {usuario.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(usuario)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(usuario)}
                      >
                        {usuario.ativo ? (
                          <UserX className="h-4 w-4 text-destructive" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
