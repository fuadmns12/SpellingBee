type RemoteWinner = {
  playerId: string;
  playerName: string;
  groupId?: string | null;
} | null;

type Props = {
  game: any;
  isBuzzRoundActive: boolean;
  isBuzzOpen: boolean;
  remoteWinner: RemoteWinner;
  onAcceptRemoteBuzz: () => void;
  onRejectRemoteBuzz: () => void;
};

export default function SimulationPanel({
  game,
  isBuzzRoundActive,
  isBuzzOpen,
  remoteWinner,
  onAcceptRemoteBuzz,
  onRejectRemoteBuzz,
}: Props) {
  return (
    <section className="rounded-2xl border border-cyan-400/30 bg-slate-900/70 p-6">
      <h2 className="text-xl font-semibold text-white">Game Control (Host / Judge)</h2>
      <p className="mt-2 text-base text-cyan-200">{game.stateText}</p>

      {game.setup ? (
        <div className="mt-4 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Current Prompt</p>
              <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
                {game.timerEnabled ? `Timer: ${game.remainingTime}s` : "Timer Off"}
              </div>
            </div>

            <h3 className="mt-2">
              <span className="inline-flex rounded-xl border border-amber-300/80 bg-amber-400/20 px-4 py-2 text-2xl font-extrabold tracking-wide text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.35)]">
                {game.currentWord?.word ?? "-"}
              </span>
            </h3>
            <p className="mt-1 text-sm text-slate-300">Definition: {game.currentWord?.definition ?? "-"}</p>
            {game.setup?.level !== "beginner" ? (
              <p className="mt-1 text-sm text-slate-300">Hint: {game.currentWord?.hint ?? "-"}</p>
            ) : null}

            {game.roundMode === "turn" && !game.finished ? (
              <div className="mt-5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Turn Round</p>
                <p className="mt-2 text-lg font-bold text-emerald-100">
                  Turn: {game.activeGroup?.name ?? "-"}
                </p>
                <p className="mt-1 text-sm text-slate-200">
                  Player: <span className="font-semibold">{game.activePlayer?.name ?? "-"}</span>
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Remote first bell:{" "}
                  <span className="font-semibold text-cyan-200">
                    {remoteWinner
                      ? `${remoteWinner.playerName}${remoteWinner.groupId ? ` (${remoteWinner.groupId.replace("group-", "Group ")})` : ""}`
                      : "none"}
                  </span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => game.resolveTurn(true)} disabled={game.isRevealingWord} className="rounded-lg border border-emerald-400/60 bg-emerald-500/20 px-3 py-2 text-sm text-emerald-100 disabled:opacity-40">
                    Correct (+10)
                  </button>
                  <button type="button" onClick={() => game.resolveTurn(false)} disabled={game.isRevealingWord} className="rounded-lg border border-rose-400/60 bg-rose-500/20 px-3 py-2 text-sm text-rose-100 disabled:opacity-40">
                    Wrong (0)
                  </button>
                  <button type="button" onClick={onAcceptRemoteBuzz} disabled={!remoteWinner || game.isRevealingWord} className="rounded-lg border border-cyan-400/60 bg-cyan-500/20 px-3 py-2 text-sm text-cyan-100 disabled:opacity-40">
                    Accept Turn Bell
                  </button>
                  <button type="button" onClick={onRejectRemoteBuzz} disabled={!remoteWinner || game.isRevealingWord} className="rounded-lg border border-slate-500 bg-slate-700/30 px-3 py-2 text-sm text-slate-100 disabled:opacity-40">
                    Reject Turn Bell
                  </button>
                  <button type="button" onClick={game.skipCurrentWord} disabled={game.isRevealingWord} className="rounded-lg border border-slate-500 bg-slate-700/30 px-3 py-2 text-sm text-slate-100 disabled:opacity-40">
                    Skip Word
                  </button>
                </div>
              </div>
            ) : null}

            {isBuzzRoundActive ? (
              <div className="mt-5 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-200">Buzz Round</p>
                  <div className="flex items-center gap-2 rounded-full border border-slate-600 px-3 py-1 text-xs">
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${isBuzzOpen ? "animate-pulse bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.9)]" : "bg-rose-400 shadow-[0_0_10px_rgba(248,113,113,0.8)]"}`} />
                    <span className={isBuzzOpen ? "text-emerald-200" : "text-rose-200"}>BELL {isBuzzOpen ? "OPEN" : "LOCKED"}</span>
                  </div>
                </div>

                <p className="mt-2 text-sm text-slate-200">Question {game.buzzQuestionIndex + 1}/{game.buzzQuestionsPerSession}</p>
                <p className="mt-1 text-sm text-slate-300">
                  Local responder: <span className="font-semibold text-white">{game.buzzResponderId ?? "none"}</span>
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Remote first buzz:{" "}
                  <span className="font-semibold text-cyan-200">
                    {remoteWinner
                      ? `${remoteWinner.playerName}${remoteWinner.groupId ? ` (${remoteWinner.groupId.replace("group-", "Group ")})` : ""}`
                      : "none"}
                  </span>
                </p>

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {game.groups.flatMap((group: any) =>
                    group.players.map((player: any) => {
                      const isWinner = game.buzzResponderId === player.id;
                      const baseBell = isWinner ? "bg-amber-400 text-black" : isBuzzOpen ? "bg-emerald-400 text-black" : "bg-slate-600 text-slate-200";

                      return (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => game.buzzAs(player.id)}
                          disabled={Boolean(game.buzzResponderId || remoteWinner || game.isRevealingWord)}
                          className={`rounded-lg border px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-60 ${isWinner ? "border-amber-300/80 bg-amber-500/20 text-amber-100" : "border-cyan-400/50 bg-cyan-500/10 text-cyan-100"}`}
                        >
                          <span className="flex items-center gap-2">
                            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${baseBell}`}>BELL</span>
                            <span>
                              Buzz: {player.name} ({group.name})
                            </span>
                          </span>
                        </button>
                      );
                    }),
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => game.resolveBuzz(true)} disabled={!game.buzzResponderId || game.isRevealingWord} className="rounded-lg border border-emerald-400/60 bg-emerald-500/20 px-3 py-2 text-sm text-emerald-100 disabled:opacity-40">
                    Correct (+15)
                  </button>
                  <button type="button" onClick={() => game.resolveBuzz(false)} disabled={!game.buzzResponderId || game.isRevealingWord} className="rounded-lg border border-rose-400/60 bg-rose-500/20 px-3 py-2 text-sm text-rose-100 disabled:opacity-40">
                    Wrong (Rebuzz)
                  </button>
                  <button type="button" onClick={game.skipCurrentWord} disabled={game.isRevealingWord} className="rounded-lg border border-slate-500 bg-slate-700/30 px-3 py-2 text-sm text-slate-100 disabled:opacity-40">
                    Skip Question
                  </button>
                  <button type="button" onClick={onAcceptRemoteBuzz} disabled={!remoteWinner || game.isRevealingWord} className="rounded-lg border border-cyan-400/60 bg-cyan-500/20 px-3 py-2 text-sm text-cyan-100 disabled:opacity-40">
                    Accept Remote Buzz
                  </button>
                  <button type="button" onClick={onRejectRemoteBuzz} disabled={!remoteWinner || game.isRevealingWord} className="rounded-lg border border-slate-500 bg-slate-700/30 px-3 py-2 text-sm text-slate-100 disabled:opacity-40">
                    Reject Remote Buzz
                  </button>
                </div>
              </div>
            ) : null}

            {game.finished ? (
              <div className="mt-5 rounded-lg border border-amber-400/30 bg-amber-500/10 p-3">
                <p className="text-sm font-semibold text-amber-200">All sessions finished. Final leaderboard ready.</p>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Live Scoreboard</p>
              <div className="mt-3 space-y-3">
                {game.leaderboard.map((group: any, idx: number) => (
                  <div key={group.id} className="rounded-lg border border-slate-700 bg-slate-900/80 p-3">
                    <p className="text-xs text-slate-400">Rank #{idx + 1}</p>
                    <p className="text-base font-semibold text-white">{group.name}</p>
                    <p className="text-sm text-cyan-200">{group.score} pts</p>
                    <p className="mt-1 text-xs text-slate-400">{group.players.map((p: any) => p.name).join(" | ")}</p>
                  </div>
                ))}
              </div>
            </div>

            {game.finished ? (
              <div className="rounded-xl border border-amber-300/50 bg-amber-500/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-amber-200">Final Score</p>
                <div className="mt-3 space-y-2">
                  {game.leaderboard.map((group: any, idx: number) => (
                    <div key={`final-${group.id}`} className="rounded-lg border border-amber-300/30 bg-slate-900/70 p-3">
                      <p className="text-xs text-amber-200">Rank #{idx + 1}</p>
                      <p className="text-sm font-semibold text-white">{group.name}</p>
                      <p className="text-sm text-amber-100">{group.score} pts</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Event Timeline</p>
              <div className="mt-3 max-h-[380px] space-y-2 overflow-y-auto pr-1">
                {game.logs.length ? (
                  game.logs.map((log: any) => (
                    <div key={log.id} className="rounded-lg border border-slate-700 bg-slate-900/80 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{log.type}</p>
                      <p className="mt-1 text-sm text-slate-100">{log.message}</p>
                      <p className="mt-1 text-[11px] text-cyan-300">{log.at}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No events yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Word Review</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {game.vocabularyResults.length ? (
                  game.vocabularyResults.map((item: any) => {
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
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-300">Game has not started yet. Create a room first, then click Start Game.</p>
      )}
    </section>
  );
}
