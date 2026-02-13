import { PlayerSnapshot } from "@/lib/firebase/spellingBeeRealtime";

type Props = {
  roomId: string;
  copied: boolean;
  canStartGame: boolean;
  fullJoinLink: string;
  isPlaying: boolean;
  joinedPlayers: PlayerSnapshot[];
  pendingGroupByPlayer: Record<string, string>;
  groupCount: number;
  onCopyJoinLink: () => void;
  onStartGame: () => void;
  onEndGame: () => void;
  onAssignAllRandom: () => void;
  onPendingGroupChange: (playerId: string, value: string) => void;
  onAssignGroup: (playerId: string) => void;
};

export default function RoomPanel({
  roomId,
  copied,
  canStartGame,
  fullJoinLink,
  isPlaying,
  joinedPlayers,
  pendingGroupByPlayer,
  groupCount,
  onCopyJoinLink,
  onStartGame,
  onEndGame,
  onAssignAllRandom,
  onPendingGroupChange,
  onAssignGroup,
}: Props) {
  if (!roomId) return null;

  const groupedPlayers = Array.from({ length: groupCount }).map((_, idx) => {
    const groupId = `group-${idx + 1}`;
    return {
      groupId,
      label: `Group ${idx + 1}`,
      players: joinedPlayers.filter((player) => (pendingGroupByPlayer[player.playerId] ?? player.groupId ?? "") === groupId),
    };
  });

  const groupGridClass =
    groupCount === 2
      ? "grid gap-3 md:grid-cols-2"
      : "grid gap-3 md:grid-cols-2 xl:grid-cols-4";

  return (
    <section className="rounded-2xl border border-emerald-400/30 bg-slate-900/70 p-6">
      <h2 className="text-xl font-semibold text-white">Match Share Link</h2>
      <p className="mt-2 text-base text-slate-300">Share this link to members. They join first, then host starts the game.</p>
      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
        <span className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base text-cyan-200">Room: {roomId}</span>
        <button type="button" onClick={onCopyJoinLink} className="rounded-lg border border-slate-500 bg-slate-700/30 px-4 py-2 text-sm text-slate-100">
          {copied ? "Copied" : "Copy Link"}
        </button>
        <button
          type="button"
          onClick={onStartGame}
          disabled={!canStartGame}
          className="rounded-lg border border-emerald-400/60 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 disabled:opacity-40"
        >
          Start Game
        </button>
        <button type="button" onClick={onEndGame} className="rounded-lg border border-rose-400/60 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-100">
          End Game
        </button>
      </div>
      <p className="mt-2 break-all text-xs text-cyan-200">Share URL: {fullJoinLink || "-"}</p>
      <p className="mt-3 text-xs text-slate-400">
        Status: {isPlaying ? "playing" : "waiting for host to start"} | End Game deletes this room and all related session data.
      </p>

      <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Participants ({joinedPlayers.length})</p>
          <button
            type="button"
            onClick={onAssignAllRandom}
            disabled={!joinedPlayers.length || groupCount < 1}
            className="rounded-md border border-fuchsia-300/60 bg-fuchsia-500/20 px-3 py-1.5 text-xs font-semibold text-fuchsia-100 disabled:opacity-40"
          >
            Random Assign All
          </button>
        </div>
        {joinedPlayers.length ? (
          <div className="mt-3 space-y-2">
            {joinedPlayers.map((player) => (
              <div key={player.playerId} className="flex flex-col gap-2 rounded-lg border border-slate-700 bg-slate-900/80 p-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {player.name}
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${
                        player.status === "approved"
                          ? "border border-emerald-300/60 bg-emerald-500/15 text-emerald-200"
                          : "border border-amber-300/60 bg-amber-500/15 text-amber-200"
                      }`}
                    >
                      {player.status === "approved" ? "Approved" : "Pending"}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400">{player.playerId}</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  Group
                  <select
                    value={pendingGroupByPlayer[player.playerId] ?? player.groupId ?? ""}
                    onChange={(e) => onPendingGroupChange(player.playerId, e.target.value)}
                    className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                  >
                    <option value="">Unassigned</option>
                    {Array.from({ length: groupCount }).map((_, idx) => {
                      const value = `group-${idx + 1}`;
                      return (
                        <option key={value} value={value}>
                          Group {idx + 1}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    onClick={() => onAssignGroup(player.playerId)}
                    disabled={(pendingGroupByPlayer[player.playerId] ?? player.groupId ?? "") === (player.groupId ?? "")}
                    className="rounded-md border border-cyan-400/60 bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-100 disabled:opacity-40"
                  >
                    Enter
                  </button>
                </label>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-400">No players have joined this room yet.</p>
        )}
      </div>

      {groupCount > 0 ? (
        <div className="mt-4 rounded-xl border border-cyan-500/30 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Team Assignment</p>
          <div className={`mt-3 ${groupGridClass}`}>
            {groupedPlayers.map((group) => (
              <div key={group.groupId} className="rounded-lg border border-slate-700 bg-slate-900/80 p-3">
                <p className="text-sm font-semibold text-cyan-100">
                  {group.label} ({group.players.length})
                </p>
                {group.players.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.players.map((player) => (
                      <span
                        key={player.playerId}
                        className="rounded-full border border-cyan-300/40 bg-cyan-500/15 px-2.5 py-1 text-xs text-cyan-100"
                      >
                        {player.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">No players yet.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
