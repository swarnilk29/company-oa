import { useRef, useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { COLS, ROWS, TOTAL } from '../lib/constants';

const CELL_SIZE = 26; // px
const GAP = 2;        // px

export default function Grid({ gridState, myUserId, onClaim, onMove, cooldownUntil, flashSet, remoteCursors, onlineUsers }) {
  const containerRef = useRef(null);

  // Zoom / pan state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragStart = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Tooltip
  const [tooltip, setTooltip] = useState(null); // { x, y, cellId }

  // Presence
  const lastSent = useRef(0);
  const handleMouseMovePresence = useCallback((e) => {
    if (!onMove) return;
    const now = Date.now();
    if (now - lastSent.current < 100) return; // 100ms throttle
    lastSent.current = now;

    const canvas = e.currentTarget.querySelector('.grid-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    // Normalize coordinates so they work across all scales/pans
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    onMove(x, y);
  }, [onMove, scale]);

  // Zoom 
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 10) {
        e.preventDefault();
        setScale(s => Math.max(0.35, Math.min(3, s + (e.deltaY < 0 ? 0.08 : -0.08))));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Pan
  const onMouseDown = useCallback((e) => {
    if (e.target.classList.contains('cell')) return;
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragOffset.current = { ...offset };
  }, [offset]);

  const onMouseMove = useCallback((e) => {
    handleMouseMovePresence(e); // presence

    if (!dragStart.current) return;
    setOffset({
      x: dragOffset.current.x + e.clientX - dragStart.current.x,
      y: dragOffset.current.y + e.clientY - dragStart.current.y,
    });
  }, [handleMouseMovePresence]);

  const onMouseUp = useCallback(() => { dragStart.current = null; }, []);

  // Cell interaction
  const handleCellClick = useCallback((cellId) => {
    onClaim(cellId);
  }, [onClaim]);

  const onCellMouseEnter = useCallback((e, cellId) => {
    setTooltip({ x: e.clientX, y: e.clientY, cellId });
  }, []);

  const onCellMouseLeave = useCallback(() => setTooltip(null), []);
  const onCellMouseMove = useCallback((e) => {
    setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null);
  }, []);

  const now = Date.now();
  const onCooldown = now < cooldownUntil;

  return (
    <div
      ref={containerRef}
      className="grid-viewport relative flex-1 flex items-center justify-center"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1
                      bg-[#111520] border border-[#1e2736] rounded-lg p-1">
        <button
          onClick={() => setScale(s => Math.min(3, s + 0.15))}
          className="w-7 h-7 text-slate-400 hover:text-white rounded flex items-center justify-center text-lg leading-none transition-colors"
        >+</button>
        <span className="text-xs text-slate-600 w-10 text-center font-mono">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale(s => Math.max(0.35, s - 0.15))}
          className="w-7 h-7 text-slate-400 hover:text-white rounded flex items-center justify-center text-lg leading-none transition-colors"
        >−</button>
        <div className="w-px h-4 bg-[#1e2736] mx-0.5" />
        <button
          onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}
          className="w-7 h-7 text-slate-400 hover:text-white rounded flex items-center justify-center text-xs transition-colors"
          title="Reset view"
        >⌖</button>
      </div>

      {/* Grid canvas */}
      <div
        className="grid-canvas select-none"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
      >
        {/* Remote cursors */}
        {Object.entries(remoteCursors).map(([uid, pos]) => {
          const user = onlineUsers.find(u => u.id === uid);
          if (!user) return null;
          return (
            <div
              key={uid}
              className="absolute pointer-events-none z-30 transition-all duration-100 ease-out"
              style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)' }}
            >
              <div className="w-3 h-3 rounded-full border-2 border-white shadow-lg" style={{ background: user.color }} />
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[#111520]/80 border border-white/10 text-[9px] font-mono whitespace-nowrap text-white">
                {user.name}
              </div>
            </div>
          );
        })}

        <div
          className="grid-cells p-0.5 bg-[#0d1117] rounded-lg border border-[#1e2736]"
          style={{ cursor: onCooldown ? 'not-allowed' : 'crosshair' }}
        >
          {Array.from({ length: TOTAL }, (_, i) => {
            const cell = gridState[i];
            const isMine = cell?.userId === myUserId;
            const isFlashing = flashSet.has(i);

            return (
              <div
                key={i}
                className={clsx(
                  'cell',
                  cell ? 'cell-claimed' : 'cell-unclaimed',
                  isMine && 'cell-mine',
                  isFlashing && (isMine ? 'animate-capture' : 'animate-incoming'),
                )}
                style={cell ? { background: cell.color } : {}}
                onClick={() => handleCellClick(i)}
                onMouseEnter={(e) => onCellMouseEnter(e, i)}
                onMouseLeave={onCellMouseLeave}
                onMouseMove={onCellMouseMove}
              />
            );
          })}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (() => {
        const cell = gridState[tooltip.cellId];
        const col = (tooltip.cellId % COLS) + 1;
        const row = Math.floor(tooltip.cellId / COLS) + 1;
        const age = cell ? Math.round((Date.now() - cell.ts) / 1000) : 0;
        const ageStr = age < 60 ? `${age}s ago` : `${Math.floor(age / 60)}m ago`;

        return (
          <div
            className="fixed z-50 pointer-events-none px-2.5 py-1.5
                       bg-[#111520] border border-[#1e2736] rounded-lg
                       text-xs font-mono text-slate-300 shadow-xl"
            style={{ left: tooltip.x + 14, top: tooltip.y - 36 }}
          >
            {cell ? (
              <span>
                <span style={{ color: cell.color }}>■</span>{' '}
                <span className="text-white font-medium">{cell.name}</span>
                <span className="text-slate-600"> · [{col},{row}] · {ageStr}</span>
              </span>
            ) : (
              <span className="text-slate-500">[{col},{row}] · unclaimed</span>
            )}
          </div>
        );
      })()}
    </div>
  );
}
