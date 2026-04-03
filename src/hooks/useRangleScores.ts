import {time_zone} from "../../time";

import {useState, useEffect, useMemo} from "react";

import type {SaveStateDay, ScoreState} from "@/hooks/useRangleState";

export const useRangleScores = () => {
    const [scores, setScores] = useState<ScoreState | null>(null);

    useEffect(() => {
        const migrate_from_state = () => {
            const raw_state = localStorage.getItem("rangle_state_v1");
            if (!raw_state) {
                localStorage.setItem("rangle_scores_v1", JSON.stringify({}));
                return;
            }

            try {
                const state = JSON.parse(raw_state);
                const migrated_scores: ScoreState = {};
                for (const date in state) {
                    const game_data = state[date] as SaveStateDay;

                    const correct = game_data.attempts.length > 0 && game_data.attempts[game_data.attempts.length - 1].every((pos) => pos);
                    const finished = correct || game_data.attempts.length >= 5;

                    // result is true if correct, false if finished incorrectly, and undefined if still in progress
                    const result = finished ? correct : undefined;

                    migrated_scores[date] = {
                        attempts: game_data.attempts.length,
                        updated: new Date().toISOString(),
                        result
                    };
                }

                localStorage.setItem("rangle_scores_v1", JSON.stringify(migrated_scores));
            } catch (e) {
                console.error("Failed to migrate scores from state", e);
                localStorage.setItem("rangle_scores_v1", JSON.stringify({}));
            }
        }

        const load_scores = () => {
            // if score key not set, need to migrate it by parsing rangle_state_v1 once
            if (!localStorage.getItem("rangle_scores_v1")) {
                migrate_from_state();
            }

            const raw = localStorage.getItem("rangle_scores_v1")!;
            try {
                setScores(JSON.parse(raw));
            } catch (e) {
                console.error("Failed to parse scores", e);
            }
        };

        load_scores();

        // listen for updates to scores in other tabs
        const score_listener = (e: StorageEvent) => {
            if (e.key === "rangle_scores_v1") {
                load_scores();
            }
        };

        window.addEventListener("storage", score_listener);
        return () => window.removeEventListener('storage', score_listener);
    }, []);

    const stats = useMemo(() => {
        if (!scores) {
            return null;
        }

        // filter out in progress games and sort by date ascending
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

        for (const [date_str, score] of sorted_entries) {
            // sum wins and score distribution
            if (score.result === true) {
                wins++;
                if (score.attempts) {
                    score_distribution[score.attempts] = (score_distribution[score.attempts] || 0) + 1;
                }
            }

            // utc date maths
            const current_date = new Date(`${date_str}T00:00:00Z`);

            if (previous_date) {
                const diff_time = current_date.getTime() - previous_date.getTime();
                const diff_days = Math.round(diff_time / (1000 * 60 * 60 * 24));

                if (diff_days === 1) {
                    // next day in a row, so play streak continues
                    current_play_streak++;

                    // if they also won, win streak continues, otherwise resets
                    if (score.result === true) {
                        current_win_streak++;
                    } else {
                        current_win_streak = 0;
                    }
                } else {
                    // both streaks reset as missed at least one day
                    current_play_streak = 1;
                    current_win_streak = score.result === true ? 1 : 0;
                }
            } else {
                //  first entry, so start play streak and win streak if they won
                current_play_streak = 1;
                current_win_streak = score.result === true ? 1 : 0;
            }

            // compare against current longest streaks
            if (current_play_streak > longest_play_streak) {
                longest_play_streak = current_play_streak;
            }
            if (current_win_streak > longest_win_streak) {
                longest_win_streak = current_win_streak;
            }

            previous_date = current_date;
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

    return { scores, stats };
};
