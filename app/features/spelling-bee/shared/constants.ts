import { SpellingLevel } from "@/lib/mock/spellingBeeMock";

export const levelOptions: SpellingLevel[] = ["beginner", "intermediate", "advanced"];
export const groupOptions = [2, 4] as const;
export const sessionOptions = [1, 2, 3, 4, 5] as const;
export const timerOptions = [10, 20, 30, 40, 50, 60] as const;

export function createRoomId() {
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `GEUWAT-SB-${random}`;
}

export function createPlayerId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `player-${Math.random().toString(36).slice(2, 10)}`;
}
