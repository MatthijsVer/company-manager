"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Label } from "@/types/kanban";

interface TaskLabelProps {
  label: Label;
  size?: "sm" | "md" | "lg";
  variant?: "solid" | "outline";
}

export function TaskLabel({ 
  label, 
  size = "sm",
  variant = "solid" 
}: TaskLabelProps) {
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5 h-5",
    md: "text-sm px-2 py-1 h-6", 
    lg: "text-sm px-2.5 py-1.5 h-7"
  };

  const getTextColor = (bgColor: string) => {
    // Convert hex to RGB
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return white for dark colors, dark for light colors
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  if (variant === "outline") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "font-medium border-2 rounded-full",
          sizeClasses[size]
        )}
        style={{
          borderColor: label.color,
          color: label.color,
          backgroundColor: 'transparent'
        }}
      >
        {label.name}
      </Badge>
    );
  }

  return (
    <Badge
      className={cn(
        "font-medium border-0 rounded-full",
        sizeClasses[size]
      )}
      style={{
        backgroundColor: label.color,
        color: getTextColor(label.color)
      }}
    >
      {label.name}
    </Badge>
  );
}

interface TaskLabelsProps {
  labels: Label[];
  maxVisible?: number;
  size?: "sm" | "md" | "lg";
  variant?: "solid" | "outline";
}

export function TaskLabels({ 
  labels, 
  maxVisible = 3, 
  size = "sm",
  variant = "solid" 
}: TaskLabelsProps) {
  if (!labels || labels.length === 0) {
    return null;
  }

  const visibleLabels = labels.slice(0, maxVisible);
  const remainingCount = labels.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1">
      {visibleLabels.map((label) => (
        <TaskLabel 
          key={label.id} 
          label={label} 
          size={size}
          variant={variant}
        />
      ))}
      {remainingCount > 0 && (
        <Badge 
          variant="secondary" 
          className={cn(
            "font-medium rounded-full",
            size === "sm" && "text-xs px-1.5 py-0.5 h-5",
            size === "md" && "text-sm px-2 py-1 h-6",
            size === "lg" && "text-sm px-2.5 py-1.5 h-7"
          )}
        >
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
}