"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Save, EyeOff } from "lucide-react";

const RichNoteEditor = dynamic(
  () => import("@/components/meetings/RichNoteEditor"),
  { ssr: false }
);

export default function DocumentEditorClient({
  documentId,
  initialHTML,
  editable,
  fileUrl,
  fileName,
}: {
  documentId: string;
  initialHTML: string;
  editable: boolean;
  fileUrl: string;
  fileName: string;
}) {
  const [title, setTitle] = useState<string>(() => {
    const m = /<title>([^<]*)<\/title>/i.exec(initialHTML);
    return (m?.[1] || "Untitled").trim();
  });
  const [html, setHtml] = useState<string>(initialHTML);
  const [plain, setPlain] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const onChangeHTML = useCallback(
    (h: string, p: string) => {
      if (!editable) return; // ignore changes in readonly
      setHtml(h);
      setPlain(p);
    },
    [editable]
  );

  async function handleSave() {
    if (!editable) return; // guard
    try {
      setSaving(true);

      let outgoing = html;

      // preserve blank paragraphs
      outgoing = outgoing.replace(/<p>\s*<\/p>/g, "<p><br/></p>");

      const hasDoctype = /^\s*<!doctype/i.test(outgoing);
      if (!hasDoctype) {
        outgoing = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(title || "Untitled")}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
</head>
<body><article>${outgoing}</article></body>
</html>`;
      } else {
        outgoing = outgoing.replace(
          /<title>.*?<\/title>/i,
          `<title>${escapeHtml(title || "Untitled")}</title>`
        );
      }

      const res = await fetch(`/api/documents/${documentId}/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: outgoing, title }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to save");

      toast.success("Saved changes");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex items-center bg-transparent gap-3 sticky top-0 z-10 px-4 py-1">
        <h1 className="text-sm font-semibold truncate">{fileName}</h1>

        {!editable && (
          <span className="ml-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
            <EyeOff className="h-3.5 w-3.5" /> View only
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {!editable ? (
            <a
              className="underline text-blue-600 text-sm"
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open original
            </a>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saving}
              variant="ghost"
              size="icon"
              aria-label="Save"
            >
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
            </Button>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="pt-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!editable}
          className="flex-1 max-w-[48vw] active:!ring-0 -mb-6 mt-2  z-10 relative px-0 mx-auto border-0 text-3xl font-bold placeholder:!text-3xl"
          placeholder="Document title"
          style={{ fontSize: "32px" }}
        />
      </div>

      {/* Editor */}
      <div className="px-4 pb-10">
        <RichNoteEditor
          isFullScreen={true}
          initialHTML={html}
          onChangeHTML={onChangeHTML}
          fullHeight
          className="min-h-[70vh]"
          editable={editable} // <- key line
        />
      </div>
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!
  );
}
