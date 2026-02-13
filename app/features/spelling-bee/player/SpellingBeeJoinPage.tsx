"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  PlayerSnapshot,
  registerPlayer,
  RoomSnapshot,
  submitBuzzEvent,
  subscribePlayer,
  subscribeRoom,
} from "@/lib/firebase/spellingBeeRealtime";
import { createPlayerId } from "@/app/features/spelling-bee/shared/constants";

export default function JoinRoomPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = params?.roomId ?? "UNKNOWN";

  const [playerName, setPlayerName] = useState("");
  const [joined, setJoined] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [playerId, setPlayerId] = useState("");
  const [roomState, setRoomState] = useState<RoomSnapshot | null>(null);
  const [playerState, setPlayerState] = useState<PlayerSnapshot | null>(null);
  const [submitError, setSubmitError] = useState("");

  const storageKey = useMemo(() => `spelling-bee-player:${roomId}`, [roomId]);
  const roomStatus = roomState?.status ?? (joined ? "connecting" : "waiting");
  const canJoin = playerName.trim().length >= 2;
  const isApproved = playerState?.status === "approved";
  const canPressBell = Boolean(
    joined && isApproved && roomStatus === "playing" && roomState?.buzzOpen && roomState?.currentRoundKey,
  );

  useEffect(() => {
    const unsub = subscribeRoom(roomId, setRoomState);
    return () => unsub();
  }, [roomId]);

  useEffect(() => {
    if (!playerId) {
      setPlayerState(null);
      return;
    }

    const unsub = subscribePlayer(roomId, playerId, setPlayerState);
    return () => unsub();
  }, [roomId, playerId]);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as { playerId: string; playerName: string };
      if (parsed.playerId && parsed.playerName) {
        setPlayerId(parsed.playerId);
        setPlayerName(parsed.playerName);
        setJoined(true);
      }
    } catch {
      // ignore invalid local cache
    }
  }, [storageKey]);

  useEffect(() => {
    if (!joined || !playerId || !isApproved) return;
    router.replace(`/games/spelling-bee/join/${roomId}/simulation`);
  }, [isApproved, joined, playerId, roomId, router]);

  async function handleJoin() {
    const nextPlayerId = createPlayerId();
    setPlayerId(nextPlayerId);
    setJoined(true);
    setSubmitError("");

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ playerId: nextPlayerId, playerName: playerName.trim() }),
    );

    await registerPlayer(roomId, playerName.trim(), nextPlayerId);
  }

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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Player Device</p>
          <h1 className="mt-2 text-4xl font-bold text-white">Spelling Bee Competition - Join Room</h1>
        </div>
      </div>

      <section className="rounded-2xl border border-cyan-400/30 bg-slate-900/70 p-6">
        <p className="text-sm text-slate-300">Room ID</p>
        <p className="mt-1 text-xl font-semibold text-cyan-100">{roomId}</p>
        <p className="mt-2 text-sm text-slate-300">
          Round code: <span className="font-mono text-cyan-200">{roomState?.currentRoundKey ?? "-"}</span>
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
                  : roomStatus === "connecting"
                    ? "font-semibold text-cyan-300"
                  : "font-semibold text-amber-300"
            }
          >
            {roomStatus.toUpperCase()}
          </span>
        </p>

        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-600 px-3 py-1 text-xs">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${roomState?.buzzOpen ? "animate-pulse bg-emerald-400" : "bg-rose-400"}`} />
          <span className={roomState?.buzzOpen ? "text-emerald-200" : "text-rose-200"}>
            BELL {roomState?.buzzOpen ? "OPEN" : "LOCKED"}
          </span>
        </div>

        {roomStatus === "playing" && isApproved ? (
          <div className="mt-4 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-200">Current Word Preview</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {roomState?.promptWord ?? (roomState?.level === "beginner" ? "-" : "???")}
            </p>
            <p className="mt-1 text-sm text-slate-200">Definition: {roomState?.promptDefinition ?? "-"}</p>
            {roomState?.level !== "beginner" && roomState?.promptHint ? (
              <p className="mt-1 text-sm text-slate-300">Hint: {roomState.promptHint}</p>
            ) : null}
          </div>
        ) : null}

        {!joined ? (
          <div className="mt-5 space-y-3">
            <label className="block text-sm text-slate-300">Your Name</label>
            <input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="ex: Fajar"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/70"
            />
            <button
              type="button"
              disabled={!canJoin}
              onClick={handleJoin}
              className="rounded-lg border border-cyan-400/60 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
            >
              Join Room
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-emerald-300">Connected as {playerName}.</p>
            {!isApproved ? (
              <p className="text-sm text-amber-200">
                Waiting for the host to assign you to a group.
              </p>
            ) : null}
            {roomStatus !== "playing" ? (
              <p className="text-sm text-amber-200">
                {roomStatus === "connecting"
                  ? "Connecting room data... make sure the room link is correct and your connection is stable."
                  : roomStatus === "finished"
                  ? "Game has finished. Wait for the host to create a new room."
                  : "You have joined successfully. Wait for the host to press Start Game."}
              </p>
            ) : null}
            <button
              type="button"
              onClick={handlePressBell}
              disabled={!canPressBell}
              className={`relative mx-auto flex h-44 w-44 items-center justify-center overflow-hidden rounded-full border text-lg font-extrabold tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50 ${
                pressed
                  ? "border-amber-200 bg-gradient-to-b from-amber-300/90 via-amber-500/85 to-amber-700/85 text-black shadow-[0_0_40px_rgba(251,191,36,0.5)]"
                  : "border-emerald-200 bg-gradient-to-b from-emerald-300/90 via-emerald-500/85 to-emerald-700/85 text-slate-950 shadow-[0_0_40px_rgba(16,185,129,0.45)]"
              }`}
            >
              <span className="pointer-events-none absolute left-6 top-4 h-14 w-24 rounded-full bg-white/30 blur-sm" />
              <span className="relative z-10">{pressed ? "BELL SENT" : "PRESS BELL"}</span>
            </button>
            {submitError ? <p className="text-xs text-rose-300">{submitError}</p> : null}
            <p className="text-xs text-slate-400">Bell actions sync live during this match.</p>
          </div>
        )}
      </section>
    </main>
  );
}
