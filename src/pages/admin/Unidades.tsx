import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import {
  useUnidades, useCreateUnidade, useUpdateUnidade,
  useSalasPorUnidade, useCreateSalaUnidade, useUpdateSalaUnidade,
} from '@/hooks/useUnidades';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animations';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus, Search, Building2, Loader2, Edit, CheckCircle, XCircle, MapPin, DoorOpen,
} from 'lucide-react';
import type { Unidade } from '@/types/database';
import type { Sala } from '@/types/estoque';

function SalasManager({ unidade }: { unidade: Unidade }) {
  const { data: salas, isLoading } = useSalasPorUnidade(unidade.id, true);
  const createSala = useCreateSalaUnidade();
  const updateSala = useUpdateSalaUnidade();

  const [novaSala, setNovaSala] = useState('');
  const [editingSala, setEditingSala] = useState<Sala | null>(null);
  const [editNome, setEditNome] = useState('');

  const handleCreate = () => {
    if (!novaSala.trim()) return;
    createSala.mutate(
      { nome: novaSala.trim(), unidade_id: unidade.id },
      { onSuccess: () => setNovaSala('') }
    );
  };

  const handleSaveEdit = () => {
    if (!editingSala || !editNome.trim()) return;
    updateSala.mutate(
      { id: editingSala.id, nome: editNome.trim() },
      { onSuccess: () => setEditingSala(null) }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={novaSala}
          onChange={(e) => setNovaSala(e.target.value)}
          placeholder="Nome da nova sala (ex: Sala de Vacina)"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate(); } }}
        />
        <Button onClick={handleCreate} disabled={createSala.isPending || !novaSala.trim()}>
          {createSala.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : !salas || salas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhuma sala cadastrada</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {salas.map(sala => (
            <div key={sala.id} className="flex items-center gap-2 p-2 rounded border bg-muted/30">
              {editingSala?.id === sala.id ? (
                <>
                  <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} className="flex-1" />
                  <Button size="sm" onClick={handleSaveEdit} disabled={updateSala.isPending}>Salvar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingSala(null)}>X</Button>
                </>
              ) : (
                <>
                  <DoorOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{sala.nome}</span>
                  {!sala.ativa && <Badge variant="secondary">Inativa</Badge>}
                  <Button size="sm" variant="ghost" onClick={() => { setEditingSala(sala); setEditNome(sala.nome); }}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost"
                    onClick={() => updateSala.mutate({ id: sala.id, ativa: !sala.ativa })}>
                    {sala.ativa ? <XCircle className="w-3 h-3 text-destructive" /> : <CheckCircle className="w-3 h-3 text-green-600" />}
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Unidades() {
  const { isAdmin } = useAuth();
  const { data: unidades, isLoading } = useUnidades({ includeInactive: true });
  const createUnidade = useCreateUnidade();
  const updateUnidade = useUpdateUnidade();

  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnidade, setEditingUnidade] = useState<Unidade | null>(null);
  const [formData, setFormData] = useState({ nome: '', endereco: '' });

  const [salasDialogOpen, setSalasDialogOpen] = useState(false);
  const [unidadeSalas, setUnidadeSalas] = useState<Unidade | null>(null);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const filteredUnidades = unidades?.filter((u) =>
    u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.endereco?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const resetForm = () => { setFormData({ nome: '', endereco: '' }); setEditingUnidade(null); };
  const openCreateDialog = () => { resetForm(); setDialogOpen(true); };
  const openEditDialog = (u: Unidade) => {
    setEditingUnidade(u);
    setFormData({ nome: u.nome, endereco: u.endereco || '' });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingUnidade) {
      updateUnidade.mutate(
        { id: editingUnidade.id, nome: formData.nome, endereco: formData.endereco || undefined },
        { onSuccess: () => { setDialogOpen(false); resetForm(); } }
      );
    } else {
      createUnidade.mutate(
        { nome: formData.nome, endereco: formData.endereco || undefined },
        { onSuccess: () => { setDialogOpen(false); resetForm(); } }
      );
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Gestão de Unidades</h1>
              <p className="text-muted-foreground">Gerencie unidades e suas salas.</p>
            </div>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="w-5 h-5" />Nova Unidade
            </Button>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        <p className="text-sm text-muted-foreground">{filteredUnidades.length} unidade(s)</p>

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filteredUnidades.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">Nenhuma unidade encontrada</h3>
              {!searchTerm && <Button onClick={openCreateDialog}>Criar Unidade</Button>}
            </CardContent>
          </Card>
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
                        <MapPin className="w-3 h-3" />{unidade.endereco}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(unidade)}>
                        <Edit className="w-4 h-4 mr-1" />Editar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setUnidadeSalas(unidade); setSalasDialogOpen(true); }}>
                        <DoorOpen className="w-4 h-4 mr-1" />Salas
                      </Button>
                      <Button size="sm" variant={unidade.ativa ? 'destructive' : 'default'} className="col-span-2"
                        onClick={() => updateUnidade.mutate({ id: unidade.id, ativa: !unidade.ativa })}>
                        {unidade.ativa ? <><XCircle className="w-4 h-4 mr-1" />Desativar</> : <><CheckCircle className="w-4 h-4 mr-1" />Ativar</>}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}

        {/* Dialog Unidade */}
        <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUnidade ? 'Editar Unidade' : 'Nova Unidade'}</DialogTitle>
              <DialogDescription>{editingUnidade ? 'Atualize os dados.' : 'Preencha os dados.'}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Unidade</Label>
                <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: UBS Centro" />
              </div>
              <div className="space-y-2">
                <Label>Endereço (opcional)</Label>
                <Input value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} placeholder="Ex: Rua Principal, 123" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={createUnidade.isPending || updateUnidade.isPending}>
                {(createUnidade.isPending || updateUnidade.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingUnidade ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Salas */}
        <Dialog open={salasDialogOpen} onOpenChange={(o) => { if (!o) { setSalasDialogOpen(false); setUnidadeSalas(null); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DoorOpen className="w-5 h-5" />Salas — {unidadeSalas?.nome}
              </DialogTitle>
              <DialogDescription>Gerencie as salas desta unidade. Use o botão de toggle para ativar/desativar.</DialogDescription>
            </DialogHeader>
            {unidadeSalas && <SalasManager unidade={unidadeSalas} />}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSalasDialogOpen(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
