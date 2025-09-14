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
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "text/csv") {
      setFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/companies/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Import failed");
      }

      setResults(data);

      if (data.success > 0) {
        onSuccess();
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResults(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Companies</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple companies at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!results ? (
            <>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="space-y-2">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFile(null)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="font-medium">Drop your CSV file here</p>
                    <p className="text-sm text-muted-foreground">or</p>
                    <Button variant="outline" size="sm" asChild>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        Browse Files
                        <input
                          id="file-upload"
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                      </label>
                    </Button>
                  </div>
                )}
              </div>

              <Alert>
                <AlertDescription>
                  CSV should include columns: name, email, phone, website,
                  street, city, state, country, postalCode
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-semibold">Import Results</p>
                  <p className="text-sm text-muted-foreground">
                    {results.success} successful, {results.failed} failed
                  </p>
                </div>
              </div>

              {results.errors && results.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <p className="font-medium mb-2">Errors:</p>
                    <ul className="list-disc list-inside text-sm">
                      {results.errors
                        .slice(0, 5)
                        .map((error: string, i: number) => (
                          <li key={i}>{error}</li>
                        ))}
                      {results.errors.length > 5 && (
                        <li>...and {results.errors.length - 5} more</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {!results ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={!file || loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
