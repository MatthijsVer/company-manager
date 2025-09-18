export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { slugify } from "./slugify";
import { format } from "date-fns";

function parseDateMaybe(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// 🧩 helper: simple HTML minutes template
function renderMinutesHTML(opts: {
  meeting: any;
  summary: string;
  decisionsText: string;
  tasks: Array<{ name: string; description?: string; dueDate?: string; priority?: string; assigneeEmail?: string; companyName?: string }>;
}) {
  const { meeting, summary, decisionsText, tasks } = opts;
  const title = meeting.title || "Meeting";
  const when = format(new Date(meeting.createdAt), "PPPp");
  const decisions = decisionsText
    ? decisionsText.split("\n").map((l: string) => l.trim()).filter(Boolean)
    : [];

  const tasksList = tasks.map(t => {
    const bits = [
      `<strong>${t.name}</strong>`,
      t.priority ? `Priority: ${t.priority}` : "",
      t.assigneeEmail ? `Assignee: ${t.assigneeEmail}` : "",
      t.companyName ? `Company: ${t.companyName}` : "",
      t.dueDate ? `Due: ${t.dueDate}` : "",
    ].filter(Boolean).join(" · ");

    const desc = t.description ? `<div class="task-desc">${t.description}</div>` : "";
    return `<li class="task">${bits}${desc}</li>`;
  }).join("");

  const decisionsHtml = decisions.length
    ? `<ul>${decisions.map(d => `<li>${d}</li>`).join("")}</ul>`
    : `<p><em>No explicit decisions recorded.</em></p>`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${title} — Minutes</title>
<style>
  body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.45;color:#111;padding:24px;max-width:860px;margin:0 auto;background:#fff}
  h1{font-size:24px;margin:0 0 2px}
  .meta{color:#666;font-size:13px;margin-bottom:18px}
  h2{font-size:16px;margin:18px 0 8px}
  .card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:12px 0;background:#fff}
  .task{margin:8px 0}
  .task-desc{color:#475569;margin-top:4px;white-space:pre-wrap}
  .muted{color:#6b7280}
  .badge{display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:999px;padding:2px 8px;font-size:11px;color:#374151}
</style>
</head>
<body>
  <h1>Meeting Minutes</h1>
  <div class="meta">
    <span class="badge">${when}</span>
    ${meeting.company ? `<span class="badge" style="margin-left:6px;">${meeting.company.name}</span>` : ""}
  </div>

  <div class="card">
    <h2>Summary</h2>
    <div>${summary ? summary.replace(/\n/g, "<br/>") : "<span class='muted'>No summary</span>"}</div>
  </div>

  <div class="card">
    <h2>Decisions</h2>
    ${decisionsHtml}
  </div>

  <div class="card">
    <h2>Action Items</h2>
    ${tasksList ? `<ol>${tasksList}</ol>` : "<p class='muted'>No tasks.</p>"}
  </div>
</body>
</html>`;
}

// 🧩 helper: ensure one time entry per meeting
async function maybeCreateTimeEntry(tx: any, meeting: any, durationSec?: number | null) {
  // Check if already exists (by meeting marker in notes)
  const tag = `[meeting:${meeting.id}]`;
  const existing = await tx.timeEntry.findFirst({
    where: { userId: meeting.createdBy, notes: { contains: tag } },
    select: { id: true },
  });
  if (existing) return { created: false, id: existing.id };

  // Derive duration
  let seconds = durationSec ?? 0;
  if (!seconds) {
    if (meeting.startedAt && meeting.endedAt) {
      seconds = Math.max(0, Math.round((new Date(meeting.endedAt).getTime() - new Date(meeting.startedAt).getTime()) / 1000));
    } else {
      // fallback: compute from transcript segments (max endSec)
      const aggr = await tx.transcriptSegment.aggregate({
        where: { meetingId: meeting.id },
        _max: { endSec: true },
        _min: { startSec: true },
      });
      const end = aggr._max.endSec ?? 0;
      const start = aggr._min.startSec ?? 0;
      seconds = Math.max(0, Math.round(end - start));
    }
  }
  if (seconds <= 0) seconds = 60; // at least 1 min to avoid zero-length entries

  const startTime = meeting.startedAt ? new Date(meeting.startedAt) : new Date(Date.now() - seconds * 1000);
  const endTime = new Date(startTime.getTime() + seconds * 1000);

  const te = await tx.timeEntry.create({
    data: {
      userId: meeting.createdBy,
      companyId: meeting.companyId ?? null,
      description: `Meeting: ${meeting.title || format(new Date(meeting.createdAt), "PPPp")} ${tag}`,
      startTime,
      endTime,
      duration: seconds,
      isRunning: false,
      isInternal: !meeting.companyId,
      isBillable: !!meeting.companyId,
      notes: tag,
    },
    select: { id: true },
  });

  return { created: true, id: te.id };
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { organizationId, userId } = await requireAuth();

  const meeting = await prisma.meeting.findUnique({
    where: { id: params.id },
    include: { company: { select: { id: true, name: true } } },
  });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (meeting.organizationId !== organizationId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Parse body FIRST
  const body = await req.json();
  
  // THEN extract the minutesHTML after body is parsed
  const minutesHTMLFromClient: string = typeof body.minutesHTML === "string" ? body.minutesHTML : "";
  
  // DEBUG: Log what we received
  console.log("📥 API DEBUG - Received minutesHTML length:", minutesHTMLFromClient.length);
  console.log("📥 API DEBUG - minutesHTML content:", minutesHTMLFromClient.slice(0, 200));

  const summary: string = String(body.summary ?? "");
  const decisionsText: string = String(body.decisions ?? "");
  const createMinutes: boolean = body.createMinutes !== false; // default true
  const autoCompanies: boolean = !!body.autoCreateCompanies;
  const autoContacts: boolean = !!body.autoCreateContacts;

  const tasks: Array<{
    name: string; description?: string; dueDate?: string;
    assignedToId?: string | null;
    assigneeEmail?: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    companyId?: string | null;
    companyName?: string; companySlug?: string;
    labels?: (string | { name: string })[];
  }> = Array.isArray(body.tasks) ? body.tasks : [];

  // Lookups (companies / users)
  const names = Array.from(new Set(tasks.map(t => (t.companyName || "").trim()).filter(Boolean)));
  const slugs  = Array.from(new Set(tasks.map(t => (t.companySlug || "").trim()).filter(Boolean)));
  const emails = Array.from(new Set(tasks.map(t => (t.assigneeEmail || "").trim().toLowerCase()).filter(Boolean)));

  const companiesByName = new Map<string, any>();
  if (names.length) {
    (await prisma.company.findMany({ where: { organizationId, name: { in: names } } }))
      .forEach(c => companiesByName.set(c.name, c));
  }
  const companiesBySlug = new Map<string, any>();
  if (slugs.length) {
    (await prisma.company.findMany({ where: { organizationId, slug: { in: slugs } } }))
      .forEach(c => companiesBySlug.set(c.slug!, c));
  }
  const usersByEmail = new Map<string, any>();
  if (emails.length) {
    (await prisma.user.findMany({ where: { email: { in: emails } } }))
      .forEach(u => usersByEmail.set(u.email.toLowerCase(), u));
  }

  // Auto-create missing companies by name
  const toCreateCompanies: { name: string; slug: string }[] = [];
  if (autoCompanies) {
    for (const nm of names) {
      if (!companiesByName.has(nm)) {
        const base = slugify(nm);
        let s = base;
        let i = 1;
        while (await prisma.company.findFirst({ where: { organizationId, slug: s } })) {
          s = `${base}-${++i}`;
        }
        toCreateCompanies.push({ name: nm, slug: s });
      }
    }
  }

  const createdCompanies: Record<string, string> = {}; // name -> id
  if (toCreateCompanies.length) {
    await prisma.company.createMany({
      data: toCreateCompanies.map(x => ({ organizationId, name: x.name, slug: x.slug, status: "ACTIVE", type: "CLIENT" })),
    });
    const added = await prisma.company.findMany({ where: { organizationId, name: { in: toCreateCompanies.map(x => x.name) } } });
    for (const c of added) {
      createdCompanies[c.name] = c.id;
      companiesByName.set(c.name, c);
    }
  }

  // Build tasks
  const toCreateTasks = tasks.map(t => {
    const coId =
      (t.companyId || null) ||
      (t.companySlug && companiesBySlug.get(t.companySlug)?.id) ||
      (t.companyName && companiesByName.get(t.companyName)?.id) ||
      meeting.companyId ||
      null;

    const assigneeId =
      (t.assignedToId || null) ||
      (t.assigneeEmail ? usersByEmail.get(t.assigneeEmail.toLowerCase())?.id ?? null : null);

    const labelNames =
      Array.isArray(t.labels) ? t.labels.map((x) => (typeof x === "string" ? x : (x?.name || ""))).filter(Boolean) : [];

    return {
      organizationId,
      companyId: coId,
      name: t.name,
      description: t.description?.slice(0, 4000) ?? null,
      assignedToId: assigneeId,
      reporterId: meeting.createdBy,
      dueDate: parseDateMaybe(t.dueDate),
      priority: (t.priority as any) || "MEDIUM",
      labels: labelNames.length ? JSON.stringify(labelNames) : null,
      meetingId: meeting.id,
    };
  }).filter(t => t.name && t.name.trim());

  let createdTasksCount = 0;
  let createdContactsCount = 0;
  let minutesDocId: string | null = null;
  let minutesDocUrl: string | null = null;
  let timeEntryId: string | null = null;
  let timeEntryCreated = false;

  await prisma.$transaction(async (tx) => {
    if (toCreateTasks.length) {
      const created = await tx.task.createMany({ data: toCreateTasks });
      createdTasksCount = created.count ?? toCreateTasks.length;

      // Auto-create contacts by assignee email if not a user
      if (autoContacts) {
        for (const t of tasks) {
          const email = (t.assigneeEmail || "").toLowerCase();
          if (!email || usersByEmail.has(email)) continue;

          const coId =
            (t.companyId || null) ||
            (t.companySlug && companiesBySlug.get(t.companySlug)?.id) ||
            (t.companyName && companiesByName.get(t.companyName)?.id) ||
            meeting.companyId ||
            null;

          if (!coId) continue;

          const exists = await tx.companyContact.findFirst({
            where: { companyId: coId, email },
            select: { id: true },
          });
          if (!exists) {
            await tx.companyContact.create({
              data: {
                companyId: coId,
                name: email.split("@")[0],
                email,
                isPrimary: false,
              },
            });
            createdContactsCount += 1;
          }
        }
      }
    }

    // Upsert extraction with what user committed
    await tx.meetingExtraction.upsert({
      where: { meetingId: meeting.id },
      create: { meetingId: meeting.id, status: "COMPLETE", summary, decisions: decisionsText, payload: { tasks } },
      update: { status: "COMPLETE", summary, decisions: decisionsText, payload: { tasks } },
    });

    // OPTIONAL: company note from summary
    if (summary.trim() && meeting.companyId) {
      await tx.companyNote.create({
        data: {
          companyId: meeting.companyId,
          userId,
          content: summary,
          category: "meeting_summary",
          meetingId: meeting.id,
        },
      });
    }

    // Mark processed
    await tx.meeting.update({ where: { id: meeting.id }, data: { status: "PROCESSED" } });

    // TimeEntry automation
    const te = await maybeCreateTimeEntry(tx, meeting, null);
    timeEntryId = te.id;
    timeEntryCreated = te.created;

    if (createMinutes) {
      // Use the client's BlockNote HTML if provided, otherwise fall back to template
      const html =
        minutesHTMLFromClient && minutesHTMLFromClient.trim().length > 0
          ? minutesHTMLFromClient
          : renderMinutesHTML({
              meeting,
              summary,
              decisionsText,
              tasks: tasks.map(t => ({
                name: t.name,
                description: t.description,
                dueDate: t.dueDate,
                priority: t.priority,
                assigneeEmail: t.assigneeEmail,
                companyName: t.companyName,
              })),
            });

      console.log("💾 API DEBUG - Final HTML to save length:", html.length);
      console.log("💾 API DEBUG - Using client HTML:", minutesHTMLFromClient.length > 0);
      console.log("💾 API DEBUG - Final HTML preview:", html.slice(0, 300));

      const fileName = `Meeting Minutes - ${meeting.title || format(new Date(meeting.createdAt), "yyyy-MM-dd_HH-mm")}.html`;
      const fileSize = Buffer.byteLength(html, "utf8");

      // Check if document already exists and update it, or create new one
      const existingDoc = await tx.organizationDocument.findFirst({
        where: {
          organizationId,
          category: "meeting_minutes",
          metadata: {
            path: "$.meetingId",
            equals: meeting.id,
          },
        },
        select: { id: true },
      });

      let doc;
      if (existingDoc) {
        // Update existing document
        doc = await tx.organizationDocument.update({
          where: { id: existingDoc.id },
          data: {
            fileSize,
            description: summary?.slice(0, 500) || null,
            metadata: {
              kind: "meeting_minutes",
              meetingId: meeting.id,
              companyId: meeting.companyId ?? null,
              html, // This should now be the BlockNote HTML
              tasksCount: tasks.length,
            },
            updatedAt: new Date(),
          },
          select: { id: true },
        });
        console.log("💾 API DEBUG - Updated existing document:", doc.id);
      } else {
        // Create new document
        doc = await tx.organizationDocument.create({
          data: {
            organizationId,
            uploadedBy: userId,
            category: "meeting_minutes",
            fileName,
            fileSize,
            fileUrl: "",
            mimeType: "text/html",
            description: summary?.slice(0, 500) || null,
            tags: JSON.stringify(["meeting_minutes"]),
            metadata: {
              kind: "meeting_minutes",
              meetingId: meeting.id,
              companyId: meeting.companyId ?? null,
              html, // This should now be the BlockNote HTML
              tasksCount: tasks.length,
            },
            isTemplate: false,
            isStarred: false,
          },
          select: { id: true },
        });
        console.log("💾 API DEBUG - Created new document:", doc.id);
      }

      const url = `/dashboard/documents/${doc.id}`;
      await tx.organizationDocument.update({
        where: { id: doc.id },
        data: { fileUrl: url },
      });

      if (meeting.companyId) {
        await tx.documentCompanyLink.upsert({
          where: { documentId_companyId: { documentId: doc.id, companyId: meeting.companyId } },
          create: { documentId: doc.id, companyId: meeting.companyId, linkedBy: userId },
          update: {},
        });
      }

      minutesDocId = doc.id;
      minutesDocUrl = url;
    }
  });

  return NextResponse.json({
    ok: true,
    createdTasks: createdTasksCount,
    createdContacts: createdContactsCount,
    createdCompanies: Object.keys(createdCompanies).length,
    minutesDocumentId: minutesDocId,
    minutesDocumentUrl: minutesDocUrl,
    timeEntryId,
    timeEntryCreated,
  });
}