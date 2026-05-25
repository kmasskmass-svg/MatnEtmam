import { useState, useRef, useCallback, useEffect } from "react";

export type PlayerState = "idle" | "loading" | "playing" | "paused" | "error";

interface UseAudioPlayerOptions {
  onEnd?: () => void;
}

export function useAudioPlayer({ onEnd }: UseAudioPlayerOptions = {}) {
  const [state, setState] = useState<PlayerState>("idle");
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cleanup = useCallback(() => {
    abortRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setProgress(0);
    setDuration(0);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const play = useCallback(async (text: string, voice: string, speed: number) => {
    cleanup();
    setState("loading");
    setError(null);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
      const resp = await fetch(`${BASE}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice, speed }),
        signal: abort.signal,
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error((data as any).error || "فشل تحميل الصوت");
      }

      const blob = await resp.blob();
      if (abort.signal.aborted) return;

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onloadedmetadata = () => setDuration(audio.duration);
      audio.ontimeupdate = () => {
        if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
      };
      audio.onended = () => {
        setState("idle");
        setProgress(0);
        URL.revokeObjectURL(url);
        onEnd?.();
      };
      audio.onerror = () => {
        setState("error");
        setError("خطأ في تشغيل الصوت");
        URL.revokeObjectURL(url);
      };

      await audio.play();
      setState("playing");
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setState("error");
      setError(err.message || "خطأ غير متوقع");
    }
  }, [cleanup, onEnd]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setState("paused");
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play();
    setState("playing");
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setState("idle");
    setError(null);
  }, [cleanup]);

  const seek = useCallback((pct: number) => {
    if (audioRef.current && duration) {
      audioRef.current.currentTime = (pct / 100) * duration;
      setProgress(pct);
    }
  }, [duration]);

  const currentTime = audioRef.current ? audioRef.current.currentTime : 0;

  return { state, progress, duration, currentTime, error, play, pause, resume, stop, seek };
}
