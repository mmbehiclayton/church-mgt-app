import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  /** When true, fills its container with a min-height to look intentional in big sections */
  bordered?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  bordered = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        bordered && "border border-dashed border-border rounded-xl py-14 px-6",
        !bordered && "py-12 px-6",
        className
      )}
    >
      {Icon && (
        <div className="h-14 w-14 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mb-4">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
