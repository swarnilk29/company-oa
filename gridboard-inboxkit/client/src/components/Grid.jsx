import { useRef, useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { COLS, ROWS, TOTAL } from '../lib/constants';

const CELL_SIZE = 26; // px
const GAP = 2;        // px

export default function Grid({ gridState, myUserId, onClaim, cooldownUntil, flashSet }) {
  const containerRef = useRef(null);

  // Zoom / pan state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragStart = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Tooltip
  const [tooltip, setTooltip] = useState(null); // { x, y, cellId }

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
    if (!dragStart.current) return;
    setOffset({
      x: dragOffset.current.x + e.clientX - dragStart.current.x,
      y: dragOffset.current.y + e.clientY - dragStart.current.y,
    });
  }, []);

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
