import { useState, useCallback } from "react";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import {
  Play, Pause, Square, Volume2, VolumeX, ChevronDown, ChevronUp,
  Loader, AlertCircle, Mic, SkipBack, SkipForward,
} from "lucide-react";

const VOICES = [
  { id: "onyx", label: "أكسينكس", desc: "صوت عميق ورصين" },
  { id: "echo", label: "إيكو", desc: "صوت واضح ومتزن" },
  { id: "fable", label: "فابل", desc: "صوت دافئ وسردي" },
  { id: "alloy", label: "ألوي", desc: "صوت متوازن وطبيعي" },
  { id: "nova", label: "نوفا", desc: "صوت حيوي ونابض" },
  { id: "shimmer", label: "شيمر", desc: "صوت ناعم وهادئ" },
];

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface Props {
  lines: string[];
  sectionTitle: string;
}

export default function AudioPlayer({ lines, sectionTitle }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [voice, setVoice] = useState("onyx");
  const [speed, setSpeed] = useState(1.0);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [muted, setMuted] = useState(false);

  // Split content into chunks of ~800 chars each (TTS limit)
  const chunks = useCallback(() => {
    const allText = lines.join("\n");
    const result: string[] = [];
    let i = 0;
    while (i < allText.length) {
      // Cut at sentence boundary if possible
      let end = Math.min(i + 800, allText.length);
      if (end < allText.length) {
        const cut = allText.lastIndexOf(".", end);
        if (cut > i + 400) end = cut + 1;
      }
      result.push(allText.slice(i, end).trim());
      i = end;
    }
    return result.filter(Boolean);
  }, [lines]);

  const allChunks = chunks();

  const goNext = useCallback(() => {
    setChunkIndex(prev => {
      const next = prev + 1;
      if (next < allChunks.length) {
        setTimeout(() => player.play(allChunks[next], voice, speed), 100);
        return next;
      }
      return prev;
    });
  }, [allChunks, voice, speed]);

  const player = useAudioPlayer({ onEnd: goNext });

  const handlePlay = () => {
    if (player.state === "playing") {
      player.pause();
    } else if (player.state === "paused") {
      player.resume();
    } else {
      setChunkIndex(0);
      player.play(allChunks[0] || lines.join("\n"), voice, speed);
    }
  };

  const handleStop = () => {
    player.stop();
    setChunkIndex(0);
  };

  const handlePrevChunk = () => {
    const prev = Math.max(0, chunkIndex - 1);
    setChunkIndex(prev);
    player.play(allChunks[prev], voice, speed);
  };

  const handleNextChunk = () => {
    const next = Math.min(allChunks.length - 1, chunkIndex + 1);
    setChunkIndex(next);
    player.play(allChunks[next], voice, speed);
  };

  const isActive = player.state !== "idle" && player.state !== "error";
  const totalChunks = allChunks.length;

  return (
    <div style={{
      background: "var(--bg-card)",
      border: `1px solid ${isActive ? "var(--accent-light)" : "var(--border)"}`,
      borderRadius: 14,
      overflow: "hidden",
      marginBottom: 24,
      transition: "border-color 0.2s",
      boxShadow: isActive ? "0 4px 20px var(--shadow-color)" : "none",
    }}>
      {/* Main bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px" }}>
        {/* Icon */}
        <div style={{
          width: 38, height: 38, borderRadius: "50%",
          background: isActive ? "var(--accent)" : "var(--bg-secondary)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          transition: "background 0.2s",
        }}>
          <Mic size={16} style={{ color: isActive ? "#fff" : "var(--accent)" }} />
        </div>

        {/* Info + progress */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {isActive ? (
              player.state === "loading" ? "جارٍ التحميل..." : `جزء ${chunkIndex + 1} من ${totalChunks}`
            ) : "القراءة الصوتية بالذكاء الاصطناعي"}
          </div>

          {/* Progress bar */}
          <div
            style={{ height: 4, background: "var(--bg-secondary)", borderRadius: 2, cursor: isActive ? "pointer" : "default", position: "relative" }}
            onClick={e => {
              if (!isActive) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = ((e.clientX - rect.left) / rect.width) * 100;
              player.seek(pct);
            }}
          >
            <div style={{ height: "100%", width: `${player.progress}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-light))", borderRadius: 2, transition: "width 0.3s" }} />
          </div>

          {/* Time */}
          {isActive && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
              <span>{formatTime(player.currentTime)}</span>
              <span>{formatTime(player.duration)}</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
          {isActive && (
            <button onClick={handlePrevChunk} disabled={chunkIndex === 0} style={{ padding: 6, border: "none", background: "none", cursor: "pointer", color: chunkIndex === 0 ? "var(--border)" : "var(--text-secondary)", display: "flex" }}>
              <SkipBack size={14} />
            </button>
          )}

          {/* Play/Pause */}
          <button
            onClick={handlePlay}
            disabled={player.state === "loading" || lines.length === 0}
            style={{
              width: 38, height: 38, borderRadius: "50%",
              background: player.state === "error" ? "#ef4444" : "var(--accent)",
              border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              opacity: (player.state === "loading" || lines.length === 0) ? 0.7 : 1,
              transition: "all 0.15s",
            }}
          >
            {player.state === "loading" ? (
              <div style={{ width: 16, height: 16, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            ) : player.state === "playing" ? (
              <Pause size={16} fill="#fff" style={{ color: "#fff" }} />
            ) : (
              <Play size={16} fill="#fff" style={{ color: "#fff" }} />
            )}
          </button>

          {isActive && (
            <>
              <button onClick={handleNextChunk} disabled={chunkIndex >= totalChunks - 1} style={{ padding: 6, border: "none", background: "none", cursor: "pointer", color: chunkIndex >= totalChunks - 1 ? "var(--border)" : "var(--text-secondary)", display: "flex" }}>
                <SkipForward size={14} />
              </button>
              <button onClick={handleStop} style={{ padding: 6, border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                <Square size={14} />
              </button>
            </>
          )}

          {/* Settings toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ padding: 6, border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}
            title="إعدادات الصوت"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Error */}
      {player.state === "error" && player.error && (
        <div style={{ padding: "8px 16px 10px", display: "flex", gap: 8, alignItems: "center", background: "#fef2f2", borderTop: "1px solid #fecaca" }}>
          <AlertCircle size={14} style={{ color: "#ef4444", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#ef4444" }}>{player.error}</span>
          <button onClick={handlePlay} style={{ marginRight: "auto", fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Settings panel */}
      {expanded && (
        <div style={{ padding: "12px 16px 16px", borderTop: "1px solid var(--border)", background: "var(--bg-secondary)", display: "flex", flexDirection: "column", gap: 14 }} className="fade-in">

          {/* Voice selection */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 8 }}>الصوت</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {VOICES.map(v => (
                <button
                  key={v.id}
                  onClick={() => setVoice(v.id)}
                  style={{
                    padding: "8px 6px", borderRadius: 8, border: `1.5px solid ${voice === v.id ? "var(--accent)" : "var(--border)"}`,
                    background: voice === v.id ? "var(--accent-bg)" : "var(--bg-card)",
                    cursor: "pointer", fontFamily: "inherit", textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: voice === v.id ? "var(--accent)" : "var(--text-primary)" }}>{v.label}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{v.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Speed */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>سرعة القراءة</label>
              <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>×{speed.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {[0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  style={{
                    flex: 1, padding: "6px 0", borderRadius: 6, border: `1.5px solid ${speed === s ? "var(--accent)" : "var(--border)"}`,
                    background: speed === s ? "var(--accent)" : "var(--bg-card)",
                    color: speed === s ? "#fff" : "var(--text-secondary)",
                    cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: speed === s ? 700 : 400,
                  }}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-muted)" }}>
            <span>📄 {lines.length} سطر</span>
            <span>🔊 {totalChunks} جزء صوتي</span>
            <span>🤖 OpenAI TTS-HD</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
