"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      {icon && (
        <div className="p-4 rounded-2xl bg-foreground/5 border border-border mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground/90 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground/80 max-w-sm mb-6">{description}</p>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          variant="outline"
          className="gap-2 text-foreground border-border hover:bg-foreground/5 hover:border-foreground/20"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

