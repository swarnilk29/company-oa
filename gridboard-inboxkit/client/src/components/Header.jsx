import clsx from 'clsx';
import { TOTAL } from '../lib/constants';

export default function Header({ claimedCount, onlineCount, wsStatus }) {
  return (
    <header className="shrink-0 h-11 flex items-center justify-between px-5
                       border-b border-[#1e2736] bg-[#0d1117]">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <span className="font-display font-semibold text-white text-sm tracking-tight">
          GridBoard
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-5 text-[11px] font-mono text-slate-500">
        <span>
          <span className="text-slate-300">{claimedCount}</span>
          <span className="text-slate-700"> / {TOTAL} claimed</span>
        </span>
        <span>
          <span className="text-slate-300">{onlineCount}</span>
          <span className="text-slate-700"> online</span>
        </span>

        {/* WS status */}
        <div className="flex items-center gap-1.5">
          <span
            className={clsx(
              'w-1.5 h-1.5 rounded-full',
              wsStatus === 'connected'    && 'bg-emerald-400',
              wsStatus === 'connecting'   && 'bg-amber-400 animate-pulse-soft',
              wsStatus === 'disconnected' && 'bg-red-500',
            )}
          />
          <span className={clsx(
            wsStatus === 'connected'    && 'text-emerald-600',
            wsStatus === 'connecting'   && 'text-amber-600',
            wsStatus === 'disconnected' && 'text-red-600',
          )}>
            {wsStatus === 'connected'    && 'live'}
            {wsStatus === 'connecting'   && 'connecting'}
            {wsStatus === 'disconnected' && 'reconnecting'}
          </span>
        </div>
      </div>
    </header>
  );
}
