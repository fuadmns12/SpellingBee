import { SpellingLevel } from "@/lib/mock/spellingBeeMock";

export type TimerSeconds = 0 | 10 | 20 | 30 | 40 | 50 | 60;

export type SetupPayload = {
  level: SpellingLevel;
  selectedTopics: string[];
  groupCount: 2 | 4;
  sessionCount: 1 | 2 | 3 | 4 | 5;
  timerSeconds: TimerSeconds;
};
