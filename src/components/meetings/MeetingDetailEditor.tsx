"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label as UILabel } from "@/components/ui/label";
import { DraftTaskCard, getPriorityColor } from "./DraftTaskCard";
import { DraftTaskDialog } from "./DraftTaskDialog";
import type { Label as KanbanLabel } from "@/types/kanban";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import RichNoteEditor from "./RichNoteEditor";

type Company = { id: string; name: string; slug?: string | null };
type CreatedTask = {
  id: string;
  name: string;
  dueDate: string | null;
  priority: string | null;
  assignedToId: string | null;
  companyId: string | null;
  createdAt: string;
};
type UserLite = {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
};

type ProposedTask = {
  name: string;
  description: string;
  dueDate: string;
  assignedToId?: string | null;
  assigneeEmail?: string;
  priority: string;
  companyId?: string | null;
  companyName: string;
  companySlug: string;
  labels: KanbanLabel[];
  _selected?: boolean;
};

export default function MeetingDetailEditor(props: {
  meetingId: string;
  organizationId: string;
  initialSummary: string;
  initialDecisions: string;
  companies: Company[];
  createdTasks: CreatedTask[];
  minutesDocInitial?: { id: string; url: string } | null;
}) {
  const {
    meetingId,
    initialSummary,
    initialDecisions,
    companies,
    createdTasks,
    minutesDocInitial,
  } = props;

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Plain summary text still used by your commit API
  const [summary, setSummary] = useState(initialSummary);
  const [decisions, setDecisions] = useState(initialDecisions ?? "");

  // Rich HTML for minutes canvas (synced to summary plaintext)
  const [minutesHTML, setMinutesHTML] = useState<string | null>(null);

  const [proposed, setProposed] = useState<ProposedTask[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogIndex, setDialogIndex] = useState<number>(0);
  const [committing, setCommitting] = useState(false);
  const [commitMsg, setCommitMsg] = useState<string | null>(null);
  const [minutesDoc, setMinutesDoc] = useState<{
    id: string;
    url: string;
  } | null>(minutesDocInitial ?? null);

  const [users, setUsers] = useState<UserLite[]>([]);
  const [availableLabels, setAvailableLabels] = useState<KanbanLabel[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          setUsers(
            (data || []).map((u: any) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              image: u.image,
            }))
          );
        }
      } catch {}
    })();
    // Optionally hydrate labels:
    // (async () => { const r = await fetch("/api/labels"); if (r.ok) setAvailableLabels(await r.json()); })();
  }, []);

  // Seed the rich editor’s HTML from initial plain summary/decisions
  useEffect(() => {
    if (minutesHTML == null) {
      const seed =
        (initialSummary?.trim()
          ? `<h3>Summary</h3><p>${initialSummary.replace(/\n/g, "<br/>").trim()}</p>`
          : "") +
        (initialDecisions?.trim()
          ? `<h3>Decisions</h3><p>${initialDecisions.replace(/\n/g, "<br/>").trim()}</p>`
          : "");
      setMinutesHTML(seed || "<p></p>");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const companyNames = useMemo(() => companies.map((c) => c.name), [companies]);

  async function loadPreview() {
    setLoadingPreview(true);
    setPreviewError(null);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/preview`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to get preview");

      // If no manual summary yet, take preview summary as seed
      if (!summary && json.summary) setSummary(json.summary);

      const tasks: ProposedTask[] = (json.tasks || []).map((t: any) => ({
        name: t.name || "",
        description: t.description || "",
        dueDate: t.dueDate || "",
        assigneeEmail: t.assigneeEmail || "",
        assignedToId: null,
        priority: t.priority || "MEDIUM",
        companyId: null,
        companyName: t.companyName || "",
        companySlug: t.companySlug || "",
        labels: Array.isArray(t.labels)
          ? t.labels.map((x: any, i: number) =>
              typeof x === "string" ? ({ id: `tmp-${i}`, name: x } as any) : x
            )
          : [],
        _selected: true,
      }));
      setProposed(tasks);
    } catch (e: any) {
      setPreviewError(String(e?.message || e));
    } finally {
      setLoadingPreview(false);
    }
  }

  function addDraft() {
    setProposed((p) => [
      ...p,
      {
        name: "",
        description: "",
        dueDate: "",
        assignedToId: null,
        assigneeEmail: "",
        priority: "MEDIUM",
        companyId: null,
        companyName: "",
        companySlug: "",
        labels: [],
        _selected: true,
      },
    ]);
    setDialogIndex(proposed.length);
    setDialogOpen(true);
  }

  function deleteDraft(i: number) {
    setProposed((p) => p.filter((_, idx) => idx !== i));
  }

  async function commitSelected() {
    setCommitting(true);
    setCommitMsg(null);
    try {
      const tasks = proposed
        .filter((t) => t._selected && t.name?.trim())
        .map((t) => ({
          name: t.name.trim(),
          description: t.description ?? "",
          dueDate: t.dueDate ?? "",
          assignedToId: t.assignedToId ?? null,
          assigneeEmail: t.assigneeEmail ?? "",
          priority: t.priority || "MEDIUM",
          companyId: t.companyId ?? null,
          companyName: t.companyName ?? "",
          companySlug: t.companySlug ?? "",
          labels: (t.labels || [])
            .map((l) => (typeof l === "string" ? l : l.name))
            .filter(Boolean),
        }));

      const res = await fetch(`/api/meetings/${meetingId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Use the current plain summary (synced from the rich editor)
          summary,
          decisions,
          tasks,
          autoCreateCompanies: true,
          autoCreateContacts: true,
          createMinutes: true,
          minutesHTML: minutesHTML || undefined, // send rich HTML for the minutes doc
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Commit failed");

      if (json.minutesDocumentId && json.minutesDocumentUrl) {
        setMinutesDoc({
          id: json.minutesDocumentId,
          url: json.minutesDocumentUrl,
        });
      }

      const timeMsg = json.timeEntryCreated
        ? ` Time entry logged.`
        : ` Time entry already existed.`;
      setCommitMsg(
        `Created ${json.createdTasks} tasks` +
          (json.createdCompanies
            ? `, ${json.createdCompanies} companies`
            : "") +
          (json.createdContacts ? `, ${json.createdContacts} contacts` : "") +
          `.` +
          timeMsg
      );
    } catch (e: any) {
      setCommitMsg(`Error: ${String(e?.message || e)}`);
    } finally {
      setCommitting(false);
    }
  }

  async function recreateMinutes() {
    const res = await fetch(`/api/meetings/${meetingId}/minutes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: minutesHTML || "<p></p>" }),
    });
    const json = await res.json();
    if (res.ok && json?.id) {
      setMinutesDoc({ id: json.id, url: json.url });
    }
  }

  useEffect(() => {
    if (!initialSummary && proposed.length === 0) {
      loadPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedCount = proposed.filter(
    (t) => t._selected && t.name?.trim()
  ).length;

  return (
    <div className="space-y-4 flex items-start">
      <div className="flex flex-col flex-1">
        <section className="flex-1">
          <div className="flex items-center border-b p-4 justify-between">
            <h2 className="font-semibold">Minutes (rich)</h2>
            <div className="flex gap-2">
              {minutesDoc ? (
                <>
                  <Link
                    href={minutesDoc.url}
                    className="text-sm underline self-center"
                  >
                    View minutes
                  </Link>
                  <Button variant="outline" onClick={recreateMinutes}>
                    Update minutes
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={recreateMinutes}>
                  Create minutes
                </Button>
              )}
              <Button
                variant="outline"
                onClick={loadPreview}
                disabled={loadingPreview}
              >
                {loadingPreview ? "…" : "Load/Refresh Preview"}
              </Button>
              <Button
                onClick={commitSelected}
                disabled={committing || selectedCount === 0}
                className="bg-[#FF6B4A] hover:bg-[#FF6B4A]/90"
              >
                {committing
                  ? "Committing…"
                  : `Commit ${selectedCount} task${selectedCount === 1 ? "" : "s"} & summary`}
              </Button>
            </div>
          </div>

          {previewError && (
            <p className="text-sm text-red-600 mt-2">{previewError}</p>
          )}

          <div className="h-[60vh] px-4">
            {/* Notion-style editor (keeps plain summary in sync) */}
            {minutesHTML != null && (
              <RichNoteEditor
                initialHTML={minutesHTML}
                onChangeHTML={(html, plain) => {
                  setMinutesHTML(html);
                  setSummary(plain.slice(0, 1500)); // keep a concise plain summary for APIs
                }}
                className="mt-3 border rounded-lg h-[60vh]"
              />
            )}
          </div>

          {/* Optional: keep Decisions as a simple textarea for now */}
          <div className="mt-4">
            <UILabel className="text-sm font-medium mb-2 block">
              Decisions (optional)
            </UILabel>
            <Textarea
              value={decisions}
              onChange={(e) => setDecisions(e.target.value)}
              placeholder="One decision per line, or a paragraph."
              rows={4}
            />
          </div>

          {commitMsg && <p className="text-sm mt-3">{commitMsg}</p>}
        </section>
      </div>

      {/* Draft tasks */}
      <section className="space-y-3 w-92 border-l h-full overflow-y-auto max-h-[87vh]">
        <div className="flex flex-col mb-0">
          <div className="flex flex-col p-4 border-b items-start justify-between">
            <h2 className="font-semibold">Draft tasks (review & edit)</h2>
            <div className="flex items-start mt-4 w-full flex-col gap-2">
              <Button className="w-full" onClick={addDraft}>
                + Add draft task
              </Button>
              {proposed.length > 0 && (
                <div className="flex w-full items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setProposed((p) =>
                        p.map((t) => ({ ...t, _selected: true }))
                      )
                    }
                    className="flex-1"
                  >
                    Select all
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setProposed((p) =>
                        p.map((t) => ({ ...t, _selected: false }))
                      )
                    }
                    className="flex-1"
                  >
                    Clear selection
                  </Button>
                </div>
              )}
            </div>
          </div>

          {proposed.length === 0 ? (
            <p className="text-sm p-4 text-muted-foreground">
              No draft tasks yet. Use <strong>Load/Refresh Preview</strong> or{" "}
              <strong>Add draft task</strong>.
            </p>
          ) : (
            <div className="grid p-4 grid-cols-1 border-b gap-3">
              {proposed.map((t, i) => (
                <DraftTaskCard
                  key={i}
                  task={
                    {
                      name: t.name,
                      description: t.description,
                      dueDate: t.dueDate,
                      assigneeEmail: t.assignedToId
                        ? ""
                        : t.assigneeEmail || "",
                      priority: t.priority,
                      companyName: t.companyId
                        ? companies.find((c) => c.id === t.companyId)?.name ||
                          ""
                        : t.companyName,
                      labels: (t.labels || []).map((l) =>
                        typeof l === "string" ? l : l.name
                      ),
                      _selected: t._selected,
                    } as any
                  }
                  index={i}
                  onEdit={() => {
                    setDialogIndex(i);
                    setDialogOpen(true);
                  }}
                  onToggle={(checked) =>
                    setProposed((p) =>
                      p.map((x, idx) =>
                        idx === i ? { ...x, _selected: checked } : x
                      )
                    )
                  }
                  onDelete={() => deleteDraft(i)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col">
          {createdTasks?.length ? (
            <section>
              <h3 className="font-semibold text-sm mb-2">
                Already created from this meeting
              </h3>
              <ul className="space-y-2 text-sm w-full mt-3">
                {createdTasks.map((t) => (
                  <li key={t.id} className="flex w-full items-center py-0.5">
                    <CheckCircle className="size-3.5 mr-2" />
                    <div className="font-medium text-xs mr-auto">{t.name}</div>
                    <Badge
                      className={cn(
                        "text-[10px] px-2 py-0.5",
                        getPriorityColor(t.priority || "MEDIUM")
                      )}
                    >
                      {t.priority || "MEDIUM"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </section>

      {/* Draft edit dialog */}
      {proposed[dialogIndex] && (
        <DraftTaskDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          task={proposed[dialogIndex]}
          index={dialogIndex}
          onChange={(updated) =>
            setProposed((p) =>
              p.map((x, i) =>
                i === dialogIndex ? { ...updated, _selected: x._selected } : x
              )
            )
          }
          users={users}
          companies={companies}
          availableLabels={availableLabels}
        />
      )}
    </div>
  );
}
