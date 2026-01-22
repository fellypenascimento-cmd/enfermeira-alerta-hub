import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useRealtimeChamados } from '@/hooks/useRealtimeChamados';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const { 
    novosCount, 
    ultimosChamados, 
    limparContador,
    isConnected,
    soundEnabled,
    toggleSound
  } = useRealtimeChamados();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-white/80 hover:text-white hover:bg-white/10"
          onClick={limparContador}
        >
          <Bell className="h-5 w-5" />
          {novosCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 p-0 flex items-center justify-center text-xs bg-red-500 hover:bg-red-500 border-0">
              {novosCount > 9 ? '9+' : novosCount}
            </Badge>
          )}
          {/* Indicador de conexão */}
          <span 
            className={cn(
              "absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white/20",
              isConnected ? "bg-green-500" : "bg-yellow-500"
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          {/* Header com status de conexão */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground">Notificações</p>
              <span 
                className={cn(
                  "flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full",
                  isConnected 
                    ? "bg-green-500/10 text-green-600" 
                    : "bg-yellow-500/10 text-yellow-600"
                )}
              >
                {isConnected ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    <span>Ao vivo</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    <span>Offline</span>
                  </>
                )}
              </span>
            </div>
            {ultimosChamados.length > 0 && (
              <Link
                to="/admin/chamados"
                className="text-xs text-primary hover:underline"
              >
                Ver todos
              </Link>
            )}
          </div>

          {/* Toggle de som */}
          <div className="flex items-center justify-between py-2 px-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
              <span>Som de notificação</span>
            </div>
            <Switch
              checked={soundEnabled}
              onCheckedChange={toggleSound}
              aria-label="Ativar som de notificação"
            />
          </div>

          <Separator />

          {/* Lista de chamados */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Chamados Recentes
            </p>
            {ultimosChamados.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhuma notificação recente
              </p>
            ) : (
              <div className="space-y-2">
                {ultimosChamados.map((chamado) => (
                  <Link
                    key={chamado.id}
                    to={`/admin/chamados`}
                    className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">
                        Chamado #{chamado.numero}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(chamado.data), 'HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                    {chamado.unidade && (
                      <p className="text-xs text-muted-foreground">
                        {chamado.unidade}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
