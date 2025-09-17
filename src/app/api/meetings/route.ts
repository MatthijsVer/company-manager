// // app/api/meetings/route.ts
// export const runtime = "nodejs";

// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/db";
// import { requireAuth } from "@/lib/auth/session";
// import { z } from "zod";

// const Body = z.object({
//   companyId: z.string().optional(),
//   title: z.string().optional(),
//   language: z.string().default("en"),
//   audioUrl: z.string().url(), // already uploaded via signed URL
//   provider: z.enum(["deepgram", "openai"]).default("deepgram"),
// });

// export async function POST(req: NextRequest) {
//   const session = await requireAuth(); // throws if not authed
//   const { userId, organizationId } = session;

//   const body = Body.parse(await req.json());

//   // (Optional but recommended) ensure companyId is in the same org
//   if (body.companyId) {
//     const company = await prisma.company.findFirst({
//       where: { id: body.companyId, organizationId },
//       select: { id: true },
//     });
//     if (!company) {
//       return NextResponse.json(
//         { error: "Invalid company for this organization" },
//         { status: 400 }
//       );
//     }
//   }

//   const meeting = await prisma.meeting.create({
//     data: {
//       organizationId,
//       companyId: body.companyId ?? null,
//       title: body.title,
//       language: body.language,
//       audioUrl: body.audioUrl,
//       transcriptionProvider: body.provider,
//       status: "RECORDED",
//       createdBy: userId,
//     },
//   });

//   return NextResponse.json({ meetingId: meeting.id });
// }


export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { z } from "zod";

const Body = z.object({
  companyId: z.string().optional(),
  title: z.string().optional(),
  language: z.string().default("en"),
  audioUrl: z.string(), // allow file:// in dev
  provider: z.enum(["deepgram", "openai"]).optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireAuth(); // throws if not authed
  const { userId, organizationId } = session;

  const body = Body.parse(await req.json());

  // Validate audioUrl roughly (either file:// or a valid http/https)
  const isLocal = body.audioUrl.startsWith("file://");
  if (!isLocal) {
    try { new URL(body.audioUrl); } catch { 
      return NextResponse.json({ error: "Invalid audioUrl" }, { status: 400 });
    }
  }

  // (Optional) ensure company belongs to this org
  if (body.companyId) {
    const company = await prisma.company.findFirst({
      where: { id: body.companyId, organizationId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Invalid company for this organization" }, { status: 400 });
    }
  }

  // In dev-local, default to Whisper; otherwise default to Deepgram
  const inferredProvider =
    body.provider ??
    ((process.env.NEXT_PUBLIC_STORAGE_DRIVER === "dev-local" || isLocal) ? "openai" : "deepgram");

  const meeting = await prisma.meeting.create({
    data: {
      organizationId,
      companyId: body.companyId ?? null,
      title: body.title,
      language: body.language,
      audioUrl: body.audioUrl,
      transcriptionProvider: inferredProvider,
      status: "RECORDED",
      createdBy: userId,
    },
  });

  return NextResponse.json({ meetingId: meeting.id });
}
