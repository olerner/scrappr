import type { ListingStatus } from '../data/types';

const statusConfig: Record<ListingStatus, { label: string; dotColor: string; bgColor: string; textColor: string }> = {
  available: { label: 'Available', dotColor: 'bg-emerald-500', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700' },
  claimed: { label: 'Claimed', dotColor: 'bg-yellow-500', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700' },
  completed: { label: 'Completed', dotColor: 'bg-gray-400', bgColor: 'bg-gray-100', textColor: 'text-gray-600' },
};

export function StatusBadge({ status }: { status: ListingStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
      <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  );
}
