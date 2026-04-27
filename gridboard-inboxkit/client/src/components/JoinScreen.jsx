import { useState } from "react";
import { USER_COLORS, randomHandle } from "../lib/constants";
import clsx from "clsx";

export default function JoinScreen({ onJoin, status }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(
    USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)],
  );
  const placeholder = useState(randomHandle)[0];

  const handleJoin = () => {
    const finalName = name.trim() || placeholder;
    onJoin(finalName, color);
  };

  const isConnected = status === "connected";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0c10]">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)
    `,
          backgroundSize: "40px 40px",
          WebkitMaskImage:
            "radial-gradient(circle, white 50%, transparent 100%)",
          maskImage: "radial-gradient(circle, white 50%, transparent 100%)",
        }}
      />

      <div className="relative w-full max-w-sm mx-4 animate-fade-up">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-extrabold text-white tracking-tight mb-1">
            GridBoard
          </h1>
          <p className="text-sm text-slate-500 font-mono">
            A shared territory. Click any cell to claim it.
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#111520] border border-[#1e2736] rounded-xl p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs text-slate-500 mb-2 tracking-widest uppercase">
              Your name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && isConnected && handleJoin()
              }
              placeholder={placeholder}
              maxLength={20}
              className="w-full bg-[#0d1117] border border-[#1e2736] rounded-lg px-4 py-2.5
                         text-sm text-white placeholder:text-slate-600
                         focus:outline-none focus:border-slate-500
                         font-mono transition-colors"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs text-slate-500 mb-2 tracking-widest uppercase">
              Your color
            </label>
            <div className="flex gap-2.5 flex-wrap">
              {USER_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={clsx(
                    "w-7 h-7 rounded-full transition-all duration-150",
                    color === c
                      ? "ring-2 ring-white ring-offset-2 ring-offset-[#111520] scale-110"
                      : "hover:scale-110 opacity-70 hover:opacity-100",
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span
              className={clsx(
                "w-1.5 h-1.5 rounded-full",
                status === "connected" && "bg-emerald-400 animate-pulse-soft",
                status === "connecting" && "bg-amber-400 animate-pulse-soft",
                status === "disconnected" && "bg-red-500",
              )}
            />
            <span>
              {status === "connected" && "Connected to server"}
              {status === "connecting" && "Connecting..."}
              {status === "disconnected" && "Server unreachable — retrying"}
            </span>
          </div>

          {/* Join button */}
          <button
            onClick={handleJoin}
            disabled={!isConnected}
            className={clsx(
              "w-full rounded-lg py-2.5 text-sm font-display font-semibold tracking-wide transition-all duration-150",
              isConnected
                ? "bg-white text-[#0a0c10] hover:bg-slate-100 active:scale-[0.98]"
                : "bg-[#1e2736] text-slate-600 cursor-not-allowed",
            )}
          >
            Enter the grid
          </button>
        </div>

        <p className="text-center text-xs text-slate-700 mt-4">
          Changes are visible to everyone in real time via WebSocket
        </p>
      </div>
    </div>
  );
}
