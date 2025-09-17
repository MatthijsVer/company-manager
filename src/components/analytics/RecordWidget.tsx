"use client";

import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Mic,
  Phone,
  Settings,
  Edit3,
  Trash2,
  Save,
  Share,
} from "lucide-react";

const RecordWidget = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [activeTab, setActiveTab] = useState("Voice");

  // Mock data for recordings
  const recordings = [
    {
      id: 1,
      name: "Katherine Cooper",
      duration: "00:14:54",
      date: "Today",
      transcription:
        "- Hello, hello Elena!\n- Hello Kate! What did you wanna\n- I want to ask, will you go for a walk today? The weather is so good outside!\n- I would love to, but only in an hour.",
      waveformData: Array.from({ length: 60 }, () => Math.random() * 40 - 20),
    },
    {
      id: 2,
      name: "Stephanie Adams",
      duration: "00:00:00",
      date: "June 11, 2024",
      transcription: "",
      waveformData: Array.from({ length: 60 }, () => Math.random() * 40 - 20),
    },
    {
      id: 3,
      name: "David Perry",
      duration: "00:00:00",
      date: "June 11, 2024",
      transcription: "",
      waveformData: Array.from({ length: 60 }, () => Math.random() * 40 - 20),
    },
  ];

  // Mock waveform data for active recording
  const activeWaveformData = Array.from(
    { length: 60 },
    () => Math.random() * 40 - 20
  );

  useEffect(() => {
    if (isPlaying) {
      const timer = setInterval(() => {
        setCurrentTime((prev) => prev + 0.1);
      }, 100);
      return () => clearInterval(timer);
    }
  }, [isPlaying]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const WaveformVisualization = ({ data, height = 80, isActive = false }) => {
    const maxHeight = height - 10;

    return (
      <div
        className="flex py-13 items-center justify-center space-x-0.5"
        style={{ height: height }}
      >
        {data.map((value, index) => {
          const barHeight = Math.abs(value) * (maxHeight / 20);
          const isHighlighted = isActive && index < currentTime * 2;

          return (
            <div
              key={index}
              className={`w-1 rounded-full transition-colors ${
                isHighlighted ? "bg-blue-500" : "bg-[#535353]"
              }`}
              style={{
                height: Math.max(2, barHeight),
                minHeight: "2px",
              }}
            />
          );
        })}
      </div>
    );
  };

  const RecordingsList = () => (
    <div className="bg-white text-dark p-4 rounded-3xl">
      <div className="space-y-3">
        {recordings.slice(0, 1).map((recording) => (
          <div
            key={recording.id}
            className={`pt-5 pl-5 pb-1.5 relative rounded-xl cursor-pointer transition-colors ${
              selectedRecording?.id === recording.id
                ? "bg-[#222222]"
                : "bg-[#222222]"
            }`}
            onClick={() => setSelectedRecording(recording)}
          >
            {recording.id === 1 && (
              <WaveformVisualization
                data={recording.waveformData}
                height={60}
              />
            )}
            {/* Time markers */}
            <div className="flex items-center justify-between text-xs text-white mt-2 px-2">
              <div className="w-[1.5px] rounded-full h-2 bg-[#535353]" />
              <div className="w-[1.5px] rounded-full h-4 bg-[#535353]" />
              <div className="w-[1.5px] rounded-full h-2 bg-[#535353]" />
              <span>00:15</span>
              <div className="w-[1.5px] rounded-full h-3 bg-[#535353]" />
              <div className="w-[1.5px] rounded-full h-2 bg-[#535353]" />
              <div className="w-[1.5px] rounded-full h-3 bg-[#535353]" />
              <div className="w-[1.5px] rounded-full h-5 bg-[#535353]" />
              <div className="w-[1.5px] rounded-full h-3 bg-[#535353]" />
              <div className="w-[1.5px] rounded-full h-2 bg-[#535353]" />
              <span>00:16</span>
              <div className="w-[1.5px] rounded-full h-3 bg-[#535353]" />
              <div className="w-[1.5px] rounded-full h-2 bg-[#535353]" />
              <div className="w-[1.5px] rounded-full h-3 bg-[#535353]" />
              <div className="w-[1.5px] rounded-full h-5 bg-[#535353]" />
              <div className="w-[1.5px] rounded-full h-3 bg-[#535353]" />
              <div className="w-[1.5px] rounded-full h-2 bg-[#535353]" />
              <span>00:17</span>
              <div className="w-[1.5px] rounded-full h-2 bg-[#535353]" />
              <div className="w-[1.5px] rounded-full h-4 bg-[#535353]" />
              <div className="w-[1.5px] rounded-full h-2 bg-[#535353]" />
            </div>
            <div className="absolute h-full w-10 bg-[#222222] rounded-r-xl py-5 text-xs top-0 right-0 text-white flex flex-col items-center justify-between">
              <span>20</span>
              <span>10</span>
              <span>0</span>
              <span>-10</span>
              <span>-20</span>
            </div>
          </div>
        ))}
      </div>

      {/* Control buttons */}
      <div className="flex justify-center items-center space-x-6 mt-6">
        <button className="p-2">
          <SkipBack className="w-6 h-6 text-black" />
        </button>
        <button
          className="bg-[#222222] rounded-full p-4"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-black" />
          ) : (
            <Play className="w-6 h-6 text-white ml-0.5" />
          )}
        </button>
        <button className="p-2">
          <SkipForward className="w-6 h-6 text-black" />
        </button>
      </div>
    </div>
  );

  const TranscriptionView = () => (
    <div className="bg-gray-900 text-white p-4 rounded-t-3xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Katherine Cooper</h2>
        <span className="text-gray-400 text-sm">00:14:54 Today</span>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg mb-4">
        <p className="text-sm leading-relaxed whitespace-pre-line">
          {selectedRecording?.transcription}
        </p>
      </div>

      <div className="mb-4">
        <WaveformVisualization
          data={selectedRecording?.waveformData || activeWaveformData}
          height={100}
          isActive={true}
        />
      </div>

      {/* Time display */}
      <div className="flex justify-between text-xs text-gray-500 mb-4">
        <span>00:00</span>
        <span>00:01</span>
      </div>

      {/* Action buttons */}
      <div className="flex justify-around mb-6">
        <button className="flex flex-col items-center space-y-1 text-gray-400">
          <Edit3 className="w-5 h-5" />
          <span className="text-xs">Rename</span>
        </button>
        <button className="flex flex-col items-center space-y-1 text-gray-400">
          <Trash2 className="w-5 h-5" />
          <span className="text-xs">Delete</span>
        </button>
        <button className="flex flex-col items-center space-y-1 text-gray-400">
          <Save className="w-5 h-5" />
          <span className="text-xs">Save</span>
        </button>
        <button className="flex flex-col items-center space-y-1 text-gray-400">
          <Share className="w-5 h-5" />
          <span className="text-xs">Share</span>
        </button>
      </div>

      {/* Timer */}
      <div className="text-center mb-6">
        <div className="text-2xl font-light">00:01,89</div>
      </div>

      {/* Control buttons */}
      <div className="flex justify-center items-center space-x-6">
        <button className="p-2">
          <SkipBack className="w-6 h-6 text-black" />
        </button>
        <button
          className="bg-white rounded-full p-4"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-black" />
          ) : (
            <Play className="w-6 h-6 text-black ml-0.5" />
          )}
        </button>
        <button className="p-2">
          <SkipForward className="w-6 h-6 text-black" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-3xl">
      {selectedRecording ? <TranscriptionView /> : <RecordingsList />}
    </div>
  );
};

export default RecordWidget;
