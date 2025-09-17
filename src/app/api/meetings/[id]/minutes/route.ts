export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { format } from "date-fns";

// reuse same HTML render as in commit route
function renderMinutesHTML(opts: {
  meeting: any;
  summary: string;
  decisionsText: string;
  tasks: Array<{ name: string; description?: string; dueDate?: string; priority?: string; assigneeEmail?: string; companyName?: string }>;
}) {
  // (identical to the helper in commit route; keep a single copy if you prefer)
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

  return `<!doctype html><html><head><meta charset="utf-8" />
<title>${title} — Minutes</title>
<style>
body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.45;color:#111;padding:24px;max-width:860px;margin:0 auto;background:#fff}
h1{font-size:24px;margin:0 0 2px}.meta{color:#666;font-size:13px;margin-bottom:18px}
h2{font-size:16px;margin:18px 0 8px}.card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:12px 0;background:#fff}
.task{margin:8px 0}.task-desc{color:#475569;margin-top:4px;white-space:pre-wrap}.muted{color:#6b7280}
.badge{display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:999px;padding:2px 8px;font-size:11px;color:#374151}
</style></head>
<body>
  <h1>Meeting Minutes</h1>
  <div class="meta"><span class="badge">${when}</span>${meeting.company ? `<span class="badge" style="margin-left:6px;">${meeting.company.name}</span>` : ""}</div>
  <div class="card"><h2>Summary</h2><div>${summary ? summary.replace(/\n/g, "<br/>") : "<span class='muted'>No summary</span>"}</div></div>
  <div class="card"><h2>Decisions</h2>${decisionsHtml}</div>
  <div class="card"><h2>Action Items</h2>${tasksList ? `<ol>${tasksList}</ol>` : "<p class='muted'>No tasks.</p>"}</div>
</body></html>`;
}

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
    const { organizationId, userId } = await requireAuth();
    const { id } = await params;
  
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: { company: { select: { id: true, name: true } } },
    });
    if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (meeting.organizationId !== organizationId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  
    const extraction = await prisma.meetingExtraction.findUnique({ where: { meetingId: meeting.id } });
    const summary = extraction?.summary ?? "";
    const decisionsText = extraction?.decisions ?? "";
    const committedTasks: any[] = Array.isArray(extraction?.payload?.tasks) ? extraction?.payload?.tasks : [];
  
    const html = renderMinutesHTML({
      meeting,
      summary,
      decisionsText,
      tasks: committedTasks.map(t => ({
        name: t.name,
        description: t.description,
        dueDate: t.dueDate,
        priority: t.priority,
        assigneeEmail: t.assigneeEmail,
        companyName: t.companyName,
      })),
    });
    const fileName = `Meeting Minutes - ${meeting.title || format(new Date(meeting.createdAt), "yyyy-MM-dd_HH-mm")}.html`;
    const fileSize = Buffer.byteLength(html, "utf8");
  
    // ✅ MySQL JSON filtering uses JSONPath string for `path`
    const existing = await prisma.organizationDocument.findFirst({
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
  
    const doc = existing
      ? await prisma.organizationDocument.update({
          where: { id: existing.id },
          data: {
            fileName,
            fileSize,
            fileUrl: `/dashboard/documents/${existing.id}`,
            mimeType: "text/html",
            description: summary?.slice(0, 500) || null,
            metadata: {
              kind: "meeting_minutes",
              meetingId: meeting.id,
              companyId: meeting.companyId ?? null,
              html,
              tasksCount: committedTasks.length,
            },
          },
          select: { id: true, fileUrl: true },
        })
      : await prisma.organizationDocument.create({
          data: {
            organizationId,
            uploadedBy: userId,
            category: "meeting_minutes",
            fileName,
            fileSize,
            fileUrl: "", // will update with id below
            mimeType: "text/html",
            description: summary?.slice(0, 500) || null,
            tags: JSON.stringify(["meeting_minutes"]),
            metadata: { kind: "meeting_minutes", meetingId: meeting.id, companyId: meeting.companyId ?? null, html, tasksCount: committedTasks.length },
          },
          select: { id: true, fileUrl: true },
        });
  
    if (!doc.fileUrl) {
      await prisma.organizationDocument.update({
        where: { id: doc.id },
        data: { fileUrl: `/dashboard/documents/${doc.id}` },
      });
    }
  
    if (meeting.companyId) {
      await prisma.documentCompanyLink.upsert({
        where: { documentId_companyId: { documentId: doc.id, companyId: meeting.companyId } },
        create: { documentId: doc.id, companyId: meeting.companyId, linkedBy: userId },
        update: {},
      });
    }
  
    return NextResponse.json({ id: doc.id, url: `/dashboard/documents/${doc.id}` });
  }
  