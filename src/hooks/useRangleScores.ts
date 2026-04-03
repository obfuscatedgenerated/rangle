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

    const stats = useMemo(
        () => {
            if (!scores) {
                return null;
            }

            return {
                total_played: Object.values(scores).filter((score) => score.result !== undefined).length,
                wins: Object.values(scores).filter((score) => score.result === true).length,
                current_streak: Object.values(scores).reverse().findIndex((score) => score.result === false) === -1
                    ? Object.values(scores).filter((score) => score.result === true).length
                    : Object.values(scores).reverse().findIndex((score) => score.result === false),
                longest_streak: Object.values(scores).reduce((max, score) => {
                    if (score.result === true) {
                        return max + 1;
                    } else {
                        return 0;
                    }
                }, 0)
            };
        },
        [scores]
    );

    return { scores, stats };
};
