import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useProblemas, useCreateProblema, useUpdateProblema } from '@/hooks/useProblemas';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Plus,
  Search, 
  FolderOpen,
  Loader2,
  Edit,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import type { Problema } from '@/types/database';

export default function Problemas() {
  const { isAdmin } = useAuth();
  const { data: problemas, isLoading } = useProblemas({ includeInactive: true });
  const createProblema = useCreateProblema();
  const updateProblema = useUpdateProblema();

  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProblema, setEditingProblema] = useState<Problema | null>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
  });

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const filteredProblemas = problemas?.filter((problema) => 
    problema.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    problema.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const resetForm = () => {
    setFormData({ titulo: '', descricao: '' });
    setEditingProblema(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (problema: Problema) => {
    setEditingProblema(problema);
    setFormData({
      titulo: problema.titulo,
      descricao: problema.descricao || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingProblema) {
      updateProblema.mutate(
        {
          id: editingProblema.id,
          titulo: formData.titulo,
          descricao: formData.descricao || undefined,
        },
        {
          onSuccess: () => {
            setDialogOpen(false);
            resetForm();
          },
        }
      );
    } else {
      createProblema.mutate(
        {
          titulo: formData.titulo,
          descricao: formData.descricao || undefined,
        },
        {
          onSuccess: () => {
            setDialogOpen(false);
            resetForm();
          },
        }
      );
    }
  };

  const toggleProblemaActive = (problema: Problema) => {
    updateProblema.mutate({
      id: problema.id,
      ativo: !problema.ativo,
    });
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Catálogo de Problemas</h1>
              <p className="text-muted-foreground">
                Gerencie os tipos de problemas disponíveis para abertura de chamados.
              </p>
            </div>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="w-5 h-5" />
              Novo Problema
            </Button>
          </div>
        </FadeIn>

        {/* Search */}
        <FadeIn delay={0.1}>
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Results count */}
        <FadeIn delay={0.15}>
          <p className="text-sm text-muted-foreground">
            {filteredProblemas.length} problema(s) encontrado(s)
          </p>
        </FadeIn>

        {/* Problemas List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredProblemas.length === 0 ? (
          <FadeIn delay={0.2}>
            <Card>
              <CardContent className="py-12 text-center">
                <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">
                  Nenhum problema encontrado
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'Tente ajustar sua busca.' : 'Comece criando o primeiro tipo de problema.'}
                </p>
                {!searchTerm && (
                  <Button onClick={openCreateDialog}>Criar Problema</Button>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        ) : (
          <StaggerContainer className="space-y-3">
            {filteredProblemas.map((problema) => (
              <StaggerItem key={problema.id}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground">{problema.titulo}</h3>
                          <Badge variant={problema.ativo ? 'success' : 'secondary'}>
                            {problema.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        {problema.descricao && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {problema.descricao}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 shrink-0">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openEditDialog(problema)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant={problema.ativo ? 'destructive' : 'default'}
                          onClick={() => toggleProblemaActive(problema)}
                        >
                          {problema.ativo ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProblema ? 'Editar Problema' : 'Novo Problema'}
              </DialogTitle>
              <DialogDescription>
                {editingProblema ? 'Atualize os dados do problema.' : 'Preencha os dados para criar um novo tipo de problema.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ex: Sistema não inicia"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva o tipo de problema..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={createProblema.isPending || updateProblema.isPending}>
                {(createProblema.isPending || updateProblema.isPending) && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                {editingProblema ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
