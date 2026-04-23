"use client";

import {useRangleScores, type Stats} from "@/context/RangleScoresContext";
import {LoadingSpinner} from "@/components/LoadingSpinner";

import {useEffect, useRef} from "react";
import {useAuth} from "@/context/AuthContext";
import {LeaderboardPopup} from "@/components/LeaderboardPopup";

interface StatsPopupProps {
    open: boolean;
    on_close: () => void;

    open_leaderboard: () => void;
}
const PresentedStats = ({stats}: {stats: Stats}) => (
    <>
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] mb-4 text-center opacity-80">
            The Numbers
        </h3>

        <div className="grid grid-cols-4 gap-4 mb-8 w-full text-center">
            <div>
                <div className="text-3xl font-black leading-none">{stats.total_played}</div>
                <div className="text-xs uppercase tracking-widest opacity-60 mt-1">Played</div>
            </div>
            <div>
                <div className="text-3xl font-black leading-none">{stats.win_percentage}%</div>
                <div className="text-xs uppercase tracking-widest opacity-60 mt-1">Won</div>
            </div>
            <div>
                <div className="text-3xl font-black leading-none text-win-streak">
                    {stats.current_win_streak}
                </div>
                <div className="text-xs uppercase tracking-widest opacity-60 mt-1">Win Streak 🔥</div>
            </div>
            <div>
                <div className="text-3xl font-black leading-none text-play-streak">
                    {stats.current_play_streak}
                </div>
                <div className="text-xs uppercase tracking-widest opacity-60 mt-1">Play Streak 🗓️</div>
            </div>
        </div>

        <h3 className="text-sm font-bold uppercase tracking-[0.2em] mb-4 text-center opacity-80">
            The Records
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-8 w-full text-center">
            <div>
                <div className="text-3xl font-black leading-none text-win-streak">
                    {stats.longest_win_streak} day{stats.longest_win_streak !== 1 && "s"}
                </div>
                <div className="text-xs uppercase tracking-widest opacity-60 mt-1">Longest Win Streak 🔥</div>
            </div>
            <div>
                <div className="text-3xl font-black leading-none text-play-streak">
                    {stats.longest_play_streak} day{stats.longest_play_streak !== 1 && "s"}
                </div>
                <div className="text-xs uppercase tracking-widest opacity-60 mt-1">Longest Play Streak 🗓️</div>
            </div>
        </div>

        <div className="w-full mb-6">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] mb-4 text-center opacity-80">
                The Scores
            </h3>

            <div className="space-y-2 px-2">
                {Object.entries(stats.score_distribution).map(([guess, count]) => {
                    const maximum = Math.max(...Object.values(stats.score_distribution), 1);
                    const width_percent = (count / maximum) * 100;

                    return (
                        <div key={guess} className="flex items-center gap-3">
                            <span className="w-2 text-sm font-medium opacity-50">{guess}</span>
                            <div className="flex-1 h-5 bg-foreground/15 dark:bg-foreground/5 rounded-sm overflow-hidden">
                                <div
                                    className={`h-full flex items-center justify-end px-2 transition-all duration-700 ease-out ${count > 0 ? "bg-primary" : "bg-foreground/10"}`}
                                    style={{ width: `${Math.max(width_percent, 7)}%` }} // minimum width so 0/low counts are still visible
                                >
                            <span className="text-[0.7rem] font-bold text-on-primary">
                                {count}
                            </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        <p className="mb-8 opacity-60 text-center text-pretty">(Streaks only counted if played on day of release)</p>
    </>
);

export const StatsPopup = ({open, on_close, open_leaderboard}: StatsPopupProps) => {
    const dialog_ref = useRef<HTMLDialogElement>(null);

    // sync with open prop
    useEffect(() => {
        if (open) {
            dialog_ref.current?.showModal();
        } else {
            dialog_ref.current?.close();
        }
    }, [open]);

    const {stats} = useRangleScores();
    const {in_discord_guild} = useAuth();

    // TODO: base dialog component
    return (
        <dialog onAbort={on_close} ref={dialog_ref} className="rounded-lg p-4 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[95vw] sm:max-w-md w-full bg-background-variant text-foreground-variant flex flex-col items-center">
            <h2 className="text-xl font-bold mb-6">Statistics</h2>

            {stats === null ? <LoadingSpinner /> : <PresentedStats stats={stats} />}

            {in_discord_guild && (
                <span className="underline cursor-pointer mb-2" onClick={open_leaderboard}>View server leaderboard</span>
            )}

            <button
                className="px-4 py-2 bg-secondary text-on-secondary rounded cursor-pointer"
                onClick={on_close}
            >
                Close
            </button>
        </dialog>
    );
}

// TODO: close when clicking outside (this is why a base component would be nice)
