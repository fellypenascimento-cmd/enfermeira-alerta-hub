import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Volume2, VolumeX, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const {
    isSupported,
    isSubscribed,
    preferences,
    loading,
    togglePush,
    toggleSound,
    subscribe,
  } = usePushNotifications();

  // Auto-solicitar permissão de push no primeiro acesso (após interação)
  useEffect(() => {
    // Não fazer nada se já está inscrito ou carregando
    if (loading || isSubscribed || !isSupported) return;

    // Listener para detectar primeira interação do usuário
    const handleFirstInteraction = () => {
      // Remover listener após primeira interação
      document.removeEventListener('click', handleFirstInteraction);
      
      // Esperar um pouco e então solicitar permissão
      setTimeout(() => {
        if (Notification.permission === 'default') {
          subscribe();
        }
      }, 3000);
    };

    document.addEventListener('click', handleFirstInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
    };
  }, [loading, isSubscribed, isSupported, subscribe]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-white/80 hover:text-white hover:bg-white/10"
        >
          <Bell className="h-5 w-5" />
          {isSubscribed && (
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-[#1e3a5f]" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div>
            <p className="font-semibold text-foreground flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificações
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Alertas em tempo real para novos chamados
            </p>
          </div>

          <Separator />

          {!isSupported ? (
            <p className="text-sm text-muted-foreground">
              Seu navegador não suporta notificações push.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Push Toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="bell-push" className="text-sm flex items-center gap-2">
                  <Bell className={cn("h-4 w-4", isSubscribed ? "text-primary" : "text-muted-foreground")} />
                  Notificações Push
                </Label>
                <Switch
                  id="bell-push"
                  checked={isSubscribed}
                  onCheckedChange={togglePush}
                  disabled={loading}
                />
              </div>

              {/* Sound Toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="bell-sound" className="text-sm flex items-center gap-2">
                  {preferences.sound_enabled ? (
                    <Volume2 className="h-4 w-4 text-primary" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                  )}
                  Som de Alerta
                </Label>
                <Switch
                  id="bell-sound"
                  checked={preferences.sound_enabled}
                  onCheckedChange={toggleSound}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <div className={cn(
                "h-2 w-2 rounded-full",
                isSubscribed ? "bg-primary" : "bg-muted-foreground"
              )} />
              {isSubscribed ? 'Push ativo' : 'Push inativo'}
            </span>
            <Link
              to="/admin/chamados"
              className="text-primary hover:underline"
            >
              Ver chamados
            </Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
