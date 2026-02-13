import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  where,
} from "firebase/firestore";
import { firestore, ensureAnonymousAuth } from "@/lib/firebase/client";

const ROOM_IDLE_TTL_MINUTES = 120;

function buildRoomExpiry(ttlMinutes = ROOM_IDLE_TTL_MINUTES) {
  return Timestamp.fromDate(new Date(Date.now() + ttlMinutes * 60 * 1000));
}

type RoomPayload = {
  hostUid?: string;
  level: string;
  selectedTopics?: string[];
  groupCount: number;
  sessionCount: number;
  status: "waiting" | "playing" | "finished";
  currentSession: number;
  roundMode: "turn" | "buzz";
  currentRoundKey: string;
  buzzOpen: boolean;
  timerSeconds: number;
  promptWord?: string | null;
  promptDefinition?: string | null;
  promptHint?: string | null;
  turnGroupId?: string | null;
  turnGroupName?: string | null;
  turnPlayerName?: string | null;
  leaderboard?: LeaderboardEntry[];
};

export type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
};

export type RoomSnapshot = {
  hostUid?: string;
  level?: string;
  selectedTopics?: string[];
  groupCount?: number;
  status?: "waiting" | "playing" | "finished";
  currentSession?: number;
  roundMode?: "turn" | "buzz";
  currentRoundKey?: string;
  buzzOpen?: boolean;
  timerSeconds?: number;
  promptWord?: string | null;
  promptDefinition?: string | null;
  promptHint?: string | null;
  turnGroupId?: string | null;
  turnGroupName?: string | null;
  turnPlayerName?: string | null;
  leaderboard?: LeaderboardEntry[];
};

export type BuzzEventPayload = {
  roomId: string;
  roundKey: string;
  playerId: string;
  playerName: string;
  groupId?: string | null;
};

export type PlayerSnapshot = {
  playerId: string;
  name: string;
  active?: boolean;
  groupId?: string | null;
  status?: "pending" | "approved";
};

export type VocabularyResultSnapshot = {
  id: string;
  word: string;
  roundMode: "turn" | "buzz";
  session: number;
  decision: "correct" | "wrong" | "skip";
  createdAtMs: number;
};

export async function upsertRoom(roomId: string, payload: RoomPayload) {
  if (!firestore) return;
  const uid = await ensureAnonymousAuth();
  if (!uid) return;

  const roomRef = doc(firestore, "rooms", roomId);
  await setDoc(
    roomRef,
    {
      roomId,
      hostUid: uid,
      ...payload,
      expiresAt: buildRoomExpiry(),
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function patchRoomState(
  roomId: string,
  partial: Partial<RoomPayload> & {
    buzzLockedBy?: string | null;
    firstBuzzPlayerName?: string | null;
    firstBuzzGroupId?: string | null;
  },
) {
  if (!firestore) return;
  const uid = await ensureAnonymousAuth();
  if (!uid) return;
  const roomRef = doc(firestore, "rooms", roomId);
  await setDoc(
    roomRef,
    {
      ...partial,
      expiresAt: buildRoomExpiry(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function registerPlayer(roomId: string, playerName: string, playerId: string) {
  if (!firestore) return;
  const uid = await ensureAnonymousAuth();
  if (!uid) return;

  const playerRef = doc(firestore, "rooms", roomId, "players", playerId);
  await setDoc(
    playerRef,
    {
      playerId,
      name: playerName,
      joinedAt: serverTimestamp(),
      active: true,
      groupId: null,
      status: "pending",
    },
    { merge: true },
  );
}

export function subscribePlayers(roomId: string, onData: (players: PlayerSnapshot[]) => void) {
  if (!firestore) {
    onData([]);
    return () => {};
  }

  const playersRef = collection(firestore, "rooms", roomId, "players");
  return onSnapshot(playersRef, (snap) => {
    const players = snap.docs.map((d) => d.data() as PlayerSnapshot);
    onData(players);
  });
}

export async function assignPlayerGroup(roomId: string, playerId: string, groupId: string | null) {
  if (!firestore) return;
  const uid = await ensureAnonymousAuth();
  if (!uid) return;

  const playerRef = doc(firestore, "rooms", roomId, "players", playerId);
  await setDoc(
    playerRef,
    {
      groupId,
      status: groupId ? "approved" : "pending",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function subscribePlayer(
  roomId: string,
  playerId: string,
  onData: (player: PlayerSnapshot | null) => void,
) {
  if (!firestore) {
    onData(null);
    return () => {};
  }

  const playerRef = doc(firestore, "rooms", roomId, "players", playerId);
  return onSnapshot(playerRef, (snap) => {
    onData(snap.exists() ? (snap.data() as PlayerSnapshot) : null);
  });
}

export async function submitBuzzEvent(payload: BuzzEventPayload) {
  if (!firestore) return;
  const uid = await ensureAnonymousAuth();
  if (!uid) return;

  const roomRef = doc(firestore, "rooms", payload.roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) return;

  const roomData = roomSnap.data() as RoomSnapshot;
  if (!roomData.buzzOpen || roomData.currentRoundKey !== payload.roundKey) {
    return;
  }

  let groupId = payload.groupId ?? null;
  if (!groupId) {
    const playerRef = doc(firestore, "rooms", payload.roomId, "players", payload.playerId);
    const playerSnap = await getDoc(playerRef);
    if (playerSnap.exists()) {
      const playerData = playerSnap.data() as PlayerSnapshot;
      groupId = playerData.groupId ?? null;
    }
  }

  if (roomData.roundMode === "turn" && roomData.turnGroupId && groupId !== roomData.turnGroupId) {
    return;
  }

  const buzzRef = collection(firestore, "rooms", payload.roomId, "buzzEvents");
  await addDoc(buzzRef, {
    ...payload,
    groupId,
    pressedAtMs: Date.now(),
    createdAt: serverTimestamp(),
  });
}

export function subscribeRoom(roomId: string, onData: (data: RoomSnapshot | null) => void) {
  if (!firestore) {
    onData(null);
    return () => {};
  }

  const roomRef = doc(firestore, "rooms", roomId);
  return onSnapshot(roomRef, (snap) => {
    onData(snap.exists() ? (snap.data() as RoomSnapshot) : null);
  });
}

export function subscribeFirstBuzz(
  roomId: string,
  roundKey: string,
  onWinner: (winner: { playerId: string; playerName: string; groupId?: string | null } | null) => void,
) {
  if (!firestore) {
    onWinner(null);
    return () => {};
  }

  const buzzRef = collection(firestore, "rooms", roomId, "buzzEvents");

  function pickWinnerFromSnapshot(
    snap: { empty: boolean; docs: Array<{ data: () => { playerId: string; playerName: string; groupId?: string | null; pressedAtMs?: number } }> },
  ) {
    if (snap.empty) {
      onWinner(null);
      return;
    }

    const ordered = snap.docs
      .map((d) => d.data())
      .sort((a, b) => (a.pressedAtMs ?? Number.MAX_SAFE_INTEGER) - (b.pressedAtMs ?? Number.MAX_SAFE_INTEGER));
    const first = ordered[0];
    if (!first) {
      onWinner(null);
      return;
    }

    onWinner({ playerId: first.playerId, playerName: first.playerName, groupId: first.groupId ?? null });
  }

  const indexedQuery = query(
    buzzRef,
    where("roundKey", "==", roundKey),
    orderBy("pressedAtMs", "asc"),
    limit(1),
  );

  let unsubscribeFallback: (() => void) | null = null;
  const unsubscribePrimary = onSnapshot(
    indexedQuery,
    (snap) => {
      pickWinnerFromSnapshot(snap as any);
    },
    (error) => {
      if (error.code !== "failed-precondition") {
        onWinner(null);
        return;
      }

      const fallbackQuery = query(buzzRef, where("roundKey", "==", roundKey));
      unsubscribeFallback = onSnapshot(
        fallbackQuery,
        (snap) => {
          pickWinnerFromSnapshot(snap as any);
        },
        () => onWinner(null),
      );
    },
  );

  return () => {
    unsubscribePrimary();
    if (unsubscribeFallback) unsubscribeFallback();
  };
}

export async function markBuzzLock(roomId: string, playerId: string | null, playerName: string | null) {
  if (!firestore) return;
  const uid = await ensureAnonymousAuth();
  if (!uid) return;

  const roomRef = doc(firestore, "rooms", roomId);
  await updateDoc(roomRef, {
    buzzLockedBy: playerId,
    firstBuzzPlayerName: playerName,
    updatedAt: serverTimestamp(),
  });
}

export async function finishRoom(roomId: string, ttlMinutes = 120, leaderboard?: LeaderboardEntry[]) {
  if (!firestore) return;
  const uid = await ensureAnonymousAuth();
  if (!uid) return;

  const expiresAt = buildRoomExpiry(ttlMinutes);
  const roomRef = doc(firestore, "rooms", roomId);

  await setDoc(
    roomRef,
    {
      status: "finished",
      buzzOpen: false,
      timerSeconds: 0,
      buzzLockedBy: null,
      firstBuzzPlayerName: null,
      leaderboard: leaderboard ?? [],
      finishedAt: serverTimestamp(),
      expiresAt,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function deleteRoomImmediately(roomId: string) {
  if (!firestore) return;
  const uid = await ensureAnonymousAuth();
  if (!uid) return;

  const roomRef = doc(firestore, "rooms", roomId);
  const subcollections = ["players", "buzzEvents", "vocabularyResults"];

  for (const sub of subcollections) {
    const snap = await getDocs(collection(firestore, "rooms", roomId, sub));
    if (snap.empty) continue;

    // Batch delete in chunks to avoid write limits.
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(firestore);
      docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }

  await deleteDoc(roomRef);
}

export async function upsertVocabularyResult(roomId: string, payload: VocabularyResultSnapshot) {
  if (!firestore) return;
  const uid = await ensureAnonymousAuth();
  if (!uid) return;

  const ref = doc(firestore, "rooms", roomId, "vocabularyResults", payload.id);
  await setDoc(
    ref,
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function subscribeVocabularyResults(
  roomId: string,
  onData: (results: VocabularyResultSnapshot[]) => void,
) {
  if (!firestore) {
    onData([]);
    return () => {};
  }

  const ref = collection(firestore, "rooms", roomId, "vocabularyResults");
  return onSnapshot(ref, (snap) => {
    const results = snap.docs
      .map((d) => d.data() as VocabularyResultSnapshot)
      .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
    onData(results);
  });
}
