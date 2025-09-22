"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DraftTaskCard, getPriorityColor } from "./DraftTaskCard";
import { DraftTaskDialog } from "./DraftTaskDialog";
import type { Label as KanbanLabel } from "@/types/kanban";
import Link from "next/link";
import {
  FileText,
  FilePlus2,
  FilePenLine,
  RefreshCw,
  Rocket,
  Maximize2,
  Loader2,
  CheckCircle,
  Minimize2,
} from "lucide-react";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
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
  initialMinutesHTML?: string;
  companies: Company[];
  createdTasks: CreatedTask[];
  minutesDocInitial?: { id: string; url: string } | null;
}) {
  const {
    meetingId,
    initialSummary,
    initialDecisions,
    initialMinutesHTML,
    companies,
    createdTasks,
    minutesDocInitial,
  } = props;

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [summary, setSummary] = useState(initialSummary);
  const [decisions, setDecisions] = useState(initialDecisions ?? "");
  const [minutesHTML, setMinutesHTML] = useState<string | null>(null);

  const [proposed, setProposed] = useState<ProposedTask[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dialogIndex, setDialogIndex] = useState<number>(0);
  const [committing, setCommitting] = useState(false);
  const [commitMsg, setCommitMsg] = useState<string | null>(null);
  const [minutesDoc, setMinutesDoc] = useState<{
    id: string;
    url: string;
  } | null>(minutesDocInitial ?? null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialContentHash, setInitialContentHash] = useState<string>("");
  const [lastSavedHash, setLastSavedHash] = useState<string>("");

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
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKey);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  useEffect(() => {
    console.log(
      "🌱 DEBUG - Seeding editor, minutesHTML is null:",
      minutesHTML == null
    );
    console.log(
      "🌱 DEBUG - initialMinutesHTML length:",
      initialMinutesHTML?.length || 0
    );

    if (minutesHTML == null) {
      let seedHTML = initialMinutesHTML;

      // If we have saved HTML that looks like a full document, extract the body content
      if (seedHTML && seedHTML.includes("<!doctype html>")) {
        console.log(
          "🌱 DEBUG - Full HTML document detected, extracting content"
        );
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(seedHTML, "text/html");

          // Find the Summary and Decisions sections
          const h2Elements = Array.from(doc.querySelectorAll("h2"));
          let extractedHTML = "";

          // Look for Summary section
          const summaryH2 = h2Elements.find(
            (h2) => h2.textContent?.trim() === "Summary"
          );
          if (summaryH2?.parentElement) {
            const summaryDiv = summaryH2.parentElement.querySelector("div");
            if (summaryDiv && summaryDiv.textContent?.trim()) {
              extractedHTML += `<h3>Summary</h3><p>${summaryDiv.textContent.trim()}</p>`;
            }
          }

          // Look for Decisions section
          const decisionsH2 = h2Elements.find(
            (h2) => h2.textContent?.trim() === "Decisions"
          );
          if (decisionsH2?.parentElement) {
            const decisionsList = decisionsH2.parentElement.querySelector("ul");
            const decisionsP = decisionsH2.parentElement.querySelector("p");

            if (decisionsList && decisionsList.children.length > 0) {
              // Has actual decisions
              const items = Array.from(decisionsList.querySelectorAll("li"))
                .map((li) => `<li>${li.textContent?.trim() || ""}</li>`)
                .join("");
              if (items) {
                extractedHTML += `<h3>Decisions</h3><ul>${items}</ul>`;
              }
            } else if (
              decisionsP &&
              decisionsP.textContent &&
              !decisionsP.textContent.includes("No explicit decisions")
            ) {
              // Has decision text that's not the "no decisions" message
              extractedHTML += `<h3>Decisions</h3><p>${decisionsP.textContent.trim()}</p>`;
            }
          }

          if (extractedHTML) {
            seedHTML = extractedHTML;
            console.log("🌱 DEBUG - Successfully extracted content:", seedHTML);
          } else {
            console.log(
              "🌱 DEBUG - No content found in template, will use fallback"
            );
            seedHTML = null; // Fall back to summary/decisions
          }
        } catch (error) {
          console.error("🌱 DEBUG - Error parsing saved HTML:", error);
          seedHTML = null; // Fall back to summary/decisions
        }
      }

      if (!seedHTML) {
        console.log(
          "🌱 DEBUG - No saved HTML, generating from summary/decisions"
        );
        seedHTML =
          (initialSummary?.trim()
            ? `<h3>Summary</h3><p>${initialSummary.replace(/\n/g, "<br/>").trim()}</p>`
            : "") +
          (initialDecisions?.trim()
            ? `<h3>Decisions</h3><ul>${initialDecisions
                .split("\n")
                .filter(Boolean)
                .map((d) => `<li>${d}</li>`)
                .join("")}</ul>`
            : "");
      }

      console.log("🌱 DEBUG - Final seed HTML:", seedHTML?.slice(0, 200));
      setMinutesHTML(seedHTML || "<p></p>");
    }
  }, [initialMinutesHTML, initialSummary, initialDecisions]);

  const companyNames = useMemo(() => companies.map((c) => c.name), [companies]);

  async function loadPreview() {
    setLoadingPreview(true);
    setPreviewError(null);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/preview`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to get preview");

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

  // ---- Helpers: extract decisions from rich HTML ----
  function extractDecisionsFromHTML(html: string): string {
    const el = document.createElement("div");
    el.innerHTML = html;

    // find heading “Decisions” (h1-h4)
    const headings = Array.from(
      el.querySelectorAll("h1,h2,h3,h4")
    ) as HTMLElement[];
    const decHeading =
      headings.find(
        (h) => h.textContent?.trim().toLowerCase() === "decisions"
      ) || null;
    if (!decHeading) return "";

    const lines: string[] = [];
    // Walk following siblings until next heading
    let n = decHeading.nextElementSibling as HTMLElement | null;
    while (n && !/^H[1-6]$/.test(n.tagName)) {
      if (n.tagName === "UL" || n.tagName === "OL") {
        lines.push(
          ...Array.from(n.querySelectorAll("li")).map((li) =>
            (li.textContent || "").trim()
          )
        );
      } else if (n.tagName === "P") {
        const t = (n.textContent || "").trim();
        if (t) lines.push(t);
      }
      n = n.nextElementSibling as HTMLElement | null;
    }
    return lines.join("\n");
  }

  async function commitSelected() {
    setCommitting(true);
    setCommitMsg(null);

    console.log(
      "💾 DEBUG - Committing with minutesHTML:",
      minutesHTML?.slice(0, 200)
    );
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

      const requestBody = {
        summary,
        decisions,
        tasks,
        autoCreateCompanies: true,
        autoCreateContacts: true,
        createMinutes: true,
        minutesHTML: minutesHTML || undefined,
      };

      console.log(
        "💾 DEBUG - Request minutesHTML length:",
        requestBody.minutesHTML?.length || 0
      );

      const res = await fetch(`/api/meetings/${meetingId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
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

      // Reset change tracking after successful commit
      const newHash = createContentHash(summary, decisions, proposed);
      setLastSavedHash(newHash);
      setHasUnsavedChanges(false);
    } catch (e: any) {
      setCommitMsg(`Error: ${String(e?.message || e)}`);
    } finally {
      setCommitting(false);
    }
  }

  function createContentHash(
    summary: string,
    decisions: string,
    tasks: ProposedTask[]
  ) {
    const content = JSON.stringify({
      summary: summary.trim(),
      decisions: decisions.trim(),
      tasks: tasks.map((t) => ({
        name: t.name.trim(),
        description: t.description.trim(),
        dueDate: t.dueDate,
        priority: t.priority,
        assignedToId: t.assignedToId,
        companyName: t.companyName,
        _selected: t._selected,
      })),
    });
    return btoa(content); // Simple base64 hash
  }

  useEffect(() => {
    const hash = createContentHash(initialSummary, initialDecisions || "", []);
    setInitialContentHash(hash);
    setLastSavedHash(hash);
  }, [initialSummary, initialDecisions]);

  // Check for changes whenever content updates
  useEffect(() => {
    const currentHash = createContentHash(summary, decisions, proposed);
    const hasChanges = currentHash !== lastSavedHash;
    setHasUnsavedChanges(hasChanges);
  }, [summary, decisions, proposed, lastSavedHash]);

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
  }, []);

  const selectedCount = proposed.filter(
    (t) => t._selected && t.name?.trim()
  ).length;

  type Row =
    | { kind: "label"; text: "Proposed" | "Already created" }
    | { kind: "proposed"; index: number; item: ProposedTask }
    | { kind: "created"; item: CreatedTask };

  const rows: Row[] = [];
  if (proposed.length) {
    rows.push({ kind: "label", text: "Proposed" });
    proposed.forEach((item, i) =>
      rows.push({ kind: "proposed", index: i, item })
    );
  }
  if (createdTasks?.length) {
    rows.push({ kind: "label", text: "Already created" });
    createdTasks.forEach((item) => rows.push({ kind: "created", item }));
  }

  return (
    <div
      className="space-y-6 flex items-start"
      style={{ height: "calc(100vh - 129px)" }}
      onClick={() => console.log(hasUnsavedChanges)}
    >
      {/* Left: full-height editor column */}
      <div className="flex flex-col flex-1 mb-0 h-full">
        <section className="flex-1 overflow-hidden">
          <div className="pb-0 flex items-start h-full">
            <div className="flex-1 p-6 h-[calc(100vh-106px)]">
              {previewError && (
                <p className="text-sm text-red-600 p-4">{previewError}</p>
              )}
              {minutesHTML != null &&
                !isFullscreen && ( // ⬅️ guard
                  <RichNoteEditor
                    data-theming-css-demo
                    initialHTML={minutesHTML}
                    isFullScreen={isFullscreen}
                    fullHeight
                    onChangeHTML={(html, plain) => {
                      setMinutesHTML(html);
                      setSummary(plain.slice(0, 1500));
                      setDecisions(extractDecisionsFromHTML(html));
                    }}
                    className="h-full"
                  />
                )}
            </div>
            <TooltipProvider>
              <div className="p-4 border-l space-y-3 ml-auto flex flex-col h-full items-center">
                {/* Commit selected (shows count) */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={commitSelected}
                      disabled={
                        committing ||
                        (selectedCount === 0 && !hasUnsavedChanges)
                      }
                      className={cn(
                        "bg-[#FF6B4A] hover:bg-[#FF6B4A]/90 relative",
                        hasUnsavedChanges &&
                          "ring-2 ring-yellow-400 ring-offset-2"
                      )}
                      size="icon"
                      aria-label={
                        committing
                          ? "Committing"
                          : hasUnsavedChanges && selectedCount === 0
                            ? "Save changes"
                            : hasUnsavedChanges
                              ? `Save changes & commit ${selectedCount} selected task${selectedCount === 1 ? "" : "s"}`
                              : `Commit ${selectedCount} selected task${selectedCount === 1 ? "" : "s"} & summary`
                      }
                    >
                      <Rocket />
                      {selectedCount > 0 && (
                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center text-[10px] leading-none rounded-full px-1.5 py-0.5 bg-black text-white">
                          {selectedCount}
                        </span>
                      )}
                      {hasUnsavedChanges && (
                        <span className="absolute -bottom-1 -left-1 w-2 h-2 bg-yellow-400 rounded-full" />
                      )}
                      <span className="sr-only">
                        {committing
                          ? "Committing…"
                          : hasUnsavedChanges && selectedCount === 0
                            ? "Save changes"
                            : hasUnsavedChanges
                              ? `Save changes & commit ${selectedCount} task${selectedCount === 1 ? "" : "s"}`
                              : `Commit ${selectedCount} task${selectedCount === 1 ? "" : "s"} & summary`}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {committing
                      ? "Committing…"
                      : hasUnsavedChanges
                        ? selectedCount > 0
                          ? `Save changes & commit ${selectedCount} selected`
                          : "You have unsaved changes"
                        : selectedCount > 0
                          ? `Commit ${selectedCount} selected`
                          : "Nothing selected to commit"}
                  </TooltipContent>
                </Tooltip>

                {/* Divider */}
                <div className="h-px w-6 bg-border my-1" />

                {/* View minutes (only if exists) */}
                {minutesDoc ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link href={minutesDoc.url} aria-label="View minutes">
                        <Button variant="ghost" size="icon">
                          <FileText />
                          <span className="sr-only">View minutes</span>
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>View minutes</TooltipContent>
                  </Tooltip>
                ) : null}

                {/* Create/Update minutes */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={recreateMinutes}
                      aria-label={
                        minutesDoc ? "Update minutes" : "Create minutes"
                      }
                    >
                      {minutesDoc ? <FilePenLine /> : <FilePlus2 />}
                      <span className="sr-only">
                        {minutesDoc ? "Update minutes" : "Create minutes"}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {minutesDoc ? "Update minutes" : "Create minutes"}
                  </TooltipContent>
                </Tooltip>

                {/* Load / Refresh preview */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={loadPreview}
                      disabled={loadingPreview}
                      aria-label="Load/Refresh preview"
                    >
                      {loadingPreview ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <RefreshCw />
                      )}
                      <span className="sr-only">Load/Refresh preview</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Load/Refresh preview</TooltipContent>
                </Tooltip>

                {/* Fullscreen editor */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsFullscreen(true)}
                      aria-label="Enter full screen"
                    >
                      <Maximize2 />
                      <span className="sr-only">Enter full screen</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Full screen</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </section>
      </div>

      {/* Right: Draft tasks column */}
      <section className="space-y-3 w-92 border-l h-full overflow-y-auto max-h-[87vh]">
        <div className="flex flex-col mb-0">
          <div className="flex flex-col p-4 border-b items-start justify-between">
            <h2 className="font-semibold">Tasks</h2>
            <div className="flex items-start mt-4 w-full flex-col gap-2">
              <Button className="w-full bg-[#1F1F1F]" onClick={addDraft}>
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

          {rows.length === 0 ? (
            <p className="text-sm p-4 text-muted-foreground">
              No tasks yet. Use <strong>Load/Refresh Preview</strong> or{" "}
              <strong>Add draft task</strong>.
            </p>
          ) : (
            <div className="p-4 space-y-2 border-b">
              {rows.map((row, i) => {
                if (row.kind === "label") {
                  return (
                    <div
                      key={`label-${i}`}
                      className={`flex items-center gap-3 mb-4 ${i === 0 ? "" : "mt-4"}`}
                    >
                      {/* <div className="flex-1 h-px bg-border" /> */}
                      <span className="text-[12px] uppercase font-semibold tracking-wide text-muted-foreground">
                        {row.text}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  );
                }
                if (row.kind === "proposed") {
                  const t = row.item;
                  return (
                    <DraftTaskCard
                      key={`p-${row.index}`}
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
                            ? companies.find((c) => c.id === t.companyId)
                                ?.name || ""
                            : t.companyName,
                          labels: (t.labels || []).map((l) =>
                            typeof l === "string" ? l : l.name
                          ),
                          _selected: t._selected,
                        } as any
                      }
                      index={row.index}
                      onEdit={() => {
                        setDialogIndex(row.index);
                        setDialogOpen(true);
                      }}
                      onToggle={(checked) =>
                        setProposed((p) =>
                          p.map((x, idx) =>
                            idx === row.index ? { ...x, _selected: checked } : x
                          )
                        )
                      }
                      onDelete={() => deleteDraft(row.index)}
                    />
                  );
                }
                // created
                const t = row.item;
                return (
                  <div
                    key={`c-${t.id}`}
                    className="flex w-full items-center py-1"
                  >
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
                  </div>
                );
              })}
            </div>
          )}
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

      {hasUnsavedChanges && (
        <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded-md border border-yellow-200">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
          <span>Unsaved changes</span>
        </div>
      )}

      {isFullscreen && (
        <div className="absolute inset-0 z-50 bg-background">
          {/* Top bar */}
          <div className="flex absolute top-3 right-3 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(false)}
              aria-label="Exit full screen"
              title="Exit full screen (Esc)"
            >
              <Minimize2 />
            </Button>
          </div>

          {/* Editor fills the rest */}
          <div className="h-[100vh] p-4">
            {minutesHTML != null && (
              <RichNoteEditor
                initialHTML={minutesHTML}
                isFullScreen={isFullscreen}
                fullHeight
                onChangeHTML={(html, plain) => {
                  setMinutesHTML(html);
                  setSummary(plain.slice(0, 1500));
                  setDecisions(extractDecisionsFromHTML(html));
                }}
                className="h-full"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
