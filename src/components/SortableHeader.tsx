import { SortConfig } from '@/hooks/useTableSort';

interface SortableHeaderProps<T> {
  label: string;
  sortKey: keyof T | string;
  sortConfig: SortConfig<T>;
  onSort: (key: keyof T | string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function SortableHeader<T>({
  label,
  sortKey,
  sortConfig,
  onSort,
  className = '',
  style,
}: SortableHeaderProps<T>) {
  const isActive = sortConfig.key === sortKey;
  const direction = isActive ? sortConfig.direction : null;

  return (
    <th
      className={`px-6 py-4 text-left text-sm font-semibold text-white cursor-pointer hover:bg-white/10 transition-colors select-none ${className}`}
      onClick={() => onSort(sortKey)}
      style={style}
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        <span className="text-xs">
          {direction === 'asc' ? '↑' : direction === 'desc' ? '↓' : '⇅'}
        </span>
      </div>
    </th>
  );
}
