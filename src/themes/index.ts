import type {ScoreState, Stats} from "@/context/RangleScoresContext";

export interface ThemeDefinition {
    name: string;
    css_class: string;
    criteria?: (data: {scores: ScoreState, stats: Stats}) => boolean;
    criteria_description?: string;
    secret?: boolean;
}

import fools from "./fools.module.css";
import gold from "./gold.module.css";
import pride from "./pride.module.css";

export const THEMES: {[id: string]: ThemeDefinition} = {
    default: {
        name: "Classic",
        css_class: ""
    },

    pride: {
        name: "Pride",
        css_class: pride.theme,
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
        }
    },

    gold: {
        name: "Gold",
        css_class: gold.theme,
        criteria_description: "solving at least 14 Rangles",
        criteria: ({stats}) => stats.wins >= 14
    },
} as const;

export type ThemeID = keyof typeof THEMES;
