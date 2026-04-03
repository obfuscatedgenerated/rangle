"use client";

import {time_zone} from "../../time";

import {useRangleScores} from "@/context/RangleScoresContext";
import {LoadingSpinner} from "@/components/LoadingSpinner";

import {useEffect, useMemo, useRef} from "react";

interface StatsPopupProps {
    open: boolean;
    on_close: () => void;
}

const title_case = (str: string) => {
    return str.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

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

    const stats = useMemo(() => {
        if (!scores) {
            return null;
        }

        console.log("Calculating stats from scores:", scores);

        const sorted_entries = Object.entries(scores)
            .filter(([_, score]) => score.result !== undefined)
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB));

        let current_play_streak = 0;
        let longest_play_streak = 0;
        let current_win_streak = 0;
        let longest_win_streak = 0;
        let wins = 0;
        const score_distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

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
                    score_distribution[score.attempts] = (score_distribution[score.attempts] || 0) + 1;
                }
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
            <h2 className="text-xl font-bold mb-2">Statistics</h2>
            <p className="mb-4 opacity-60">WIP</p>

            {stats === null ? <LoadingSpinner /> :
                <table className="mb-6">
                    <thead>
                        <tr>
                            <th className="px-4 py-2">Stat</th>
                            <th className="px-4 py-2">Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(stats).map(([key, value]) => (
                            <tr key={key}>
                                <td className="border px-4 py-2">{title_case(key)}</td>
                                <td className="border px-4 py-2">{typeof value === "object" ? JSON.stringify(value) : value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            }

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
