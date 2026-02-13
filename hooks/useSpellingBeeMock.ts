"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildPlayers,
  getPlayableWordsByLevel,
  levelLabels,
  SpellingLevel,
  WordPrompt,
} from "@/lib/mock/spellingBeeMock";

type GamePlayer = {
  id: string;
  name: string;
};

export type GameGroup = {
  id: string;
  name: string;
  score: number;
  players: GamePlayer[];
};

export type SetupState = {
  level: SpellingLevel;
  selectedTopics: string[];
  groupCount: 2 | 4;
  sessionCount: 1 | 2 | 3 | 4 | 5;
  timerSeconds: number;
};

type RoundMode = "turn" | "buzz";

type LogType = "system" | "turn" | "buzz" | "score" | "timer";

export type GameLog = {
  id: string;
  at: string;
  type: LogType;
  message: string;
};

export type VocabularyDecision = "correct" | "wrong" | "skip";

export type VocabularyResult = {
  id: string;
  word: string;
  roundMode: RoundMode;
  session: number;
  decision: VocabularyDecision;
};

const TURN_POINTS = 10;
const BUZZ_POINTS = 15;
const BUZZ_QUESTIONS_PER_SESSION = 1;
const DEFAULT_TIMER_SECONDS = 15;

function makeTimeStamp() {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

function normalizeSeedGroups(groupCount: 2 | 4, seedGroups?: GameGroup[]) {
  if (!seedGroups?.length) return buildPlayers(groupCount);

  const uniquePlayerIds = new Set<string>();

  return Array.from({ length: groupCount }).map((_, idx) => {
    const groupId = `group-${idx + 1}`;
    const seed = seedGroups.find((group) => group.id === groupId);
    const seenInGroup = new Set<string>();

    const players =
      seed?.players.filter((player) => {
        if (!player?.id || !player?.name) return false;
        if (seenInGroup.has(player.id) || uniquePlayerIds.has(player.id)) return false;
        seenInGroup.add(player.id);
        uniquePlayerIds.add(player.id);
        return true;
      }) ?? [];

    return {
      id: groupId,
      name: seed?.name ?? `Group ${idx + 1}`,
      score: typeof seed?.score === "number" ? seed.score : 0,
      players,
    };
  });
}

export function useSpellingBeeMock() {
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [groups, setGroups] = useState<GameGroup[]>([]);
  const [currentSession, setCurrentSession] = useState(1);
  const [roundMode, setRoundMode] = useState<RoundMode>("turn");
  const [turnGroupIndex, setTurnGroupIndex] = useState(0);
  const [turnPlayerIndex, setTurnPlayerIndex] = useState(0);
  const [turnQuestionIndex, setTurnQuestionIndex] = useState(0);
  const [buzzQuestionIndex, setBuzzQuestionIndex] = useState(0);
  const [buzzAttemptIndex, setBuzzAttemptIndex] = useState(0);
  const [sessionWordOffset, setSessionWordOffset] = useState(0);
  const [buzzResponderId, setBuzzResponderId] = useState<string | null>(null);
  const [turnResponderId, setTurnResponderId] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [vocabularyResults, setVocabularyResults] = useState<VocabularyResult[]>([]);
  const [tick, setTick] = useState(0);
  const [questionPool, setQuestionPool] = useState<WordPrompt[]>([]);
  const [revealedPromptWord, setRevealedPromptWord] = useState<string | null>(null);
  const [isRevealingWord, setIsRevealingWord] = useState(false);

  const turnQuestionsPerSession = useMemo(() => groups.length, [groups]);

  const currentWord = useMemo<WordPrompt | null>(() => {
    if (!questionPool.length) return null;

    const pointer =
      sessionWordOffset + (roundMode === "turn" ? turnQuestionIndex : turnQuestionsPerSession + buzzQuestionIndex);
    return questionPool[pointer % questionPool.length] ?? null;
  }, [buzzQuestionIndex, questionPool, roundMode, sessionWordOffset, turnQuestionsPerSession, turnQuestionIndex]);

  const promptWord = useMemo(() => {
    if (!setup || !currentWord) return null;
    if (setup.level === "beginner") return currentWord.word;
    return revealedPromptWord;
  }, [setup, currentWord, revealedPromptWord]);

  function shuffleWords(words: WordPrompt[]) {
    const arr = [...words];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const activeGroup = groups[turnGroupIndex] ?? null;
  const activePlayer =
    (turnResponderId ? activeGroup?.players.find((player) => player.id === turnResponderId) : null) ??
    activeGroup?.players[turnPlayerIndex] ??
    null;

  function appendLog(type: LogType, message: string) {
    setLogs((prev) => [{ id: `${Date.now()}-${Math.random()}`, at: makeTimeStamp(), type, message }, ...prev].slice(0, 80));
  }

  function appendVocabularyResult(decision: VocabularyDecision) {
    if (!currentWord) return;
    setVocabularyResults((prev) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        word: currentWord.word,
        roundMode,
        session: currentSession,
        decision,
      },
      ...prev,
    ]);
  }

  function findPlayerLabel(playerId: string) {
    for (const group of groups) {
      const player = group.players.find((p) => p.id === playerId);
      if (player) {
        return `${player.name} (${group.name})`;
      }
    }
    return playerId;
  }

  function startGame(nextSetup: SetupState, seedGroups?: GameGroup[], customWordBank?: WordPrompt[]) {
    const fullBank = customWordBank?.length ? customWordBank : getPlayableWordsByLevel(nextSetup.level);
    const filteredBank = nextSetup.selectedTopics.length
      ? fullBank.filter((item) => nextSetup.selectedTopics.includes(item.topic))
      : fullBank;

    setSetup(nextSetup);
    setGroups(normalizeSeedGroups(nextSetup.groupCount, seedGroups));
    setQuestionPool(shuffleWords(filteredBank));
    setCurrentSession(1);
    setRoundMode("turn");
    setTurnGroupIndex(0);
    setTurnPlayerIndex(0);
    setTurnQuestionIndex(0);
    setBuzzQuestionIndex(0);
    setBuzzAttemptIndex(0);
    setSessionWordOffset(0);
    setBuzzResponderId(null);
    setTurnResponderId(null);
    setFinished(false);
    setLogs([]);
    setVocabularyResults([]);
    setTick(0);
    setRevealedPromptWord(null);
    setIsRevealingWord(false);

    appendLog("system", `Game started: ${levelLabels[nextSetup.level]}, ${nextSetup.groupCount} groups, ${nextSetup.sessionCount} sessions.`);
  }

  function resetGame() {
    setSetup(null);
    setGroups([]);
    setCurrentSession(1);
    setRoundMode("turn");
    setTurnGroupIndex(0);
    setTurnPlayerIndex(0);
    setTurnQuestionIndex(0);
    setBuzzQuestionIndex(0);
    setBuzzAttemptIndex(0);
    setSessionWordOffset(0);
    setBuzzResponderId(null);
    setTurnResponderId(null);
    setFinished(false);
    setLogs([]);
    setVocabularyResults([]);
    setQuestionPool([]);
    setTick(0);
    setRevealedPromptWord(null);
    setIsRevealingWord(false);
  }

  function updateScoreByPlayer(playerId: string, points: number) {
    setGroups((prev) =>
      prev.map((group) => {
        const exists = group.players.some((player) => player.id === playerId);
        if (!exists) return group;
        return { ...group, score: group.score + points };
      }),
    );
  }

  function moveToNextTurnSlot() {
    setRevealedPromptWord(null);
    setIsRevealingWord(false);
    setTurnQuestionIndex((q) => q + 1);

    const isLastGroup = turnGroupIndex >= groups.length - 1;

    if (!isLastGroup) {
      setTurnGroupIndex((g) => g + 1);
      setTurnResponderId(null);
      return;
    }

    setRoundMode("buzz");
    setBuzzQuestionIndex(0);
    setBuzzAttemptIndex(0);
    setBuzzResponderId(null);
    setTurnResponderId(null);
    appendLog("system", `Session ${currentSession}: turn round complete, entering buzz round.`);
  }

  function resolveTurn(correct: boolean) {
    if (!activePlayer) return;
    if (isRevealingWord) return;

    if (correct) {
      updateScoreByPlayer(activePlayer.id, TURN_POINTS);
      appendLog("score", `${activePlayer.name} answered correctly (+${TURN_POINTS}).`);
      appendVocabularyResult("correct");
      if (setup?.level !== "beginner" && currentWord) {
        setIsRevealingWord(true);
        setRevealedPromptWord(currentWord.word);
        window.setTimeout(() => {
          moveToNextTurnSlot();
        }, 900);
        return;
      }
    } else {
      appendLog("turn", `${activePlayer.name} answered wrong (0).`);
      appendVocabularyResult("wrong");
    }

    moveToNextTurnSlot();
  }

  function buzzAs(playerId: string) {
    if (roundMode !== "buzz" || buzzResponderId) return;
    setBuzzResponderId(playerId);
    appendLog("buzz", `${findPlayerLabel(playerId)} hit buzz first.`);
  }

  function nextSessionOrFinish() {
    if (!setup) return;

    if (currentSession < setup.sessionCount) {
      const nextSession = currentSession + 1;
      const playersPerGroup = groups[0]?.players.length ?? 1;

      setCurrentSession(nextSession);
      setRoundMode("turn");
      setTurnGroupIndex(0);
      setTurnPlayerIndex((idx) => (idx + 1) % playersPerGroup);
      setTurnQuestionIndex(0);
      setBuzzQuestionIndex(0);
      setBuzzAttemptIndex(0);
      setSessionWordOffset((offset) => offset + turnQuestionsPerSession + BUZZ_QUESTIONS_PER_SESSION);
      setBuzzResponderId(null);
      setTurnResponderId(null);
      setRevealedPromptWord(null);
      setIsRevealingWord(false);
      appendLog("system", `Session ${currentSession} complete. Moving to session ${nextSession}.`);
      return;
    }

    setFinished(true);
    setRevealedPromptWord(null);
    setIsRevealingWord(false);
    appendLog("system", "All sessions complete. Final leaderboard locked.");
  }

  function resolveBuzz(correct: boolean) {
    if (!buzzResponderId) return;
    if (isRevealingWord) return;

    if (correct) {
      updateScoreByPlayer(buzzResponderId, BUZZ_POINTS);
      appendLog("score", `${findPlayerLabel(buzzResponderId)} answered buzz correctly (+${BUZZ_POINTS}).`);
      appendVocabularyResult("correct");
      if (setup?.level !== "beginner" && currentWord) {
        setIsRevealingWord(true);
        setRevealedPromptWord(currentWord.word);
        window.setTimeout(() => {
          const isLastBuzzQuestion = buzzQuestionIndex >= BUZZ_QUESTIONS_PER_SESSION - 1;
          if (isLastBuzzQuestion) {
            nextSessionOrFinish();
            return;
          }

          setBuzzQuestionIndex((q) => q + 1);
          setBuzzAttemptIndex(0);
          setBuzzResponderId(null);
          setRevealedPromptWord(null);
          setIsRevealingWord(false);
        }, 900);
        return;
      }

      const isLastBuzzQuestion = buzzQuestionIndex >= BUZZ_QUESTIONS_PER_SESSION - 1;
      if (isLastBuzzQuestion) {
        nextSessionOrFinish();
        return;
      }

      setBuzzQuestionIndex((q) => q + 1);
      setBuzzAttemptIndex(0);
      setBuzzResponderId(null);
      return;
    }

    appendLog("buzz", `${findPlayerLabel(buzzResponderId)} answered buzz wrong. Rebuzz open.`);
    appendVocabularyResult("wrong");
    setRevealedPromptWord(null);
    setBuzzResponderId(null);
    setBuzzAttemptIndex((a) => a + 1);
  }

  function skipCurrentWord() {
    if (isRevealingWord) return;

    if (roundMode === "turn") {
      appendLog("turn", "Turn word skipped by host.");
      appendVocabularyResult("skip");
      setTurnResponderId(null);
      setRevealedPromptWord(null);
      moveToNextTurnSlot();
      return;
    }

    if (roundMode === "buzz") {
      appendLog("buzz", "Buzz question skipped by host.");
      appendVocabularyResult("skip");
      const isLastBuzzQuestion = buzzQuestionIndex >= BUZZ_QUESTIONS_PER_SESSION - 1;
      if (isLastBuzzQuestion) {
        nextSessionOrFinish();
      } else {
        setBuzzQuestionIndex((q) => q + 1);
        setBuzzAttemptIndex(0);
      }
      setRevealedPromptWord(null);
      setBuzzResponderId(null);
    }
  }

  function setTurnResponder(playerId: string) {
    if (roundMode !== "turn" || !activeGroup) return;
    const player = activeGroup.players.find((item) => item.id === playerId);
    if (!player) return;

    setTurnResponderId(playerId);
    appendLog("turn", `${player.name} (${activeGroup.name}) got first bell for turn.`);
  }

  const timerEnabled = Boolean(setup && setup.timerSeconds > 0);
  const timerSeed = `${setup?.timerSeconds ?? 0}:${currentSession}:${roundMode}:${turnQuestionIndex}:${buzzQuestionIndex}:${buzzAttemptIndex}:${buzzResponderId ?? "none"}:${finished}`;

  useEffect(() => {
    if (!timerEnabled || finished) return;
    setTick(0);
  }, [timerSeed, timerEnabled, finished]);

  useEffect(() => {
    if (!timerEnabled || finished) return;

    const id = window.setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(id);
  }, [timerSeed, timerEnabled, finished]);

  useEffect(() => {
    if (!timerEnabled || finished || !setup) return;
    if (isRevealingWord) return;
    if (tick < setup.timerSeconds) return;

    if (roundMode === "turn") {
      appendLog("timer", `Time up for ${activePlayer?.name ?? "active player"}.`);
      resolveTurn(false);
      return;
    }

    if (roundMode === "buzz" && buzzResponderId) {
      appendLog("timer", `Time up for ${findPlayerLabel(buzzResponderId)}. Rebuzz open.`);
      setBuzzResponderId(null);
      return;
    }

    if (roundMode === "buzz" && !buzzResponderId) {
      appendLog("timer", "No buzz received in time. Question skipped.");
      const isLastBuzzQuestion = buzzQuestionIndex >= BUZZ_QUESTIONS_PER_SESSION - 1;
      if (isLastBuzzQuestion) {
        nextSessionOrFinish();
      } else {
        setBuzzQuestionIndex((q) => q + 1);
      }
    }
  }, [timerEnabled, finished, setup, tick, roundMode, activePlayer, buzzResponderId, buzzQuestionIndex, isRevealingWord]);

  const leaderboard = useMemo(() => [...groups].sort((a, b) => b.score - a.score), [groups]);
  const remainingTime = timerEnabled && setup ? Math.max(setup.timerSeconds - tick, 0) : 0;

  const stateText = useMemo(() => {
    if (!setup) return "Setup mode";
    if (finished) return "Game finished";

    const levelLabel = levelLabels[setup.level];
    return `Session ${currentSession}/${setup.sessionCount} - ${roundMode.toUpperCase()} - ${levelLabel}`;
  }, [currentSession, finished, roundMode, setup]);

  return {
    setup,
    groups,
    currentSession,
    roundMode,
    turnQuestionIndex,
    activeGroup,
    activePlayer,
    currentWord,
    promptWord,
    buzzResponderId,
    turnResponderId,
    finished,
    leaderboard,
    stateText,
    buzzQuestionsPerSession: BUZZ_QUESTIONS_PER_SESSION,
    buzzQuestionIndex,
    buzzAttemptIndex,
    remainingTime,
    isRevealingWord,
    timerEnabled,
    timerSeconds: setup?.timerSeconds ?? DEFAULT_TIMER_SECONDS,
    logs,
    vocabularyResults,
    startGame,
    resetGame,
    resolveTurn,
    setTurnResponder,
    buzzAs,
    resolveBuzz,
    skipCurrentWord,
  };
}
