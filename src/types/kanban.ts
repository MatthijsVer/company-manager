export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Task {
    id: string;
    name: string;
    description?: string;
    status: string;
    priority: string;
    assignedTo?: {
      id: string;
      name: string;
      email: string;
      image?: string;
    };
    reporter?: {
      id: string;
      name: string;
      email: string;
      image?: string;
    };
    dueDate?: string;
    startDate?: string;
    estimatedHours?: number;
    position: number;
    columnOrder: number;
    labels?: Label[];
    _count?: {
      comments: number;
      attachments: number;
    };
    createdAt: string;
    updatedAt: string;
  }
  
  export interface ColumnConfig {
    id: string;
    title: string;
    color: string;
    bgColor: string;
    textColor: string;
    borderStyle: string;
    limit?: number;
    icon?: string;
    isVisible: boolean;
    order: number;
  }
  
  export interface CardStyle {
    showPriority: boolean;
    showAssignee: boolean;
    showDueDate: boolean;
    showDescription: boolean;
    showComments: boolean;
    showAttachments: boolean;
    showEstimate: boolean;
    showLabels: boolean;
    cardHeight: "compact" | "normal" | "expanded";
    borderRadius: string;
    shadow: string;
  }
  
  export interface BoardStyle {
    backgroundColor: string;
    columnSpacing: string;
    showColumnLimits: boolean;
    showEmptyMessage: boolean;
    compactMode: boolean;
  }
  
  export interface BoardSettings {
    columns: ColumnConfig[];
    cardStyle: CardStyle;
    boardStyle: BoardStyle;
  }