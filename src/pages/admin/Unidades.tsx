import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useUnidades, useCreateUnidade, useUpdateUnidade } from '@/hooks/useUnidades';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Building2,
  Loader2,
  Edit,
  CheckCircle,
  XCircle,
  MapPin
} from 'lucide-react';
import type { Unidade } from '@/types/database';

export default function Unidades() {
  const { isAdmin } = useAuth();
  const { data: unidades, isLoading } = useUnidades({ includeInactive: true });
  const createUnidade = useCreateUnidade();
  const updateUnidade = useUpdateUnidade();

  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnidade, setEditingUnidade] = useState<Unidade | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
  });

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const filteredUnidades = unidades?.filter((unidade) => 
    unidade.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unidade.endereco?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const resetForm = () => {
    setFormData({ nome: '', endereco: '' });
    setEditingUnidade(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (unidade: Unidade) => {
    setEditingUnidade(unidade);
    setFormData({
      nome: unidade.nome,
      endereco: unidade.endereco || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingUnidade) {
      updateUnidade.mutate(
        {
          id: editingUnidade.id,
          nome: formData.nome,
          endereco: formData.endereco || undefined,
        },
        {
          onSuccess: () => {
            setDialogOpen(false);
            resetForm();
          },
        }
      );
    } else {
      createUnidade.mutate(
        {
          nome: formData.nome,
          endereco: formData.endereco || undefined,
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

  const toggleUnidadeActive = (unidade: Unidade) => {
    updateUnidade.mutate({
      id: unidade.id,
      ativa: !unidade.ativa,
    });
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Gestão de Unidades</h1>
              <p className="text-muted-foreground">
                Gerencie as Unidades Básicas de Saúde do sistema.
              </p>
            </div>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="w-5 h-5" />
              Nova Unidade
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
                  placeholder="Buscar por nome ou endereço..."
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
            {filteredUnidades.length} unidade(s) encontrada(s)
          </p>
        </FadeIn>

        {/* Unidades List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredUnidades.length === 0 ? (
          <FadeIn delay={0.2}>
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">
                  Nenhuma unidade encontrada
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'Tente ajustar sua busca.' : 'Comece criando a primeira unidade.'}
                </p>
                {!searchTerm && (
                  <Button onClick={openCreateDialog}>Criar Unidade</Button>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        ) : (
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUnidades.map((unidade) => (
              <StaggerItem key={unidade.id}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <Badge variant={unidade.ativa ? 'success' : 'secondary'}>
                        {unidade.ativa ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    <h3 className="font-medium text-foreground mb-1">{unidade.nome}</h3>
                    {unidade.endereco && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {unidade.endereco}
                      </p>
                    )}
                    <div className="flex gap-2 mt-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1"
                        onClick={() => openEditDialog(unidade)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        size="sm" 
                        variant={unidade.ativa ? 'destructive' : 'default'}
                        onClick={() => toggleUnidadeActive(unidade)}
                      >
                        {unidade.ativa ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </Button>
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
                {editingUnidade ? 'Editar Unidade' : 'Nova Unidade'}
              </DialogTitle>
              <DialogDescription>
                {editingUnidade ? 'Atualize os dados da unidade.' : 'Preencha os dados para criar uma nova unidade.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Unidade</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: UBS Centro"
                />
              </div>
              <div className="space-y-2">
                <Label>Endereço (opcional)</Label>
                <Input
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Ex: Rua Principal, 123"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={createUnidade.isPending || updateUnidade.isPending}>
                {(createUnidade.isPending || updateUnidade.isPending) && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                {editingUnidade ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
