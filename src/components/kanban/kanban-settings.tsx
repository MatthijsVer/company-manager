"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Settings,
  Trash2,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Palette,
  Eye,
  EyeOff,
  Columns3,
  CreditCard,
  Layout,
  Sparkles,
  Save,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BoardSettings, ColumnConfig } from "@/types/kanban";

interface KanbanSettingsPopoverProps {
  settings: BoardSettings;
  onUpdateSettings: (settings: BoardSettings) => void;
}

type TabType = "columns" | "cards" | "board";

export function KanbanSettingsPopover({
  settings,
  onUpdateSettings,
}: KanbanSettingsPopoverProps) {
  const [localSettings, setLocalSettings] = useState<BoardSettings>(settings);
  const [isOpen, setIsOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("columns");

  const handleSave = () => {
    onUpdateSettings(localSettings);
    setHasChanges(false);
    toast.success("Settings saved");
  };

  const handleReset = () => {
    if (confirm("Reset all settings to default? This cannot be undone.")) {
      const defaultSettings: BoardSettings = {
        columns: [
          {
            id: "TODO",
            title: "To Do",
            color: "#E5E7EB",
            bgColor: "#F9FAFB",
            textColor: "#111827",
            borderStyle: "solid",
            icon: "circle",
            isVisible: true,
            order: 0,
          },
          {
            id: "IN_PROGRESS",
            title: "In Progress",
            color: "#E5E7EB",
            bgColor: "#F9FAFB",
            textColor: "#111827",
            borderStyle: "solid",
            icon: "alert-circle",
            limit: 5,
            isVisible: true,
            order: 1,
          },
          {
            id: "REVIEW",
            title: "In Review",
            color: "#E5E7EB",
            bgColor: "#F9FAFB",
            textColor: "#111827",
            borderStyle: "solid",
            icon: "clock",
            isVisible: true,
            order: 2,
          },
          {
            id: "COMPLETED",
            title: "Done",
            color: "#E5E7EB",
            bgColor: "#F9FAFB",
            textColor: "#111827",
            borderStyle: "solid",
            icon: "check-circle",
            isVisible: true,
            order: 3,
          },
        ],
        cardStyle: {
          showPriority: true,
          showAssignee: true,
          showDueDate: true,
          showDescription: true,
          showComments: true,
          showAttachments: true,
          showEstimate: false,
          cardHeight: "normal",
          borderRadius: "1rem",
          shadow: "shadow-sm",
        },
        boardStyle: {
          backgroundColor: "#F9FAFB",
          columnSpacing: "0.5rem",
          showColumnLimits: true,
          showEmptyMessage: true,
          compactMode: false,
        },
      };
      setLocalSettings(defaultSettings);
      setHasChanges(true);
      toast.success("Settings reset to defaults");
    }
  };

  const updateSetting = (updates: any) => {
    setLocalSettings({ ...localSettings, ...updates });
    setHasChanges(true);
  };

  const handleUpdateColumn = (
    columnId: string,
    updates: Partial<ColumnConfig>
  ) => {
    updateSetting({
      columns: localSettings.columns.map((col) =>
        col.id === columnId ? { ...col, ...updates } : col
      ),
    });
  };

  const handleDeleteColumn = (columnId: string) => {
    updateSetting({
      columns: localSettings.columns.filter((col) => col.id !== columnId),
    });
    toast.success("Column removed");
  };

  const handleReorderColumn = (columnId: string, direction: "up" | "down") => {
    const columns = [...localSettings.columns];
    const index = columns.findIndex((col) => col.id === columnId);

    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === columns.length - 1)
    ) {
      return;
    }

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [columns[index], columns[swapIndex]] = [columns[swapIndex], columns[index]];
    columns.forEach((col, i) => (col.order = i));

    updateSetting({ columns });
  };

  const handleAddColumn = () => {
    const newColumn: ColumnConfig = {
      id: `CUSTOM_${Date.now()}`,
      title: "New Column",
      color: "#E5E7EB",
      bgColor: "#F9FAFB",
      textColor: "#111827",
      borderStyle: "solid",
      icon: "circle",
      isVisible: true,
      order: localSettings.columns.length,
    };

    updateSetting({
      columns: [...localSettings.columns, newColumn],
    });
    toast.success("Column added");
  };

  const tabs = [
    {
      id: "columns" as TabType,
      label: "Columns",
      icon: Columns3,
    },
    {
      id: "cards" as TabType,
      label: "Cards",
      icon: CreditCard,
    },
    {
      id: "board" as TabType,
      label: "Board",
      icon: Layout,
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "columns":
        return (
          <div className="">
            <div className="flex justify-between p-4 border-b items-center">
              <p className="text-sm font-medium">Manage your board columns</p>
              <Button
                size="sm"
                onClick={handleAddColumn}
                className="h-7 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>

            <div className="space-y-2 p-4">
              {localSettings.columns
                .sort((a, b) => a.order - b.order)
                .map((column, index) => (
                  <div
                    key={column.id}
                    className="group relative flex items-center bg-accent/50 gap-2 p-2.5 rounded-lg border transition-colors"
                  >
                    <Switch
                      checked={column.isVisible}
                      onCheckedChange={(checked) =>
                        handleUpdateColumn(column.id, {
                          isVisible: checked,
                        })
                      }
                      className="scale-90"
                    />

                    <Input
                      value={column.title}
                      onChange={(e) =>
                        handleUpdateColumn(column.id, {
                          title: e.target.value,
                        })
                      }
                      className="h-7 bg-white text-xs flex-1"
                    />

                    <div className="flex items-center gap-0.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReorderColumn(column.id, "up")}
                        disabled={index === 0}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReorderColumn(column.id, "down")}
                        disabled={index === localSettings.columns.length - 1}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteColumn(column.id)}
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        );

      case "cards":
        return (
          <div className="">
            <div className="flex justify-between p-4 border-b items-center">
              <p className="text-sm font-medium">
                Customize how cards appear on your board
              </p>
            </div>

            <div className="space-y-1 p-4">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Card Information
              </Label>
              <div className="space-y-2 mt-2">
                {Object.entries({
                  showPriority: "Priority Badge",
                  showAssignee: "Assignee Avatar",
                  showDueDate: "Due Date",
                  showDescription: "Description Preview",
                  showComments: "Comments Count",
                  showAttachments: "Attachments Count",
                  showEstimate: "Time Estimate",
                }).map(([key, label]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-1.5 rounded transition-colors"
                  >
                    <Label
                      htmlFor={key}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {label}
                    </Label>
                    <Switch
                      id={key}
                      checked={
                        localSettings.cardStyle[
                          key as keyof typeof localSettings.cardStyle
                        ] as boolean
                      }
                      onCheckedChange={(checked) => {
                        updateSetting({
                          cardStyle: {
                            ...localSettings.cardStyle,
                            [key]: checked,
                          },
                        });
                      }}
                      className="scale-90"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3 p-4">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Card Appearance
              </Label>

              <div className="flex items-center justify-between py-1.5 rounded transition-colors">
                <Label htmlFor="card-height" className="text-sm font-medium">
                  Card Size
                </Label>
                <Select
                  value={localSettings.cardStyle.cardHeight}
                  onValueChange={(value: any) => {
                    updateSetting({
                      cardStyle: {
                        ...localSettings.cardStyle,
                        cardHeight: value,
                      },
                    });
                  }}
                >
                  <SelectTrigger className="w-28 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="expanded">Expanded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case "board":
        return (
          <div className="">
            <div className="flex justify-between p-4 border-b items-center">
              <p className="text-sm font-medium">
                Adjust overall board appearance and behavior
              </p>
            </div>

            <div className="space-y-1 p-4">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Display Options
              </Label>
              <div className="space-y-2 mt-2">
                <div className="flex items-center justify-between py-1.5 transition-colors">
                  <Label
                    htmlFor="compact-mode"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Compact Mode
                  </Label>
                  <Switch
                    id="compact-mode"
                    checked={localSettings.boardStyle.compactMode}
                    onCheckedChange={(checked) => {
                      updateSetting({
                        boardStyle: {
                          ...localSettings.boardStyle,
                          compactMode: checked,
                        },
                      });
                    }}
                    className="scale-90"
                  />
                </div>

                <div className="flex items-center justify-between py-1.5 transition-colors">
                  <Label
                    htmlFor="show-limits"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Show Column Limits
                  </Label>
                  <Switch
                    id="show-limits"
                    checked={localSettings.boardStyle.showColumnLimits}
                    onCheckedChange={(checked) => {
                      updateSetting({
                        boardStyle: {
                          ...localSettings.boardStyle,
                          showColumnLimits: checked,
                        },
                      });
                    }}
                    className="scale-90"
                  />
                </div>

                <div className="flex items-center justify-between py-1.5 transition-colors">
                  <Label
                    htmlFor="show-empty"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Show Empty State Message
                  </Label>
                  <Switch
                    id="show-empty"
                    checked={localSettings.boardStyle.showEmptyMessage}
                    onCheckedChange={(checked) => {
                      updateSetting({
                        boardStyle: {
                          ...localSettings.boardStyle,
                          showEmptyMessage: checked,
                        },
                      });
                    }}
                    className="scale-90"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Settings className="h-4 w-4" />
          {hasChanges && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#FF6B4A]" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[640px] rounded-2xl overflow-hidden"
        align="end"
      >
        {/* Main Content */}
        <div className="flex h-[450px]">
          {/* Sidebar Navigation */}
          <div className="w-[180px] bg-white border-r p-4">
            <nav className="space-y-1 h-full flex flex-col">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                      "hover:bg-accent/50",
                      isActive && "bg-muted"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 mt-0.5 shrink-0",
                        isActive ? "text-black" : "text-muted-foreground"
                      )}
                    />
                    <div className="space-y-0.5">
                      <div
                        className={cn(
                          "text-sm font-medium",
                          isActive ? "text-black" : "text-muted-foreground"
                        )}
                      >
                        {tab.label}
                      </div>
                    </div>
                  </button>
                );
              })}
              <div className="w-full mt-auto flex items-center">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleReset}
                  className="h-8 px-2 w-full flex justify-start"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reset to default
                </Button>
              </div>
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full relative">
              <div className="pb-12">
                {renderTabContent()}
                {hasChanges && (
                  <Button
                    className="absolute bottom-3 right-3"
                    onClick={handleSave}
                  >
                    Save
                  </Button>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
