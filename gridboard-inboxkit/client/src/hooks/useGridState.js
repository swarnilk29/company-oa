import { useState, useCallback, useRef, useEffect } from 'react';
import { useGridSocket } from './useGridSocket';
import { COLS } from '../lib/constants';

const COOLDOWN_MS = 1200;

export function useGridState() {
  const [wsStatus, setWsStatus] = useState('connecting');
  const [joined, setJoined] = useState(false);
  const [myUser, setMyUser] = useState(null);
  const [gridState, setGridState] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [events, setEvents] = useState([]);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [flashSet, setFlashSet] = useState(new Set());
  const [remoteCursors, setRemoteCursors] = useState({});

  const myUserRef = useRef(null);
  const pendingJoin = useRef(null);
  const optimisticReverts = useRef(new Map());

  // Helpers
  const flashCell = useCallback((cellId) => {
    setFlashSet(s => {
      const next = new Set(s);
      next.add(cellId);
      return next;
    });
    setTimeout(() => {
      setFlashSet(s => {
        const next = new Set(s);
        next.delete(cellId);
        return next;
      });
    }, 400);
  }, []);

  const handleMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'init': {
        const updatedUser = { ...myUserRef.current, id: msg.userId };
        myUserRef.current = updatedUser;
        setMyUser(updatedUser);
        setGridState(msg.grid || {});
        setOnlineUsers(msg.users || []);
        if (msg.leaderboard) setLeaderboard(msg.leaderboard);
        localStorage.setItem('gridboard_session', JSON.stringify(updatedUser));
        break;
      }
      case 'claimed': {
        const { cellId, userId, name, color, ts, leaderboard: lb } = msg;
        setGridState(prev => {
          const prevCell = prev[cellId];
          const col = (cellId % COLS) + 1;
          const row = Math.floor(cellId / COLS) + 1;
          setEvents(evs => [{
            name, color, col, row, ts: Date.now(),
            prev: prevCell && prevCell.userId !== userId ? prevCell.name : null,
            prevColor: prevCell?.color,
          }, ...evs].slice(0, 30));
          return { ...prev, [cellId]: { userId, name, color, ts } };
        });
        flashCell(cellId);
        optimisticReverts.current.delete(cellId);
        if (lb) setLeaderboard(lb);
        break;
      }
      case 'user_joined': {
        setOnlineUsers(prev => prev.find(u => u.id === msg.user.id) ? prev : [...prev, msg.user]);
        break;
      }
      case 'user_moved': {
        setRemoteCursors(prev => ({ ...prev, [msg.userId]: { x: msg.x, y: msg.y } }));
        break;
      }
      case 'user_left': {
        setOnlineUsers(prev => prev.filter(u => u.id !== msg.userId));
        setRemoteCursors(prev => {
          const next = { ...prev };
          delete next[msg.userId];
          return next;
        });
        break;
      }
      case 'error': {
        if (msg.remaining) setCooldownUntil(Date.now() + msg.remaining);
        if (optimisticReverts.current.size > 0) {
          setGridState(prev => {
            const next = { ...prev };
            for (const [cellId, prevState] of optimisticReverts.current) {
              if (prevState === undefined) delete next[cellId];
              else next[cellId] = prevState;
            }
            return next;
          });
          optimisticReverts.current.clear();
        }
        break;
      }
      default: break;
    }
  }, [flashCell]);

  const handleStatusChange = useCallback((status) => {
    setWsStatus(status);
    if (status === 'connected' && pendingJoin.current) {
      sendRef.current?.(pendingJoin.current);
      pendingJoin.current = null;
    }
  }, []);

  const { send } = useGridSocket({ onMessage: handleMessage, onStatusChange: handleStatusChange });
  const sendRef = useRef(send);
  useEffect(() => { sendRef.current = send; }, [send]);

  // Actions
  const handleJoin = useCallback((name, color, existingId = null) => {
    const user = { name, color, id: existingId };
    setMyUser(user);
    myUserRef.current = user;
    const joinMsg = { type: 'join', name, color, userId: existingId };
    if (wsStatus === 'connected') {
      send(joinMsg);
      setJoined(true);
    } else {
      pendingJoin.current = joinMsg;
      setJoined(true);
    }
  }, [wsStatus, send]);

  useEffect(() => {
    const saved = localStorage.getItem('gridboard_session');
    if (saved) {
      try {
        const { name, color, id } = JSON.parse(saved);
        if (name && color) handleJoin(name, color, id);
      } catch (e) { localStorage.removeItem('gridboard_session'); }
    }
  }, [handleJoin]);

  const handleClaim = useCallback((cellId) => {
    const user = myUserRef.current;
    if (!user?.id || Date.now() < cooldownUntil) return;
    setGridState(prev => {
      optimisticReverts.current.set(cellId, prev[cellId]);
      return { ...prev, [cellId]: { userId: user.id, name: user.name, color: user.color, ts: Date.now() } };
    });
    flashCell(cellId);
    setCooldownUntil(Date.now() + COOLDOWN_MS);
    send({ type: 'claim', cellId });
  }, [cooldownUntil, flashCell, send]);

  const handleMove = useCallback((x, y) => {
    if (wsStatus === 'connected') send({ type: 'move', x, y });
  }, [wsStatus, send]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('gridboard_session');
    window.location.reload();
  }, []);

  return {
    wsStatus, joined, myUser, gridState, onlineUsers, leaderboard, 
    events, cooldownUntil, flashSet, remoteCursors, 
    handleJoin, handleClaim, handleMove, handleLogout,
    cooldownMs: COOLDOWN_MS
  };
}
