import { collection, getDocs } from "firebase/firestore";
import { ensureAnonymousAuth, firestore } from "@/lib/firebase/client";
import { getPlayableWordsByLevel, SpellingLevel, WordPrompt } from "@/lib/mock/spellingBeeMock";

type VocabularyBankDoc = {
  word?: string;
  definition?: string;
  hint?: string | null;
  topic?: string;
  level?: SpellingLevel;
  active?: boolean;
};

function fallbackHint(word: string) {
  return `Starts with '${word.charAt(0)}'`;
}

function asPrompt(id: string, raw: VocabularyBankDoc): WordPrompt | null {
  const word = raw.word?.trim();
  const definition = raw.definition?.trim();
  const topic = raw.topic?.trim();

  if (!word || !definition || !topic) return null;

  return {
    id,
    word,
    definition,
    hint: raw.hint?.trim() || fallbackHint(word),
    topic,
  };
}

export async function fetchDynamicVocabularyByLevel(level: SpellingLevel): Promise<WordPrompt[]> {
  const fallback = getPlayableWordsByLevel(level);
  if (!firestore) return fallback;

  try {
    await ensureAnonymousAuth();
    const snap = await getDocs(collection(firestore, "vocabularyBank"));
    if (snap.empty) return fallback;

    const allowedLevels = level === "advanced" ? new Set<SpellingLevel>(["advanced"]) : new Set<SpellingLevel>(["beginner", "intermediate"]);

    const rows = snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as VocabularyBankDoc) }))
      .filter((item) => {
        if (item.active === false) return false;
        if (!item.level) return false;
        return allowedLevels.has(item.level);
      })
      .map((item) => asPrompt(item.id, item))
      .filter((item): item is WordPrompt => Boolean(item));

    if (!rows.length) return fallback;
    return rows;
  } catch {
    return fallback;
  }
}
