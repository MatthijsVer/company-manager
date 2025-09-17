// export const runtime = "nodejs";

// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/db";
// import { requireAuth } from "@/lib/auth/session";

// async function transcribeWithDeepgram(audioUrl: string, language?: string) {
//   const url = new URL("https://api.deepgram.com/v1/listen");
//   url.searchParams.set("model", "nova-2");
//   url.searchParams.set("smart_format", "true");
//   url.searchParams.set("diarize", "true");
//   if (language) url.searchParams.set("language", language);

//   const res = await fetch(url.toString(), {
//     method: "POST",
//     headers: {
//       Authorization: `Token ${process.env.DEEPGRAM_API_KEY!}`,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({ url: audioUrl }),
//   });
//   if (!res.ok) throw new Error(await res.text());
//   return res.json();
// }

// async function transcribeWithOpenAI(audioUrl: string, language?: string) {
//   // Whisper requires multipart/form-data with **binary**
//   const fileRes = await fetch(audioUrl);
//   if (!fileRes.ok) throw new Error(`Failed to fetch audio: ${fileRes.status}`);
//   const buf = await fileRes.arrayBuffer();

//   const form = new FormData();
//   // If you know the mime, use it; webm/opus is common for browser recordings
//   form.append("file", new Blob([buf], { type: "audio/webm" }), "meeting.webm");
//   form.append("model", "whisper-1");
//   if (language) form.append("language", language);
//   form.append("response_format", "verbose_json");

//   const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
//     method: "POST",
//     headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY!}` },
//     body: form,
//   });
//   if (!res.ok) throw new Error(await res.text());
//   return res.json();
// }

// export async function POST(
//   _: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   const session = await requireAuth();
//   const { organizationId } = session;

//   const meeting = await prisma.meeting.findUnique({ where: { id: params.id } });
//   if (!meeting)
//     return NextResponse.json({ error: "Not found" }, { status: 404 });

//   // Org guard
//   if (meeting.organizationId !== organizationId) {
//     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
//   }

//   let dg: any;
//   const provider = meeting.transcriptionProvider ?? "deepgram";
//   try {
//     if (provider === "deepgram") {
//       dg = await transcribeWithDeepgram(
//         meeting.audioUrl!,
//         meeting.language ?? undefined
//       );
//     } else {
//       dg = await transcribeWithOpenAI(
//         meeting.audioUrl!,
//         meeting.language ?? undefined
//       );
//     }
//   } catch (e: any) {
//     await prisma.meeting.update({
//       where: { id: meeting.id },
//       data: { status: "FAILED" },
//     });
//     throw e;
//   }

//   // Normalize to segments { startSec, endSec, speaker, text }
//   const segments: {
//     startSec: number;
//     endSec: number;
//     speaker?: string | null;
//     text: string;
//   }[] = [];

//   if (provider === "deepgram") {
//     const words = dg?.results?.channels?.[0]?.alternatives?.[0]?.words ?? [];
//     if (words.length === 0) {
//       // Fallback: collapse full transcript text (best-effort)
//       const alt = dg?.results?.channels?.[0]?.alternatives?.[0];
//       const transcriptText: string =
//         alt?.transcript?.trim?.() ||
//         alt?.paragraphs?.transcript?.trim?.() ||
//         "";
//       if (transcriptText) {
//         segments.push({ startSec: 0, endSec: 0, text: transcriptText });
//       }
//     } else {
//       // Group consecutive words by speaker tag
//       let buf: string[] = [];
//       let cur = {
//         s: words[0]?.start ?? 0,
//         e: words[0]?.end ?? 0,
//         spk: words[0]?.speaker ?? "S0",
//       };
//       for (const w of words) {
//         if (w.speaker !== cur.spk && buf.length) {
//           segments.push({
//             startSec: cur.s,
//             endSec: cur.e,
//             speaker: cur.spk,
//             text: buf.join(" "),
//           });
//           buf = [];
//           cur = { s: w.start, e: w.end, spk: w.speaker };
//         }
//         buf.push(w.punctuated_word ?? w.word);
//         cur.e = w.end;
//       }
//       if (buf.length) {
//         segments.push({
//           startSec: cur.s,
//           endSec: cur.e,
//           speaker: cur.spk,
//           text: buf.join(" "),
//         });
//       }
//     }
//   } else {
//     // Whisper verbose_json has segment list
//     for (const seg of dg?.segments ?? []) {
//       segments.push({
//         startSec: seg.start,
//         endSec: seg.end,
//         text: (seg.text ?? "").trim(),
//       });
//     }
//     // Fallback to full text if no segments
//     if (!segments.length && dg?.text) {
//       segments.push({ startSec: 0, endSec: 0, text: String(dg.text).trim() });
//     }
//   }

//   await prisma.$transaction(async (tx) => {
//     await tx.transcriptSegment.deleteMany({ where: { meetingId: meeting.id } });
//     if (segments.length) {
//       await tx.transcriptSegment.createMany({
//         data: segments.map((s) => ({
//           meetingId: meeting.id,
//           startSec: s.startSec,
//           endSec: s.endSec,
//           speaker: s.speaker ?? null,
//           text: s.text,
//         })),
//       });
//     }
//     await tx.meeting.update({
//       where: { id: meeting.id },
//       data: { status: "TRANSCRIBED" },
//     });
//   });

//   return NextResponse.json({ segments: segments.length });
// }


export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { readFile } from "fs/promises";

function isLocalFile(url?: string) {
  return !!url && url.startsWith("file://");
}

/** ---------- Transcription providers ---------- */
async function transcribeWithDeepgram(audioUrl: string, language?: string) {
  const url = new URL("https://api.deepgram.com/v1/listen");
  url.searchParams.set("model", "nova-2");
  url.searchParams.set("smart_format", "true");
  url.searchParams.set("diarize", "true");
  if (language) url.searchParams.set("language", language);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Token ${process.env.DEEPGRAM_API_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: audioUrl }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function transcribeDeepgramFromBuffer(
  buf: Uint8Array,
  language?: string,
  mime = "audio/webm"
) {
  const url = new URL("https://api.deepgram.com/v1/listen");
  url.searchParams.set("model", "nova-2");
  url.searchParams.set("smart_format", "true");
  url.searchParams.set("diarize", "true");
  if (language) url.searchParams.set("language", language);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY!}`, "Content-Type": mime },
    body: buf,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function transcribeWithOpenAI(audioUrl: string, language?: string) {
  const fileRes = await fetch(audioUrl);
  if (!fileRes.ok) throw new Error(`Failed to fetch audio: ${fileRes.status}`);
  const buf = new Uint8Array(await fileRes.arrayBuffer());
  return transcribeOpenAIFromBuffer(buf, "meeting.webm", "audio/webm", language);
}

async function transcribeOpenAIFromBuffer(
  buf: Uint8Array,
  filename: string,
  mime = "audio/webm",
  language?: string
) {
  const file = new File([buf], filename, { type: mime });
  const form = new FormData();
  form.append("file", file);
  form.append("model", "whisper-1");
  if (language) form.append("language", language);
  form.append("response_format", "verbose_json");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY!}` },
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const PREVIEW_MAX_CHARS = 16000;

function segmentsToLimitedTranscript(rows: { speaker?: string | null; text: string }[]) {
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

function tryExtractFromResponses(json: any) {
  const content = json?.output?.[0]?.content ?? [];
  if (Array.isArray(content)) {
    const j = content.find((c: any) => c?.type === "output_json" || c?.type === "json")?.json;
    if (j) return j;
    const t = content.find((c: any) => c?.type === "output_text" || c?.type === "text")?.text;
    if (t) {
      try { return JSON.parse(stripCodeFences(String(t))); } catch {}
    }
  }
  return null;
}

async function callPreviewExtraction(prompt: string): Promise<{ summary: string; tasks: any[]; _source?: string }> {
  // Looser schema for preview so we *always* get something
  const taskProps = {
    name: { type: "string" },
    description: { type: "string" },
    dueDate: { type: "string" },
    assigneeEmail: { type: "string" },
    priority: { type: "string" },
    companySlug: { type: "string" },
    companyName: { type: "string" },
    labels: { type: "array", items: { type: "string" } },
  } as const;

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
          properties: taskProps,
          // preview: keep optional so the model doesn't fail
        },
      },
    },
    required: ["summary", "tasks"],
  } as const;

  const baseInstruction = [
    "You are generating a quick preview after a meeting transcription.",
    "Return up to 8 concise concept tasks.",
    "If any field is unknown, use empty string (or [] for labels).",
    "Only return JSON that conforms to the schema.",
    "",
    "TRANSCRIPT:",
    prompt,
  ].join("\n");

  // Attempt 1: Responses API (json schema via text.format)
  {
    const body = {
      model: "gpt-4o-mini",
      temperature: 0,
      max_output_tokens: 1000,
      input: baseInstruction,
      text: {
        format: {
          type: "json_schema",
          name: "MeetingPreview",
          schema,
          strict: false, // be permissive for preview
        },
      },
    };
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
      },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const json = await res.json();
      const obj = tryExtractFromResponses(json);
      if (obj && typeof obj.summary === "string" && Array.isArray(obj.tasks)) {
        return { ...obj, _source: "responses" };
      }
    } else {
      // fall through to chat fallback
    }
  }

  // Attempt 2: Chat Completions fallback (json schema)
  {
    const body = {
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 1000,
      messages: [
        { role: "system", content: "You return only JSON that matches the given JSON Schema." },
        { role: "user", content: baseInstruction },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "MeetingPreview",
          schema,
          strict: false,
        },
      },
    };
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
      },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const json = await res.json();
      const text = json?.choices?.[0]?.message?.content ?? "";
      try {
        const obj = JSON.parse(stripCodeFences(String(text)));
        if (obj && typeof obj.summary === "string" && Array.isArray(obj.tasks)) {
          return { ...obj, _source: "chat" };
        }
      } catch {
        // ignore
      }
    }
  }

  // Last resort
  return { summary: "", tasks: [], _source: "none" };
}

/** ---------- Route ---------- */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth();
  const { organizationId } = session;
  const { id } = await params;

  const meeting = await prisma.meeting.findUnique({ where: { id } });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (meeting.organizationId !== organizationId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const qp = req.nextUrl.searchParams.get("provider") as "openai" | "deepgram" | null;
  let bodyProvider: "openai" | "deepgram" | null = null;
  try {
    const maybe = await req.json();
    if (maybe && (maybe.provider === "openai" || maybe.provider === "deepgram")) bodyProvider = maybe.provider;
  } catch {}
  const requestedProvider = qp || bodyProvider;

  let provider = requestedProvider || meeting.transcriptionProvider || "deepgram";
  const local = isLocalFile(meeting.audioUrl!);

  let dg: any;
  try {
    if (provider === "openai") {
      if (local) {
        const buf = await readFile(new URL(meeting.audioUrl!));
        dg = await transcribeOpenAIFromBuffer(new Uint8Array(buf), "meeting.webm", "audio/webm", meeting.language ?? undefined);
      } else {
        dg = await transcribeWithOpenAI(meeting.audioUrl!, meeting.language ?? undefined);
      }
    } else {
      if (local) {
        const buf = await readFile(new URL(meeting.audioUrl!));
        dg = await transcribeDeepgramFromBuffer(new Uint8Array(buf), meeting.language ?? undefined);
      } else {
        dg = await transcribeWithDeepgram(meeting.audioUrl!, meeting.language ?? undefined);
      }
    }
  } catch (e: any) {
    await prisma.meeting.update({ where: { id: meeting.id }, data: { status: "FAILED" } });
    throw e;
  }

  // Normalize segments
  const segments: { startSec: number; endSec: number; speaker?: string | null; text: string }[] = [];
  if (provider === "deepgram") {
    const words = dg?.results?.channels?.[0]?.alternatives?.[0]?.words ?? [];
    if (!words.length) {
      const alt = dg?.results?.channels?.[0]?.alternatives?.[0];
      const transcriptText: string = alt?.transcript?.trim?.() || alt?.paragraphs?.transcript?.trim?.() || "";
      if (transcriptText) segments.push({ startSec: 0, endSec: 0, text: transcriptText });
    } else {
      let buf: string[] = [];
      let cur = { s: words[0]?.start ?? 0, e: words[0]?.end ?? 0, spk: words[0]?.speaker ?? "S0" };
      for (const w of words) {
        if (w.speaker !== cur.spk && buf.length) {
          segments.push({ startSec: cur.s, endSec: cur.e, speaker: cur.spk, text: buf.join(" ") });
          buf = [];
          cur = { s: w.start, e: w.end, spk: w.speaker };
        }
        buf.push(w.punctuated_word ?? w.word);
        cur.e = w.end;
      }
      if (buf.length) segments.push({ startSec: cur.s, endSec: cur.e, speaker: cur.spk, text: buf.join(" ") });
    }
  } else {
    for (const seg of dg?.segments ?? []) {
      segments.push({ startSec: seg.start, endSec: seg.end, text: (seg.text ?? "").trim() });
    }
    if (!segments.length && dg?.text) {
      segments.push({ startSec: 0, endSec: 0, text: String(dg.text).trim() });
    }
  }

  // Persist transcript
  await prisma.$transaction(async (tx) => {
    await tx.transcriptSegment.deleteMany({ where: { meetingId: meeting.id } });
    if (segments.length) {
      await tx.transcriptSegment.createMany({
        data: segments.map((s) => ({
          meetingId: meeting.id,
          startSec: s.startSec,
          endSec: s.endSec,
          speaker: s.speaker ?? null,
          text: s.text,
        })),
      });
    }
    await tx.meeting.update({
      where: { id: meeting.id },
      data: { status: "TRANSCRIBED", transcriptionProvider: provider },
    });
  });

// Build preview (not persisted)
const transcriptLimited = segmentsToLimitedTranscript(
    segments.map((s) => ({ speaker: s.speaker, text: s.text }))
  );
  
  let preview: { summary: string; tasks: any[]; _source?: string } = { summary: "", tasks: [] };
  let debug: any = { transcriptChars: transcriptLimited.length, segments: segments.length };
  
  try {
    if (transcriptLimited.length >= 40) {
      preview = await callPreviewExtraction(transcriptLimited);
    } else {
      debug.note = "Transcript too short for preview";
    }
  } catch (e: any) {
    debug.previewError = String(e?.message || e);
  }
  
  const speakers = Array.from(new Set(segments.map((s) => s.speaker).filter(Boolean))) as string[];
  
  return NextResponse.json({
    provider,
    status: "TRANSCRIBED",
    segments: segments.length,
    speakers,
    preview,
    // surface debug info in dev only
    ...(process.env.NODE_ENV !== "production" ? { _debug: debug } : {}),
  });
  
}
