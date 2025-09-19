// app/dashboard/documents/page.tsx
"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { DocumentsHeader } from "@/components/documents/DocumentsHeader";
import { FolderTree } from "@/components/documents/FolderTree";
import { EmptyState } from "@/components/documents/EmptyState";
import { UploadDialog } from "@/components/documents/UploadDialog";
import { FolderDialog } from "@/components/documents/FolderDialog";
import { LinkCompanyDialog } from "@/components/documents/LinkCompanyDialog";
import { MoveDocumentDialog } from "@/components/documents/MoveDocumentDialog";
import type { Folder, Document, Company } from "@/types/documents";

export default function DocumentsPage() {
  // Data states
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [showTemplatesOnly, setShowTemplatesOnly] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );

  // Dialog states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderDialogMode, setFolderDialogMode] = useState<"create" | "edit">(
    "create"
  );
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [linkCompanyDialogOpen, setLinkCompanyDialogOpen] = useState(false);
  const [moveDocumentDialogOpen, setMoveDocumentDialogOpen] = useState(false);

  useEffect(() => {
    fetchFolders();
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedFolderId) {
      fetchDocuments(selectedFolderId);
    }
  }, [selectedFolderId]);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/folders");
      if (res.ok) {
        const data = await res.json();
        setFolders(data.folders || []);

        // Auto-expand root folders
        const rootFolderIds = data.folders
          .filter((f: Folder) => !f.parentId)
          .map((f: Folder) => f.id);
        setExpandedFolders(new Set(rootFolderIds));

        // Select first folder if none selected
        if (data.folders.length > 0 && !selectedFolderId) {
          setSelectedFolderId(data.folders[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch folders:", error);
      toast.error("Failed to load folders");
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (folderId: string) => {
    try {
      const res = await fetch(`/api/documents?folderId=${folderId}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
      toast.error("Failed to load documents");
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies?limit=100");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    }
  };

  const handleCreateFolder = async (data: {
    name: string;
    description?: string;
    parentId?: string;
    color?: string;
  }) => {
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const newFolder = await res.json();
        toast.success(`Folder "${newFolder.name}" created`);
        await fetchFolders();
        setFolderDialogOpen(false);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create folder");
      }
    } catch (error) {
      console.error("Failed to create folder:", error);
      toast.error("Failed to create folder");
    }
  };

  const handleUpdateFolder = async (
    folderId: string,
    data: {
      name?: string;
      description?: string;
      color?: string;
      parentId?: string;
    }
  ) => {
    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success("Folder updated");
        await fetchFolders();
        setFolderDialogOpen(false);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update folder");
      }
    } catch (error) {
      console.error("Failed to update folder:", error);
      toast.error("Failed to update folder");
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Are you sure you want to delete this folder?")) return;

    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Folder deleted");
        await fetchFolders();
        if (selectedFolderId === folderId) {
          setSelectedFolderId(null);
        }
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete folder");
      }
    } catch (error) {
      console.error("Failed to delete folder:", error);
      toast.error("Failed to delete folder");
    }
  };

  const handleUploadDocument = async (data: {
    file: File;
    folderId: string;
    description?: string;
    tags?: string[];
    isTemplate: boolean;
    linkedCompanies: string[];
  }) => {
    try {
      const formData = new FormData();
      formData.append("file", data.file);
      formData.append("folderId", data.folderId);
      if (data.description) formData.append("description", data.description);
      formData.append("tags", JSON.stringify(data.tags || []));
      formData.append("isTemplate", data.isTemplate.toString());
      formData.append("linkedCompanies", JSON.stringify(data.linkedCompanies));

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newDoc = await res.json();
        toast.success("Document uploaded successfully");

        // Refresh documents if in same folder
        if (data.folderId === selectedFolderId) {
          await fetchDocuments(data.folderId);
        }

        // Refresh folder counts
        await fetchFolders();
        setUploadDialogOpen(false);
      } else {
        const error = await res.json();
        toast.error(error.error || "Upload failed");
      }
    } catch (error) {
      console.error("Failed to upload document:", error);
      toast.error("Failed to upload document");
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Document deleted");
        setDocuments((prev) => prev.filter((d) => d.id !== documentId));
        await fetchFolders(); // Refresh folder counts
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete document");
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
      toast.error("Failed to delete document");
    }
  };

  const handleMoveDocument = async (
    documentId: string,
    targetFolderId: string
  ) => {
    try {
      const res = await fetch(`/api/documents/${documentId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetFolderId }),
      });

      if (res.ok) {
        toast.success("Document moved");

        // Remove from current view
        setDocuments((prev) => prev.filter((d) => d.id !== documentId));

        // Refresh folders for counts
        await fetchFolders();
        setMoveDocumentDialogOpen(false);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to move document");
      }
    } catch (error) {
      console.error("Failed to move document:", error);
      toast.error("Failed to move document");
    }
  };

  const handleLinkCompanies = async (
    documentId: string,
    companyIds: string[]
  ) => {
    try {
      const res = await fetch(`/api/documents/${documentId}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyIds }),
      });

      if (res.ok) {
        const updatedDoc = await res.json();
        setDocuments((prev) =>
          prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d))
        );
        toast.success("Document linked to companies");
        setLinkCompanyDialogOpen(false);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to link companies");
      }
    } catch (error) {
      console.error("Failed to link companies:", error);
      toast.error("Failed to link companies");
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      window.open(`/api/documents/${document.id}/download`, "_blank");
    } catch (error) {
      console.error("Failed to download document:", error);
      toast.error("Failed to download document");
    }
  };

  // Filter documents based on search and filters
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTemplate = !showTemplatesOnly || doc.isTemplate;
    return matchesSearch && matchesTemplate;
  });

  // Calculate stats
  const totalStorage = folders.reduce(
    (sum, folder) => sum + (folder.totalSize || 0),
    0
  );
  const totalDocuments = folders.reduce(
    (sum, folder) => sum + (folder.documentCount || 0),
    0
  );

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "oklch(0.94 0 0)" }}
    >
      <DocumentsHeader
        totalDocuments={totalDocuments}
        totalStorage={totalStorage}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showTemplatesOnly={showTemplatesOnly}
        onTemplatesFilterChange={setShowTemplatesOnly}
        onCreateFolder={() => {
          setSelectedFolder(null);
          setFolderDialogMode("create");
          setFolderDialogOpen(true);
        }}
        onUpload={() => setUploadDialogOpen(true)}
      />

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : folders.length === 0 ? (
          <EmptyState
            onCreateFolder={() => {
              setFolderDialogMode("create");
              setFolderDialogOpen(true);
            }}
            onUpload={() => setUploadDialogOpen(true)}
          />
        ) : (
          <FolderTree
            folders={folders}
            documents={filteredDocuments}
            selectedFolderId={selectedFolderId}
            expandedFolders={expandedFolders}
            onFolderSelect={setSelectedFolderId}
            onFolderToggle={(folderId) => {
              setExpandedFolders((prev) => {
                const next = new Set(prev);
                if (next.has(folderId)) {
                  next.delete(folderId);
                } else {
                  next.add(folderId);
                }
                return next;
              });
            }}
            onFolderEdit={(folder) => {
              setSelectedFolder(folder);
              setFolderDialogMode("edit");
              setFolderDialogOpen(true);
            }}
            onFolderDelete={handleDeleteFolder}
            onDocumentDownload={handleDownload}
            onDocumentMove={(doc) => {
              setSelectedDocument(doc);
              setMoveDocumentDialogOpen(true);
            }}
            onDocumentLink={(doc) => {
              setSelectedDocument(doc);
              setLinkCompanyDialogOpen(true);
            }}
            onDocumentDelete={handleDeleteDocument}
          />
        )}
      </div>

      {/* Dialogs */}
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        folders={folders}
        companies={companies}
        defaultFolderId={selectedFolderId}
        onUpload={handleUploadDocument}
      />

      <FolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        mode={folderDialogMode}
        folder={selectedFolder}
        folders={folders}
        onSubmit={
          folderDialogMode === "create"
            ? handleCreateFolder
            : (data) =>
                selectedFolder && handleUpdateFolder(selectedFolder.id, data)
        }
      />

      {selectedDocument && (
        <>
          <LinkCompanyDialog
            open={linkCompanyDialogOpen}
            onOpenChange={setLinkCompanyDialogOpen}
            document={selectedDocument}
            companies={companies}
            onLink={(companyIds) =>
              handleLinkCompanies(selectedDocument.id, companyIds)
            }
          />

          <MoveDocumentDialog
            open={moveDocumentDialogOpen}
            onOpenChange={setMoveDocumentDialogOpen}
            document={selectedDocument}
            folders={folders}
            currentFolderId={selectedDocument.folderId}
            onMove={(targetFolderId) =>
              handleMoveDocument(selectedDocument.id, targetFolderId)
            }
          />
        </>
      )}
    </div>
  );
}
