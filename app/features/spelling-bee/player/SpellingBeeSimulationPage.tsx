"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  LeaderboardEntry,
  PlayerSnapshot,
  RoomSnapshot,
  submitBuzzEvent,
  subscribePlayers,
  subscribePlayer,
  subscribeRoom,
  subscribeVocabularyResults,
  VocabularyResultSnapshot,
} from "@/lib/firebase/spellingBeeRealtime";

export default function SpellingBeeSimulationPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = params?.roomId ?? "UNKNOWN";

  const [playerName, setPlayerName] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [roomState, setRoomState] = useState<RoomSnapshot | null>(null);
  const [playerState, setPlayerState] = useState<PlayerSnapshot | null>(null);
  const [joinedPlayers, setJoinedPlayers] = useState<PlayerSnapshot[]>([]);
  const [vocabularyResults, setVocabularyResults] = useState<VocabularyResultSnapshot[]>([]);
  const [submitError, setSubmitError] = useState("");

  const storageKey = useMemo(() => `spelling-bee-player:${roomId}`, [roomId]);
  const roomStatus = roomState?.status ?? "connecting";
  const isApproved = playerState?.status === "approved";
  const isTurnBellAllowed = Boolean(
    roomState?.roundMode === "turn" &&
      playerState?.groupId &&
      roomState?.turnGroupId &&
      playerState.groupId === roomState.turnGroupId,
  );
  const canPressBell = Boolean(
    roomStatus === "playing" &&
      isApproved &&
      roomState?.buzzOpen &&
      roomState?.currentRoundKey &&
      (roomState?.roundMode === "buzz" || isTurnBellAllowed),
  );
  const isMyGroupTurn = Boolean(
    roomState?.roundMode === "turn" &&
      playerState?.groupId &&
      roomState?.turnGroupId &&
      playerState.groupId === roomState.turnGroupId,
  );
  const roomGroupCount = roomState?.groupCount ?? 0;
  const finalLeaderboard = useMemo(
    () => [...(roomState?.leaderboard ?? [])].sort((a, b) => (b.score ?? 0) - (a.score ?? 0),
    ),
    [roomState?.leaderboard],
  );
  const myGroupId = playerState?.groupId ?? null;
  const myGroupResult = useMemo(() => {
    if (!myGroupId || !finalLeaderboard.length) return null;

    const topScore = finalLeaderboard[0]?.score ?? 0;
    const myEntry = finalLeaderboard.find((entry) => entry.id === myGroupId) ?? null;
    if (!myEntry) return null;

    const isWinner = myEntry.score === topScore;
    const rank = finalLeaderboard.findIndex((entry) => entry.id === myGroupId) + 1;
    return { ...myEntry, isWinner, rank };
  }, [finalLeaderboard, myGroupId]);
  const groupedPlayers = Array.from({ length: roomGroupCount }).map((_, idx) => {
    const groupId = `group-${idx + 1}`;
    return {
      groupId,
      label: `Group ${idx + 1}`,
      players: joinedPlayers.filter((player) => (player.groupId ?? "") === groupId),
    };
  });

  useEffect(() => {
    const unsub = subscribeRoom(roomId, setRoomState);
    return () => unsub();
  }, [roomId]);

  useEffect(() => {
    if (!playerId) return;
    const unsub = subscribePlayer(roomId, playerId, setPlayerState);
    return () => unsub();
  }, [roomId, playerId]);

  useEffect(() => {
    const unsub = subscribePlayers(roomId, setJoinedPlayers);
    return () => unsub();
  }, [roomId]);

  useEffect(() => {
    const unsub = subscribeVocabularyResults(roomId, setVocabularyResults);
    return () => unsub();
  }, [roomId]);

  useEffect(() => {
    // Reset local bell state whenever round context changes.
    setPressed(false);
    setSubmitError("");
  }, [roomState?.currentRoundKey, roomState?.roundMode, roomState?.buzzOpen]);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      setHydrated(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { playerId: string; playerName: string };
      if (parsed.playerId && parsed.playerName) {
        setPlayerId(parsed.playerId);
        setPlayerName(parsed.playerName);
      }
    } catch {
      // ignore invalid local cache
    } finally {
      setHydrated(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    if (!playerId) {
      router.replace(`/games/spelling-bee/join/${roomId}`);
      return;
    }
    if (playerState && playerState.status !== "approved") {
      router.replace(`/games/spelling-bee/join/${roomId}`);
    }
  }, [hydrated, playerId, playerState, roomId, router]);

  async function handlePressBell() {
    if (!canPressBell) return;

    try {
      await submitBuzzEvent({
        roomId,
        roundKey: roomState?.currentRoundKey ?? "",
        playerId,
        playerName: playerName.trim(),
      });

      setPressed(true);
      window.setTimeout(() => setPressed(false), 600);
      setSubmitError("");
    } catch {
      setSubmitError("Failed to send bell. Check Firestore rules/network.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-10 md:px-10">
      {roomStatus === "finished" && myGroupResult ? (
        <div className={`pointer-events-none fixed inset-0 z-40 flex items-center justify-center px-6 ${myGroupResult.isWinner ? "bg-emerald-500/30" : "bg-rose-500/30"}`}>
          <div
            className={`rounded-2xl border px-8 py-6 text-center backdrop-blur-sm ${
              myGroupResult.isWinner
                ? "border-emerald-200/80 bg-emerald-900/40"
                : "border-rose-200/80 bg-rose-900/40"
            }`}
          >
            <p className={`text-4xl font-black tracking-[0.18em] ${myGroupResult.isWinner ? "text-emerald-100" : "text-rose-100"}`}>
              {myGroupResult.isWinner ? "WINNER" : "TRY AGAIN"}
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              {myGroupResult.name} | {myGroupResult.score} pts | Rank #{myGroupResult.rank}
            </p>
          </div>
        </div>
      ) : null}

      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-300">Player View</p>
        <h1 className="mt-2 text-4xl font-bold text-white">SpellingBee Competition - Live Match</h1>
      </div>

      <section className="rounded-2xl border border-fuchsia-400/30 bg-slate-900/70 p-6">
        <p className="text-sm text-slate-300">
          Player: <span className="font-semibold text-fuchsia-100">{playerName || "-"}</span>
        </p>
        <p className="mt-1 text-sm text-slate-300">
          Room: <span className="font-semibold text-cyan-100">{roomId}</span>
        </p>
        <p className="mt-2 text-sm text-slate-300">
          Session: <span className="font-semibold text-cyan-200">{roomState?.currentSession ?? "-"}</span> | Mode:{" "}
          <span className="font-semibold text-cyan-200">{roomState?.roundMode?.toUpperCase() ?? "-"}</span> | Timer:{" "}
          <span className="font-semibold text-cyan-200">
            {(roomState?.timerSeconds ?? 0) > 0 ? `${roomState?.timerSeconds}s` : "Off"}
          </span>
        </p>
        <p className="mt-2 text-sm text-slate-300">
          Status:{" "}
          <span
            className={
              roomStatus === "playing"
                ? "font-semibold text-emerald-300"
                : roomStatus === "finished"
                  ? "font-semibold text-rose-300"
                  : "font-semibold text-amber-300"
            }
          >
            {roomStatus.toUpperCase()}
          </span>
        </p>

        {roomState?.roundMode === "turn" ? (
          <div
            className={`mt-3 rounded-lg border p-3 ${
              isMyGroupTurn
                ? "border-emerald-300/60 bg-emerald-500/20"
                : "border-cyan-400/40 bg-cyan-500/10"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.18em] text-slate-200">Turn Active</p>
            <p className="mt-1 text-lg font-bold text-white">{roomState?.turnGroupName ?? "-"}</p>
            <p className="mt-1 text-sm text-slate-200">
              Player: <span className="font-semibold">{roomState?.turnPlayerName ?? "-"}</span>
            </p>
            {isMyGroupTurn ? <p className="mt-1 text-xs font-semibold text-emerald-200">It is now your group&apos;s turn.</p> : null}
          </div>
        ) : null}

        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-600 px-3 py-1 text-xs">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${roomState?.buzzOpen ? "animate-pulse bg-emerald-400" : "bg-rose-400"}`} />
          <span className={roomState?.buzzOpen ? "text-emerald-200" : "text-rose-200"}>
            BELL {roomState?.buzzOpen ? "OPEN" : "LOCKED"} ({roomState?.roundMode?.toUpperCase() ?? "-"})
          </span>
        </div>

        <div className="mt-4 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-200">Current Word Preview</p>
          <p className="mt-2">
            <span className="inline-flex rounded-xl border border-amber-300/80 bg-amber-400/20 px-4 py-2 text-2xl font-extrabold tracking-wide text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.35)]">
              {roomState?.promptWord ?? (roomState?.level === "beginner" ? "-" : "???")}
            </span>
          </p>
          <p className="mt-1 text-sm text-slate-200">Definition: {roomState?.promptDefinition ?? "-"}</p>
          {roomState?.level !== "beginner" && roomState?.promptHint ? (
            <p className="mt-1 text-sm text-slate-300">Hint: {roomState.promptHint}</p>
          ) : null}
        </div>

        {roomStatus !== "playing" ? (
          <p className="mt-4 text-sm text-amber-200">
            {roomStatus === "finished"
              ? "Game has finished. Wait for the host to create a new room."
              : "Waiting for host to press Start Game."}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handlePressBell}
          disabled={!canPressBell}
          className={`relative mt-4 mx-auto flex h-44 w-44 items-center justify-center overflow-hidden rounded-full border text-lg font-extrabold tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50 ${
            pressed
              ? "border-amber-200 bg-gradient-to-b from-amber-300/90 via-amber-500/85 to-amber-700/85 text-black shadow-[0_0_40px_rgba(251,191,36,0.5)]"
              : "border-emerald-200 bg-gradient-to-b from-emerald-300/90 via-emerald-500/85 to-emerald-700/85 text-slate-950 shadow-[0_0_40px_rgba(16,185,129,0.45)]"
          }`}
        >
          <span className="pointer-events-none absolute left-6 top-4 h-14 w-24 rounded-full bg-white/30 blur-sm" />
          <span className="relative z-10">{pressed ? "BELL SENT" : "PRESS BELL"}</span>
        </button>

        {submitError ? <p className="mt-3 text-xs text-rose-300">{submitError}</p> : null}
      </section>

      {roomGroupCount > 0 ? (
        <section className="rounded-2xl border border-cyan-500/30 bg-slate-900/70 p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Team Assignment</p>
          <div className={`mt-3 grid gap-3 ${roomGroupCount === 2 ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-4"}`}>
            {groupedPlayers.map((group) => (
              <div key={group.groupId} className="rounded-lg border border-slate-700 bg-slate-950/70 p-3">
                <p className="text-sm font-semibold text-cyan-100">
                  {group.label} ({group.players.length})
                </p>
                {group.players.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.players.map((player) => (
                      <span key={player.playerId} className="rounded-full border border-cyan-300/40 bg-cyan-500/15 px-2.5 py-1 text-xs text-cyan-100">
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
        </section>
      ) : null}

      <section className="rounded-2xl border border-amber-400/30 bg-slate-900/70 p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-amber-200">Live Scoreboard</p>
        {finalLeaderboard.length ? (
          <div className="mt-3 space-y-2">
            {finalLeaderboard.map((entry: LeaderboardEntry, idx) => (
              <div key={`score-${entry.id}`} className="rounded-lg border border-slate-700 bg-slate-950/70 p-3">
                <p className="text-xs text-slate-400">Rank #{idx + 1}</p>
                <p className="text-sm font-semibold text-white">{entry.name}</p>
                <p className="text-sm text-amber-100">{entry.score} pts</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-400">Score is not available yet.</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
        {roomStatus === "finished" ? (
          <div className={`mb-4 rounded-xl border p-4 ${myGroupResult?.isWinner ? "border-emerald-300/70 bg-emerald-500/15" : "border-rose-300/70 bg-rose-500/15"}`}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-200">Final Score</p>
            {myGroupResult ? (
              <p className={`mt-2 text-lg font-bold ${myGroupResult.isWinner ? "text-emerald-100" : "text-rose-100"}`}>
                {myGroupResult.isWinner ? "Your team WON" : "Your team did not win"} ({myGroupResult.name}) - {myGroupResult.score} pts
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-200">Final score is not available yet.</p>
            )}
            <div className="mt-3 space-y-2">
              {finalLeaderboard.map((entry: LeaderboardEntry, idx) => (
                <div key={`player-final-${entry.id}`} className="rounded-lg border border-slate-600 bg-slate-950/60 p-2.5">
                  <p className="text-xs text-slate-300">Rank #{idx + 1}</p>
                  <p className="text-sm font-semibold text-white">{entry.name}</p>
                  <p className="text-sm text-cyan-100">{entry.score} pts</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Word Review</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {vocabularyResults.length ? (
            vocabularyResults.map((item) => {
              const isCorrect = item.decision === "correct";
              const isWrong = item.decision === "wrong";
              const cardClass = isCorrect
                ? "border-emerald-300/90 bg-emerald-600/30"
                : isWrong
                  ? "border-rose-300/90 bg-rose-600/30"
                  : "border-slate-500/70 bg-slate-700/30";
              const badgeClass = isCorrect
                ? "border-emerald-200/80 bg-emerald-500/25 text-emerald-100"
                : isWrong
                  ? "border-rose-200/80 bg-rose-500/25 text-rose-100"
                  : "border-slate-400/80 bg-slate-600/40 text-slate-100";
              const label = isCorrect ? "Correct" : isWrong ? "Wrong" : "Skip";

              return (
                <div key={item.id} className={`rounded-lg border p-3 ${cardClass}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${isCorrect ? "text-emerald-50" : isWrong ? "text-rose-50" : "text-white"}`}>{item.word}</p>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${badgeClass}`}>
                      {isCorrect ? (
                        <svg viewBox="0 0 20 20" className="h-3 w-3 fill-current" aria-hidden="true">
                          <path d="M7.8 14.6 3.6 10.4l1.4-1.4 2.8 2.8 7.2-7.2 1.4 1.4-8.6 8.6Z" />
                        </svg>
                      ) : isWrong ? (
                        <svg viewBox="0 0 20 20" className="h-3 w-3 fill-current" aria-hidden="true">
                          <path d="m11.4 10 4.3-4.3-1.4-1.4-4.3 4.3-4.3-4.3-1.4 1.4L8.6 10l-4.3 4.3 1.4 1.4 4.3-4.3 4.3 4.3 1.4-1.4Z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 20 20" className="h-3 w-3 fill-current" aria-hidden="true">
                          <path d="M4 9h12v2H4z" />
                        </svg>
                      )}
                      {label}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-200">
                    S{item.session} - {item.roundMode}
                  </p>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-400">No word decisions yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
