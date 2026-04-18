"use client";

import {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState} from "react";
import type {SaveStateDay} from "@/context/RangleStateContext";
import {time_zone} from "../../time";

export interface ScoreStateDay {
    attempts: number;
    updated: string;

    // true = won, false = lost, undefined = in progress
    result?: boolean;
}

export type ScoreState = Record<string, ScoreStateDay>;

export interface Stats {
    total_played: number;
    wins: number;
    losses: number;
    win_percentage: number;
    current_play_streak: number;
    longest_play_streak: number;
    current_win_streak: number;
    longest_win_streak: number;
    score_distribution: Record<number, number>;
}

interface RangleScoresContextType {
    scores: ScoreState | null;
    stats: Stats | null;
    update_score: (date: string, score_data: ScoreStateDay) => void;
    rebuild_scores: () => void;
}

const RangleScoresContext = createContext<RangleScoresContextType | undefined>(undefined);

export const RangleScoresProvider = ({ children }: { children: ReactNode }) => {
    const [scores, setScores] = useState<ScoreState | null>(null);

    const migrate_from_state = useCallback((only_new = false) => {
        const raw_state = localStorage.getItem("rangle_state_v1");
        if (!raw_state) {
            localStorage.setItem("rangle_scores_v1", JSON.stringify({}));
            return;
        }

        const existing_scores_raw = localStorage.getItem("rangle_scores_v1");
        const existing_scores = existing_scores_raw ? JSON.parse(existing_scores_raw) : {};

        try {
            const state = JSON.parse(raw_state);
            const migrated_scores: ScoreState = {};
            for (const date in state) {
                if (only_new && existing_scores[date]) {
                    migrated_scores[date] = existing_scores[date];
                    continue;
                }

                const game_data = state[date] as SaveStateDay;
                const correct = game_data.attempts.length > 0 && game_data.attempts[game_data.attempts.length - 1].every((pos) => pos);
                const finished = correct || game_data.attempts.length >= 5;
                const result = finished ? correct : undefined;

                migrated_scores[date] = {
                    attempts: game_data.attempts.length,
                    result,

                    // give the benefit of the doubt that the migrated games were played on the day of
                    // TODO: add timestamp to state saves in the future to be more accurate about this
                    updated: new Date(`${date}T12:00:00Z`).toISOString(),
                };
            }

            localStorage.setItem("rangle_scores_v1", JSON.stringify(migrated_scores));
            return migrated_scores;
        } catch (e) {
            console.error("Failed to migrate scores from state", e);
            localStorage.setItem("rangle_scores_v1", JSON.stringify({}));
            return {};
        }
    }, []);

    const load_scores = useCallback(() => {
        if (!localStorage.getItem("rangle_scores_v1")) {
            const migrated = migrate_from_state();
            setScores(migrated || {});
            return;
        }

        const raw = localStorage.getItem("rangle_scores_v1");
        try {
            if (raw) setScores(JSON.parse(raw));
        } catch (e) {
            console.error("Failed to parse scores", e);
        }
    }, [migrate_from_state]);

    useEffect(() => {
        load_scores();

        const score_listener = (e: StorageEvent) => {
            if (e.key === "rangle_scores_v1") {
                load_scores();
            }
            if (e.key === "rangle_state_v1") {
                console.log("State changed in other tab, checking for score updates...");
                migrate_from_state(true);
                load_scores();
            }
        };

        window.addEventListener("storage", score_listener);
        return () => window.removeEventListener("storage", score_listener);
    }, [load_scores, migrate_from_state]);

    const update_score = useCallback((date: string, score_data: ScoreStateDay) => {
        setScores((prev_scores) => {
            const new_scores = {
                ...prev_scores,
                [date]: score_data,
            };
            localStorage.setItem("rangle_scores_v1", JSON.stringify(new_scores));
            return new_scores;
        });
    }, []);

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
            losses: sorted_entries.length - wins,
            win_percentage: sorted_entries.length > 0 ? Math.round((wins / sorted_entries.length) * 100) : 0,
            current_play_streak,
            longest_play_streak,
            current_win_streak,
            longest_win_streak,
            score_distribution
        };
    }, [scores]);

    const rebuild_scores = useCallback(() => {
        localStorage.removeItem("rangle_scores_v1");
        const migrated = migrate_from_state();
        setScores(migrated || {});
    }, [migrate_from_state]);

    return (
        <RangleScoresContext.Provider value={{ scores, stats, update_score, rebuild_scores }}>
            {children}
        </RangleScoresContext.Provider>
    );
};

export const useRangleScores = () => {
    const context = useContext(RangleScoresContext);
    if (context === undefined) {
        throw new Error("useRangleScores must be used within a RangleScoresProvider");
    }
    return context;
};

// TODO: store hardcore and bonus_results here for stats
