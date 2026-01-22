import React from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useRealtimeChamados } from '@/hooks/useRealtimeChamados';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function NotificationBell() {
  const { novosCount, ultimosChamados, limparContador } = useRealtimeChamados();

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
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-foreground">Novos Chamados</p>
            {ultimosChamados.length > 0 && (
              <Link
                to="/admin/chamados"
                className="text-xs text-primary hover:underline"
              >
                Ver todos
              </Link>
            )}
          </div>

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
      </PopoverContent>
    </Popover>
  );
}
