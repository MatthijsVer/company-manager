// app/dashboard/documents/[id]/ViewerClient.tsx
"use client";

import DocumentEditorClient from "./DocumentEditorClient";

export default function ViewerClient(props: {
  docId: string;
  fileName: string;
  fileUrl: string;
  isHtml: boolean;
  editable: boolean;
  initialHTML: string | null;
}) {
  const { docId, fileName, fileUrl, isHtml, editable, initialHTML } = props;

  return (
    <div className="h-full bg-white absolute top-0 left-0 w-full space-y-4">
      {editable ? (
        <DocumentEditorClient
          fileName={fileName}
          fileUrl={fileUrl}
          editable={editable}
          documentId={docId}
          initialHTML={
            initialHTML ||
            "<!doctype html><html><body><article><p></p></article></body></html>"
          }
        />
      ) : isHtml ? (
        <iframe
          src={fileUrl}
          sandbox={[
            "allow-popups",
            "allow-modals",
            "allow-pointer-lock",
            "allow-downloads",
            "allow-forms",
            // omit "allow-scripts" and "allow-same-origin"
          ].join(" ")}
          referrerPolicy="no-referrer"
          style={{ width: "100%", height: "80vh", borderRadius: 12 }}
        />
      ) : (
        <div className="text-sm text-muted-foreground">
          This file type is not editable here.
        </div>
      )}
    </div>
  );
}
