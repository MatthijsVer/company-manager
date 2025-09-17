export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

const PREVIEW_MAX_CHARS = 16000;

function buildTranscriptText(rows: { speaker: string | null; text: string }[]) {
  let out = "";
  for (const r of rows) {
    const line = `${r.speaker ? r.speaker + ": " : ""}${r.text.trim()}\n`;
    if (out.length + line.length > PREVIEW_MAX_CHARS) break;
    out += line;
  }
  return out.trim();
}

function stripCodeFences(s: string) {
  return s.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { organizationId } = await requireAuth();
  const { id } = await params;

  const meeting = await prisma.meeting.findUnique({ where: { id } });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (meeting.organizationId !== organizationId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const segments = await prisma.transcriptSegment.findMany({
    where: { meetingId: meeting.id },
    orderBy: { startSec: "asc" },
    select: { speaker: true, text: true },
    take: 4000, // cap
  });

  const transcript = buildTranscriptText(segments);
  if (!transcript) {
    return NextResponse.json({ summary: "", tasks: [] });
  }

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: { type: "string" },
      tasks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            dueDate: { type: "string" },
            assigneeEmail: { type: "string" },
            priority: { type: "string" },
            companySlug: { type: "string" },
            companyName: { type: "string" },
            labels: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
    required: ["summary", "tasks"],
  } as const;

  // Responses API (permissive for preview)
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      max_output_tokens: 1200,
      input: [
        "You are generating a quick preview after a meeting transcription.",
        "Return up to 8 concise concept tasks.",
        "If any field is unknown, use empty string (or [] for labels).",
        "Only return JSON matching the schema.",
        "",
        "TRANSCRIPT:",
        transcript,
      ].join("\n"),
      text: {
        format: {
          type: "json_schema",
          name: "MeetingPreview",
          schema,
          strict: false,
        },
      },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    return NextResponse.json({ error: t }, { status: 500 });
  }

  const json = await res.json();
  const content = json?.output?.[0]?.content ?? [];
  let obj: any = null;
  if (Array.isArray(content)) {
    obj = content.find((c: any) => c?.type === "output_json")?.json;
    if (!obj) {
      const text = content.find((c: any) => c?.type === "output_text")?.text;
      if (text) {
        try { obj = JSON.parse(stripCodeFences(String(text))); } catch {}
      }
    }
  }
  return NextResponse.json(obj ?? { summary: "", tasks: [] });
}
