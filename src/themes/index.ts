import type {ScoreState, Stats} from "@/context/RangleScoresContext";

export interface ThemeDefinition {
    name: string;
    css_class: string;
    criteria?: (data: {scores: ScoreState, stats: Stats}) => boolean;
    criteria_description?: string;
    secret?: boolean;
    confetti_colors?: string[];
    share_emoji?: {
        correct: string;
        incorrect: string;
    };
}

import fools from "./fools.module.css";
import gold from "./gold.module.css";
import pride from "./pride.module.css";

export const THEMES: {default: Required<Pick<ThemeDefinition, "share_emoji">> & ThemeDefinition, [id: string]: ThemeDefinition} = {
    default: {
        name: "Classic",
        css_class: "",
        share_emoji: {
            correct: "🟩",
            incorrect: "⬛"
        }
    },

    pride: {
        name: "Pride",
        css_class: pride.theme,
        confetti_colors: ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#8B00FF"],
        share_emoji: {
            correct: "🏳️‍🌈",
            incorrect: "⬛"
        }
    },

    fools: {
        name: "Foolish",
        css_class: fools.theme,
        criteria_description: "winning the April Fools 2026 Rangle",
        criteria: ({scores}) => {
            const score = scores["2026-04-01"];
            if (!score) {
                return false;
            }

            return score.result === true;
        },
        confetti_colors: ["#000"],
        share_emoji: {
            correct: "🤡",
            incorrect: "⬛"
        }
    },

    gold: {
        name: "Gold",
        css_class: gold.theme,
        criteria_description: "solving at least 14 Rangles",
        criteria: ({stats}) => stats.wins >= 14,
        confetti_colors: ["#FFD700", "#FFF8DC", "#FFEC8B"],
        share_emoji: {
            correct: "🥇",
            incorrect: "⬛"
        }
    },
} as const;

export type ThemeID = keyof typeof THEMES;

// TODO: themed sound effects
// TODO: themed favicons
// TODO: themed cursor
