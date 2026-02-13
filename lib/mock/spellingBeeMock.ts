import {
  AdvancedBusinessStrategyWordDefinitions,
  AdvancedFinanceWordDefinitions,
  AdvancedLegalWordDefinitions,
  AdvancedManagementWordDefinitions,
  AdvancedOperationsWordDefinitions,
  BeginnerDailyRoutineWordDefinitions,
  BeginnerFoodWordDefinitions,
  BeginnerHealthWordDefinitions,
  BeginnerHomeWordDefinitions,
  BeginnerNatureWordDefinitions,
  BeginnerSchoolWordDefinitions,
  BeginnerTransportWordDefinitions,
  IntermediateCareerWordDefinitions,
  IntermediateCommunicationWordDefinitions,
  IntermediateEducationWordDefinitions,
  IntermediateLifestyleWordDefinitions,
  IntermediateNatureWordDefinitions,
  IntermediatePlanningWordDefinitions,
  IntermediateTechnologyWordDefinitions,
} from "@/lib/mock/vocabulary/topic-data";
import type { WordPrompt } from "@/lib/mock/vocabulary/types";

export type SpellingLevel = "beginner" | "intermediate" | "advanced";
export type { WordPrompt };

type WordBank = Record<SpellingLevel, WordPrompt[]>;

export const levelLabels: Record<SpellingLevel, string> = {
  beginner: "Beginner (Daily Activity)",
  intermediate: "Intermediate (Daily Activity)",
  advanced: "Advanced (English for Business)",
};

type TopicWordDefinition = {
  word: string;
  definition: string;
};

function toPrompts(level: SpellingLevel, topic: string, rows: TopicWordDefinition[]): WordPrompt[] {
  const topicCode = topic.replace(/[^a-z]/gi, "").slice(0, 4).toLowerCase();
  const prefix = level.charAt(0);

  return rows.map((item, index) => ({
    id: `${prefix}-${topicCode}-${String(index + 1).padStart(2, "0")}`,
    word: item.word,
    definition: item.definition,
    hint: `Starts with '${item.word.charAt(0)}'`,
    topic,
  }));
}

const beginnerWords: WordPrompt[] = [
  ...toPrompts("beginner", "home", BeginnerHomeWordDefinitions),
  ...toPrompts("beginner", "daily-routine", BeginnerDailyRoutineWordDefinitions),
  ...toPrompts("beginner", "transport", BeginnerTransportWordDefinitions),
  ...toPrompts("beginner", "food", BeginnerFoodWordDefinitions),
  ...toPrompts("beginner", "nature", BeginnerNatureWordDefinitions),
  ...toPrompts("beginner", "school", BeginnerSchoolWordDefinitions),
  ...toPrompts("beginner", "health", BeginnerHealthWordDefinitions),
];

const intermediateWords: WordPrompt[] = [
  ...toPrompts("intermediate", "planning", IntermediatePlanningWordDefinitions),
  ...toPrompts("intermediate", "lifestyle", IntermediateLifestyleWordDefinitions),
  ...toPrompts("intermediate", "communication", IntermediateCommunicationWordDefinitions),
  ...toPrompts("intermediate", "career", IntermediateCareerWordDefinitions),
  ...toPrompts("intermediate", "nature", IntermediateNatureWordDefinitions),
  ...toPrompts("intermediate", "technology", IntermediateTechnologyWordDefinitions),
  ...toPrompts("intermediate", "education", IntermediateEducationWordDefinitions),
];

const advancedWords: WordPrompt[] = [
  ...toPrompts("advanced", "business-strategy", AdvancedBusinessStrategyWordDefinitions),
  ...toPrompts("advanced", "management", AdvancedManagementWordDefinitions),
  ...toPrompts("advanced", "finance", AdvancedFinanceWordDefinitions),
  ...toPrompts("advanced", "legal", AdvancedLegalWordDefinitions),
  ...toPrompts("advanced", "operations", AdvancedOperationsWordDefinitions),
];

export const wordBank: WordBank = {
  beginner: beginnerWords,
  intermediate: intermediateWords,
  advanced: advancedWords,
};

export function getPlayableWordsByLevel(level: SpellingLevel): WordPrompt[] {
  if (level === "advanced") {
    return wordBank.advanced;
  }
  // Beginner and intermediate share the same topic pool; gameplay differs by level.
  return [...wordBank.beginner, ...wordBank.intermediate];
}

export function getTopicsByLevel(level: SpellingLevel): string[] {
  return [...new Set(getPlayableWordsByLevel(level).map((item) => item.topic))];
}

export function buildPlayers(groupCount: 2 | 4) {
  return Array.from({ length: groupCount }).map((_, idx) => ({
    id: `group-${idx + 1}`,
    name: `Group ${idx + 1}`,
    score: 0,
    players: [
      { id: `g${idx + 1}-p1`, name: `Player ${idx + 1}A` },
      { id: `g${idx + 1}-p2`, name: `Player ${idx + 1}B` },
      { id: `g${idx + 1}-p3`, name: `Player ${idx + 1}C` },
    ],
  }));
}
