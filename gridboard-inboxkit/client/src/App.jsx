import { useState, useCallback, useRef, useEffect } from "react";
import { useGridSocket } from "./hooks/useGridSocket";
import JoinScreen from "./components/JoinScreen";
import Header from "./components/Header";
import Grid from "./components/Grid";
import Sidebar from "./components/Sidebar";
import { COLS, ROWS } from "./lib/constants";

const COOLDOWN_MS = 1200; // Keep in sync with server — server enforces it

export default function App() {
  const [wsStatus, setWsStatus] = useState("connecting");
  const [joined, setJoined] = useState(false);
  const [myUser, setMyUser] = useState(null); // { id, name, color }
  const [gridState, setGridState] = useState({}); // { cellId: { userId, name, color, ts } }
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [events, setEvents] = useState([]);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [flashSet, setFlashSet] = useState(new Set()); // cells to flash

  const myUserRef = useRef(null);
  const pendingJoin = useRef(null); // { name, color } — queued if not yet connected

  // Flash helper
  const flashCell = useCallback((cellId) => {
    setFlashSet((s) => {
      const next = new Set(s);
      next.add(cellId);
      return next;
    });
    setTimeout(() => {
      setFlashSet((s) => {
        const next = new Set(s);
        next.delete(cellId);
        return next;
      });
    }, 400);
  }, []);

  // Message handler
  const handleMessage = useCallback(
    (msg) => {
      switch (msg.type) {
        case "init": {
          myUserRef.current = { ...myUserRef.current, id: msg.userId };
          setMyUser((u) => ({ ...u, id: msg.userId }));
          setGridState(msg.grid || {});
          setOnlineUsers(msg.users || []);
          break;
        }

        case "claimed": {
          const { cellId, userId, name, color, ts, leaderboard: lb } = msg;

          setGridState((prev) => {
            const prevCell = prev[cellId];

            // Push to activity feed
            const col = (cellId % COLS) + 1;
            const row = Math.floor(cellId / COLS) + 1;
            setEvents((evs) =>
              [
                {
                  name,
                  color,
                  col,
                  row,
                  ts: Date.now(),
                  prev:
                    prevCell && prevCell.userId !== userId
                      ? prevCell.name
                      : null,
                  prevColor: prevCell?.color,
                },
                ...evs,
              ].slice(0, 30),
            );

            return { ...prev, [cellId]: { userId, name, color, ts } };
          });

          flashCell(cellId);
          if (lb) setLeaderboard(lb);
          break;
        }

        case "user_joined": {
          setOnlineUsers((prev) => {
            if (prev.find((u) => u.id === msg.user.id)) return prev;
            return [...prev, msg.user];
          });
          break;
        }

        case "user_left": {
          setOnlineUsers((prev) => prev.filter((u) => u.id !== msg.userId));
          break;
        }

        case "error": {
          // Cooldown error from server — sync local cooldown
          if (msg.remaining) {
            setCooldownUntil(Date.now() + msg.remaining);
          }
          break;
        }

        default:
          break;
      }
    },
    [flashCell],
  );

  const handleStatusChange = useCallback((status) => {
    setWsStatus(status);

    // If we reconnected and had a pending join, send it now
    if (status === "connected" && pendingJoin.current) {
      sendRef.current?.(pendingJoin.current);
      pendingJoin.current = null;
    }
  }, []);

  const { send } = useGridSocket({
    onMessage: handleMessage,
    onStatusChange: handleStatusChange,
  });

  // Store send in a ref so handleStatusChange can call it
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  // Join 
  const handleJoin = useCallback(
    (name, color) => {
      const user = { name, color, id: null }; // id comes from server
      setMyUser(user);
      myUserRef.current = user;

      const joinMsg = { type: "join", name, color };

      if (wsStatus === "connected") {
        send(joinMsg);
        setJoined(true);
      } else {
        // Queue it — will send on connect
        pendingJoin.current = joinMsg;
        setJoined(true);
      }
    },
    [wsStatus, send],
  );

  // Claim 
  const handleClaim = useCallback(
    (cellId) => {
      const user = myUserRef.current;
      if (!user?.id) return;

      const now = Date.now();
      if (now < cooldownUntil) return; // local fast-path reject

      // Optimistic update
      setGridState((prev) => ({
        ...prev,
        [cellId]: {
          userId: user.id,
          name: user.name,
          color: user.color,
          ts: now,
        },
      }));
      flashCell(cellId);
      setCooldownUntil(now + COOLDOWN_MS);

      // Send to server — server will broadcast confirmed state to all
      send({ type: "claim", cellId });
    },
    [cooldownUntil, flashCell, send],
  );

  // Derived stats 
  const claimedCount = Object.keys(gridState).length;
  const myCellCount = myUser?.id
    ? Object.values(gridState).filter((c) => c.userId === myUser.id).length
    : 0;

  return (
    <div className="flex flex-col h-screen bg-[#0a0c10]">
      {!joined && <JoinScreen onJoin={handleJoin} status={wsStatus} />}

      <Header
        claimedCount={claimedCount}
        onlineCount={onlineUsers.length}
        wsStatus={wsStatus}
      />

      <div className="flex flex-1 overflow-hidden">
        <Grid
          gridState={gridState}
          myUserId={myUser?.id}
          onClaim={handleClaim}
          cooldownUntil={cooldownUntil}
          flashSet={flashSet}
        />
        <Sidebar
          user={myUser}
          myUserId={myUser?.id}
          myCellCount={myCellCount}
          cooldownUntil={cooldownUntil}
          cooldownMs={COOLDOWN_MS}
          leaderboard={leaderboard}
          onlineUsers={onlineUsers}
          events={events}
        />
      </div>
    </div>
  );
}
