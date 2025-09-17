"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Play, RefreshCcw } from "lucide-react";
import { Button } from "../ui/button";

type Provider = "openai" | "deepgram";

type Preview = {
  summary: string;
  tasks: {
    name: string;
    description: string;
    dueDate: string;
    assigneeEmail: string;
    priority: string;
    companySlug: string;
    companyName: string;
    labels: string[];
  }[];
} | null;

export default function MeetingActions({
  id,
  inline,
}: {
  id: string;
  inline?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>("openai");
  const [preview, setPreview] = useState<Preview>(null);
  const router = useRouter();

  async function runTranscribe(p?: Provider) {
    setBusy("transcribe");
    setPreview(null);
    try {
      const prov = p ?? provider;
      const res = await fetch(
        `/api/meetings/${id}/transcribe?provider=${prov}`,
        { method: "POST" }
      );
      const json = await res.json();
      if (res.ok) setPreview(json.preview ?? null);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function runProcess() {
    setBusy("process");
    try {
      await fetch(`/api/meetings/${id}/process`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function rerun(p?: Provider) {
    setBusy("rerun");
    setPreview(null);
    try {
      const prov = p ?? provider;
      const res = await fetch(
        `/api/meetings/${id}/transcribe?provider=${prov}`,
        { method: "POST" }
      );
      const json = await res.json();
      if (res.ok) setPreview(json.preview ?? null);
      await fetch(`/api/meetings/${id}/process`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`flex ${inline ? "flex-col" : "flex-col"} gap-2`}>
      <div
        className={`flex ${inline ? "flex-row" : "flex-wrap"} gap-2 items-center justify-start`}
      >
        <Button
          variant={"ghost"}
          size={"icon"}
          onClick={() => runTranscribe()}
          disabled={!!busy}
          className="rounded-full"
        >
          {busy === "transcribe" ? "…" : <Mic />}
        </Button>
        <Button
          variant={"ghost"}
          size={"icon"}
          onClick={runProcess}
          disabled={!!busy}
          className="rounded-full"
        >
          {busy === "process" ? "…" : <Play />}
        </Button>
        <Button
          variant={"ghost"}
          size={"icon"}
          onClick={() => rerun()}
          disabled={!!busy}
          className="rounded-full"
        >
          {busy === "rerun" ? "…" : <RefreshCcw />}
        </Button>
      </div>

      {preview && (
        <div className="mt-2 border rounded-lg p-3 space-y-3 bg-gray-50">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500">
              Preview summary
            </div>
            <p className="text-sm whitespace-pre-wrap">
              {preview.summary || "(empty)"}
            </p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500">
              Concept tasks (not saved)
            </div>
            {preview.tasks.length === 0 ? (
              <p className="text-sm text-gray-500">No tasks suggested.</p>
            ) : (
              <ul className="text-sm list-disc pl-5 space-y-1">
                {preview.tasks.slice(0, 8).map((t, i) => (
                  <li key={i}>
                    <span className="font-medium">{t.name}</span>
                    {t.assigneeEmail ? <> · {t.assigneeEmail}</> : null}
                    {t.dueDate ? <> · due {t.dueDate}</> : null}
                    {t.priority ? <> · {t.priority}</> : null}
                    {t.companyName ? <> · {t.companyName}</> : null}
                    {t.description ? (
                      <div className="text-gray-600">{t.description}</div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <div className="text-xs text-gray-500 mt-2">
              These are previews only. Click <strong>Process</strong> to create
              real tasks & save the summary.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
