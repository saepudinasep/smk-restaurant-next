import { Badge } from '@/components/ui/badge';
import type { OrderPhase } from '@/lib/data/history';

const PHASE: Record<OrderPhase, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  paid: { label: 'Paid', variant: 'default' },
  awaiting: { label: 'Awaiting payment', variant: 'outline' },
  kitchen: { label: 'In kitchen', variant: 'secondary' },
};

/** Label status satu order: Paid / Awaiting payment / In kitchen. */
export function OrderStatusBadge({ phase }: { phase: OrderPhase }) {
  const { label, variant } = PHASE[phase];
  return <Badge variant={variant}>{label}</Badge>;
}
