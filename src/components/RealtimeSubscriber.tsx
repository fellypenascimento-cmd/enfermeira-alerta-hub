import { useRealtimeChamados } from '@/hooks/useRealtimeChamados';

/**
 * Componente invisível que mantém a subscription de realtime ativa para admins.
 * Separado do NotificationBell para garantir que a subscription inicie
 * independentemente do estado de renderização do sino.
 */
export function RealtimeSubscriber() {
  useRealtimeChamados();
  return null;
}
