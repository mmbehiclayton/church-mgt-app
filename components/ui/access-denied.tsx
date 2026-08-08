import { Lock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface AccessDeniedProps {
  description: string;
  title?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export function AccessDenied({
  description,
  title = "Access Denied",
  icon = Lock,
  className,
}: AccessDeniedProps) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      className={className}
    />
  );
}
