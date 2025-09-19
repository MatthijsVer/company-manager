// components/documents/MoveDocumentDialog.tsx
"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { FileText, Folder } from "lucide-react";
import type { Document, Folder as FolderType } from "@/types/documents";

interface MoveDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document;
  folders: FolderType[];
  currentFolderId: string;
  onMove: (targetFolderId: string) => Promise<void>;
}

export function MoveDocumentDialog({
  open,
  onOpenChange,
  document,
  folders,
  currentFolderId,
  onMove,
}: MoveDocumentDialogProps) {
  const [targetFolderId, setTargetFolderId] = useState("");
  const [moving, setMoving] = useState(false);

  const flattenFolders = (
    folders: FolderType[],
    level = 0
  ): Array<FolderType & { level: number }> => {
    let result: Array<FolderType & { level: number }> = [];
    folders.forEach((folder) => {
      // Don't show current folder as option
      if (folder.id !== currentFolderId) {
        result.push({ ...folder, level });
      }
      if (folder.children) {
        result = result.concat(flattenFolders(folder.children, level + 1));
      }
    });
    return result;
  };

  const flatFolders = flattenFolders(folders);

  const handleMove = async () => {
    if (!targetFolderId || targetFolderId === currentFolderId) return;

    setMoving(true);
    try {
      await onMove(targetFolderId);
      setTargetFolderId("");
      onOpenChange(false);
    } finally {
      setMoving(false);
    }
  };

  const currentFolder = folders.find((f) => f.id === currentFolderId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move Document</DialogTitle>
          <DialogDescription>
            Select a destination folder for this document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Document Info */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-[#FF6B4A]" />
              <span className="font-medium">{document.fileName}</span>
            </div>
            {currentFolder && (
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                <Folder className="h-4 w-4" />
                <span>Current folder: {currentFolder.name}</span>
              </div>
            )}
          </div>

          {/* Target Folder Selection */}
          <div>
            <Label htmlFor="targetFolder">Move to Folder</Label>
            <Select value={targetFolderId} onValueChange={setTargetFolderId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select destination folder" />
              </SelectTrigger>
              <SelectContent>
                {flatFolders.length === 0 ? (
                  <SelectItem value="" disabled>
                    No other folders available
                  </SelectItem>
                ) : (
                  flatFolders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <span
                        style={{ paddingLeft: `${folder.level * 1}rem` }}
                        className="flex items-center gap-2"
                      >
                        <Folder
                          className="h-3 w-3"
                          style={{ color: folder.color || "#6b7280" }}
                        />
                        {folder.name}
                        {folder.isSystemFolder && " (System)"}
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Warning if moving to different permission scope */}
          {targetFolderId && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Moving this document will inherit the permissions of the
                destination folder. Users without access to the new folder won't
                be able to see this document.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setTargetFolderId("");
              onOpenChange(false);
            }}
            disabled={moving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={
              moving || !targetFolderId || targetFolderId === currentFolderId
            }
            className="bg-[#FF6B4A] hover:bg-[#FF6B4A]/90"
          >
            {moving ? "Moving..." : "Move Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
