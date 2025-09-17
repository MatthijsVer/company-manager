// app/api/meetings/[id]/summary/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

export async function GET(_: NextRequest, { params }: { params: { id: string }}) {
  const { organizationId } = await requireAuth();
  const m = await prisma.meeting.findUnique({
    where: { id: params.id },
    include: {
      segments: { orderBy: { startSec: "asc" }, take: 2000 }, // cap for sanity
      tasks: { select: { id: true, name: true, dueDate: true, priority: true, companyId: true } },
    },
  });
  if (!m || m.organizationId !== organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const extraction = await prisma.meetingExtraction.findUnique({ where: { meetingId: m.id } });
  return NextResponse.json({
    status: m.status,
    summary: extraction?.summary ?? "",
    decisions: extraction?.decisions?.split("\n").filter(Boolean) ?? [],
    tasks: m.tasks,
    segments: m.segments.map(s => ({ t0: s.startSec, t1: s.endSec, speaker: s.speaker, text: s.text })),
  });
}
