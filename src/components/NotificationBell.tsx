import React from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function NotificationBell() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-white/80 hover:text-white hover:bg-white/10"
        >
          <Bell className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-3">
          <p className="font-semibold text-foreground">Notificações</p>
          <p className="text-sm text-muted-foreground">
            Chamados são atualizados automaticamente em tempo real.
          </p>
          <Link
            to="/admin/chamados"
            className="block text-sm text-primary hover:underline"
          >
            Ver todos os chamados
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
