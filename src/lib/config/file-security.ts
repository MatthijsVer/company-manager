// lib/config/file-security.ts

export const FILE_SECURITY = {
    // Maximum file size in bytes (50MB default)
    maxFileSize: 50 * 1024 * 1024,
    
    // Allowed MIME types
    allowedMimeTypes: [
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      
      // Archives (scan contents)
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
    ],
    
    // Blocked file extensions (even if MIME type is allowed)
    blockedExtensions: [
      '.exe', '.bat', '.cmd', '.com', '.msi', '.app', '.deb', '.rpm',
      '.sh', '.bash', '.ps1', '.vbs', '.js', '.jar', '.war',
      '.scr', '.dll', '.so', '.dylib', '.sys',
      '.html', '.htm', '.php', '.jsp', '.asp', '.aspx',
      '.py', '.rb', '.pl', '.cgi',
    ],
    
    // File name validation
    fileNameRules: {
      maxLength: 255,
      // Remove or replace dangerous characters
      sanitizePattern: /[<>:"/\\|?*\x00-\x1f]/g,
      replacement: '_',
    },
    
    // Content scanning settings
    scanning: {
      enabled: true,
      // You can integrate with ClamAV or other antivirus APIs
      quarantinePath: 'quarantine/',
      deleteInfectedFiles: true,
    },
    
    // Storage paths (relative to upload root)
    storage: {
      temp: 'temp/',
      permanent: 'documents/',
      organizationPath: (orgId: string) => `organizations/${orgId}/`,
      folderPath: (orgId: string, folderId: string) => `organizations/${orgId}/folders/${folderId}/`,
    },
  }
  
  // Validate file before upload
  export function validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > FILE_SECURITY.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds maximum of ${FILE_SECURITY.maxFileSize / (1024 * 1024)}MB`,
      }
    }
    
    // Check MIME type
    if (!FILE_SECURITY.allowedMimeTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'File type not allowed',
      }
    }
    
    // Check file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (FILE_SECURITY.blockedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `File extension ${extension} is not allowed`,
      }
    }
    
    // Check filename length
    if (file.name.length > FILE_SECURITY.fileNameRules.maxLength) {
      return {
        valid: false,
        error: `File name too long (max ${FILE_SECURITY.fileNameRules.maxLength} characters)`,
      }
    }
    
    return { valid: true }
  }
  
  // Sanitize filename for storage
  export function sanitizeFileName(fileName: string): string {
    // Remove directory traversal attempts
    let sanitized = fileName.replace(/\.\./g, '')
    
    // Remove dangerous characters
    sanitized = sanitized.replace(FILE_SECURITY.fileNameRules.sanitizePattern, FILE_SECURITY.fileNameRules.replacement)
    
    // Ensure it has a valid extension
    if (!sanitized.includes('.')) {
      sanitized += '.unknown'
    }
    
    return sanitized
  }
  
  // Generate secure file path
  export function generateSecureFilePath(
    organizationId: string,
    folderId: string,
    fileName: string
  ): string {
    const sanitized = sanitizeFileName(fileName)
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    
    // Create unique filename to prevent collisions and directory traversal
    const uniqueFileName = `${timestamp}_${random}_${sanitized}`
    
    return FILE_SECURITY.storage.folderPath(organizationId, folderId) + uniqueFileName
  }
  
  // Calculate file hash for integrity verification
  export async function calculateFileHash(file: File | Buffer): Promise<string> {
    const crypto = await import('crypto')
    
    let buffer: Buffer
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } else {
      buffer = file
    }
    
    return crypto.createHash('sha256').update(buffer).digest('hex')
  }