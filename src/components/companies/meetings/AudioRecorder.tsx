"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Pause, Play, Loader2 } from "lucide-react";

interface AudioRecorderProps {
  companyId?: string;
  onRecordingComplete?: (meetingId: string) => void;
  onDurationUpdate?: (duration: number) => void;
  maxDuration?: number;
}

export function AudioRecorder({
  companyId,
  onRecordingComplete,
  onDurationUpdate,
  maxDuration = 7200,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          const newDuration = prev + 1;
          if (onDurationUpdate) {
            onDurationUpdate(newDuration);
          }
          if (newDuration >= maxDuration) {
            stopRecording();
            return prev;
          }
          return newDuration;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused, maxDuration, onDurationUpdate]);

  const startRecording = async () => {
    try {
      setError(null);

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Create MediaRecorder with opus codec
      const mimeType = "audio/webm;codecs=opus";
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000, // 128kbps for good quality
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = handleRecordingStop;

      // Start recording with 1 second chunks for better reliability
      mediaRecorder.start(1000);
      setIsRecording(true);
      setDuration(0);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Could not access microphone. Please check permissions.");
    }
  };

  const pauseRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "paused"
    ) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const handleRecordingStop = async () => {
    const audioBlob = new Blob(chunksRef.current, {
      type: "audio/webm;codecs=opus",
    });

    // If recording is very short, don't upload
    if (duration < 2) {
      setError("Recording too short. Please record at least 2 seconds.");
      return;
    }

    await uploadRecording(audioBlob);
  };

  const uploadRecording = async (audioBlob: Blob) => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, `recording-${Date.now()}.webm`);
      if (companyId) formData.append("companyId", companyId);
      formData.append("duration", duration.toString());

      const response = await fetch("/api/meetings/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();

      if (onRecordingComplete) {
        onRecordingComplete(data.meetingId);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload recording. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="space-y-4">
        {/* Recording Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`w-3 h-3 rounded-full ${isRecording ? "bg-red-500 animate-pulse" : "bg-gray-300"}`}
            />
            <span className="text-lg font-medium">
              {isRecording
                ? isPaused
                  ? "Paused"
                  : "Recording"
                : "Ready to Record"}
            </span>
          </div>
          <div className="text-2xl font-mono">{formatTime(duration)}</div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center justify-center space-x-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={isUploading}
              className="flex items-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <Mic className="w-5 h-5" />
              <span>Start Recording</span>
            </button>
          ) : (
            <>
              {isPaused ? (
                <button
                  onClick={resumeRecording}
                  className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                >
                  <Play className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={pauseRecording}
                  className="p-3 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition-colors"
                >
                  <Pause className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={stopRecording}
                className="p-3 bg-gray-800 text-white rounded-full hover:bg-gray-900 transition-colors"
              >
                <Square className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Upload Status */}
        {isUploading && (
          <div className="flex items-center justify-center space-x-2 text-blue-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Processing recording...</span>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-gray-500 text-center">
          Maximum recording duration: {formatTime(maxDuration)}
        </div>
      </div>
    </div>
  );
}
