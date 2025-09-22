"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import RichNoteEditor from "../meetings/RichNoteEditor";

type Props = {
  defaultFolderId: string | null;
  initialTitle?: string;
  // optional extras for future: default tags, default description, link companies, etc.
};

export default function DocumentComposer({
  defaultFolderId,
  initialTitle = "Untitled",
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [html, setHtml] = useState<string>("<p></p>");
  const [plain, setPlain] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // a simple content hash to enable "Save" enable/disable + localStorage key
  const key = useMemo(
    () => `doc-composer:${defaultFolderId || "root"}`,
    [defaultFolderId]
  );

  // ---- restore from localStorage (draft) ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const draft = JSON.parse(raw) as { title: string; html: string };
        if (draft?.title) setTitle(draft.title);
        if (draft?.html) setHtml(draft.html);
      }
    } catch {}
  }, [key]);

  // ---- persist draft to localStorage (cheap debounce) ----
  const draftTimer = useRef<number | null>(null);
  const persistDraft = useCallback(
    (next: { title?: string; html?: string }) => {
      const payload = {
        title: next.title ?? title,
        html: next.html ?? html,
      };
      if (draftTimer.current) window.clearTimeout(draftTimer.current);
      draftTimer.current = window.setTimeout(() => {
        try {
          localStorage.setItem(key, JSON.stringify(payload));
        } catch {}
      }, 300);
    },
    [key, title, html]
  );

  // editor change handler from RichNoteEditor
  const onChangeHTML = useCallback(
    (h: string, p: string) => {
      setHtml(h);
      setPlain(p);
      persistDraft({ html: h });
    },
    [persistDraft]
  );

  const disabled = !defaultFolderId || !title.trim() || saving;

  async function handleSave() {
    if (!defaultFolderId) {
      toast.error("Pick a destination folder first.");
      return;
    }
    try {
      setSaving(true);

      // Wrap the BlockNote HTML into a full html file (optional but nice)
      const fullHTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <article>${html}</article>
</body>
</html>`;

      const blob = new Blob([fullHTML], { type: "text/html" });
      const file = new File([blob], `${sanitizeFileName(title)}.html`, {
        type: "text/html",
      });

      const form = new FormData();
      form.append("file", file);
      form.append("folderId", defaultFolderId);
      form.append("description", plain.slice(0, 1000)); // optional: quick summary
      form.append("tags", JSON.stringify([]));
      form.append("isTemplate", "false");
      form.append("linkedCompanies", JSON.stringify([]));

      const res = await fetch("/api/documents", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to save document");

      // clear draft
      localStorage.removeItem(key);

      toast.success("Document created");
      // go to the document details page (you already have a route like /dashboard/documents/[id])
      router.replace(`/dashboard/documents/${data.id}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="absolute top-0 left-0 w-full h-screen bg-white">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          aria-label="Back"
        >
          <ArrowLeft />
        </Button>

        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            persistDraft({ title: e.target.value });
          }}
          placeholder="Untitled"
          className="flex-1 text-base h-10"
        />

        <Button
          onClick={handleSave}
          disabled={disabled}
          className="bg-[#FF6B4A] hover:bg-[#FF6B4A]/90"
        >
          {saving ? (
            <Loader2 className="mr-2 animate-spin" />
          ) : (
            <Save className="mr-2" />
          )}
          Save
        </Button>
      </div>

      {/* Editor */}
      <div className="border rounded-xl bg-white">
        <RichNoteEditor
          initialHTML={html}
          onChangeHTML={onChangeHTML}
          fullHeight
          className="min-h-[60vh]"
        />
      </div>

      {!defaultFolderId && (
        <p className="text-sm text-red-600">
          You opened the composer without a folder. Return and start from a
          folder’s menu.
        </p>
      )}
    </div>
  );
}

function sanitizeFileName(name: string) {
  return name.replace(/[\/\\?%*:|"<>]/g, "_").trim() || "Untitled";
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
