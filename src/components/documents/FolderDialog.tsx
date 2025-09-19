// components/documents/FolderDialog.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Folder } from "@/types/documents";

interface FolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  folder: Folder | null;
  folders: Folder[];
  onSubmit: (data: {
    name: string;
    description?: string;
    parentId?: string;
    color?: string;
  }) => Promise<void>;
}

const FOLDER_COLORS = [
  { label: "Gray", value: "#6b7280" },
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#FF6B4A" },
  { label: "Yellow", value: "#eab308" },
  { label: "Green", value: "#22c55e" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Purple", value: "#a855f7" },
];

export function FolderDialog({
  open,
  onOpenChange,
  mode,
  folder,
  folders,
  onSubmit,
}: FolderDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [color, setColor] = useState("#6b7280");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (folder && mode === "edit") {
      setName(folder.name);
      setDescription(folder.description || "");
      setParentId(folder.parentId || "");
      setColor(folder.color || "#6b7280");
    } else {
      setName("");
      setDescription("");
      setParentId("");
      setColor("#6b7280");
    }
  }, [folder, mode]);

  const flattenFolders = (
    folders: Folder[],
    level = 0
  ): Array<Folder & { level: number }> => {
    let result: Array<Folder & { level: number }> = [];
    folders.forEach((f) => {
      // Don't allow selecting self or descendants as parent
      if (
        mode === "edit" &&
        folder &&
        (f.id === folder.id || isDescendant(f, folder.id))
      ) {
        return;
      }
      result.push({ ...f, level });
      if (f.children) {
        result = result.concat(flattenFolders(f.children, level + 1));
      }
    });
    return result;
  };

  const isDescendant = (folder: Folder, ancestorId: string): boolean => {
    if (folder.parentId === ancestorId) return true;
    if (folder.parentId) {
      const parent = folders.find((f) => f.id === folder.parentId);
      if (parent) return isDescendant(parent, ancestorId);
    }
    return false;
  };

  const flatFolders = flattenFolders(folders);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        parentId: parentId,
        color,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create New Folder" : "Edit Folder"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new folder to organize your documents"
              : "Update folder details"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Folder Name */}
          <div>
            <Label htmlFor="folderName">Folder Name</Label>
            <Input
              id="folderName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Contracts, Templates"
              className="mt-1.5"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5"
              rows={2}
              placeholder="Add a description..."
            />
          </div>

          {/* Parent Folder */}
          <div>
            <Label htmlFor="parent">Parent Folder (optional)</Label>
            <Select
              value={parentId ?? "__root__"}
              onValueChange={(val) =>
                setParentId(val === "__root__" ? undefined : val)
              }
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="No parent (root folder)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__root__">
                  No parent (root folder)
                </SelectItem>
                {flatFolders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Color */}
          <div>
            <Label>Folder Color</Label>
            <div className="grid grid-cols-4 gap-2 mt-1.5">
              {FOLDER_COLORS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setColor(value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    color === value
                      ? "border-gray-900"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  title={label}
                >
                  <div
                    className="h-4 w-full rounded"
                    style={{ backgroundColor: value }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
            className="bg-[#FF6B4A] hover:bg-[#FF6B4A]/90"
          >
            {submitting
              ? mode === "create"
                ? "Creating..."
                : "Updating..."
              : mode === "create"
                ? "Create Folder"
                : "Update Folder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
