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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Upload } from "lucide-react";
import type { Folder, Company } from "@/types/documents";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  companies: Company[];
  defaultFolderId?: string | null;
  onUpload: (data: {
    file: File;
    folderId: string;
    description?: string;
    tags?: string[];
    isTemplate: boolean;
    linkedCompanies: string[];
  }) => Promise<void>;
}

export function UploadDialog({
  open,
  onOpenChange,
  folders,
  companies,
  defaultFolderId,
  onUpload,
}: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [folderId, setFolderId] = useState(defaultFolderId || "");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isTemplate, setIsTemplate] = useState(false);
  const [linkedCompanies, setLinkedCompanies] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const flattenFolders = (
    folders: Folder[],
    level = 0
  ): Array<Folder & { level: number }> => {
    let result: Array<Folder & { level: number }> = [];
    folders.forEach((folder) => {
      result.push({ ...folder, level });
      if (folder.children) {
        result = result.concat(flattenFolders(folder.children, level + 1));
      }
    });
    return result;
  };

  const flatFolders = flattenFolders(folders);

  const handleSubmit = async () => {
    if (!file || !folderId) return;

    setUploading(true);
    try {
      await onUpload({
        file,
        folderId,
        description: description.trim() || undefined,
        tags: tags
          ? tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
        isTemplate,
        linkedCompanies,
      });

      // Reset form
      setFile(null);
      setDescription("");
      setTags("");
      setIsTemplate(false);
      setLinkedCompanies([]);
      onOpenChange(false);
    } finally {
      setUploading(false);
    }
  };

  const toggleCompany = (companyId: string) => {
    setLinkedCompanies((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Add a new file to your organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Input */}
          <div>
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1.5"
            />
            {file && (
              <p className="text-sm text-gray-500 mt-1">
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Folder Selection */}
          <div>
            <Label htmlFor="folder">Destination Folder</Label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select a folder" />
              </SelectTrigger>
              <SelectContent>
                {flatFolders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    <span style={{ paddingLeft: `${folder.level * 1}rem` }}>
                      {folder.name}
                      {folder.isSystemFolder && " (System)"}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {/* Tags */}
          <div>
            <Label htmlFor="tags">Tags (optional)</Label>
            <Input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="mt-1.5"
              placeholder="Comma-separated tags..."
            />
          </div>

          {/* Template Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="template"
              checked={isTemplate}
              onCheckedChange={(checked) => setIsTemplate(checked as boolean)}
            />
            <Label htmlFor="template">Mark as template</Label>
          </div>

          {/* Company Links */}
          <div>
            <Label>Link to Companies (optional)</Label>
            <ScrollArea className="h-48 mt-1.5 border rounded-lg p-3">
              {companies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => toggleCompany(company.id)}
                  className="w-full text-left px-2 py-1.5 hover:bg-gray-50 rounded flex items-center gap-2 mb-1"
                >
                  <Check
                    className={`h-4 w-4 ${
                      linkedCompanies.includes(company.id)
                        ? "opacity-100"
                        : "opacity-0"
                    }`}
                  />
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: company.color || "#999" }}
                  />
                  <span className="text-sm">{company.name}</span>
                </button>
              ))}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={uploading || !file || !folderId}
            className="bg-[#FF6B4A] hover:bg-[#FF6B4A]/90"
          >
            {uploading ? (
              <>Uploading...</>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
