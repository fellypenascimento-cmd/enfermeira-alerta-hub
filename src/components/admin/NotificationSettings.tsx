import React from 'react';
import { Bell, BellOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

export function NotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    preferences,
    loading,
    togglePush,
    toggleSound,
  } = usePushNotifications();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notificações
          </CardTitle>
          <CardDescription>
            Seu navegador não suporta notificações push.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const needsPermission = permission === 'default';
  const permissionDenied = permission === 'denied';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações de Chamados
        </CardTitle>
        <CardDescription>
          Receba alertas quando novos chamados forem abertos no sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {permissionDenied && (
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
            <p className="font-medium">Notificações bloqueadas</p>
            <p className="mt-1 text-muted-foreground">
              Você bloqueou as notificações para este site. Para ativar, acesse as configurações 
              do seu navegador e permita notificações para este site.
            </p>
          </div>
        )}

        {needsPermission && !isSubscribed && (
          <div className="rounded-md bg-primary/10 p-4">
            <p className="text-sm text-muted-foreground mb-3">
              Ative as notificações para ser alertado sobre novos chamados em tempo real.
            </p>
            <Button onClick={togglePush} size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Ativar Notificações
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {/* Push Notifications Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-toggle" className="flex items-center gap-2">
                {isSubscribed ? (
                  <Bell className="h-4 w-4 text-primary" />
                ) : (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                )}
                Notificações Push
              </Label>
              <p className="text-sm text-muted-foreground">
                Receber notificações do navegador quando houver novos chamados
              </p>
            </div>
            <Switch
              id="push-toggle"
              checked={isSubscribed}
              onCheckedChange={togglePush}
              disabled={permissionDenied}
            />
          </div>

          {/* Sound Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sound-toggle" className="flex items-center gap-2">
                {preferences.sound_enabled ? (
                  <Volume2 className="h-4 w-4 text-primary" />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                )}
                Som de Alerta
              </Label>
              <p className="text-sm text-muted-foreground">
                Reproduzir som quando um novo chamado for aberto
              </p>
            </div>
            <Switch
              id="sound-toggle"
              checked={preferences.sound_enabled}
              onCheckedChange={toggleSound}
            />
          </div>
        </div>

        {/* Status Info */}
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className={cn(
              "h-2 w-2 rounded-full",
              isSubscribed ? "bg-primary" : "bg-muted-foreground"
            )} />
            {isSubscribed ? 'Notificações ativas' : 'Notificações desativadas'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
