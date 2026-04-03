"use client";

import {createContext, ReactNode, useCallback, useContext, useEffect, useState} from "react";
import type {SaveStateDay} from "@/hooks/useRangleState";

export interface ScoreStateDay {
    attempts: number;
    updated: string;

    // true = won, false = lost, undefined = in progress
    result?: boolean;
}

export type ScoreState = Record<string, ScoreStateDay>;

interface RangleScoresContextType {
    scores: ScoreState | null;
    update_score: (date: string, score_data: ScoreStateDay) => void;
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

    return (
        <RangleScoresContext.Provider value={{ scores, update_score }}>
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
