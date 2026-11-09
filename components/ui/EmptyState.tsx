interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
        <span className="text-xl">📭</span>
      </div>
      <p className="text-sm font-medium text-zinc-700">{title}</p>
      {description && <p className="text-xs text-zinc-400 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
