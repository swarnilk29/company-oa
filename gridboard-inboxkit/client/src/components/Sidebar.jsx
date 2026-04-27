import clsx from "clsx";
import { TOTAL } from "../lib/constants";

function Section({ title, children }) {
  return (
    <div className="border-b border-[#1e2736] last:border-0">
      <div className="px-4 pt-4 pb-3">
        <p className="text-[10px] tracking-widest text-slate-600 uppercase mb-3">
          {title}
        </p>
        {children}
      </div>
    </div>
  );
}

// Cooldown bar 
function CooldownBar({ cooldownUntil, cooldownMs }) {
  const now = Date.now();
  const remaining = Math.max(0, cooldownUntil - now);
  const pct = remaining > 0 ? (1 - remaining / cooldownMs) * 100 : 100;
  const ready = remaining === 0;

  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1.5">
        <span className="text-slate-600 tracking-wider uppercase">
          Cooldown
        </span>
        <span
          className={clsx(
            "font-mono",
            ready ? "text-emerald-400" : "text-amber-400",
          )}
        >
          {ready ? "Ready" : `${(remaining / 1000).toFixed(1)}s`}
        </span>
      </div>
      <div className="h-1 bg-[#1e2736] rounded-full overflow-hidden">
        <div
          className={clsx(
            "h-full rounded-full transition-all duration-100",
            ready ? "bg-emerald-400" : "bg-amber-400",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Profile block 
function MyProfile({ user, myCellCount, cooldownUntil, cooldownMs }) {
  return (
    <Section title="You">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center
                     text-xs font-display font-bold text-black flex-shrink-0"
          style={{ background: user.color }}
        >
          {user.name[0].toUpperCase()}
        </div>
        <div>
          <div
            className="text-sm text-white font-medium"
            style={{ color: user.color }}
          >
            {user.name}
          </div>
          <div className="text-xs text-slate-600">
            {myCellCount} {myCellCount === 1 ? "cell" : "cells"} ·{" "}
            {TOTAL > 0 ? ((myCellCount / TOTAL) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>
      <CooldownBar cooldownUntil={cooldownUntil} cooldownMs={cooldownMs} />
    </Section>
  );
}

// Leaderboard
function Leaderboard({ leaderboard, myUserId }) {
  const max = leaderboard[0]?.count || 1;

  return (
    <Section title="Leaderboard">
      {leaderboard.length === 0 ? (
        <p className="text-xs text-slate-700">No cells claimed yet.</p>
      ) : (
        <div className="space-y-2">
          {leaderboard.slice(0, 10).map((u, i) => {
            const isMe = u.userId === myUserId;
            return (
              <div
                key={u.userId}
                className={clsx(
                  "flex items-center gap-2 rounded-md px-2 py-1 -mx-2 transition-colors",
                  isMe ? "bg-white/5" : "",
                )}
              >
                <span className="text-[10px] text-slate-600 w-4 text-right flex-shrink-0">
                  {i === 0 ? "①" : i === 1 ? "②" : i === 2 ? "③" : i + 1}
                </span>
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: u.color }}
                />
                <span
                  className="text-xs flex-1 truncate"
                  style={{ color: isMe ? u.color : "#94a3b8" }}
                >
                  {u.name}
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="w-12 h-1 bg-[#1e2736] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(u.count / max) * 100}%`,
                        background: u.color,
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 w-5 text-right">
                    {u.count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

// Online users
function OnlineUsers({ users, myUserId }) {
  return (
    <Section title={`Online — ${users.length}`}>
      <div className="flex flex-wrap gap-1.5">
        {users.map((u) => (
          <div
            key={u.id}
            title={u.name}
            className={clsx(
              "w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold",
              u.id === myUserId
                ? "ring-2 ring-white/40 ring-offset-1 ring-offset-[#0d1117]"
                : "",
            )}
            style={{ background: u.color, color: "rgba(0,0,0,0.7)" }}
          >
            {u.name[0].toUpperCase()}
          </div>
        ))}
      </div>
    </Section>
  );
}

// Activity feed
function ActivityFeed({ events }) {
  return (
    <Section title="Activity">
      <div className="space-y-1.5 max-h-36 overflow-y-auto">
        {events.length === 0 ? (
          <p className="text-xs text-slate-700">Waiting for activity...</p>
        ) : (
          events.slice(0, 15).map((ev, i) => {
            const age = Math.round((Date.now() - ev.ts) / 1000);
            const ageStr = age < 60 ? `${age}s` : `${Math.floor(age / 60)}m`;
            return (
              <div
                key={i}
                className="text-[11px] text-slate-500 animate-slide-in leading-relaxed"
              >
                <span style={{ color: ev.color }} className="font-medium">
                  {ev.name}
                </span>
                {ev.prev ? (
                  <>
                    {" "}
                    took{" "}
                    <span className="text-slate-400">
                      [{ev.col},{ev.row}]
                    </span>{" "}
                    from <span style={{ color: ev.prevColor }}>{ev.prev}</span>
                  </>
                ) : (
                  <>
                    {" "}
                    claimed{" "}
                    <span className="text-slate-400">
                      [{ev.col},{ev.row}]
                    </span>
                  </>
                )}
                <span className="text-slate-700 ml-1">{ageStr}</span>
              </div>
            );
          })
        )}
      </div>
    </Section>
  );
}

// Territory bar 
function TerritoryBar({ leaderboard }) {
  const claimed = leaderboard.reduce((s, u) => s + u.count, 0);
  const unclaimed = TOTAL - claimed;

  return (
    <div className="h-1.5 flex w-full overflow-hidden">
      {leaderboard.map((u) => (
        <div
          key={u.userId}
          style={{ width: `${(u.count / TOTAL) * 100}%`, background: u.color }}
          className="h-full transition-all duration-500"
        />
      ))}
      <div
        style={{ width: `${(unclaimed / TOTAL) * 100}%` }}
        className="h-full bg-[#1e2736] transition-all duration-500"
      />
    </div>
  );
}

// Main Sidebar export 
export default function Sidebar({
  user,
  myCellCount,
  cooldownUntil,
  cooldownMs,
  leaderboard,
  onlineUsers,
  myUserId,
  events,
}) {
  return (
    <aside
      className="w-56 flex-shrink-0 bg-[#0d1117] border-l border-[#1e2736]
                      flex flex-col overflow-hidden"
    >
      <TerritoryBar leaderboard={leaderboard} />
      <div className="flex-1 overflow-y-auto">
        {user && (
          <MyProfile
            user={user}
            myCellCount={myCellCount}
            cooldownUntil={cooldownUntil}
            cooldownMs={cooldownMs}
          />
        )}
        <Leaderboard leaderboard={leaderboard} myUserId={myUserId} />
        <OnlineUsers users={onlineUsers} myUserId={myUserId} />
        <ActivityFeed events={events} />
      </div>
    </aside>
  );
}
