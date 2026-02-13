import { useState } from "react";
import { groupOptions, levelOptions, sessionOptions, timerOptions } from "@/app/features/spelling-bee/shared/constants";
import { TimerSeconds } from "@/app/features/spelling-bee/shared/types";
import { levelLabels, SpellingLevel } from "@/lib/mock/spellingBeeMock";

type Props = {
  level: SpellingLevel | "";
  availableTopics: string[];
  selectedTopics: string[];
  groupCount: (typeof groupOptions)[number] | 0;
  sessionCount: (typeof sessionOptions)[number] | 0;
  timerSeconds: TimerSeconds;
  roomId: string;
  canCreateServer: boolean;
  setupSummary: string;
  onLevelChange: (value: SpellingLevel) => void;
  onToggleTopic: (topic: string) => void;
  onSelectAllTopics: () => void;
  onClearAllTopics: () => void;
  onGroupCountChange: (value: (typeof groupOptions)[number]) => void;
  onSessionCountChange: (value: (typeof sessionOptions)[number]) => void;
  onTimerChange: (value: TimerSeconds) => void;
  onCreateServer: () => void;
};

export default function SetupPanel({
  level,
  availableTopics,
  selectedTopics,
  groupCount,
  sessionCount,
  timerSeconds,
  roomId,
  canCreateServer,
  setupSummary,
  onLevelChange,
  onToggleTopic,
  onSelectAllTopics,
  onClearAllTopics,
  onGroupCountChange,
  onSessionCountChange,
  onTimerChange,
  onCreateServer,
}: Props) {
  const [showTutorial, setShowTutorial] = useState(false);
  const isTimerOn = timerSeconds > 0;
  const hasLevel = Boolean(level);
  const allTopicsSelected = availableTopics.length > 0 && selectedTopics.length === availableTopics.length;

  function formatTopicLabel(topic: string) {
    return topic
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  return (
    <section className="rounded-2xl border border-purple-400/30 bg-slate-900/70 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-white">Match Setup</h2>
        <button
          type="button"
          onClick={() => setShowTutorial(true)}
          className="rounded-lg border border-amber-300/60 bg-amber-500/15 px-3 py-1.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/25"
        >
          Tutorial
        </button>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <label className="flex flex-col gap-2">
          <span className="text-base text-slate-300">Level / Category</span>
          <select
            value={level}
            disabled={Boolean(roomId)}
            onChange={(e) => onLevelChange(e.target.value as SpellingLevel)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
          >
            <option value="">Select level</option>
            {levelOptions.map((opt) => (
              <option key={opt} value={opt}>
                {levelLabels[opt]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-base text-slate-300">Group Count</span>
          <select
            value={groupCount || ""}
            disabled={Boolean(roomId)}
            onChange={(e) => onGroupCountChange(Number(e.target.value) as (typeof groupOptions)[number])}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
          >
            <option value="">Select groups</option>
            {groupOptions.map((count) => (
              <option key={count} value={count}>
                {count} groups
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-base text-slate-300">Session Count</span>
          <select
            value={sessionCount || ""}
            disabled={Boolean(roomId)}
            onChange={(e) => onSessionCountChange(Number(e.target.value) as (typeof sessionOptions)[number])}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
          >
            <option value="">Select sessions</option>
            {sessionOptions.map((count) => (
              <option key={count} value={count}>
                {count} session{count > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-base text-slate-300">Timer</span>
          <select
            value={isTimerOn ? "on" : "off"}
            disabled={Boolean(roomId)}
            onChange={(e) => onTimerChange(e.target.value === "on" ? 10 : 0)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
          >
            <option value="off">Off</option>
            <option value="on">On</option>
          </select>
        </label>

        {isTimerOn ? (
          <label className="flex flex-col gap-2">
            <span className="text-sm text-slate-300">Time (seconds)</span>
            <select
              value={timerSeconds}
              disabled={Boolean(roomId)}
              onChange={(e) => onTimerChange(Number(e.target.value) as TimerSeconds)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
            >
              {timerOptions.map((seconds) => (
                <option key={seconds} value={seconds}>
                  {seconds} seconds
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {hasLevel ? (
        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-200">Vocabulary Topics</p>
            <button
              type="button"
              onClick={allTopicsSelected ? onClearAllTopics : onSelectAllTopics}
              disabled={Boolean(roomId) || !availableTopics.length}
              className="rounded-md border border-cyan-400/60 bg-cyan-500/15 px-2.5 py-1 text-xs font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
            >
              {allTopicsSelected ? "Clear All" : "Select All"}
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {availableTopics.map((topic) => {
              const checked = selectedTopics.includes(topic);
              return (
                <label key={topic} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${checked ? "border-cyan-300/60 bg-cyan-500/15 text-cyan-100" : "border-slate-700 bg-slate-900/70 text-slate-300"}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={Boolean(roomId)}
                    onChange={() => onToggleTopic(topic)}
                    className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-400"
                  />
                  <span>{formatTopicLabel(topic)}</span>
                </label>
              );
            })}
          </div>
          {!selectedTopics.length ? (
            <p className="mt-2 text-xs text-rose-300">Select at least 1 topic.</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!canCreateServer}
          onClick={onCreateServer}
          className="rounded-lg border border-cyan-300/60 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 transition enabled:hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
        >
          Create Room
        </button>
        <span className="text-sm text-slate-300">{setupSummary}</span>
      </div>

      {showTutorial ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowTutorial(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Tutorial penggunaan aplikasi"
          >
            <h3 className="text-xl font-bold text-white">Tutorial Penggunaan Aplikasi</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-200">
              <p className="text-base font-semibold text-cyan-200">Aturan Permainan</p>
              <p>1. Setiap soal memiliki satu jawaban kata (vocabulary) yang dinilai oleh host/juri.</p>
              <p>2. Tombol bell hanya valid jika status bell sedang OPEN pada ronde aktif.</p>
              <p>3. Mode Turn: hanya grup yang sedang mendapat giliran yang boleh menekan bell.</p>
              <p>4. Mode Buzz: semua player yang memenuhi syarat boleh menekan bell, sistem memilih yang tercepat.</p>
              <p>5. Jika jawaban dinilai <span className="font-semibold text-emerald-200">Correct</span>, skor grup bertambah.</p>
              <p>6. Jika jawaban dinilai <span className="font-semibold text-rose-200">Wrong</span> pada mode buzz, kesempatan bell dibuka lagi untuk percobaan berikutnya.</p>
              <p>7. Jika host memilih <span className="font-semibold text-slate-100">Skip</span>, soal dilewati dan game lanjut ke soal berikutnya.</p>
              <p>8. Pemenang ditentukan dari total skor tertinggi di akhir sesi.</p>

              <p className="pt-2 text-base font-semibold text-cyan-200">Langkah Penggunaan</p>
              <p>1. Pilih level, jumlah grup, jumlah sesi, dan timer sesuai kebutuhan.</p>
              <p>2. Centang topik vocabulary yang ingin dipakai sebagai bank soal.</p>
              <p>3. Klik <span className="font-semibold text-cyan-200">Create Room</span> untuk membuat room pertandingan.</p>
              <p>4. Bagikan link room ke player, lalu atur grup setiap player di panel peserta.</p>
              <p>5. Klik <span className="font-semibold text-emerald-200">Start Game</span> saat semua grup sudah siap.</p>
              <p>6. Saat permainan berjalan, host memberi keputusan <span className="font-semibold text-emerald-200">Correct</span>, <span className="font-semibold text-rose-200">Wrong</span>, atau <span className="font-semibold text-slate-200">Skip</span>.</p>
              <p>7. Klik <span className="font-semibold text-rose-200">End Game</span> untuk mengakhiri game dan memulai kembali permainan.</p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTutorial(false)}
                className="rounded-lg border border-slate-500 bg-slate-700/40 px-4 py-2 text-sm font-semibold text-slate-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
