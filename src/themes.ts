import type { ScoreState } from "@/context/RangleScoresContext";

export interface ThemeDefinition {
    name: string;
    css_class: string;
    criteria?: (scores: ScoreState) => boolean;
    criteria_description?: string;
    secret?: boolean;
}

export const THEMES: {[id: string]: ThemeDefinition} = {
    default: {
        name: "Classic",
        css_class: ""
    },

    fools: {
        name: "Foolish",
        css_class: "theme-fools",
        criteria_description: "winning the April Fools 2026 Rangle",
        criteria: (scores) => {
            const score = scores["2026-04-01"];
            if (!score) {
                return false;
            }

            return score.result === true;
        }
    }
} as const;

export type ThemeID = keyof typeof THEMES;
