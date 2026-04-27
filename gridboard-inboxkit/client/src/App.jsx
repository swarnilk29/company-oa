import { useGridState } from './hooks/useGridState';
import JoinScreen from './components/JoinScreen';
import Header from './components/Header';
import Grid from './components/Grid';
import Sidebar from './components/Sidebar';

export default function App() {
  const {
    wsStatus, joined, myUser, gridState, onlineUsers, leaderboard, 
    events, cooldownUntil, flashSet, remoteCursors, 
    handleJoin, handleClaim, handleMove, handleLogout,
    cooldownMs
  } = useGridState();

  const claimedCount = Object.keys(gridState).length;
  const myCellCount = myUser?.id
    ? Object.values(gridState).filter(c => c.userId === myUser.id).length
    : 0;

  return (
    <div className="flex flex-col h-screen bg-[#0a0c10]">
      {!joined && (
        <JoinScreen onJoin={handleJoin} status={wsStatus} />
      )}

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
          onMove={handleMove}
          cooldownUntil={cooldownUntil}
          flashSet={flashSet}
          remoteCursors={remoteCursors}
          onlineUsers={onlineUsers}
        />
        <Sidebar
          user={myUser}
          myUserId={myUser?.id}
          myCellCount={myCellCount}
          cooldownUntil={cooldownUntil}
          cooldownMs={cooldownMs}
          leaderboard={leaderboard}
          onlineUsers={onlineUsers}
          events={events}
          onLogout={handleLogout}
        />
      </div>
    </div>
  );
}
