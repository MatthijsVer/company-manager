// types/documents.ts

export interface Folder {
    id: string;
    organizationId: string;
    name: string;
    description?: string;
    parentId?: string;
    parent?: {
      id: string;
      name: string;
    };
    children: Folder[];
    color?: string;
    icon?: string;
    isSystemFolder: boolean;
    createdBy: string;
    createdByUser: {
      id: string;
      name: string;
      email: string;
      image?: string;
    };
    lastModifiedBy?: string;
    lastModifiedAt: string;
    documents: Document[];
    documentCount: number;
    totalSize: number;
    permissions: FolderPermission[];
    companyLinks: FolderCompanyLink[];
    createdAt: string;
    updatedAt: string;
  }
  
  export interface Document {
    id: string;
    organizationId: string;
    folderId: string;
    folder: {
      id: string;
      name: string;
      parentId?: string;
      color?: string;
    };
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    description?: string;
    tags: string[];
    version: number;
    isTemplate: boolean;
    fileHash?: string;
    scanStatus: string;
    uploadedBy: string;
    uploadedByUser: {
      id: string;
      name: string;
      email: string;
      image?: string;
    };
    lastModifiedBy?: string;
    lastModifiedAt: string;
    companies: Company[];
    companyLinks: DocumentCompanyLink[];
    lastActivity?: DocumentActivity;
    permissions?: DocumentPermission[];
    createdAt: string;
    updatedAt: string;
  }
  
  export interface Company {
    id: string;
    name: string;
    color: string | null;
    slug: string;
  }
  
  export interface FolderPermission {
    id: string;
    folderId: string;
    userId?: string;
    role?: string;
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
    canManagePerms: boolean;
  }
  
  export interface DocumentPermission {
    id: string;
    documentId: string;
    userId?: string;
    role?: string;
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
  }
  
  export interface FolderCompanyLink {
    id: string;
    folderId: string;
    companyId: string;
    company: Company;
    linkedBy: string;
    linkedAt: string;
  }
  
  export interface DocumentCompanyLink {
    id: string;
    documentId: string;
    companyId: string;
    company: Company;
    linkedBy: string;
    linkedAt: string;
  }
  
  export interface DocumentActivity {
    id: string;
    documentId: string;
    userId: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
    action: string;
    metadata?: any;
    createdAt: string;
  }