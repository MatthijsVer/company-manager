// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/db";

// const TOKENS_PER_CHAR = 0.25;
// const MAX_TOKENS = 8000;
// const PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);

// const approxTokenCount = (s: string) => Math.ceil(s.length * TOKENS_PER_CHAR);

// function chunkByTokens(text: string, maxTokens = MAX_TOKENS) {
//   const chunks: string[] = [];
//   let cur = "";
//   for (const line of text.split("\n")) {
//     if (approxTokenCount(cur) + approxTokenCount(line) > maxTokens) {
//       if (cur.trim()) chunks.push(cur);
//       cur = "";
//     }
//     cur += line + "\n";
//   }
//   if (cur.trim()) chunks.push(cur);
//   return chunks;
// }

// function segmentsToTranscript(
//   rows: { speaker?: string | null; text: string }[]
// ) {
//   return rows
//     .map((r) => `${r.speaker ? r.speaker + ": " : ""}${r.text.trim()}`)
//     .join("\n");
// }

// async function callStructuredExtraction(prompt: string) {
//   const schema = {
//     type: "object",
//     additionalProperties: false,
//     properties: {
//       summary: { type: "string", maxLength: 1500 },
//       decisions: { type: "array", items: { type: "string" } },
//       tasks: {
//         type: "array",
//         items: {
//           type: "object",
//           required: ["name"],
//           additionalProperties: false,
//           properties: {
//             name: { type: "string", maxLength: 120 },
//             description: { type: "string" },
//             dueDate: { type: "string", format: "date" },
//             assigneeEmail: { type: "string" },
//             priority: { enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
//             companySlug: { type: "string" },
//             companyName: { type: "string" },
//             labels: { type: "array", items: { type: "string" } },
//           },
//         },
//       },
//     },
//     required: ["summary", "tasks"],
//   } as const;

//   const res = await fetch("https://api.openai.com/v1/responses", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
//     },
//     body: JSON.stringify({
//       model: "gpt-4o-mini",
//       input: [
//         {
//           role: "system",
//           content:
//             "You are a meeting minute extractor. Output only the schema.",
//         },
//         { role: "user", content: prompt },
//       ],
//       structured_outputs: [{ id: "extract", schema }],
//     }),
//   });
//   if (!res.ok) throw new Error(await res.text());

//   const json = await res.json();
//   const out =
//     json.output?.[0]?.content?.[0]?.text ||
//     json.output?.[0]?.parsed ||
//     json.parsed ||
//     json;
//   return typeof out === "string" ? JSON.parse(out) : out;
// }

// export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
//   const meeting = await prisma.meeting.findUnique({ where: { id: params.id } });
//   if (!meeting) {
//     return NextResponse.json({ error: "Not found" }, { status: 404 });
//   }

//   const segs = await prisma.transcriptSegment.findMany({
//     where: { meetingId: meeting.id },
//     orderBy: { startSec: "asc" },
//   });

//   if (!segs.length) {
//     return NextResponse.json({ error: "No transcript segments" }, { status: 400 });
//   }

//   const transcript = segmentsToTranscript(segs);
//   const chunks = chunkByTokens(transcript, MAX_TOKENS);

//   // Aggregate summaries/decisions/tasks across chunks
//   const summaries: string[] = [];
//   const decisionsAgg: string[] = [];
//   const tasksAgg: any[] = [];

//   for (const [i, chunk] of chunks.entries()) {
//     const res = await callStructuredExtraction(
//       `This is chunk ${i + 1}/${chunks.length}. Extract concrete, deduplicated tasks with owners, dates, and companySlug/companyName if present. If info is missing, leave fields blank.\n\n` +
//         chunk
//     );
//     if (res?.summary) summaries.push(res.summary);
//     if (Array.isArray(res?.decisions)) decisionsAgg.push(...res.decisions);
//     if (Array.isArray(res?.tasks)) tasksAgg.push(...res.tasks);
//   }

//   const summary = summaries.join("\n\n");

//   // ---- Dedupe tasks across chunks (by name+assigneeEmail+dueDate+companySlug+companyName) ----
//   const dedup = new Map<string, any>();
//   for (const t of tasksAgg) {
//     const key = JSON.stringify([
//       t.name?.trim() ?? "",
//       t.assigneeEmail?.toLowerCase() ?? "",
//       t.dueDate ?? "",
//       t.companySlug?.toLowerCase() ?? "",
//       t.companyName?.toLowerCase() ?? "",
//     ]);
//     if (!dedup.has(key)) dedup.set(key, t);
//   }
//   const tasks = Array.from(dedup.values()).filter(
//     (t) => typeof t?.name === "string" && t.name.trim().length > 0
//   );

//   // Resolve assignees
//   const assigneeEmails = Array.from(
//     new Set(
//       tasks
//         .map((t) => (t.assigneeEmail || "").toLowerCase())
//         .filter((e) => !!e)
//     )
//   );
//   const users = assigneeEmails.length
//     ? await prisma.user.findMany({ where: { email: { in: assigneeEmails } } })
//     : [];
//   const usersByEmail = new Map(users.map((u) => [u.email!.toLowerCase(), u]));

//   // Resolve companies by slug (ORG-SCOPED) and by name (ORG-SCOPED)
//   const slugs = Array.from(
//     new Set(tasks.map((t) => t.companySlug).filter(Boolean))
//   );
//   const names = Array.from(
//     new Set(tasks.map((t) => t.companyName).filter(Boolean))
//   );

//   const companiesBySlug =
//     slugs.length > 0
//       ? new Map(
//           (
//             await prisma.company.findMany({
//               where: { organizationId: meeting.organizationId, slug: { in: slugs } },
//             })
//           ).map((c) => [c.slug!, c])
//         )
//       : new Map<string, any>();

//   const companiesByName =
//     names.length > 0
//       ? new Map(
//           (
//             await prisma.company.findMany({
//               where: {
//                 organizationId: meeting.organizationId,
//                 name: { in: names },
//               },
//             })
//           ).map((c) => [c.name, c])
//         )
//       : new Map<string, any>();

//   // Prepare task creates (Companies = Projects)
//   const toCreate = tasks.map((t) => {
//     const bySlug = t.companySlug ? companiesBySlug.get(t.companySlug) : null;
//     const byName = !bySlug && t.companyName ? companiesByName.get(t.companyName) : null;

//     const companyId = bySlug?.id || byName?.id || meeting.companyId || null;

//     // Normalize priority and due date
//     const priority =
//       typeof t.priority === "string" && PRIORITIES.has(t.priority)
//         ? t.priority
//         : ("MEDIUM" as const);

//     const dueDate =
//       t.dueDate && !Number.isNaN(Date.parse(t.dueDate))
//         ? new Date(t.dueDate)
//         : null;

//     const assignedToId = t.assigneeEmail
//       ? usersByEmail.get(String(t.assigneeEmail).toLowerCase())?.id ?? null
//       : null;

//     return {
//       organizationId: meeting.organizationId,
//       companyId,
//       name: t.name as string,
//       description: t.description ? String(t.description).slice(0, 4000) : null,
//       assignedToId,
//       reporterId: meeting.createdBy,
//       dueDate,
//       priority,
//       labels: Array.isArray(t.labels) && t.labels.length ? JSON.stringify(t.labels) : null,
//       meetingId: meeting.id,
//     };
//   });

//   // Transaction: create tasks, upsert extraction, save note, bump status
//   const decisionsText = decisionsAgg.join("\n");
//   let createdCount = 0;

//   await prisma.$transaction(async (tx) => {
//     if (toCreate.length) {
//       const { count } = await tx.task.createMany({ data: toCreate, skipDuplicates: true });
//       createdCount = count;
//     }

//     await tx.meetingExtraction.upsert({
//       where: { meetingId: meeting.id },
//       create: {
//         meetingId: meeting.id,
//         summary,
//         decisions: decisionsText,
//         payload: { tasks, decisions: decisionsAgg },
//         status: "COMPLETE",
//       },
//       update: {
//         summary,
//         decisions: decisionsText,
//         payload: { tasks, decisions: decisionsAgg },
//         status: "COMPLETE",
//       },
//     });

//     if (summary.trim() && meeting.companyId) {
//       await tx.companyNote.create({
//         data: {
//           companyId: meeting.companyId,
//           userId: meeting.createdBy,
//           content: summary,
//           category: "meeting_summary",
//           meetingId: meeting.id,
//         },
//       });
//     }

//     await tx.meeting.update({
//       where: { id: meeting.id },
//       data: { status: "PROCESSED" },
//     });
//   });

//   return NextResponse.json({
//     createdTasks: createdCount,
//     decisions: decisionsAgg.length,
//   });
// }

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

// --- cheap token estimator & helpers ---
const TOKENS_PER_CHAR = 0.25;
const MAX_TOKENS = 8000;
const PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);
const approxTokenCount = (s: string) => Math.ceil(s.length * TOKENS_PER_CHAR);

function chunkByTokens(text: string, maxTokens = MAX_TOKENS) {
  const chunks: string[] = [];
  let cur = "";
  for (const line of text.split("\n")) {
    if (approxTokenCount(cur) + approxTokenCount(line) > maxTokens) {
      if (cur.trim()) chunks.push(cur);
      cur = "";
    }
    cur += line + "\n";
  }
  if (cur.trim()) chunks.push(cur);
  return chunks;
}

function segmentsToTranscript(rows: { speaker?: string | null; text: string }[]) {
  return rows.map((r) => `${r.speaker ? r.speaker + ": " : ""}${r.text.trim()}`).join("\n");
}

async function callStructuredExtraction(prompt: string) {
    // Define task properties in one place
    const taskProps = {
      name:          { type: "string", maxLength: 120 },
      description:   { type: "string" },              // send "" if unknown
      dueDate:       { type: "string", format: "date" }, // send "" if unknown
      assigneeEmail: { type: "string" },              // send "" if unknown
      priority:      { enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] }, // send "MEDIUM" if unknown
      companySlug:   { type: "string" },              // send "" if unknown
      companyName:   { type: "string" },              // send "" if unknown
      labels:        { type: "array", items: { type: "string" } }, // send [] if none
    } as const;
  
    const taskItemSchema = {
      type: "object",
      additionalProperties: false,
      properties: taskProps,
      required: Object.keys(taskProps), // <-- strict mode wants ALL keys listed
    } as const;
  
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        summary:   { type: "string", maxLength: 1500 },
        decisions: { type: "array", items: { type: "string" } },
        tasks:     { type: "array", items: taskItemSchema },
      },
      required: ["summary", "tasks", "decisions"]
    } as const;
  
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        input: [
          // brief instruction so the model fills all required fields
          "Extract a concise meeting summary, decisions, and concrete tasks.",
          "All task fields are required by schema: if unknown, use an empty string, [] for labels, and 'MEDIUM' for priority.",
          "Only return JSON that conforms to the schema.",
          "",
          prompt,
        ].join("\n"),
        text: {
          format: {
            type: "json_schema",
            name: "MeetingExtraction",   // REQUIRED at this level
            schema,
            strict: true,                // enforce the schema strictly
          },
        },
        // max_output_tokens: 1500, // optional
      }),
    });
  
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Structured extraction failed: ${res.status} ${t}`);
    }
  
    const json = await res.json();
  
    // Pull structured JSON from Responses API content
    const content = json?.output?.[0]?.content ?? [];
    const obj =
      (Array.isArray(content)
        ? content.find((c: any) => c?.type === "output_json")?.json
        : null) ??
      (() => {
        const text = Array.isArray(content)
          ? content.find((c: any) => c?.type === "output_text")?.text
          : undefined;
        try { return text ? JSON.parse(text) : null; } catch { return null; }
      })();
  
    if (!obj) throw new Error("No structured JSON returned");
    return obj;
  }
  

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth();
  const { organizationId } = session;
  const { id } = await params

  const meeting = await prisma.meeting.findUnique({ where: { id } });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (meeting.organizationId !== organizationId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const segs = await prisma.transcriptSegment.findMany({
    where: { meetingId: meeting.id },
    orderBy: { startSec: "asc" },
  });
  if (!segs.length) return NextResponse.json({ error: "No transcript segments" }, { status: 400 });

  const transcript = segmentsToTranscript(segs);
  const chunks = chunkByTokens(transcript, MAX_TOKENS);

  const summaries: string[] = [];
  const decisionsAgg: string[] = [];
  const tasksAgg: any[] = [];

  for (const [i, chunk] of chunks.entries()) {
    const res = await callStructuredExtraction(
      `This is chunk ${i + 1}/${chunks.length}. Extract concrete, deduplicated tasks with owners, dates, and companySlug/companyName if present. If info is missing, leave fields blank.\n\n` +
        chunk
    );
    if (res?.summary) summaries.push(res.summary);
    if (Array.isArray(res?.decisions)) decisionsAgg.push(...res.decisions);
    if (Array.isArray(res?.tasks)) tasksAgg.push(...res.tasks);
  }

  const summary = summaries.join("\n\n");

  // Dedupe tasks across chunks
  const dedup = new Map<string, any>();
  for (const t of tasksAgg) {
    const key = JSON.stringify([
      (t.name || "").trim(),
      (t.assigneeEmail || "").toLowerCase(),
      t.dueDate || "",
      (t.companySlug || "").toLowerCase(),
      (t.companyName || "").toLowerCase(),
    ]);
    if (!dedup.has(key)) dedup.set(key, t);
  }
  const tasks = Array.from(dedup.values()).filter((t) => typeof t?.name === "string" && t.name.trim().length > 0);

  // Resolve assignees
  const assigneeEmails = Array.from(
    new Set(tasks.map((t) => String(t.assigneeEmail || "").toLowerCase()).filter(Boolean))
  );
  const users = assigneeEmails.length
    ? await prisma.user.findMany({ where: { email: { in: assigneeEmails } } })
    : [];
  const usersByEmail = new Map(users.map((u) => [u.email!.toLowerCase(), u]));

  // Resolve companies (ORG-scoped)
  const slugs = Array.from(new Set(tasks.map((t) => t.companySlug).filter(Boolean)));
  const names = Array.from(new Set(tasks.map((t) => t.companyName).filter(Boolean)));

  const companiesBySlug =
    slugs.length
      ? new Map(
          (
            await prisma.company.findMany({
              where: { organizationId: meeting.organizationId, slug: { in: slugs } },
            })
          ).map((c) => [c.slug!, c])
        )
      : new Map<string, any>();

  const companiesByName =
    names.length
      ? new Map(
          (
            await prisma.company.findMany({
              where: { organizationId: meeting.organizationId, name: { in: names } },
            })
          ).map((c) => [c.name, c])
        )
      : new Map<string, any>();

  // Prepare task creates (Companies = Projects)
  const toCreate = tasks.map((t) => {
    const bySlug = t.companySlug ? companiesBySlug.get(t.companySlug) : null;
    const byName = !bySlug && t.companyName ? companiesByName.get(t.companyName) : null;
    const companyId = bySlug?.id || byName?.id || meeting.companyId || null;

    const priority =
      typeof t.priority === "string" && PRIORITIES.has(t.priority) ? t.priority : ("MEDIUM" as const);

    const dueDate = t.dueDate && !Number.isNaN(Date.parse(t.dueDate)) ? new Date(t.dueDate) : null;
    const assignedToId = t.assigneeEmail
      ? usersByEmail.get(String(t.assigneeEmail).toLowerCase())?.id ?? null
      : null;

    return {
      organizationId: meeting.organizationId,
      companyId,
      name: t.name as string,
      description: t.description ? String(t.description).slice(0, 4000) : null,
      assignedToId,
      reporterId: meeting.createdBy,
      dueDate,
      priority,
      labels: Array.isArray(t.labels) && t.labels.length ? JSON.stringify(t.labels) : null,
      meetingId: meeting.id,
    };
  });

  const decisionsText = decisionsAgg.join("\n");
  let createdCount = 0;

  await prisma.$transaction(async (tx) => {
    if (toCreate.length) {
      const { count } = await tx.task.createMany({ data: toCreate, skipDuplicates: true });
      createdCount = count;
    }

    await tx.meetingExtraction.upsert({
      where: { meetingId: meeting.id },
      create: { meetingId: meeting.id, summary, decisions: decisionsText, payload: { tasks, decisions: decisionsAgg }, status: "COMPLETE" },
      update: { summary, decisions: decisionsText, payload: { tasks, decisions: decisionsAgg }, status: "COMPLETE" },
    });

    if (summary.trim() && meeting.companyId) {
      await tx.companyNote.create({
        data: {
          companyId: meeting.companyId,
          userId: meeting.createdBy,
          content: summary,
          category: "meeting_summary",
          meetingId: meeting.id,
        },
      });
    }

    await tx.meeting.update({ where: { id: meeting.id }, data: { status: "PROCESSED" } });
  });

  return NextResponse.json({ createdTasks: createdCount, decisions: decisionsAgg.length });
}
