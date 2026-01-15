import { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { FadeIn } from '@/components/animations';
import { useUsers } from '@/hooks/useUsers';
import { useUnidades } from '@/hooks/useUnidades';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import StatCard from '@/components/common/StatCard';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  UserPlus, 
  Edit, 
  UserX, 
  UserCheck, 
  Shield, 
  Trash2, 
  Search, 
  Users, 
  ArrowUpDown,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

type SortField = 'nome' | 'unidade';
type SortOrder = 'asc' | 'desc';

export default function Usuarios() {
  const { isAdmin, user: currentUser } = useAuth();
  const { data: usuarios, isLoading, refetch } = useUsers();
  const { data: unidades } = useUnidades();
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProfile, setFilterProfile] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // Form states
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    unidade_id: '',
    perfil_texto: '',
    isAdmin: false,
    ativo: true,
  });
  
  // Password change states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Email change states
  const [originalEmail, setOriginalEmail] = useState('');
  const [showEmailWarning, setShowEmailWarning] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Calculate statistics
  const stats = useMemo(() => {
    if (!usuarios) return { total: 0, ativos: 0, inativos: 0 };
    return {
      total: usuarios.length,
      ativos: usuarios.filter(u => u.ativo !== false).length,
      inativos: usuarios.filter(u => u.ativo === false).length,
    };
  }, [usuarios]);

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    if (!usuarios) return [];
    
    let result = [...usuarios];
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(u => 
        u.nome?.toLowerCase().includes(search) || 
        u.unidade?.nome?.toLowerCase().includes(search) ||
        u.email?.toLowerCase().includes(search)
      );
    }
    
    // Profile filter
    if (filterProfile !== 'all') {
      if (filterProfile === 'admin') {
        result = result.filter(u => u.role === 'admin');
      } else {
        result = result.filter(u => u.role !== 'admin');
      }
    }
    
    // Status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'ativo') {
        result = result.filter(u => u.ativo !== false);
      } else {
        result = result.filter(u => u.ativo === false);
      }
    }
    
    // Sorting
    result.sort((a, b) => {
      let valueA: string;
      let valueB: string;
      
      if (sortField === 'nome') {
        valueA = a.nome || '';
        valueB = b.nome || '';
      } else {
        valueA = a.unidade?.nome || '';
        valueB = b.unidade?.nome || '';
      }
      
      const comparison = valueA.localeCompare(valueB);
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [usuarios, searchTerm, filterProfile, filterStatus, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      senha: '',
      unidade_id: '',
      perfil_texto: '',
      isAdmin: false,
      ativo: true,
    });
    setEditingUser(null);
    setOriginalEmail('');
    setShowEmailWarning(false);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleOpenDialog = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        nome: user.nome || '',
        email: user.email || '',
        senha: '',
        unidade_id: user.unidade_id || '',
        perfil_texto: user.perfil_texto || '',
        isAdmin: user.role === 'admin',
        ativo: user.ativo !== false,
      });
      setOriginalEmail(user.email || '');
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleEmailChange = (newEmail: string) => {
    setFormData({ ...formData, email: newEmail });
    if (editingUser && newEmail !== originalEmail) {
      setShowEmailWarning(true);
    } else {
      setShowEmailWarning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const role = formData.isAdmin ? 'admin' : 'enfermeira';
    
    try {
      if (editingUser) {
        // Update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            nome: formData.nome,
            unidade_id: formData.unidade_id || null,
            perfil_texto: formData.perfil_texto || null,
            ativo: formData.ativo,
          })
          .eq('id', editingUser.id);

        if (profileError) throw profileError;

        // Update role (UPSERT)
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert(
            { user_id: editingUser.id, role },
            { onConflict: 'user_id' }
          );

        if (roleError) throw roleError;

        // Update email if changed
        if (formData.email !== originalEmail) {
          const response = await supabase.functions.invoke('update-user-email', {
            body: {
              user_id: editingUser.id,
              new_email: formData.email,
            },
          });

          if (response.error || response.data?.error) {
            throw new Error(response.data?.error || 'Erro ao atualizar email');
          }
        }

        toast.success('Usuário atualizado com sucesso!');
      } else {
        // Create new user via Edge Function
        const response = await supabase.functions.invoke('create-user', {
          body: {
            email: formData.email,
            password: formData.senha,
            nome: formData.nome,
            unidade_id: formData.unidade_id || undefined,
            role,
            perfil_texto: formData.perfil_texto || undefined,
          },
        });

        if (response.error) {
          throw new Error(response.error.message || 'Erro ao criar usuário');
        }

        if (response.data?.error) {
          throw new Error(response.data.error);
        }

        toast.success('Usuário criado com sucesso!');
      }

      setDialogOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Erro ao salvar usuário');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!editingUser) return;
    
    if (newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    
    setIsChangingPassword(true);
    
    try {
      const response = await supabase.functions.invoke('update-user-password', {
        body: {
          user_id: editingUser.id,
          new_password: newPassword,
        },
      });

      if (response.error || response.data?.error) {
        throw new Error(response.data?.error || 'Erro ao alterar senha');
      }

      toast.success('Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Erro ao alterar senha');
    } finally {
      setIsChangingPassword(false);
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

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const response = await supabase.functions.invoke('delete-user', {
        body: {
          user_id: userToDelete.id,
        },
      });

      if (response.error || response.data?.error) {
        throw new Error(response.data?.error || 'Erro ao excluir usuário');
      }

      toast.success('Usuário excluído com sucesso!');
      setUserToDelete(null);
      setDeleteConfirmation('');
      refetch();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Erro ao excluir usuário');
    } finally {
      setIsDeleting(false);
    }
  };

  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const passwordsValid = newPassword.length >= 6 && passwordsMatch;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
              <p className="text-muted-foreground">Gerencie os usuários do sistema</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
                      onChange={(e) => handleEmailChange(e.target.value)}
                      required
                    />
                    {showEmailWarning && (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span>Alterar o e-mail pode afetar o login do usuário.</span>
                      </div>
                    )}
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
                    <Label htmlFor="perfil_texto">Perfil</Label>
                    <Input
                      id="perfil_texto"
                      placeholder="Ex: Enfermeira, Técnico, Recepcionista"
                      value={formData.perfil_texto}
                      onChange={(e) => setFormData({ ...formData, perfil_texto: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="isAdmin" className="text-base flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Administrador
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Permite acesso completo ao sistema
                      </p>
                    </div>
                    <Switch
                      id="isAdmin"
                      checked={formData.isAdmin}
                      onCheckedChange={(checked) => setFormData({ ...formData, isAdmin: checked })}
                    />
                  </div>

                  {editingUser && (
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="ativo" className="text-base">Status</Label>
                        <p className="text-sm text-muted-foreground">
                          Usuários inativos não podem acessar o sistema
                        </p>
                      </div>
                      <Switch
                        id="ativo"
                        checked={formData.ativo}
                        onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                      />
                    </div>
                  )}

                  {/* Password change section - only for editing */}
                  {editingUser && (
                    <div className="border-t border-border pt-4 mt-4 space-y-4">
                      <h4 className="font-medium text-foreground">Alterar Senha</h4>
                      
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">Nova Senha</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? 'text' : 'password'}
                            placeholder="Mínimo 6 caracteres"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            tabIndex={-1}
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Repita a nova senha"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            tabIndex={-1}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {newPassword && confirmPassword && !passwordsMatch && (
                          <p className="text-sm text-destructive">As senhas não coincidem</p>
                        )}
                        {passwordsMatch && (
                          <p className="text-sm text-emerald-600">Senhas conferem ✓</p>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleChangePassword}
                        disabled={!passwordsValid || isChangingPassword}
                        className="w-full"
                      >
                        {isChangingPassword ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Alterando...
                          </>
                        ) : (
                          'Alterar Senha'
                        )}
                      </Button>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : editingUser ? 'Salvar' : 'Criar Usuário'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </FadeIn>

        {/* Statistics Cards */}
        <FadeIn delay={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Total de Usuários"
              value={stats.total}
              icon={<Users className="h-5 w-5" />}
            />
            <StatCard
              title="Usuários Ativos"
              value={stats.ativos}
              icon={<UserCheck className="h-5 w-5" />}
              variant="resolvido"
            />
            <StatCard
              title="Usuários Desativados"
              value={stats.inativos}
              icon={<UserX className="h-5 w-5" />}
            />
          </div>
        </FadeIn>

        {/* Search and Filters */}
        <FadeIn delay={0.2}>
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, unidade ou e-mail..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterProfile} onValueChange={setFilterProfile}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os perfis</SelectItem>
                    <SelectItem value="admin">Administradores</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="ativo">Ativos</SelectItem>
                    <SelectItem value="inativo">Desativados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Users Table */}
        <FadeIn delay={0.3}>
          <div className="bg-card rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleSort('nome')}
                  >
                    <div className="flex items-center gap-2">
                      Nome
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleSort('unidade')}
                  >
                    <div className="flex items-center gap-2">
                      Unidade
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
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
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-medium">{usuario.nome}</TableCell>
                      <TableCell>{usuario.email}</TableCell>
                      <TableCell>{usuario.unidade?.nome || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{usuario.perfil_texto || '-'}</span>
                          {usuario.role === 'admin' && (
                            <Badge variant="default" className="text-xs">
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={usuario.ativo !== false ? 'default' : 'outline'}>
                          {usuario.ativo !== false ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(usuario)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(usuario)}
                            title={usuario.ativo !== false ? 'Desativar' : 'Ativar'}
                          >
                            {usuario.ativo !== false ? (
                              <UserX className="h-4 w-4 text-amber-600" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-emerald-600" />
                            )}
                          </Button>
                          {usuario.id !== currentUser?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setUserToDelete(usuario)}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </FadeIn>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!userToDelete} onOpenChange={() => { setUserToDelete(null); setDeleteConfirmation(''); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Confirmar Exclusão
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>
                  Você está prestes a excluir o usuário <strong>{userToDelete?.nome}</strong>.
                </p>
                <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  <strong>Atenção:</strong> O usuário será removido do sistema, mas o histórico de chamados e ações será preservado.
                </div>
                <p>Para confirmar, digite <strong>EXCLUIR</strong> no campo abaixo:</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              placeholder="Digite EXCLUIR para confirmar"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value.toUpperCase())}
              className="mt-2"
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleteConfirmation !== 'EXCLUIR' || isDeleting}
                onClick={handleDeleteUser}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Excluir Usuário'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
