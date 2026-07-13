"use client";
import WaveSurfer from "wavesurfer.js";
import { useEffect, useRef, useState } from "react";

interface PanelAudioPlayerProps {
  audioSrc: string;
  color?: "red" | "green" | "main";
  isPanel?: boolean;
}

export function PanelAudioPlayer({
  audioSrc,
  color = "green",
  isPanel = true,
}: PanelAudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<string>("0:00");
  const [currentTime, setCurrentTime] = useState<string>("0:00");

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getWaveColor = () => {
    switch (color) {
      case "red":
        return "#ef4444";
      case "main":
        return "#00a5a6";
      case "green":
      default:
        return "#22c55e";
    }
  };

  const getProgressColor = () => {
    switch (color) {
      case "red":
        return "#b91c1c";
      case "main":
        return "#008f90";
      case "green":
      default:
        return "#16a34a";
    }
  };

  const waveColor = getWaveColor();
  const progressColor = getProgressColor();

  useEffect(() => {
    if (!containerRef.current || !audioSrc) return;

    wavesurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      url: audioSrc,
      waveColor,
      progressColor,
      height: isPanel ? 40 : 80,
      barWidth: 2,
      barGap: 2,
      barRadius: 999,
      cursorWidth: 0,
    });

    wavesurferRef.current.on("ready", (dur) => {
      setDuration(formatTime(dur));
    });

    wavesurferRef.current.on("timeupdate", (time) => {
      setCurrentTime(formatTime(time));
    });

    wavesurferRef.current.on("play", () => setIsPlaying(true));
    wavesurferRef.current.on("pause", () => setIsPlaying(false));
    wavesurferRef.current.on("finish", () => {
      setIsPlaying(false);
      setCurrentTime("0:00");
    });

    return () => wavesurferRef.current?.destroy();
  }, [audioSrc]);

  const handlePlay = () => {
    wavesurferRef.current?.playPause();
  };

  return (
    <div
      dir="ltr"
      className={`flex items-center gap-x-3 ${isPanel && "bg-card py-3"} border border-border 
      rounded-xl px-4  w-full  ${color == "main" ? "border-none w-full md:max-w-sm " : "max-w-sm"}`}
    >
      <button
        onClick={handlePlay}
        className={`shrink-0 size-8 rounded-full flex items-center justify-center transition-colors
    ${
      color === "red"
        ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
        : color === "main"
          ? "bg-[#00a5a6]/20 text-[#00a5a6] hover:bg-[#00a5a6]/30"
          : "bg-green-500/20 text-green-500 hover:bg-green-500/30" // default = green
    }
  `}
      >
        {isPlaying ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
            />
          </svg>
        )}
      </button>

      <div ref={containerRef} className="flex-1 overflow-hidden " />

      <span className="shrink-0 text-xs text-muted-foreground font-mono">
        {isPlaying ? currentTime : duration}
      </span>
    </div>
  );
}
