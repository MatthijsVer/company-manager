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
import { useRouter } from "next/navigation";

export default function DocumentsPage() {
  const router = useRouter();

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
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    fetchFolders();
    fetchCompanies();
  }, []);

  useEffect(() => {
    // Fetch documents for all expanded folders
    const fetchAllDocuments = async () => {
      const allDocuments: Document[] = [];

      for (const folderId of expandedFolders) {
        try {
          const res = await fetch(`/api/documents?folderId=${folderId}`);
          if (res.ok) {
            const data = await res.json();
            allDocuments.push(...(data.documents || []));
          }
        } catch (error) {
          console.error(
            `Failed to fetch documents for folder ${folderId}:`,
            error
          );
        }
      }

      setDocuments(allDocuments);
    };

    if (expandedFolders.size > 0) {
      fetchAllDocuments();
    } else {
      setDocuments([]);
    }
  }, [expandedFolders]);

  const fetchFolders = async (opts?: { preserveExpansion?: boolean }) => {
    const preserveExpansion = opts?.preserveExpansion ?? true;

    try {
      setLoading(true);
      const res = await fetch("/api/folders");
      if (res.ok) {
        const data = await res.json();
        setFolders(data.folders || []);

        // 🔑 Keep previously expanded folders (only collapse on first-ever load if you want)
        setExpandedFolders((prev) => {
          if (!preserveExpansion) return new Set<string>(); // explicit collapse
          // keep only IDs that still exist in the new tree
          const next = new Set<string>();
          for (const id of prev) {
            if (folderExists(data.folders || [], id)) next.add(id);
          }
          return next;
        });

        // Keep selection if it still exists, otherwise fall back (optional)
        setSelectedFolderId((sel) => {
          if (sel && folderExists(data.folders || [], sel)) return sel;
          return data.folders?.[0]?.id ?? null;
        });

        if (!hasLoadedOnce) setHasLoadedOnce(true);
      }
    } catch (error) {
      console.error("Failed to fetch folders:", error);
      toast.error("Failed to load folders");
    } finally {
      setLoading(false);
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

  const folderExists = (list: Folder[], id: string): boolean => {
    for (const f of list) {
      if (f.id === id) return true;
      if (f.children?.length && folderExists(f.children, id)) return true;
    }
    return false;
  };

  const removeFolderById = (list: Folder[], id: string): Folder[] =>
    list
      .map((f) =>
        f.id === id
          ? null
          : {
              ...f,
              children: f.children ? removeFolderById(f.children, id) : [],
            }
      )
      .filter(Boolean) as Folder[];

  const addChildToFolder = (
    list: Folder[],
    parentId: string,
    child: Folder
  ): Folder[] =>
    list.map((f) => {
      if (f.id === parentId) {
        return {
          ...f,
          // ensure children array exists
          children: [...(f.children || []), child],
          // bump last modified to reflect change
          lastModifiedAt: new Date().toISOString() as any,
        };
      }
      return {
        ...f,
        children: f.children
          ? addChildToFolder(f.children, parentId, child)
          : [],
      };
    });

  const replaceFolderById = (
    list: Folder[],
    tempId: string,
    real: Folder
  ): Folder[] =>
    list.map((f) => {
      if (f.id === tempId) return real;
      return {
        ...f,
        children: f.children ? replaceFolderById(f.children, tempId, real) : [],
      };
    });

  const collectDescendantIds = (list: Folder[], rootId: string): string[] => {
    const found = (function find(list2: Folder[]): Folder | null {
      for (const f of list2) {
        if (f.id === rootId) return f;
        const inChild = find(f.children || []);
        if (inChild) return inChild;
      }
      return null;
    })(list);

    const ids: string[] = [];
    (function walk(f?: Folder) {
      if (!f) return;
      for (const c of f.children || []) {
        ids.push(c.id);
        walk(c);
      }
    })(found || undefined);
    return ids;
  };

  const handleCreateBlankFileInFolder = (folderId: string) => {
    const q = new URLSearchParams({ folderId });
    router.push(`/dashboard/documents/new?${q.toString()}`);
  };

  const handleUploadInFolder = (folderId: string) => {
    setSelectedFolderId(folderId);
    setUploadDialogOpen(true);
  };

  const onCreateSubfolder = async (parentFolderId: string, name: string) => {
    // optimistic temp folder
    const tempId = `temp-${Math.random().toString(36).slice(2)}`;
    const tempFolder: Folder = {
      id: tempId,
      organizationId: "optimistic",
      name,
      description: "",
      parentId: parentFolderId,
      parent: null as any,
      children: [],
      color: undefined,
      icon: undefined,
      isSystemFolder: false,
      createdBy: "optimistic",
      createdByUser: {} as any,
      lastModifiedBy: undefined,
      lastModifiedAt: new Date() as any,
      organization: {} as any,
      documents: [],
      permissions: [],
      companyLinks: [],
      createdAt: new Date() as any,
      updatedAt: new Date() as any,
      // counters you use in UI:
      documentCount: 0 as any,
      totalSize: 0 as any,
    };

    // apply optimistic update + keep parent expanded
    setFolders((prev) => addChildToFolder(prev, parentFolderId, tempFolder));
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.add(parentFolderId);
      return next;
    });

    try {
      // call your existing API
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId: parentFolderId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create folder");
      }

      const serverFolder: Folder = await res.json();

      // swap temp with real
      setFolders((prev) => replaceFolderById(prev, tempId, serverFolder));

      // reconcile from server, but keep expanded
      await fetchFolders({ preserveExpansion: true });
      toast.success(`Folder "${serverFolder.name}" created`);
    } catch (e) {
      console.error(e);
      // rollback temp
      setFolders((prev) => removeFolderById(prev, tempId));
      toast.error(e instanceof Error ? e.message : "Failed to create folder");
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

    // snapshot for rollback
    const prevFolders = folders;
    const prevExpanded = new Set(expandedFolders);
    const prevSelected = selectedFolderId;

    // collect descendants to clean expanded state
    const descendantIds = collectDescendantIds(folders, folderId);

    // optimistic remove
    setFolders((prev) => removeFolderById(prev, folderId));
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.delete(folderId);
      for (const id of descendantIds) next.delete(id);
      return next;
    });
    if (
      selectedFolderId &&
      (selectedFolderId === folderId ||
        descendantIds.includes(selectedFolderId))
    ) {
      setSelectedFolderId(null);
    }

    try {
      const res = await fetch(`/api/folders/${folderId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete folder");
      }

      // refresh counts/metadata, preserving expansion
      await fetchFolders({ preserveExpansion: true });
      toast.success("Folder deleted");
    } catch (e) {
      console.error(e);
      // rollback
      setFolders(prevFolders);
      setExpandedFolders(prevExpanded);
      setSelectedFolderId(prevSelected);
      toast.error(e instanceof Error ? e.message : "Failed to delete folder");
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

        // Refresh documents if folder is expanded
        if (expandedFolders.has(data.folderId)) {
          // Trigger a re-fetch by updating expandedFolders
          setExpandedFolders(new Set(expandedFolders));
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
        // Re-trigger document fetch for expanded folders
        setExpandedFolders(new Set(expandedFolders));
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

        // Refresh folders for counts
        await fetchFolders();

        // Re-trigger document fetch for expanded folders
        setExpandedFolders(new Set(expandedFolders));

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

  const handleMoveFolder = async (
    folderId: string,
    targetParentId: string | null
  ) => {
    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: targetParentId }),
      });

      if (res.ok) {
        toast.success("Folder moved");
        await fetchFolders();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to move folder");
      }
    } catch (error) {
      console.error("Failed to move folder:", error);
      toast.error("Failed to move folder");
    }
  };

  const handleDocumentDrop = async (
    documentId: string,
    targetFolderId: string
  ) => {
    await handleMoveDocument(documentId, targetFolderId);
  };

  const handleFilesDrop = async (files: FileList, targetFolderId: string) => {
    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await handleUploadDocument({
        file,
        folderId: targetFolderId,
        description: undefined,
        tags: [],
        isTemplate: false,
        linkedCompanies: [],
      });
    }

    // Refresh folders and documents
    await fetchFolders();
    if (expandedFolders.has(targetFolderId)) {
      setExpandedFolders(new Set(expandedFolders));
    }

    toast.success(`${files.length} file(s) uploaded`);
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
                next.has(folderId) ? next.delete(folderId) : next.add(folderId);
                return next;
              });
            }}
            onFolderEdit={(folder) => {
              setSelectedFolder(folder);
              setFolderDialogMode("edit");
              setFolderDialogOpen(true);
            }}
            onFolderDelete={handleDeleteFolder}
            onFolderMove={handleMoveFolder}
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
            onDocumentDrop={handleDocumentDrop}
            onFilesDrop={handleFilesDrop}
            onCreateFileInFolder={handleCreateBlankFileInFolder}
            onUploadInFolder={handleUploadInFolder}
            onCreateSubfolder={onCreateSubfolder}
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
