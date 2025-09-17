"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Mic,
  Upload,
  StopCircle,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import MeetingActions from "./MeetingActions";

type CompanyOpt = { id: string; name: string };
const STORAGE = process.env.NEXT_PUBLIC_STORAGE_DRIVER ?? "dev-local";

type Status =
  | "idle"
  | "recording"
  | "uploading"
  | "processing"
  | "done"
  | "error";

export default function RecordUploadPanel({
  companies,
}: {
  companies: CompanyOpt[];
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [autoProcess, setAutoProcess] = useState(true);
  const [lastMeetingId, setLastMeetingId] = useState<string | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // === Upload Logic ===
  async function uploadAndCreate(file: File) {
    try {
      setError("");
      setStatus("uploading");

      let fileUrl: string;
      if (STORAGE === "dev-local") {
        const form = new FormData();
        form.append("file", file, file.name || "meeting.webm");
        const res = await fetch("/api/uploads/dev", {
          method: "POST",
          body: form,
        });
        if (!res.ok) throw new Error(await res.text());
        fileUrl = (await res.json()).fileUrl;
      } else {
        const { uploadUrl, fileUrl: publicUrl } = await fetch(
          "/api/uploads/signed-url",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contentType: file.type || "audio/webm" }),
          }
        ).then((r) => r.json());
        await fetch(uploadUrl, { method: "PUT", body: file });
        fileUrl = publicUrl;
      }

      const { meetingId } = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioUrl: fileUrl,
          companyId: companyId || undefined,
        }),
      }).then((r) => r.json());

      setLastMeetingId(meetingId);
      setAudioUrl(fileUrl);

      if (autoProcess) {
        setStatus("processing");
        await fetch(`/api/meetings/${meetingId}/transcribe`, {
          method: "POST",
        });
        await fetch(`/api/meetings/${meetingId}/process`, { method: "POST" });
        setStatus("done");
        router.refresh();
      } else {
        setStatus("done");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setStatus("error");
    }
  }

  // === Recording Logic ===
  async function startRecording() {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        chunks.current = [];
        setAudioUrl(URL.createObjectURL(blob));
        await uploadAndCreate(
          new File([blob], "meeting.webm", { type: "audio/webm" })
        );
      };
      mediaRef.current = rec;
      rec.start(250);
      setStatus("recording");
    } catch (e: any) {
      setError(e?.message ?? "Microphone permission denied");
      setStatus("error");
    }
  }

  function stopRecording() {
    if (mediaRef.current?.state === "recording") {
      mediaRef.current.stop();
      // stop all tracks to release mic permission
      mediaRef.current.stream.getTracks().forEach((t) => t.stop());
    }
  }

  // === File Upload ===
  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.currentTarget.files?.[0];
    if (!f) return;
    try {
      setAudioUrl(URL.createObjectURL(f));
      await uploadAndCreate(f);
    } finally {
      e.currentTarget.value = "";
    }
  }

  function onDropFile(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("audio/")) {
      setError("Please drop an audio file.");
      setStatus("error");
      return;
    }
    setAudioUrl(URL.createObjectURL(f));
    uploadAndCreate(f);
  }

  // === Playback ===
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime || 0);
    const setDur = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnd = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", setDur);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnd);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", setDur);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnd);
    };
  }, [audioUrl]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  }

  function formatTime(s: number) {
    if (!isFinite(s)) return "00:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  const isBusy = status === "uploading" || status === "processing";

  return (
    <section className="from-white to-zinc-50">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-black text-white grid place-items-center">
            <Mic className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-medium leading-tight">
              Record or Upload Audio
            </h2>
            <p className="text-xs text-muted-foreground">
              Create summaries and more from audio
            </p>
          </div>
        </div>

        <div className="ml-auto absolute top-5 right-4 flex items-center gap-2">
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Controls Row */}
      <div className="grid grid-cols-1 gap-4">
        {/* Company select */}
        <div className="mt-5 w-full max-w-sm">
          <label className="mb-1 block text-left text-xs text-muted-foreground">
            Company (optional)
          </label>
          <select
            className="w-full rounded-md border bg-white px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            disabled={isBusy}
          >
            <option value="">(no company)</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-3xl p-2">
          <div className="relative overflow-hidden rounded-2xl border border-[#222222] bg-[#222222] text-white p-4 sm:p-5 sm:pb-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-zinc-400">Recorder</div>
                <div className="text-base font-medium">Microphone</div>
              </div>
              <div className="flex items-center gap-2">
                {/* Auto process toggle */}
                <label className="flex items-center gap-2 text-xs text-zinc-400 select-none">
                  <span>Auto process</span>
                  <span className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={autoProcess}
                      onChange={(e) => setAutoProcess(e.target.checked)}
                    />
                    <span className="h-5 w-9 rounded-full bg-zinc-700 peer-checked:bg-[#FF6B4A] transition-colors"></span>
                    <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transform transition-transform peer-checked:translate-x-4" />
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center">
              {status === "recording" ? (
                <button
                  aria-label="Stop recording"
                  onClick={stopRecording}
                  className="relative grid h-20 w-20 place-items-center rounded-full bg-white text-zinc-900 shadow-md hover:shadow-lg transition focus:outline-none focus:ring-2 focus:ring-white/40"
                  disabled={isBusy}
                >
                  <div className="absolute inset-0 rounded-full ring-8 ring-red-500/10 animate-pulse" />
                  <StopCircle className="h-9 w-9" />
                </button>
              ) : (
                <button
                  aria-label="Start recording"
                  onClick={startRecording}
                  className="grid h-20 w-20 place-items-center rounded-full bg-[#FF6B4A] text-white shadow-md hover:bg-[#FF6B4A]/80 transition focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-50"
                  disabled={isBusy}
                >
                  <Mic className="h-9 w-9" />
                </button>
              )}
            </div>

            <p className="mt-4 text-center text-xs text-zinc-400">
              {status === "recording"
                ? "Recording… click to stop"
                : "Click to start recording"}
            </p>
          </div>

          {audioUrl && (
            <div className="bg-white mt-4">
              <audio ref={audioRef} src={audioUrl} hidden />

              {/* Scrubber */}
              <div className="flex items-center gap-3">
                <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={isFinite(currentTime) ? currentTime : 0}
                  onChange={(e) => {
                    const t = Number(e.currentTarget.value);
                    setCurrentTime(t);
                    if (audioRef.current) audioRef.current.currentTime = t;
                  }}
                  className="flex-1 accent-black"
                />
                <span className="w-12 text-left text-xs tabular-nums text-muted-foreground">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Transport */}
              <div className="mt-4 flex items-center justify-center gap-6">
                <button
                  aria-label="Back 5 seconds"
                  onClick={() =>
                    audioRef.current &&
                    (audioRef.current.currentTime = Math.max(
                      0,
                      audioRef.current.currentTime - 5
                    ))
                  }
                  className="p-2 rounded-full hover:bg-zinc-100"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                <button
                  aria-label={isPlaying ? "Pause" : "Play"}
                  onClick={togglePlay}
                  className="grid h-12 w-12 place-items-center rounded-full bg-[#222222] text-white hover:opacity-90"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 ml-0.5" />
                  )}
                </button>

                <button
                  aria-label="Forward 5 seconds"
                  onClick={() =>
                    audioRef.current &&
                    (audioRef.current.currentTime = Math.min(
                      duration || 0,
                      audioRef.current.currentTime + 5
                    ))
                  }
                  className="p-2 rounded-full hover:bg-zinc-100"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Right: Upload Card (Drag & Drop) */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDropFile}
            className="py-4 border-t mt-4 px-2 flex flex-row items-center justify-start text-center transition hover:border-zinc-300"
          >
            <div className="bg-gray-100 p-2.5 rounded-full">
              <Upload className="size-4.5 text-zinc-500" />
            </div>
            <div className="flex flex-col items-start ml-3">
              <p className="text-sm font-medium">Drop an audio file here</p>
              <div className="-mt-0.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={onPickFile}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="underline text-[12px] font-medium text-gray-400 hover:opacity-90 transition disabled:opacity-50"
                  disabled={isBusy}
                >
                  Or here click to browse files
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Post-upload manual actions */}
      {lastMeetingId && !autoProcess && (
        <div className="rounded-2xl border bg-white p-4 space-y-3">
          <div className="text-sm text-muted-foreground">
            Actions for last upload:
          </div>
          <MeetingActions id={lastMeetingId} inline />
        </div>
      )}
    </section>
  );
}

/* ---------- Small UI helpers ---------- */

function StatusBadge({ status }: { status: Status }) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium";
  switch (status) {
    case "idle":
      return <span className={`${base} bg-white text-zinc-700`}>Idle</span>;
    case "recording":
      return (
        <span className={`${base} bg-red-100 text-red-700`}>
          <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
          Recording
        </span>
      );
    case "uploading":
      return (
        <span className={`${base} bg-blue-100 text-blue-700`}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Uploading
        </span>
      );
    case "processing":
      return (
        <span className={`${base} bg-amber-100 text-amber-700`}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Processing
        </span>
      );
    case "done":
      return (
        <span className={`${base} bg-emerald-100 text-emerald-700`}>
          <CheckCircle2 className="h-3.5 w-3.5" />
          Done
        </span>
      );
    case "error":
      return (
        <span className={`${base} bg-red-100 text-red-700`}>
          <AlertTriangle className="h-3.5 w-3.5" />
          Error
        </span>
      );
    default:
      return null;
  }
}
