import React from 'react';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Table component with glassmorphic styling
 * Use with TableHeader, TableBody, TableRow, TableCell sub-components
 */
export function Table({ children, className = '' }: TableProps) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-white/10 ${className}`}>
      <table className="w-full text-white">
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-white/5 border-b border-white/10">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function TableRow({ children, className = '', onClick }: TableRowProps) {
  return (
    <tr
      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export function TableCell({ children, className = '', align = 'left' }: TableCellProps) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  }[align];

  return (
    <td className={`px-4 py-3 ${alignClass} ${className}`}>
      {children}
    </td>
  );
}

interface TableHeaderCellProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export function TableHeaderCell({ children, className = '', align = 'left' }: TableHeaderCellProps) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  }[align];

  return (
    <th className={`px-4 py-3 ${alignClass} font-semibold text-white/80 ${className}`}>
      {children}
    </th>
  );
}
