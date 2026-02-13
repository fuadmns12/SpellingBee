"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SetupPanel from "@/app/features/spelling-bee/host/components/SetupPanel";
import RoomPanel from "@/app/features/spelling-bee/host/components/RoomPanel";
import SimulationPanel from "@/app/features/spelling-bee/host/components/SimulationPanel";
import { GameGroup, useSpellingBeeMock } from "@/hooks/useSpellingBeeMock";
import { levelLabels, SpellingLevel, WordPrompt } from "@/lib/mock/spellingBeeMock";
import { fetchDynamicVocabularyByLevel } from "@/lib/firebase/spellingBeeVocabulary";
import {
  assignPlayerGroup,
  deleteRoomImmediately,
  LeaderboardEntry,
  patchRoomState,
  PlayerSnapshot,
  subscribeFirstBuzz,
  subscribePlayers,
  upsertVocabularyResult,
  upsertRoom,
} from "@/lib/firebase/spellingBeeRealtime";
import { createRoomId, groupOptions, sessionOptions } from "@/app/features/spelling-bee/shared/constants";
import { SetupPayload, TimerSeconds } from "@/app/features/spelling-bee/shared/types";

export default function SpellingBeeHostPage() {
  const game = useSpellingBeeMock();

  const [level, setLevel] = useState<SpellingLevel | "">("");
  const [groupCount, setGroupCount] = useState<(typeof groupOptions)[number] | 0>(0);
  const [sessionCount, setSessionCount] = useState<(typeof sessionOptions)[number] | 0>(0);
  const [timerSeconds, setTimerSeconds] = useState<TimerSeconds>(0);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [roomId, setRoomId] = useState("");
  const [copied, setCopied] = useState(false);
  const [remoteWinner, setRemoteWinner] = useState<{ playerId: string; playerName: string; groupId?: string | null } | null>(null);
  const [serverSetup, setServerSetup] = useState<SetupPayload | null>(null);
  const [joinedPlayers, setJoinedPlayers] = useState<PlayerSnapshot[]>([]);
  const [shareOrigin, setShareOrigin] = useState("");
  const [pendingGroupByPlayer, setPendingGroupByPlayer] = useState<Record<string, string>>({});
  const [dynamicVocabulary, setDynamicVocabulary] = useState<WordPrompt[]>([]);
  const [loadingVocabulary, setLoadingVocabulary] = useState(false);
  const syncedVocabularyIdsRef = useRef<Set<string>>(new Set());
  const syncingVocabularyIdsRef = useRef<Set<string>>(new Set());
  const lastSyncedTimerValueRef = useRef<number | null>(null);
  const lastRemoteWinnerRef = useRef<{ playerId: string; playerName: string; groupId?: string | null } | null>(null);

  const availableTopics = useMemo(
    () => [...new Set(dynamicVocabulary.map((item) => item.topic))],
    [dynamicVocabulary],
  );
  const canCreateServer = Boolean(
    level && selectedTopics.length && groupCount && sessionCount && !roomId && !loadingVocabulary && dynamicVocabulary.length,
  );
  const canStartGame = Boolean(roomId && serverSetup && !game.setup);
  const isTurnRoundActive = game.roundMode === "turn" && !game.finished;
  const isBuzzRoundActive = game.roundMode === "buzz" && !game.finished;
  const isRoundBellActive = (isTurnRoundActive || isBuzzRoundActive) && Boolean(game.setup);
  const leaderboardPayload: LeaderboardEntry[] = useMemo(
    () =>
      game.leaderboard.map((group: any) => ({
        id: group.id,
        name: group.name,
        score: group.score,
      })),
    [game.leaderboard],
  );

  const roundKey = useMemo(() => {
    if (!game.setup) return "";
    if (game.roundMode === "buzz") {
      return `s${game.currentSession}-buzz-q${game.buzzQuestionIndex + 1}-a${game.buzzAttemptIndex + 1}`;
    }

    return `s${game.currentSession}-turn-q${game.turnQuestionIndex + 1}`;
  }, [game.setup, game.currentSession, game.roundMode, game.buzzQuestionIndex, game.buzzAttemptIndex, game.turnQuestionIndex]);

  const isBuzzOpen =
    isRoundBellActive &&
    !remoteWinner &&
    (game.roundMode === "turn" ? !game.turnResponderId : !game.buzzResponderId);

  const setupSummary = useMemo(() => {
    if (!level || !groupCount || !sessionCount) return "Select all options to create server.";
    if (loadingVocabulary) return "Loading vocabulary bank...";
    if (!dynamicVocabulary.length) return "No vocabulary loaded. Add data to `vocabularyBank` or use fallback.";
    return `${levelLabels[level]} | Topics: ${selectedTopics.length} | ${groupCount} groups | ${sessionCount} session(s) | Timer ${timerSeconds ? `${timerSeconds}s` : "Off"}`;
  }, [dynamicVocabulary.length, groupCount, level, loadingVocabulary, selectedTopics.length, sessionCount, timerSeconds]);

  useEffect(() => {
    if (!level || roomId) {
      if (!level) {
        setSelectedTopics([]);
        setDynamicVocabulary([]);
      }
      return;
    }

    let cancelled = false;
    setLoadingVocabulary(true);

    fetchDynamicVocabularyByLevel(level)
      .then((rows) => {
        if (cancelled) return;
        setDynamicVocabulary(rows);
        setSelectedTopics([...new Set(rows.map((item) => item.topic))]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingVocabulary(false);
      });

    return () => {
      cancelled = true;
    };
  }, [level, roomId]);

  useEffect(() => {
    if (!level) {
      setSelectedTopics([]);
      return;
    }
    setSelectedTopics((prev) => prev.filter((topic) => availableTopics.includes(topic)));
  }, [availableTopics, level]);

  const playerJoinPath = roomId ? `/games/spelling-bee/join/${roomId}` : "";
  const fullJoinLink = playerJoinPath
    ? `${shareOrigin || (typeof window !== "undefined" ? window.location.origin : "")}${playerJoinPath}`
    : "";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const { hostname, origin, port } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      setShareOrigin(origin);
      return;
    }

    const devPort = port || "3003";
    fetch("/api/network-host")
      .then((res) => res.json())
      .then((data: { ip?: string | null }) => {
        if (data?.ip) {
          setShareOrigin(`http://${data.ip}:${devPort}`);
        } else {
          setShareOrigin(origin);
        }
      })
      .catch(() => setShareOrigin(origin));
  }, []);

  useEffect(() => {
    if (!roomId || !game.setup) return;

    patchRoomState(roomId, {
      status: game.finished ? "finished" : "playing",
      currentSession: game.currentSession,
      roundMode: game.roundMode,
      currentRoundKey: roundKey,
      buzzOpen: isBuzzOpen,
      promptWord: game.promptWord ?? null,
      promptDefinition: game.currentWord?.definition ?? null,
      promptHint: game.setup?.level === "beginner" ? null : game.currentWord?.hint ?? null,
      turnGroupId: game.roundMode === "turn" ? (game.activeGroup?.id ?? null) : null,
      turnGroupName: game.roundMode === "turn" ? (game.activeGroup?.name ?? null) : null,
      turnPlayerName: game.roundMode === "turn" ? (game.activePlayer?.name ?? null) : null,
      leaderboard: leaderboardPayload,
    });
  }, [
    roomId,
    game.setup,
    game.finished,
    game.currentSession,
    game.roundMode,
    game.promptWord,
    game.currentWord?.definition,
    game.currentWord?.hint,
    game.activeGroup?.id,
    game.activeGroup?.name,
    game.activePlayer?.name,
    leaderboardPayload,
    roundKey,
    isBuzzOpen,
  ]);

  useEffect(() => {
    if (!roomId || !game.setup) return;

    if (lastSyncedTimerValueRef.current === game.remainingTime) return;
    lastSyncedTimerValueRef.current = game.remainingTime;
    patchRoomState(roomId, {
      timerSeconds: game.remainingTime,
    });
  }, [roomId, game.setup, game.remainingTime, game.timerSeconds]);

  useEffect(() => {
    if (!roomId || !isRoundBellActive || !roundKey) {
      setRemoteWinner(null);
      lastRemoteWinnerRef.current = null;
      return;
    }

    const unsub = subscribeFirstBuzz(roomId, roundKey, (winner) => {
      const prev = lastRemoteWinnerRef.current;
      const sameWinner =
        prev?.playerId === winner?.playerId &&
        prev?.playerName === winner?.playerName &&
        (prev?.groupId ?? null) === (winner?.groupId ?? null);

      if (sameWinner) return;

      lastRemoteWinnerRef.current = winner;
      setRemoteWinner(winner);
      if (winner) {
        patchRoomState(roomId, {
          buzzLockedBy: winner.playerId,
          firstBuzzPlayerName: winner.playerName,
          firstBuzzGroupId: winner.groupId ?? null,
          buzzOpen: false,
        });
      }
    });

    return () => unsub();
  }, [roomId, isRoundBellActive, roundKey]);

  useEffect(() => {
    if (!roomId) {
      setJoinedPlayers([]);
      setPendingGroupByPlayer({});
      syncedVocabularyIdsRef.current.clear();
      syncingVocabularyIdsRef.current.clear();
      lastSyncedTimerValueRef.current = null;
      return;
    }

    const unsub = subscribePlayers(roomId, setJoinedPlayers);
    return () => unsub();
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !game.vocabularyResults.length) return;

    const unsynced = game.vocabularyResults.filter(
      (item) =>
        !syncedVocabularyIdsRef.current.has(item.id) &&
        !syncingVocabularyIdsRef.current.has(item.id),
    );
    if (!unsynced.length) return;

    unsynced.forEach((item) => syncingVocabularyIdsRef.current.add(item.id));

    const chunkSize = 5;
    const chunks = Array.from(
      { length: Math.ceil(unsynced.length / chunkSize) },
      (_, idx) => unsynced.slice(idx * chunkSize, idx * chunkSize + chunkSize),
    );

    void (async () => {
      for (const chunk of chunks) {
        const settled = await Promise.allSettled(
          chunk.map((item) =>
            upsertVocabularyResult(roomId, {
              id: item.id,
              word: item.word,
              roundMode: item.roundMode,
              session: item.session,
              decision: item.decision,
              createdAtMs: Number(item.id.split("-")[0]) || Date.now(),
            }),
          ),
        );

        settled.forEach((result, idx) => {
          const item = chunk[idx];
          if (!item) return;
          if (result.status === "fulfilled") {
            syncedVocabularyIdsRef.current.add(item.id);
          }
          syncingVocabularyIdsRef.current.delete(item.id);
        });
      }
    })();
  }, [roomId, game.vocabularyResults]);

  async function handleCopyJoinLink() {
    if (!playerJoinPath || typeof window === "undefined") return;

    const full = fullJoinLink || `${window.location.origin}${playerJoinPath}`;
    await navigator.clipboard.writeText(full);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  async function handleCreateServer() {
    if (!level || !groupCount || !sessionCount) return;
    if (!dynamicVocabulary.length) {
      window.alert("Vocabulary is not available yet. Fill the `vocabularyBank` collection or use mock fallback.");
      return;
    }

    const nextRoomId = createRoomId();
    const payload: SetupPayload = {
      level,
      selectedTopics,
      groupCount: groupCount as 2 | 4,
      sessionCount: sessionCount as 1 | 2 | 3 | 4 | 5,
      timerSeconds,
    };

    setRoomId(nextRoomId);
    setRemoteWinner(null);
    setServerSetup(payload);

    await upsertRoom(nextRoomId, {
      level: payload.level,
      groupCount: payload.groupCount,
      sessionCount: payload.sessionCount,
      status: "waiting",
      currentSession: 0,
      roundMode: "turn",
      currentRoundKey: "pending",
      buzzOpen: false,
      timerSeconds: payload.timerSeconds,
      selectedTopics: payload.selectedTopics,
    });
  }

  async function handleStartGame() {
    if (!roomId || !serverSetup) return;

    const seededGroups: GameGroup[] = Array.from({ length: serverSetup.groupCount }).map((_, idx) => {
      const groupId = `group-${idx + 1}`;
      const players = joinedPlayers
        .filter((player) => player.status === "approved" && player.groupId === groupId)
        .map((player) => ({
          id: player.playerId,
          name: player.name,
        }));

      return {
        id: groupId,
        name: `Group ${idx + 1}`,
        score: 0,
        players,
      };
    });

    const emptyGroups = seededGroups.filter((group) => group.players.length === 0);
    if (emptyGroups.length) {
      const labels = emptyGroups.map((group) => group.name).join(", ");
      window.alert(`Cannot start yet. These groups do not have approved players: ${labels}`);
      return;
    }

    await upsertRoom(roomId, {
      level: serverSetup.level,
      groupCount: serverSetup.groupCount,
      sessionCount: serverSetup.sessionCount,
      status: "playing",
      currentSession: 1,
      roundMode: "turn",
      currentRoundKey: "s1-turn-q1",
      buzzOpen: false,
      timerSeconds: serverSetup.timerSeconds,
      selectedTopics: serverSetup.selectedTopics,
      promptWord: null,
      promptDefinition: null,
      promptHint: null,
      turnGroupId: null,
      turnGroupName: null,
      turnPlayerName: null,
    });

    await patchRoomState(roomId, {
      buzzLockedBy: null,
      firstBuzzPlayerName: null,
      firstBuzzGroupId: null,
    });

    game.startGame(serverSetup, seededGroups, dynamicVocabulary);
  }

  async function handleRejectRemoteBuzz() {
    if (!roomId) return;
    setRemoteWinner(null);
    await patchRoomState(roomId, {
      buzzLockedBy: null,
      firstBuzzPlayerName: null,
      firstBuzzGroupId: null,
      buzzOpen: true,
    });
  }

  async function handleAcceptRemoteBuzz() {
    if (!roomId) return;
    if (game.roundMode === "turn" && remoteWinner) {
      game.setTurnResponder(remoteWinner.playerId);
      setRemoteWinner(null);
      await patchRoomState(roomId, {
        buzzLockedBy: null,
        firstBuzzPlayerName: null,
        firstBuzzGroupId: null,
        buzzOpen: false,
      });
      return;
    }

    if (game.roundMode === "buzz" && remoteWinner) {
      game.buzzAs(remoteWinner.playerId);
      setRemoteWinner(null);
      await patchRoomState(roomId, {
        buzzLockedBy: null,
        firstBuzzPlayerName: null,
        firstBuzzGroupId: null,
        buzzOpen: false,
      });
      return;
    }

    setRemoteWinner(null);
    await patchRoomState(roomId, {
      buzzLockedBy: null,
      firstBuzzPlayerName: null,
      firstBuzzGroupId: null,
    });
    game.skipCurrentWord();
  }

  async function handleEndGame() {
    if (!roomId) return;

    await deleteRoomImmediately(roomId);
    game.resetGame();
    setRemoteWinner(null);
    setServerSetup(null);
    setRoomId("");
  }

  async function handleAssignGroup(playerId: string) {
    if (!roomId) return;
    const groupId = pendingGroupByPlayer[playerId] ?? "";
    await assignPlayerGroup(roomId, playerId, groupId || null);
  }

  async function handleAssignAllRandom() {
    if (!roomId || !serverSetup || !joinedPlayers.length) return;

    const shuffled = [...joinedPlayers].sort(() => Math.random() - 0.5);
    const nextAssignments: Record<string, string> = {};

    shuffled.forEach((player, index) => {
      const groupNumber = (index % serverSetup.groupCount) + 1;
      nextAssignments[player.playerId] = `group-${groupNumber}`;
    });

    setPendingGroupByPlayer((prev) => ({
      ...prev,
      ...nextAssignments,
    }));

    await Promise.all(
      Object.entries(nextAssignments).map(([playerId, groupId]) => assignPlayerGroup(roomId, playerId, groupId)),
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10 md:px-10">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Game Setup</p>
        <h1 className="mt-2 text-3xl font-bold text-white">SpellingBee-Competition</h1>
      </div>

      <SetupPanel
        level={level}
        groupCount={groupCount}
        sessionCount={sessionCount}
        timerSeconds={timerSeconds}
        roomId={roomId}
        canCreateServer={canCreateServer}
        setupSummary={setupSummary}
        onLevelChange={setLevel}
        availableTopics={availableTopics}
        selectedTopics={selectedTopics}
        onToggleTopic={(topic) =>
          setSelectedTopics((prev) =>
            prev.includes(topic) ? prev.filter((item) => item !== topic) : [...prev, topic],
          )
        }
        onSelectAllTopics={() => setSelectedTopics(availableTopics)}
        onClearAllTopics={() => setSelectedTopics([])}
        onGroupCountChange={setGroupCount}
        onSessionCountChange={setSessionCount}
        onTimerChange={setTimerSeconds}
        onCreateServer={handleCreateServer}
      />

      <RoomPanel
        roomId={roomId}
        copied={copied}
        canStartGame={canStartGame}
        fullJoinLink={fullJoinLink}
        isPlaying={Boolean(game.setup)}
        joinedPlayers={joinedPlayers}
        pendingGroupByPlayer={pendingGroupByPlayer}
        groupCount={serverSetup?.groupCount ?? 0}
        onCopyJoinLink={handleCopyJoinLink}
        onStartGame={handleStartGame}
        onEndGame={handleEndGame}
        onAssignAllRandom={handleAssignAllRandom}
        onPendingGroupChange={(playerId, value) =>
          setPendingGroupByPlayer((prev) => ({
            ...prev,
            [playerId]: value,
          }))
        }
        onAssignGroup={handleAssignGroup}
      />

      <SimulationPanel
        game={game}
        isBuzzRoundActive={isBuzzRoundActive}
        isBuzzOpen={isBuzzOpen}
        remoteWinner={remoteWinner}
        onAcceptRemoteBuzz={handleAcceptRemoteBuzz}
        onRejectRemoteBuzz={handleRejectRemoteBuzz}
      />
    </main>
  );
}
