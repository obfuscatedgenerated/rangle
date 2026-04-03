"use client";

import {time_zone} from "../../time";

import {useRangleScores} from "@/context/RangleScoresContext";
import {LoadingSpinner} from "@/components/LoadingSpinner";

import {useEffect, useMemo, useRef} from "react";

interface StatsPopupProps {
    open: boolean;
    on_close: () => void;
}

interface Stats {
    total_played: number;
    wins: number;
    win_percentage: number;
    current_play_streak: number;
    longest_play_streak: number;
    current_win_streak: number;
    longest_win_streak: number;
    score_distribution: Record<number, number>;
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
                <div className="text-3xl font-black leading-none text-orange-500">
                    {stats.current_win_streak}
                </div>
                <div className="text-xs uppercase tracking-widest opacity-60 mt-1">Win Streak 🔥</div>
            </div>
            <div>
                <div className="text-3xl font-black leading-none text-blue-400">
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
                <div className="text-3xl font-black leading-none text-orange-500">
                    {stats.longest_win_streak} day{stats.longest_win_streak !== 1 && "s"}
                </div>
                <div className="text-xs uppercase tracking-widest opacity-60 mt-1">Longest Win Streak 🔥</div>
            </div>
            <div>
                <div className="text-3xl font-black leading-none text-blue-400">
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
                            <div className="flex-1 h-5 bg-white/5 rounded-sm overflow-hidden">
                                <div
                                    className={`h-full flex items-center justify-end px-2 transition-all duration-700 ease-out ${count > 0 ? "bg-blue-600" : "bg-white/10"}`}
                                    style={{ width: `${Math.max(width_percent, 7)}%` }} // minimum width so 0/low counts are still visible
                                >
                            <span className="text-[0.7rem] font-bold text-white">
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

export const StatsPopup = ({open, on_close}: StatsPopupProps) => {
    const dialog_ref = useRef<HTMLDialogElement>(null);

    // sync with open prop
    useEffect(() => {
        if (open) {
            dialog_ref.current?.showModal();
        } else {
            dialog_ref.current?.close();
        }
    }, [open]);

    const {scores} = useRangleScores();

    const stats = useMemo((): Stats | null => {
        if (!scores) {
            return null;
        }

        const sorted_entries = Object.entries(scores)
            .filter(([_, score]) => score.result !== undefined)
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB));

        let current_play_streak = 0;
        let longest_play_streak = 0;
        let current_win_streak = 0;
        let longest_win_streak = 0;
        let wins = 0;
        const score_distribution: Record<number | "X", number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, X: 0 };

        let previous_date: Date | null = null;
        let previous_was_on_time = false;

        for (const [date_str, score] of sorted_entries) {
            // did they play on the day the puzzle was released? (i.e. not archived play)
            const played_date_iso = new Date(score.updated).toLocaleDateString("en-CA", { timeZone: time_zone });
            const played_on_time = played_date_iso === date_str;

            // regardless archived or not, count the win if they got it right
            if (score.result === true) {
                wins++;
                if (score.attempts) {
                    score_distribution[score.attempts]++;
                }
            } else if (score.result === false) {
                score_distribution.X++;
            }

            // utc maths
            const current_date = new Date(`${date_str}T00:00:00Z`);

            if (previous_date) {
                const diff_time = current_date.getTime() - previous_date.getTime();
                const diff_days = Math.round(diff_time / (1000 * 60 * 60 * 24));

                if (diff_days === 1 && played_on_time && previous_was_on_time) {
                    // played on time and next day in a row, so play streak continues
                    current_play_streak++;

                    // if they also won, win streak continues, otherwise resets
                    current_win_streak = score.result === true ? current_win_streak + 1 : 0;
                } else {
                    // both streaks reset as missed at least one day
                    current_play_streak = played_on_time ? 1 : 0;
                    current_win_streak = (played_on_time && score.result === true) ? 1 : 0;
                }
            } else {
                //  first entry, so start play streak and win streak if they won
                current_play_streak = played_on_time ? 1 : 0;
                current_win_streak = (played_on_time && score.result === true) ? 1 : 0;
            }

            // compare against current longest streaks
            if (current_play_streak > longest_play_streak){
                longest_play_streak = current_play_streak;
            }

            if (current_win_streak > longest_win_streak) {
                longest_win_streak = current_win_streak;
            }

            previous_date = current_date;
            previous_was_on_time = played_on_time;
        }

        // check if streaks died today
        if (previous_date) {
            const today_iso = new Date().toLocaleDateString("en-CA", { timeZone: time_zone });
            const today_utc = new Date(`${today_iso}T00:00:00Z`);
            const days_since_last_play = Math.round((today_utc.getTime() - previous_date.getTime()) / (1000 * 60 * 60 * 24));

            // if they haven't played today or yesterday, streaks are dead
            if (days_since_last_play > 1) {
                current_play_streak = 0;
                current_win_streak = 0;
            }
        }

        return {
            total_played: sorted_entries.length,
            wins,
            win_percentage: sorted_entries.length > 0 ? Math.round((wins / sorted_entries.length) * 100) : 0,
            current_play_streak,
            longest_play_streak,
            current_win_streak,
            longest_win_streak,
            score_distribution
        };
    }, [scores]);

    // TODO: base dialog component
    return (
        <dialog onAbort={on_close} ref={dialog_ref} className="rounded-lg p-4 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[95vw] sm:max-w-md w-full bg-background-variant text-foreground-variant flex flex-col items-center">
            <h2 className="text-xl font-bold mb-6">Statistics</h2>

            {stats === null ? <LoadingSpinner /> : <PresentedStats stats={stats} />}

            <button
                className="px-4 py-2 bg-red-500 text-white rounded cursor-pointer"
                onClick={on_close}
            >
                Close
            </button>
        </dialog>
    );
}

// TODO: close when clicking outside (this is why a base component would be nice)
