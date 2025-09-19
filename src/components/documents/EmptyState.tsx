"use client";

import { Button } from "@/components/ui/button";
import { Folder, Upload, FolderPlus } from "lucide-react";

interface EmptyStateProps {
  onCreateFolder: () => void;
  onUpload: () => void;
}

export function EmptyState({ onCreateFolder, onUpload }: EmptyStateProps) {
  return (
    <div className="text-center py-12 bg-white rounded-xl">
      <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <p className="text-lg font-medium text-gray-900">No documents found</p>
      <p className="text-sm text-gray-500 mt-1">
        Create a folder or upload your first document to get started
      </p>
      <div className="flex items-center justify-center gap-3 mt-4">
        <Button
          onClick={onCreateFolder}
          variant="outline"
          className="inline-flex items-center"
        >
          <FolderPlus className="h-4 w-4 mr-2" />
          Create Folder
        </Button>
        <Button
          onClick={onUpload}
          className="bg-[#FF6B4A] hover:bg-[#FF6B4A]/90 inline-flex items-center"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>
    </div>
  );
}
